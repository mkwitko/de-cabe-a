// Builds and publishes the level tracks (ADR-006, ADR-007): Career Path and Grid levels in
// rising difficulty, through the same services and eligibility checks as the admin panel.
// Re-runnable: published levels stay, new ones are appended up to the targets.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-levels.ts [--cp 60] [--grid 30]
import { checkGridCombination, type Criterion } from '../../packages/engine/src/index';
import { createPrisma } from '../../apps/api/src/db';
import {
  careerPathEligibility,
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import type { CriterionParam } from '../../apps/api/src/modules/challenges/grid-snapshot';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
};
const CP_TARGET = arg('--cp', 60);
const GRID_TARGET = arg('--grid', 30);
const by = 'ai-curator';

/** Deterministic pseudo-random from a string, so re-runs pick the same order. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const shuffle = <T>(xs: T[], rnd: () => number) =>
  xs
    .map((x) => [rnd(), x] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, x]) => x);

async function live(input: Parameters<typeof createChallenge>[1]) {
  const c = await createChallenge(prisma, input);
  await validateChallenge(prisma, c.id);
  return publishChallenge(prisma, c.id, new Date());
}

// ── Career Path: every eligible verified player not yet used, easiest first.
const players = await prisma.player.findMany({
  where: { verificationStatus: 'verified' },
  select: { id: true, canonicalName: true, notabilityTier: true },
});
const pool: { id: string; name: string; tier: number; notability: string }[] = [];
for (const p of players) {
  const r = await careerPathEligibility(prisma, p.id);
  if (r.eligible)
    pool.push({
      id: p.id,
      name: p.canonicalName,
      tier: r.suggestedDifficulty,
      notability: p.notabilityTier,
    });
}
console.log(`Career Path: ${pool.length} eligible players not used yet`);
const rndCp = seeded('cp');
const ordered = shuffle(pool, rndCp).sort(
  (a, b) => a.tier - b.tier || a.notability.localeCompare(b.notability),
);
const cpLive = await prisma.challenge.count({
  where: { gameMode: 'CAREER_PATH', status: 'published' },
});
let cpNew = 0;
for (const p of ordered.slice(0, Math.max(0, CP_TARGET - cpLive))) {
  try {
    await live({ mode: 'CAREER_PATH', params: { playerId: p.id }, createdBy: by });
    cpNew++;
  } catch (e) {
    console.log(`  skip ${p.name}: ${(e as Error).message}`);
  }
}
console.log(`Career Path: published ${cpNew} new levels (${cpLive + cpNew} in the track)`);

// ── Football Grid: score random grids in memory, publish the varied ones that pass.
const verified = await prisma.player.findMany({
  where: { verificationStatus: 'verified' },
  include: {
    spells: {
      where: { verificationStatus: 'verified', spellType: { in: ['professional', 'loan'] } },
      include: { club: true },
    },
  },
});
const facts = verified.map((p) => ({
  id: p.id,
  nat: new Set(
    [p.nationalityCountryId, p.secondaryNationalityCountryId].filter(Boolean) as string[],
  ),
  pos: p.primaryPositionGroup,
  clubs: new Set(p.spells.map((s) => s.clubId)),
  countries: new Set(p.spells.map((s) => s.club.countryId)),
}));
const clubCount = new Map<string, number>();
for (const f of facts) for (const c of f.clubs) clubCount.set(c, (clubCount.get(c) ?? 0) + 1);
const clubs = await prisma.club.findMany({ where: { verificationStatus: 'verified' } });
const bigClubs = clubs.filter((c) => (clubCount.get(c.id) ?? 0) >= 10);
const countries = await prisma.country.findMany({
  where: {
    isoCode: {
      in: [
        'BR',
        'AR',
        'IT',
        'ES',
        'PT',
        'GB',
        'FR',
        'DE',
        'NL',
        'JP',
        'SA',
        'MX',
        'US',
        'TR',
        'RU',
        'UY',
      ],
    },
  },
});
const iso = new Map(countries.map((c) => [c.id, c.isoCode]));
const clubCountry = Object.fromEntries(clubs.map((c) => [c.id, c.countryId]));

const others: CriterionParam[] = [
  ...(['DF', 'MF', 'FW'] as const).map((positionGroup) => ({
    type: 'position' as const,
    positionGroup,
  })),
  ...countries
    .filter((c) => c.isoCode !== 'BR')
    .map((c) => ({ type: 'played_in_country' as const, countryId: c.id })),
  ...countries
    .filter((c) => ['AR', 'UY', 'PT'].includes(c.isoCode))
    .map((c) => ({ type: 'nationality' as const, countryId: c.id })),
];
const asCriterion = (c: CriterionParam): Criterion =>
  c.type === 'club'
    ? { type: 'club', clubId: c.clubId, label: '' }
    : c.type === 'position'
      ? { type: 'position', positionGroup: c.positionGroup, label: '' }
      : { type: c.type, countryId: c.countryId, label: '', flagCode: iso.get(c.countryId) ?? '' };
const matches = (c: CriterionParam, f: (typeof facts)[number]) =>
  c.type === 'club'
    ? f.clubs.has(c.clubId)
    : c.type === 'position'
      ? f.pos === c.positionGroup
      : c.type === 'nationality'
        ? f.nat.has(c.countryId)
        : f.countries.has(c.countryId);
const key = (c: CriterionParam) => JSON.stringify(c);

const rnd = seeded('grid');
const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;
const found: { rows: CriterionParam[]; cols: CriterionParam[]; min: number }[] = [];
const seen = new Set<string>();
for (let tries = 0; tries < 60_000 && found.length < GRID_TARGET * 3; tries++) {
  const club = () => ({ type: 'club' as const, clubId: pick(bigClubs).id });
  const third = () => (rnd() < 0.5 ? club() : pick(others));
  const rows = [club(), club(), third()];
  const cols = [club(), club(), third()];
  const all = [...rows, ...cols];
  if (new Set(all.map(key)).size !== 6) continue;
  if (checkGridCombination(rows.map(asCriterion), cols.map(asCriterion), clubCountry).length)
    continue;
  const counts = rows.flatMap((r) =>
    cols.map((c) => facts.filter((f) => matches(r, f) && matches(c, f)).length),
  );
  const min = Math.min(...counts);
  if (min < 8) continue;
  const sig = [...all.map(key)].sort().join('|');
  if (seen.has(sig)) continue;
  seen.add(sig);
  found.push({ rows, cols, min });
}
console.log(
  `Grid: ${found.length} candidate grids with ≥ 8 answers per cell (${bigClubs.length} clubs with ≥ 10 verified players)`,
);

// Prefer variety: greedy pick that penalises reusing the same criteria.
const usage = new Map<string, number>();
const ordered2: typeof found = [];
const rest = [...found];
while (rest.length) {
  rest.sort((a, b) => {
    const cost = (g: (typeof found)[number]) =>
      [...g.rows, ...g.cols].reduce((s, c) => s + (usage.get(key(c)) ?? 0), 0);
    return cost(a) - cost(b) || b.min - a.min;
  });
  const g = rest.shift()!;
  ordered2.push(g);
  for (const c of [...g.rows, ...g.cols]) usage.set(key(c), (usage.get(key(c)) ?? 0) + 1);
}
// Easier grids (bigger pools) first.
ordered2.sort((a, b) => b.min - a.min);
const gridLive = await prisma.challenge.count({
  where: { gameMode: 'FOOTBALL_GRID', status: 'published' },
});
let gridNew = 0;
for (const g of ordered2.slice(0, Math.max(0, GRID_TARGET - gridLive))) {
  try {
    await live({
      mode: 'FOOTBALL_GRID',
      params: { rows: g.rows as never, cols: g.cols as never },
      createdBy: by,
    });
    gridNew++;
  } catch (e) {
    console.log(`  grid skip: ${(e as Error).message}`);
  }
}
console.log(`Grid: published ${gridNew} new levels (${gridLive + gridNew} in the track)`);
await prisma.$disconnect();
