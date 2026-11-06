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
const bigClubs = clubs.filter((c) => (clubCount.get(c.id) ?? 0) >= 8);
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
    .filter((c) => ['BR', 'AR', 'UY', 'PT'].includes(c.isoCode))
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

// Systematic search: count every pair of criteria once, then for each row triple keep the
// columns compatible with all three rows and build column triples from them.
const MIN = 8;
const criteria: CriterionParam[] = shuffle(
  [...bigClubs.map((c) => ({ type: 'club' as const, clubId: c.id })), ...others],
  seeded('criteria'),
);
const sets = criteria.map((c) => new Set(facts.filter((f) => matches(c, f)).map((f) => f.id)));
const pair = (a: number, b: number) => {
  let n = 0;
  for (const id of sets[a]!) if (sets[b]!.has(id)) n++;
  return n;
};
const counts = criteria.map((_, a) => criteria.map((__, b) => (a === b ? 0 : pair(a, b))));
const isClub = (i: number) => criteria[i]!.type === 'club';
const ok = (rows: number[], cols: number[]) =>
  checkGridCombination(
    rows.map((r) => asCriterion(criteria[r]!)),
    cols.map((c) => asCriterion(criteria[c]!)),
    clubCountry,
  ).length === 0;

const found: { rows: CriterionParam[]; cols: CriterionParam[]; min: number }[] = [];
const seen = new Set<string>();
const n = criteria.length;
outer: for (let a = 0; a < n; a++)
  for (let b = a + 1; b < n; b++)
    for (let c = b + 1; c < n; c++) {
      const rows = [a, b, c];
      if (!rows.some(isClub)) continue;
      const compatible = criteria
        .map((_, x) => x)
        .filter((x) => !rows.includes(x) && rows.every((r) => counts[r]![x]! >= MIN));
      let perRows = 0;
      colsLoop: for (let i = 0; i < compatible.length; i++)
        for (let j = i + 1; j < compatible.length; j++)
          for (let k = j + 1; k < compatible.length; k++) {
            const cols = [compatible[i]!, compatible[j]!, compatible[k]!];
            if (!cols.some(isClub) || !ok(rows, cols)) continue;
            const sig = [...rows, ...cols].sort((x, y) => x - y).join(',');
            if (seen.has(sig)) continue;
            seen.add(sig);
            const min = Math.min(...rows.flatMap((r) => cols.map((col) => counts[r]![col]!)));
            found.push({
              rows: rows.map((r) => criteria[r]!),
              cols: cols.map((col) => criteria[col]!),
              min,
            });
            if (found.length >= 200000) break outer;
            if (++perRows >= 1) break colsLoop;
          }
    }
console.log(
  `Grid: ${found.length} candidate grids with ≥ ${MIN} answers per cell (${criteria.length} criteria)`,
);

// Variety: a club appears in at most 7 grids, a broad criterion (position, country, nationality)
// in at most 20; then easier grids (bigger pools) first.
const maxUses = (k: string) => (k.includes('"club"') ? 7 : 20);
const usage = new Map<string, number>();
const ordered2: typeof found = [];
// Grids already in the track count towards usage and are never published twice.
const sigOf = (cs: CriterionParam[]) => cs.map(key).sort().join('|');
const publishedSigs = new Set<string>();
for (const c of await prisma.challenge.findMany({
  where: { gameMode: 'FOOTBALL_GRID', status: { in: ['draft', 'validated', 'published'] } },
})) {
  const snap = c.snapshot as { rows: Criterion[]; cols: Criterion[] };
  const params = [...snap.rows, ...snap.cols].map((x): CriterionParam =>
    x.type === 'club'
      ? { type: 'club', clubId: x.clubId }
      : x.type === 'position'
        ? { type: 'position', positionGroup: x.positionGroup }
        : { type: x.type, countryId: x.countryId },
  );
  publishedSigs.add(sigOf(params));
  for (const k of params.map(key)) usage.set(k, (usage.get(k) ?? 0) + 1);
}
for (const g of shuffle(found, seeded('variety'))) {
  const keys = [...g.rows, ...g.cols].map(key);
  if (publishedSigs.has(sigOf([...g.rows, ...g.cols]))) continue;
  publishedSigs.add(sigOf([...g.rows, ...g.cols]));
  if (keys.some((k) => (usage.get(k) ?? 0) >= maxUses(k))) continue;
  ordered2.push(g);
  for (const k of keys) usage.set(k, (usage.get(k) ?? 0) + 1);
}
ordered2.sort((a, b) => b.min - a.min);
console.log(`Grid: ${ordered2.length} varied grids selected`);
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
