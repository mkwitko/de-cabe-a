/**
 * Craque Misterioso snapshot (ADR-011): the hidden player's facts, frozen at publishing.
 * The same facts are loaded for every guess (attempts.service), so both sides compare alike.
 */
import { z } from 'zod';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';

export const MysteryParams = z.object({ playerId: z.string() });
export type MysteryParams = z.infer<typeof MysteryParams>;

type Db = PrismaClient | Prisma.TransactionClient;

/** Nationality, position, birth year and clubs (verified professional or loan spells). */
export async function playerFacts(db: Db, playerId: string) {
  const p = await db.player.findUnique({
    where: { id: playerId },
    include: {
      nationality: true,
      spells: {
        where: { verificationStatus: 'verified', spellType: { in: ['professional', 'loan'] } },
        include: { club: { include: { country: true } } },
        orderBy: { sortIndex: 'asc' },
      },
    },
  });
  if (!p) return null;
  const seen = new Set<string>();
  return {
    playerId: p.id,
    name: p.canonicalName,
    nationalityCode: p.nationality.isoCode,
    positionGroup: p.primaryPositionGroup,
    birthYear: p.birthDate?.getUTCFullYear() ?? null,
    clubs: p.spells
      .filter((s) => !seen.has(s.clubId) && seen.add(s.clubId))
      .map((s) => ({ id: s.clubId, name: s.club.shortName, countryCode: s.club.country.isoCode })),
    verified: p.verificationStatus === 'verified',
  };
}

export async function buildMysterySnapshot(
  prisma: PrismaClient,
  params: MysteryParams,
  difficultyTier: 1 | 2 | 3 = 2,
) {
  const f = await playerFacts(prisma, params.playerId);
  const reasons: string[] = [];
  if (!f) reasons.push('PLAYER_NOT_FOUND');
  else {
    if (!f.verified) reasons.push('PLAYER_NOT_VERIFIED');
    if (!f.positionGroup) reasons.push('NO_POSITION');
    if (f.birthYear === null) reasons.push('NO_BIRTH_YEAR');
    if (f.clubs.length < 3) reasons.push('TOO_FEW_CLUBS');
  }
  if (reasons.length) return { eligible: false, reasons, config: null };
  const { verified: _v, ...answer } = f!;
  return {
    eligible: true,
    reasons,
    config: {
      engine: 'mystery-player' as const,
      engineVersion: 1 as const,
      answer,
      difficultyTier,
    },
  };
}
