// Published levels that no longer pass their own rules (a player lost "verified" after a
// re-curation, a Grid cell got too small) are replaced in place with the smallest change that
// makes them valid again: only the failing round, player or criterion is swapped.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/repair-stale-levels.ts [--dry]
import { createPrisma } from '../../apps/api/src/db';
import {
  buildSnapshot,
  careerPathEligibility,
  publishChallenge,
  retireChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import { timelineClubs } from '../../apps/api/src/modules/challenges/timeline-snapshot';
import type { GameModeCode } from '../../apps/api/src/modules/challenges/engines';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const DRY = process.argv.includes('--dry');

type Crit = { type: string; clubId?: string; countryId?: string; positionGroup?: string };
const crit = ({ type, clubId, countryId, positionGroup }: Crit) =>
  type === 'club'
    ? { type, clubId }
    : type === 'position'
      ? { type, positionGroup }
      : { type, countryId };
type Snap = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- params are checked by buildSnapshot
type Params = any;

function paramsOf(mode: GameModeCode, s: Snap): Params {
  if (mode === 'CAREER_PATH') return { playerId: s.answerPlayerId };
  if (mode === 'FOOTBALL_GRID')
    return { rows: (s.rows as Crit[]).map(crit), cols: (s.cols as Crit[]).map(crit) };
  if (mode === 'IMPOSTOR')
    return {
      rounds: (s.rounds as { clubId: string; players: { id: string }[]; impostorId: string }[]).map(
        (r) => ({
          clubId: r.clubId,
          memberIds: r.players.map((p) => p.id).filter((id) => id !== r.impostorId),
          impostorId: r.impostorId,
        }),
      ),
    };
  return { rounds: (s.rounds as { playerId: string }[]).map((r) => ({ playerId: r.playerId })) };
}

/** Reasons a rebuild gives, or [] when the level is still valid. */
async function reasonsOf(mode: GameModeCode, params: Params, tier: 1 | 2 | 3, ignore: string) {
  try {
    await buildSnapshot(prisma, { mode, params, difficultyTier: tier }, ignore);
    return [];
  } catch (e) {
    return ((e as { details?: { reasons?: string[] } }).details?.reasons ?? ['ERROR']) as string[];
  }
}
const failingRounds = (reasons: string[]) =>
  [...new Set(reasons.map((r) => /^(?:ROUND|CELL)_(\d+)_/.exec(r)?.[1]).filter(Boolean))].map(
    Number,
  );

const usedIn = async (mode: GameModeCode) =>
  new Set(
    (
      await prisma.challenge.findMany({
        where: { gameMode: mode, status: { in: ['draft', 'validated', 'published'] } },
        select: { snapshot: true },
      })
    ).flatMap((c) => JSON.stringify(c.snapshot).match(/[0-9a-f]{8}-[0-9a-f-]{27}/g) ?? []),
  );
const verified = await prisma.player.findMany({
  where: { verificationStatus: 'verified' },
  select: { id: true, notabilityTier: true },
  orderBy: [{ notabilityTier: 'asc' }, { canonicalName: 'asc' }],
});

async function fix(
  mode: GameModeCode,
  params: Params,
  reasons: string[],
  id: string,
): Promise<Params | null> {
  const used = await usedIn(mode);
  if (mode === 'CAREER_PATH') {
    const old = await prisma.player.findUnique({ where: { id: params.playerId } });
    for (const p of verified.filter((x) => x.notabilityTier === old?.notabilityTier))
      if (!used.has(p.id) && (await careerPathEligibility(prisma, p.id)).eligible)
        return { playerId: p.id };
    return null;
  }
  if (mode === 'TIMELINE') {
    const rounds = [...params.rounds];
    for (const i of failingRounds(reasons)) {
      const old = await prisma.player.findUnique({ where: { id: rounds[i].playerId } });
      let swap = null;
      // Same fame first, then anyone.
      const order = [
        ...verified.filter((x) => x.notabilityTier === old?.notabilityTier),
        ...verified.filter((x) => x.notabilityTier !== old?.notabilityTier),
      ];
      for (const p of order)
        if (!used.has(p.id) && (await timelineClubs(prisma, p.id))) {
          swap = p.id;
          used.add(p.id);
          break;
        }
      if (!swap) return null;
      rounds[i] = { playerId: swap };
    }
    return { rounds };
  }
  if (mode === 'IMPOSTOR') {
    const rounds = params.rounds.map((r: Params) => ({ ...r, memberIds: [...r.memberIds] }));
    const inLevel = new Set(rounds.flatMap((r: Params) => [...r.memberIds, r.impostorId]));
    for (const i of failingRounds(reasons)) {
      const r = rounds[i];
      const club = await prisma.club.findUniqueOrThrow({ where: { id: r.clubId } });
      // A member must be verified with a verified spell here; the impostor only verified.
      const ok = await prisma.player.findMany({
        where: { id: { in: [...r.memberIds, r.impostorId] }, verificationStatus: 'verified' },
        select: {
          id: true,
          spells: { where: { clubId: r.clubId, verificationStatus: 'verified' } },
        },
      });
      const good = new Set(
        ok.filter((p) => p.id === r.impostorId || p.spells.length).map((p) => p.id),
      );
      for (const [k, m] of r.memberIds.entries()) {
        if (good.has(m)) continue;
        const sub = await prisma.player.findFirst({
          where: {
            verificationStatus: 'verified',
            id: { notIn: [...inLevel] as string[] },
            spells: { some: { clubId: r.clubId, verificationStatus: 'verified' } },
          },
          orderBy: { notabilityTier: 'asc' },
        });
        if (!sub) {
          // No one left at this club: move the round to another club the other members share
          // (verified spells), where the impostor never played, and add a third member there.
          const rest = r.memberIds.filter((x: string) => good.has(x));
          const shared = await prisma.careerSpell.groupBy({
            by: ['clubId'],
            where: {
              playerId: { in: rest },
              verificationStatus: 'verified',
              clubId: { not: r.clubId },
            },
            _count: { playerId: true },
          });
          let moved = false;
          for (const g of shared.filter((x) => x._count.playerId >= rest.length)) {
            const imp = await prisma.careerSpell.count({
              where: {
                playerId: r.impostorId,
                clubId: g.clubId,
                verificationStatus: { not: 'rejected' },
              },
            });
            if (imp) continue;
            const third = await prisma.player.findFirst({
              where: {
                verificationStatus: 'verified',
                id: { notIn: [...inLevel] as string[] },
                spells: { some: { clubId: g.clubId, verificationStatus: 'verified' } },
              },
              orderBy: { notabilityTier: 'asc' },
            });
            if (!third) continue;
            r.clubId = g.clubId;
            r.memberIds = [...rest, third.id];
            inLevel.add(third.id);
            moved = true;
            break;
          }
          if (!moved) return null;
          break;
        }
        r.memberIds[k] = sub.id;
        inLevel.add(sub.id);
      }
      if (!good.has(r.impostorId)) {
        const old = await prisma.player.findUnique({ where: { id: r.impostorId } });
        const sub = await prisma.player.findFirst({
          where: {
            verificationStatus: 'verified',
            notabilityTier: old?.notabilityTier ?? 'T2',
            id: { notIn: [...inLevel] as string[] },
            spells: {
              some: { club: { countryId: club.countryId }, verificationStatus: 'verified' },
              none: { clubId: r.clubId, verificationStatus: { not: 'rejected' } },
            },
          },
          orderBy: { canonicalName: 'asc' },
        });
        if (!sub) return null;
        r.impostorId = sub.id;
        inLevel.add(sub.id);
      }
    }
    return { rounds };
  }
  // Grid: swap the row (then the column) criterion of each failing cell for one that other
  // published grids use, keeping the first combination that passes.
  const pool = new Map<string, Crit>();
  for (const c of await prisma.challenge.findMany({
    where: { gameMode: 'FOOTBALL_GRID', status: 'published' },
    select: { snapshot: true },
  }))
    for (const x of [
      ...((c.snapshot as Snap).rows as Crit[]),
      ...((c.snapshot as Snap).cols as Crit[]),
    ])
      pool.set(JSON.stringify(crit(x)), crit(x));
  for (const i of failingRounds(reasons)) {
    for (const [axis, k] of [
      ['rows', Math.floor(i / 3)],
      ['cols', i % 3],
    ] as const) {
      const taken = new Set([...params.rows, ...params.cols].map((x: Crit) => JSON.stringify(x)));
      for (const [key, c] of pool) {
        if (taken.has(key)) continue;
        const next = {
          ...params,
          [axis]: params[axis].map((x: Crit, j: number) => (j === k ? c : x)),
        };
        if (!(await reasonsOf(mode, next, 2, id)).length) return next;
      }
    }
  }
  return null;
}

let fixed = 0;
const stuck: string[] = [];
const levels = await prisma.challenge.findMany({
  where: {
    status: 'published',
    gameMode: { in: ['CAREER_PATH', 'FOOTBALL_GRID', 'IMPOSTOR', 'TIMELINE'] },
  },
  orderBy: [{ gameMode: 'asc' }, { publicNumber: 'asc' }],
});
for (const c of levels) {
  const mode = c.gameMode as GameModeCode;
  const tier = c.difficultyTier as 1 | 2 | 3;
  let params = paramsOf(mode, c.snapshot as Snap);
  let reasons = await reasonsOf(mode, params, tier, c.id);
  if (!reasons.length) continue;
  // Several failing parts: fix, recheck, repeat (a few passes at most).
  for (let pass = 0; pass < 3 && reasons.length; pass++) {
    const next = await fix(mode, params, reasons, c.id);
    if (!next) break;
    params = next;
    reasons = await reasonsOf(mode, params, tier, c.id);
  }
  if (reasons.length) {
    stuck.push(`${mode} ${c.publicNumber}: ${reasons.join(',')}`);
    continue;
  }
  if (DRY) {
    fixed++;
    continue;
  }
  const { replacement } = await retireChallenge(
    prisma,
    c.id,
    'Jogador deixou de estar conferido; parte da fase trocada',
    { params, difficultyTier: tier },
    'ai-curator',
  );
  await validateChallenge(prisma, replacement!.id);
  await publishChallenge(prisma, replacement!.id, new Date());
  fixed++;
}
console.log(`${DRY ? 'would fix' : 'fixed'} ${fixed} levels; stuck ${stuck.length}`);
for (const s of stuck) console.log('  ', s);
await prisma.$disconnect();
