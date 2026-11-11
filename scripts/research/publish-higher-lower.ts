// Builds and publishes Mais ou Menos levels (ADR-011): 5 duels per level between two real spells
// (verified, with league games and goals), preferably at the same club, else in the same
// country; a clear winner only. Fame ramp like the other games. Re-runnable up to --levels.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-higher-lower.ts [--levels 100]
import { createPrisma } from '../../apps/api/src/db';
import {
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import { clearWinner } from '../../apps/api/src/modules/challenges/higher-lower-snapshot';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const i = process.argv.indexOf('--levels');
const TARGET = i > 0 ? Number(process.argv[i + 1]) : 100;

function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const rnd = seeded('higher-lower');

// Player × club totals from verified spells with stats (games ≥ 30 so the numbers mean something).
const rows = await prisma.$queryRaw<
  {
    playerId: string;
    clubId: string;
    countryId: string;
    tier: string;
    games: bigint;
    goals: bigint;
  }[]
>`
  SELECT s."playerId", s."clubId", c."countryId", p."notabilityTier" AS tier,
         SUM(s.appearances) AS games, SUM(s.goals) AS goals
  FROM "CareerSpell" s
  JOIN "Player" p ON p.id = s."playerId" AND p."verificationStatus" = 'verified'
  JOIN "Club" c ON c.id = s."clubId"
  WHERE s."verificationStatus" = 'verified' AND s."spellType" IN ('professional', 'loan')
  GROUP BY 1, 2, 3, 4
  HAVING bool_and(s.appearances IS NOT NULL AND s.goals IS NOT NULL) AND SUM(s.appearances) >= 30`;
const pool = rows.map((r) => ({
  ...r,
  games: Number(r.games),
  goals: Number(r.goals),
  tierN: Number(r.tier.slice(1)),
}));
const byClub = new Map<string, typeof pool>();
const byCountry = new Map<string, typeof pool>();
for (const r of pool) {
  byClub.set(r.clubId, [...(byClub.get(r.clubId) ?? []), r]);
  byCountry.set(r.countryId, [...(byCountry.get(r.countryId) ?? []), r]);
}

const existing = await prisma.challenge.findMany({
  where: { gameMode: 'HIGHER_LOWER', status: { in: ['draft', 'validated', 'published'] } },
});
// Duels already live are never drawn again. The draw is seeded, so without this every run (a
// --replace-unfair pass included) replays the same duels: level 2 once repeated 4 of level 1's.
const usedPairs = new Set<string>();
for (const c of existing)
  if (c.status === 'published')
    for (const r of (
      c.snapshot as { rounds?: { a: { playerId: string }; b: { playerId: string } }[] }
    ).rounds ?? [])
      usedPairs.add([r.a.playerId, r.b.playerId].sort().join());
const live = existing.filter((c) => c.status === 'published').length;
console.log(`Mais ou Menos: ${live} live, ${pool.length} player-club totals`);

function buildRounds(level: number) {
  const maxTier = level <= 20 ? 2 : level <= 60 ? 3 : 4;
  const fit = pool.filter((r) => r.tierN <= maxTier);
  const used = new Set<string>();
  const rounds = [];
  for (let tries = 0; rounds.length < 5 && tries < 500; tries++) {
    const a = fit[Math.floor(rnd() * fit.length)]!;
    if (used.has(a.playerId)) continue;
    const metric = rnd() < 0.5 ? ('goals' as const) : ('games' as const);
    const v = (x: typeof a) => (metric === 'goals' ? x.goals : x.games);
    if (metric === 'goals' && a.goals < 5) continue; // goals duels between defenders are dull
    const options = (
      byClub.get(a.clubId)!.length > 1 ? byClub.get(a.clubId)! : byCountry.get(a.countryId)!
    ).filter(
      (b) =>
        b.playerId !== a.playerId &&
        !used.has(b.playerId) &&
        b.tierN <= maxTier &&
        clearWinner(v(a), v(b)) &&
        !usedPairs.has([a.playerId, b.playerId].sort().join()),
    );
    if (!options.length) continue;
    const b = options[Math.floor(rnd() * options.length)]!;
    used.add(a.playerId);
    used.add(b.playerId);
    usedPairs.add([a.playerId, b.playerId].sort().join());
    rounds.push({
      metric,
      a: { playerId: a.playerId, clubId: a.clubId },
      b: { playerId: b.playerId, clubId: b.clubId },
    });
  }
  return { rounds, maxTier };
}

// --replace-unfair: published levels with a duel that fails the current fairness rule are
// replaced in place (same number) with new duels.
if (process.argv.includes('--replace-unfair')) {
  const { retireChallenge } =
    await import('../../apps/api/src/modules/challenges/challenges.service');
  // Also duels showing a club renamed by repair-club-names.ts (its old, wrong name).
  const renamed = new Set<string>();
  try {
    const { readFileSync } = await import('node:fs');
    const { changes } = JSON.parse(
      readFileSync(new URL('./club-name-repair.json', import.meta.url), 'utf8'),
    ) as { changes: { from: string; reason: string }[] };
    for (const ch of changes) if (ch.reason === 'wrong name') renamed.add(ch.from);
  } catch {
    /* no repair report: fairness only */
  }
  // --levels-to-replace 82,86: also these levels (e.g. no longer valid after a re-curation).
  const li = process.argv.indexOf('--levels-to-replace');
  const forced = new Set(li > 0 ? process.argv[li + 1]!.split(',').map(Number) : []);
  const published = await prisma.challenge.findMany({
    where: { gameMode: 'HIGHER_LOWER', status: 'published' },
    orderBy: { publicNumber: 'asc' },
  });
  let replaced = 0;
  for (const c of published) {
    const snap = c.snapshot as {
      rounds: { a: { value: number; clubName: string }; b: { value: number; clubName: string } }[];
    };
    const ok = (r: (typeof snap.rounds)[number]) =>
      clearWinner(r.a.value, r.b.value) && !renamed.has(r.a.clubName) && !renamed.has(r.b.clubName);
    if (snap.rounds.every(ok) && !forced.has(c.publicNumber!)) continue;
    const { rounds, maxTier } = buildRounds(c.publicNumber!);
    if (rounds.length < 5) continue;
    const { replacement } = await retireChallenge(
      prisma,
      c.id,
      snap.rounds.every(ok)
        ? 'Substituída a pedido (--levels-to-replace): duelos repetidos ou re-curadoria'
        : 'Duelo apertado demais (jogos/gols da Wikipédia podem ser só da liga ou de todas as competições)',
      { params: { rounds }, difficultyTier: maxTier === 2 ? 1 : maxTier === 3 ? 2 : 3 },
      'ai-curator',
    );
    await validateChallenge(prisma, replacement!.id);
    await publishChallenge(prisma, replacement!.id, new Date());
    replaced++;
  }
  console.log(`Mais ou Menos: replaced ${replaced} of ${published.length} levels in place`);
  await prisma.$disconnect();
  process.exit(0);
}

let made = 0;
for (let level = live + 1; level <= TARGET; level++) {
  const { rounds, maxTier } = buildRounds(level);
  if (rounds.length < 5) {
    console.log(`level ${level}: not enough duels, stopping`);
    break;
  }
  try {
    const draft = await createChallenge(prisma, {
      mode: 'HIGHER_LOWER',
      params: { rounds },
      difficultyTier: maxTier === 2 ? 1 : maxTier === 3 ? 2 : 3,
      createdBy: 'ai-curator',
    });
    await validateChallenge(prisma, draft.id);
    await publishChallenge(prisma, draft.id, new Date());
    made++;
  } catch (e) {
    console.log(`level ${level}: ${(e as Error).message.slice(0, 120)}`);
  }
}
console.log(`Mais ou Menos: published ${made} new levels (${live + made} in the track)`);
await prisma.$disconnect();
