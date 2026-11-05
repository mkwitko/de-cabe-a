// Builds and publishes the pilot schedule (ADR-006): 30 days of dailies per game plus a practice
// pool, through the same services and eligibility checks as the admin panel. Re-runnable: dates
// that already have a live daily are skipped and players already used are not reused.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-pilot.ts [--days 30]
import { checkGridCombination, type Criterion } from '../../packages/engine/src/index';
import { createPrisma } from '../../apps/api/src/db';
import { addDays, civilDate } from '../../apps/api/src/modules/challenges/civil-date';
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
const daysArg = process.argv.indexOf('--days');
const DAYS = daysArg > 0 ? Number(process.argv[daysArg + 1]) : 30;
const CP_PRACTICE = 30;
const GRID_PRACTICE = 15;
const by = 'ai-curator';
const today = civilDate(new Date());

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

async function liveDaily(mode: 'CAREER_PATH' | 'FOOTBALL_GRID', date: string) {
  return prisma.challenge.findFirst({
    where: {
      gameMode: mode,
      kind: 'daily',
      scheduledFor: new Date(`${date}T00:00:00Z`),
      status: { not: 'retired' },
    },
  });
}

// ── Career Path
const players = await prisma.player.findMany({
  where: { verificationStatus: 'verified' },
  select: { id: true, canonicalName: true },
});
const used = new Set(
  (
    await prisma.challengePlayerUsage.findMany({
      where: { role: 'answer', challenge: { status: { not: 'retired' } } },
    })
  ).map((u) => u.playerId),
);
const pool: { id: string; name: string; daily: boolean; tier: 1 | 2 | 3 }[] = [];
for (const p of players) {
  const daily = await careerPathEligibility(prisma, p.id, 'daily');
  const practice = daily.eligible ? daily : await careerPathEligibility(prisma, p.id, 'practice');
  if (practice.eligible)
    pool.push({
      id: p.id,
      name: p.canonicalName,
      daily: daily.eligible,
      tier: daily.suggestedDifficulty,
    });
}
console.log(
  `Career Path: ${pool.length} eligible players (${pool.filter((p) => p.daily).length} for daily)`,
);
const free = shuffle(
  pool.filter((p) => !used.has(p.id)),
  seeded('cp'),
);

/** CAREER_PATH.md §9: Mon–Wed tier 1–2, Thu–Sat 2–3, Sun 1. */
const wanted = (date: string): number[] => {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return dow === 0 ? [1] : dow <= 3 ? [1, 2] : [2, 3];
};
let cpDaily = 0;
for (let d = 0; d < DAYS; d++) {
  const date = addDays(today, d);
  if (await liveDaily('CAREER_PATH', date)) continue;
  const i = free.findIndex((p) => p.daily && wanted(date).includes(p.tier));
  const j = i >= 0 ? i : free.findIndex((p) => p.daily);
  if (j < 0) break;
  const [pick] = free.splice(j, 1);
  try {
    await live({
      mode: 'CAREER_PATH',
      kind: 'daily',
      scheduledFor: date,
      params: { playerId: pick!.id },
      createdBy: by,
    });
    cpDaily++;
  } catch (e) {
    console.log(`  skip ${pick!.name} on ${date}: ${(e as Error).message}`);
  }
}
const practiceLive = await prisma.challenge.count({
  where: { gameMode: 'CAREER_PATH', kind: 'practice', status: 'published' },
});
let cpPractice = 0;
for (const p of free.slice(0, Math.max(0, CP_PRACTICE - practiceLive))) {
  await live({ mode: 'CAREER_PATH', kind: 'practice', params: { playerId: p.id }, createdBy: by });
  cpPractice++;
}
console.log(`Career Path: published ${cpDaily} dailies and ${cpPractice} practice challenges`);

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
for (let tries = 0; tries < 60_000 && found.length < DAYS + GRID_PRACTICE + 10; tries++) {
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
const ordered: typeof found = [];
const rest = [...found];
while (rest.length) {
  rest.sort((a, b) => {
    const cost = (g: (typeof found)[number]) =>
      [...g.rows, ...g.cols].reduce((s, c) => s + (usage.get(key(c)) ?? 0), 0);
    return cost(a) - cost(b) || b.min - a.min;
  });
  const g = rest.shift()!;
  ordered.push(g);
  for (const c of [...g.rows, ...g.cols]) usage.set(key(c), (usage.get(key(c)) ?? 0) + 1);
}
let gridDaily = 0;
let gridPractice = 0;
for (let d = 0; d < DAYS && ordered.length; d++) {
  const date = addDays(today, d);
  if (await liveDaily('FOOTBALL_GRID', date)) continue;
  const g = ordered.shift()!;
  try {
    await live({
      mode: 'FOOTBALL_GRID',
      kind: 'daily',
      scheduledFor: date,
      params: { rows: g.rows as never, cols: g.cols as never },
      createdBy: by,
    });
    gridDaily++;
  } catch (e) {
    console.log(`  grid skip on ${date}: ${(e as Error).message}`);
  }
}
const gridPracticeLive = await prisma.challenge.count({
  where: { gameMode: 'FOOTBALL_GRID', kind: 'practice', status: 'published' },
});
for (const g of ordered.slice(0, Math.max(0, GRID_PRACTICE - gridPracticeLive))) {
  await live({
    mode: 'FOOTBALL_GRID',
    kind: 'practice',
    params: { rows: g.rows as never, cols: g.cols as never },
    createdBy: by,
  });
  gridPractice++;
}
console.log(`Grid: published ${gridDaily} dailies and ${gridPractice} practice grids`);
await prisma.$disconnect();
