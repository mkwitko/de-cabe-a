/**
 * Editorial operations on the knowledge base (API_SPEC.md admin, DATA_QUALITY.md §1).
 * Status transitions are validated here and blocked by DQ rules with severity "block".
 */
import { normalizeName } from '@decabeca/engine';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import {
  checkClub,
  checkPlayer,
  checkSpell,
  type DqViolation,
  type PlayerDq,
  type VerificationStatus,
} from './quality';

/**
 * Allowed status transitions. `verified -> imported` reopens a record for editing;
 * nothing returns to `draft`.
 */
const TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  draft: ['verified', 'rejected'],
  imported: ['verified', 'rejected'],
  verified: ['imported'],
  rejected: ['imported'],
};

export function assertTransition(from: VerificationStatus, to: VerificationStatus) {
  if (from !== to && !TRANSITIONS[from].includes(to))
    throw new AppError(409, 'INVALID_TRANSITION', `Transição inválida: ${from} → ${to}.`, {
      from,
      to,
    });
}

function assertNoBlockers(violations: DqViolation[]) {
  const blockers = violations.filter((v) => v.severity === 'block');
  if (blockers.length)
    throw new AppError(422, 'DATA_QUALITY_VIOLATION', blockers.map((b) => b.message).join(' '), {
      rules: [...new Set(blockers.map((b) => b.rule))],
      violations: blockers,
    });
}

const playerInclude = {
  aliases: { orderBy: [{ isPrimary: 'desc' }, { alias: 'asc' }] },
  spells: {
    include: { club: { include: { country: true } }, loanFromClub: true },
    orderBy: [{ startDate: 'asc' }, { sortIndex: 'asc' }],
  },
  nationality: true,
  secondaryNationality: true,
} satisfies Prisma.PlayerInclude;

export type PlayerWithRelations = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;

export const toPlayerDq = (p: PlayerWithRelations): PlayerDq => ({
  id: p.id,
  verificationStatus: p.verificationStatus,
  wikidataId: p.wikidataId,
  sourceRef: p.sourceRef,
  primaryPositionGroup: p.primaryPositionGroup,
  birthDate: p.birthDate,
  aliases: p.aliases,
  spells: p.spells,
});

export async function getPlayer(prisma: PrismaClient, id: string) {
  const p = await prisma.player.findUnique({ where: { id }, include: playerInclude });
  if (!p) throw new AppError(404, 'NOT_FOUND', 'Jogador não encontrado.');
  return p;
}

export async function playerDetail(prisma: PrismaClient, id: string) {
  const p = await getPlayer(prisma, id);
  return { ...p, dq: checkPlayer(toPlayerDq(p)) };
}

export async function listPlayers(
  prisma: PrismaClient,
  q: { status?: VerificationStatus | undefined; q?: string | undefined; page: number },
) {
  const PAGE = 50;
  const term = q.q ? normalizeName(q.q) : '';
  const where: Prisma.PlayerWhereInput = {
    ...(q.status ? { verificationStatus: q.status } : {}),
    ...(term
      ? {
          aliases: {
            some: {
              OR: [{ normalized: { startsWith: term } }, { normalized: { contains: ` ${term}` } }],
            },
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.player.findMany({
      where,
      include: { spells: { select: { verificationStatus: true } }, nationality: true },
      orderBy: [{ notabilityTier: 'asc' }, { canonicalName: 'asc' }],
      skip: (q.page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.player.count({ where }),
  ]);
  return {
    total,
    page: q.page,
    items: rows.map(({ spells, nationality, ...p }) => ({
      ...p,
      nationalityCode: nationality.isoCode,
      spells: {
        verified: spells.filter((s) => s.verificationStatus === 'verified').length,
        imported: spells.filter((s) => s.verificationStatus === 'imported').length,
        other: spells.filter((s) => !['verified', 'imported'].includes(s.verificationStatus))
          .length,
      },
    })),
  };
}

export async function updatePlayer(
  prisma: PrismaClient,
  id: string,
  data: Omit<Prisma.PlayerUncheckedUpdateInput, 'verificationStatus'> & {
    verificationStatus?: VerificationStatus;
  },
  editor: string,
) {
  const current = await getPlayer(prisma, id);
  const { verificationStatus, ...fields } = data;
  if (verificationStatus) assertTransition(current.verificationStatus, verificationStatus);
  if (verificationStatus === 'verified') {
    const next = await prisma.$transaction(async (tx) => {
      await tx.player.update({ where: { id }, data: fields });
      return tx.player.findUniqueOrThrow({ where: { id }, include: playerInclude });
    });
    assertNoBlockers(checkPlayer({ ...toPlayerDq(next), verificationStatus: 'verified' }));
  }
  return prisma.player.update({
    where: { id },
    data: {
      ...fields,
      ...(verificationStatus
        ? {
            verificationStatus,
            verifiedAt: verificationStatus === 'verified' ? new Date() : null,
            verifiedBy: verificationStatus === 'verified' ? editor : null,
          }
        : {}),
    },
  });
}

type SpellData = Omit<Prisma.CareerSpellUncheckedUpdateInput, 'verificationStatus'> & {
  verificationStatus?: VerificationStatus;
};

export async function updateSpell(
  prisma: PrismaClient,
  playerId: string,
  spellId: string,
  data: SpellData,
  editor: string,
) {
  const current = await prisma.careerSpell.findFirst({ where: { id: spellId, playerId } });
  if (!current) throw new AppError(404, 'NOT_FOUND', 'Passagem não encontrada.');
  const { verificationStatus, ...fields } = data;
  if (verificationStatus) assertTransition(current.verificationStatus, verificationStatus);
  const merged = {
    ...current,
    ...fields,
    verificationStatus: verificationStatus ?? current.verificationStatus,
  } as typeof current;
  assertNoBlockers(
    checkSpell(merged).filter(
      (v) => v.rule !== 'DQ-01' || merged.verificationStatus === 'verified',
    ),
  );
  return prisma.careerSpell.update({
    where: { id: spellId },
    data: {
      ...fields,
      ...(verificationStatus
        ? {
            verificationStatus,
            verifiedAt: verificationStatus === 'verified' ? new Date() : null,
            verifiedBy: verificationStatus === 'verified' ? editor : null,
          }
        : {}),
    },
  });
}

export async function createSpell(
  prisma: PrismaClient,
  playerId: string,
  data: Prisma.CareerSpellUncheckedCreateInput,
) {
  await getPlayer(prisma, playerId);
  const draft = {
    id: 'new',
    loanFromClubId: null,
    startDate: null,
    endDate: null,
    startPrecision: 'unknown' as const,
    ...data,
    verificationStatus: 'draft' as const,
  };
  assertNoBlockers(checkSpell(draft as never));
  return prisma.careerSpell.create({ data: { ...data, playerId, verificationStatus: 'draft' } });
}

export async function addAlias(
  prisma: PrismaClient,
  playerId: string,
  data: {
    alias: string;
    kind: 'canonical' | 'full' | 'nickname' | 'variant';
    isPrimary?: boolean | undefined;
  },
) {
  await getPlayer(prisma, playerId);
  return prisma.playerAlias.create({
    data: {
      playerId,
      alias: data.alias,
      kind: data.kind,
      isPrimary: data.isPrimary ?? data.kind === 'canonical',
      normalized: normalizeName(data.alias),
    },
  });
}

export async function updateClub(
  prisma: PrismaClient,
  id: string,
  data: Omit<Prisma.ClubUncheckedUpdateInput, 'verificationStatus'> & {
    verificationStatus?: VerificationStatus;
  },
) {
  const current = await prisma.club.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'NOT_FOUND', 'Clube não encontrado.');
  if (data.verificationStatus)
    assertTransition(current.verificationStatus, data.verificationStatus);
  const merged = { ...current, ...data } as typeof current;
  if (merged.verificationStatus === 'verified') assertNoBlockers(checkClub(merged));
  return prisma.club.update({ where: { id }, data });
}
