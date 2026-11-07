// Builds and publishes Conexões levels (ADR-011): 4 groups of 4 players (two clubs, a national
// team and a final's starting XI, mixed per level), every player fitting only his group.
// Famous players first; a player appears in at most 4 levels. Re-runnable: appends up to --levels.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-connections.ts [--levels 100]
import { createHash } from 'node:crypto';
import { createPrisma } from '../../apps/api/src/db';
import {
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import {
  fits,
  type GroupCriterion,
} from '../../apps/api/src/modules/challenges/connections-snapshot';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const i = process.argv.indexOf('--levels');
const TARGET = i > 0 ? Number(process.argv[i + 1]) : 100;
const hash = (s: string) => createHash('sha1').update(s).digest('hex');
const TIERS = ['T1', 'T2', 'T3', 'T4'] as const;

const existing = await prisma.challenge.findMany({
  where: { gameMode: 'CONNECTIONS', status: { in: ['draft', 'validated', 'published'] } },
});
const uses = new Map<string, number>();
for (const c of existing)
  for (const g of (c.snapshot as { groups: { playerIds: string[] }[] }).groups)
    for (const id of g.playerIds) uses.set(id, (uses.get(id) ?? 0) + 1);
const usedCriteria = new Set<string>();
const live = existing.filter((c) => c.status === 'published').length;

// Criteria pools.
const clubRows = await prisma.careerSpell.groupBy({
  by: ['clubId'],
  where: {
    verificationStatus: 'verified',
    player: { verificationStatus: 'verified', notabilityTier: { in: ['T1', 'T2'] } },
  },
  _count: { playerId: true },
  orderBy: { _count: { playerId: 'desc' } },
  take: 120,
});
// "United Kingdom" is a citizenship, not a national team.
const uk = await prisma.country.findUnique({ where: { isoCode: 'GB' }, select: { id: true } });
const nations = await prisma.player.groupBy({
  by: ['nationalityCountryId'],
  where: {
    verificationStatus: 'verified',
    notabilityTier: { in: ['T1', 'T2'] },
    ...(uk ? { nationalityCountryId: { not: uk.id } } : {}),
  },
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
  take: 30,
});
// Final XIs with how many famous (T1/T2) players they have: early levels use famous ones.
const sides = (
  await prisma.match.findMany({
    where: { source: 'wikipedia' },
    include: {
      lineups: {
        where: { starter: true, playerId: { not: null } },
        select: { side: true, playerId: true },
      },
    },
  })
).flatMap((m) =>
  (['home', 'away'] as const)
    .filter((s) => m.lineups.filter((l) => l.side === s).length >= 8)
    .map((side) => ({
      type: 'match' as const,
      matchId: m.id,
      side,
      ids: m.lineups.filter((l) => l.side === side).map((l) => l.playerId!),
    })),
);
const famous = new Set(
  (
    await prisma.player.findMany({
      where: { notabilityTier: { in: ['T1', 'T2'] }, verificationStatus: 'verified' },
      select: { id: true },
    })
  ).map((p) => p.id),
);
const fameOf = (s: { ids: string[] }) => s.ids.filter((id) => famous.has(id)).length;
const pools: Record<string, GroupCriterion[]> = {
  club: clubRows.map((r) => ({ type: 'club' as const, clubId: r.clubId })),
  nationality: nations.map((n) => ({
    type: 'nationality' as const,
    countryId: n.nationalityCountryId,
  })),
  match: sides.map(({ type, matchId, side }) => ({ type, matchId, side })),
};
console.log(
  `Conexões: ${live} live; ${pools.club!.length} clubs, ${pools.nationality!.length} nations, ${sides.length} XIs`,
);

async function candidates(c: GroupCriterion, maxTier: number) {
  const tier = { in: TIERS.slice(0, maxTier) as unknown as ('T1' | 'T2' | 'T3' | 'T4')[] };
  const rows =
    c.type === 'club'
      ? await prisma.player.findMany({
          where: {
            verificationStatus: 'verified',
            notabilityTier: tier,
            spells: { some: { clubId: c.clubId, verificationStatus: 'verified' } },
          },
          select: { id: true },
        })
      : c.type === 'nationality'
        ? await prisma.player.findMany({
            where: {
              verificationStatus: 'verified',
              notabilityTier: tier,
              nationalityCountryId: c.countryId,
            },
            select: { id: true },
          })
        : c.type === 'match'
          ? (
              await prisma.matchLineup.findMany({
                where: { matchId: c.matchId, side: c.side, starter: true, playerId: { not: null } },
                select: { playerId: true },
              })
            ).map((l) => ({ id: l.playerId! }))
          : [];
  return rows
    .map((r) => r.id)
    .filter((id) => (uses.get(id) ?? 0) < 4)
    .sort((a, b) => (uses.get(a) ?? 0) - (uses.get(b) ?? 0) || (hash(a) < hash(b) ? -1 : 1));
}

const SHAPES = [
  ['club', 'club', 'nationality', 'match'],
  ['club', 'club', 'club', 'match'],
  ['club', 'club', 'match', 'match'],
  ['club', 'club', 'club', 'nationality'],
  ['club', 'club', 'club', 'club'],
];
let made = 0;
for (let level = live + 1, tries = 0; level <= TARGET && tries < TARGET * 20; tries++) {
  const maxTier = level <= 20 ? 2 : level <= 60 ? 3 : 4;
  const shape = SHAPES[(level + tries) % SHAPES.length]!;
  const taken = new Set<string>();
  const crits = shape.map((t, k) => {
    const minFame = maxTier === 2 ? 6 : maxTier === 3 ? 3 : 0;
    const base =
      t === 'match' ? pools.match!.filter((_, k) => fameOf(sides[k]!) >= minFame) : pools[t]!;
    const pool = base.filter(
      (c) => !taken.has(JSON.stringify(c)) && !usedCriteria.has(JSON.stringify(c)),
    );
    const list = pool.length ? pool : base.filter((c) => !taken.has(JSON.stringify(c)));
    const c = list[Number.parseInt(hash(`${level}:${tries}:${k}`).slice(0, 8), 16) % list.length]!;
    taken.add(JSON.stringify(c));
    return c;
  });
  const groups: { criterion: GroupCriterion; playerIds: string[] }[] = [];
  const inLevel = new Set<string>();
  for (const [k, c] of crits.entries()) {
    const picked: string[] = [];
    // Famous players first; the rest only when the famous ones clash with other groups.
    const first = await candidates(c, maxTier);
    const more = maxTier < 4 ? (await candidates(c, 4)).filter((id) => !first.includes(id)) : [];
    for (const id of [...first, ...more].slice(0, 80)) {
      if (inLevel.has(id)) continue;
      let clash = false;
      for (const [o, other] of crits.entries())
        if (o !== k && (await fits(prisma, id, other))) {
          clash = true;
          break;
        }
      if (clash) continue;
      picked.push(id);
      inLevel.add(id);
      if (picked.length === 4) break;
    }
    if (picked.length < 4) {
      if (process.env.DEBUG)
        console.log(`level ${level} try ${tries}: ${c.type} got ${picked.length}`);
      break;
    }
    groups.push({ criterion: c, playerIds: picked });
  }
  if (groups.length < 4) continue;
  try {
    const draft = await createChallenge(prisma, {
      mode: 'CONNECTIONS',
      params: { groups },
      difficultyTier: maxTier === 2 ? 1 : maxTier === 3 ? 2 : 3,
      createdBy: 'ai-curator',
    });
    await validateChallenge(prisma, draft.id);
    await publishChallenge(prisma, draft.id, new Date());
    for (const id of inLevel) uses.set(id, (uses.get(id) ?? 0) + 1);
    for (const c of crits) usedCriteria.add(JSON.stringify(c));
    made++;
    level++;
  } catch (e) {
    console.log(`level ${level}: ${(e as Error).message.slice(0, 120)}`);
  }
}
console.log(`Conexões: published ${made} new levels (${live + made} in the track)`);
await prisma.$disconnect();
