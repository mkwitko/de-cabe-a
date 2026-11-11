/**
 * Deterministic data for the Playwright e2e (TEST_STRATEGY.md §3): two levels per game track.
 * Synthetic test data, not editorial content.
 * Run: DATABASE_URL=<e2e db> tsx src/test/e2e-seed.ts (after prisma migrate deploy).
 */
import { createPrisma } from '../db';
import { seedReference } from '../seed-reference';
import {
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../modules/challenges/challenges.service';
import { countryIds, verifiedClubs, verifiedPlayer } from './factory';
import { DRAFT_SLOTS } from '@decabeca/engine';

const url = process.env.DATABASE_URL;
if (!url?.includes('e2e'))
  throw new Error('Refusing to seed: DATABASE_URL must point to an e2e database.');
const prisma = createPrisma(url);

const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
);
await prisma.$executeRawUnsafe(
  `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`,
);
await seedReference(prisma);
const clubs = await verifiedClubs(prisma);
const countries = await countryIds(prisma);
const c = (n: string) => clubs[n]!.id;

const ronaldo = await verifiedPlayer(prisma, {
  name: 'Ronaldo',
  clubIds: [
    c('Cruzeiro'),
    c('PSV'),
    c('Barcelona'),
    c('Inter de Milão'),
    c('Real Madrid'),
    c('Milan'),
    c('Corinthians'),
  ],
  nationalityId: countries.BR!,
  position: 'FW',
  tier: 'T1',
  birthYear: 1976,
  aliases: ['Ronaldo Fenômeno', 'R9'],
});
await verifiedPlayer(prisma, {
  name: 'Romário',
  clubIds: [c('Vasco'), c('PSV'), c('Barcelona'), c('Flamengo')],
  nationalityId: countries.BR!,
  position: 'FW',
  tier: 'T1',
});
const kaka = await verifiedPlayer(prisma, {
  name: 'Kaká',
  clubIds: [c('São Paulo'), c('Milan'), c('Real Madrid')],
  nationalityId: countries.BR!,
  position: 'MF',
  tier: 'T1',
  birthYear: 1982,
});

// Grid: rows Flamengo, Santos, forwards; cols Milan, Real Madrid, Argentines. 8 synthetic players per cell.
const rows = [{ club: 'Flamengo' }, { club: 'Santos' }, { position: 'FW' as const }];
const cols = [{ club: 'Milan' }, { club: 'Real Madrid' }, { nationality: 'AR' }];
for (const [ri, r] of rows.entries())
  for (const [ci, col] of cols.entries())
    for (let i = 1; i <= 8; i++)
      await verifiedPlayer(prisma, {
        name: `Craque L${ri + 1}C${ci + 1} ${i}`,
        clubIds: [r.club, col.club].filter((x): x is string => !!x).map(c),
        nationalityId: col.nationality ? countries.AR! : countries.BR!,
        position: r.position ?? 'DF',
        tier: i === 1 ? 'T1' : 'T3',
      });
const grid = {
  rows: [
    { type: 'club' as const, clubId: c('Flamengo') },
    { type: 'club' as const, clubId: c('Santos') },
    { type: 'position' as const, positionGroup: 'FW' as const },
  ] as const,
  cols: [
    { type: 'club' as const, clubId: c('Milan') },
    { type: 'club' as const, clubId: c('Real Madrid') },
    { type: 'nationality' as const, countryId: countries.AR! },
  ] as const,
};

async function live(input: Parameters<typeof createChallenge>[1]) {
  const ch = await createChallenge(prisma, input);
  await validateChallenge(prisma, ch.id);
  await publishChallenge(prisma, ch.id, new Date());
}
// Tracks: Career Path levels 1–2, Grid levels 1–2 (ADR-007).
await live({ mode: 'CAREER_PATH', params: { playerId: ronaldo.id }, createdBy: 'e2e' });
await live({ mode: 'CAREER_PATH', params: { playerId: kaka.id }, createdBy: 'e2e' });
await live({
  mode: 'FOOTBALL_GRID',
  params: { rows: [...grid.rows], cols: [...grid.cols] },
  createdBy: 'e2e',
});
await live({
  mode: 'FOOTBALL_GRID',
  params: { rows: [...grid.rows], cols: [...grid.cols] },
  createdBy: 'e2e',
});
// A real-looking Série A season among the seed clubs: the Modo Carreira calendar comes from it.
const brClubs = [
  'Flamengo',
  'Santos',
  'Palmeiras',
  'Grêmio',
  'Vasco',
  'Botafogo',
  'Cruzeiro',
  'São Paulo',
]
  .map((n) => clubs[n]?.id)
  .filter((x): x is string => Boolean(x));
let k = 0;
await prisma.match.createMany({
  data: brClubs.flatMap((h) =>
    brClubs
      .filter((a) => a !== h)
      .map((a) => ({
        source: 'e2e',
        sourceRef: `e2e:${k++}`,
        competition: 'Brasileirão Série A',
        season: '2025',
        homeTeam: h,
        awayTeam: a,
        homeClubId: h,
        awayClubId: a,
        homeScore: k % 3,
        awayScore: k % 2,
      })),
  ),
});
// Escalação level 1: a final whose away XI mixes the seed stars and Grid players.
const xi = [
  ['Craque L1C1 2', 'GK'],
  ['Craque L1C1 3', 'RB'],
  ['Craque L1C1 4', 'CB'],
  ['Craque L1C1 5', 'CB'],
  ['Craque L1C1 6', 'LB'],
  ['Craque L1C1 7', 'DM'],
  ['Craque L1C1 8', 'CM'],
  ['Craque L1C1 1', 'CM'],
  ['Kaká', 'AM'],
  ['Romário', 'SS'],
  ['Ronaldo', 'CF'],
] as const;
const xiIds = new Map(
  (
    await prisma.player.findMany({
      where: { canonicalName: { in: xi.map(([n]) => n) } },
      select: { id: true, canonicalName: true },
    })
  ).map((p) => [p.canonicalName, p.id]),
);
const final = await prisma.match.create({
  data: {
    source: 'wikipedia',
    sourceRef: 'wikipedia:en:2002 FIFA World Cup final',
    competition: 'FIFA World Cup',
    season: '2002',
    stage: 'Final',
    homeTeam: 'Germany',
    awayTeam: 'Brazil',
    homeScore: 0,
    awayScore: 2,
    lineups: {
      create: xi.map(([name, position], i) => ({
        side: 'away',
        playerName: name,
        position,
        jersey: i + 1,
        starter: true,
        playerId: xiIds.get(name) ?? null,
      })),
    },
  },
});
await live({
  mode: 'MISSING_XI',
  params: { matchId: final.id, side: 'away' },
  difficultyTier: 1,
  createdBy: 'e2e',
});
// Craque Misterioso level 1: Kaká.
await live({ mode: 'MYSTERY_PLAYER', params: { playerId: kaka.id }, createdBy: 'e2e' });
// Conexões level 1: four groups of Grid players who fit only one club each.
const byName = async (n: string) =>
  (await prisma.player.findFirstOrThrow({ where: { canonicalName: n } })).id;
const four = (cell: string) => Promise.all([1, 2, 3, 4].map((i) => byName(`Craque ${cell} ${i}`)));
await live({
  mode: 'CONNECTIONS',
  params: {
    groups: [
      { criterion: { type: 'club', clubId: c('Milan') }, playerIds: await four('L3C1') },
      { criterion: { type: 'club', clubId: c('Real Madrid') }, playerIds: await four('L3C2') },
      { criterion: { type: 'club', clubId: c('Flamengo') }, playerIds: await four('L1C3') },
      { criterion: { type: 'club', clubId: c('Santos') }, playerIds: await four('L2C3') },
    ],
  },
  createdBy: 'e2e',
});
// Draft level 1: 11 matches, one per slot of the 4-3-3. The starter is "Craque L2C2 1..8" then
// "Craque L2C3 1..3"; the wrong options come from other Grid cells (e2e/draft.spec.ts).
const draftAnswers = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `Craque L2C2 ${i}`);
draftAnswers.push('Craque L2C3 1', 'Craque L2C3 2', 'Craque L2C3 3');
const decoyNames = ['L3C1', 'L3C2', 'L3C3', 'L2C1', 'L1C2'].flatMap((cell) =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `Craque ${cell} ${i}`),
);
const SLOT_CODE = { GK: 'GK', DF: 'CB', MF: 'CM', FW: 'CF' } as const;
const draftRounds = [];
for (const [i, slot] of DRAFT_SLOTS.entries()) {
  const playerId = await byName(draftAnswers[i]!);
  const m = await prisma.match.create({
    data: {
      source: 'wikipedia',
      sourceRef: `wikipedia:en:e2e draft ${i}`,
      competition: 'FIFA World Cup',
      season: String(1970 + i * 4),
      stage: 'Final',
      homeTeam: 'Brazil',
      awayTeam: 'Italy',
      homeScore: 1,
      awayScore: 0,
      lineups: {
        create: [
          {
            side: 'home',
            playerName: draftAnswers[i]!,
            position: SLOT_CODE[slot],
            starter: true,
            playerId,
          },
        ],
      },
    },
  });
  draftRounds.push({
    matchId: m.id,
    side: 'home' as const,
    playerId,
    decoyIds: await Promise.all(decoyNames.slice(i * 3, i * 3 + 3).map(byName)),
  });
}
await live({ mode: 'DRAFT', params: { rounds: draftRounds }, createdBy: 'e2e' });
// Quem fez mais? level 1: five duels at Flamengo. Side a has the games, side b the goals, so the
// goals duels (1, 3, 5) go to b and the games duels (2, 4) to a (e2e/higher-lower.spec.ts).
const hlRounds = [];
for (let i = 1; i <= 5; i++) {
  const [a, b] = await Promise.all([byName(`Craque L1C1 ${i}`), byName(`Craque L1C2 ${i}`)]);
  const at = (playerId: string) => ({ playerId, clubId: c('Flamengo') });
  // Close numbers and goals between same-position players (evenDuel, comparableGoals).
  await prisma.player.updateMany({
    where: { id: { in: [a, b] } },
    data: { primaryPositionGroup: 'FW' },
  });
  await prisma.careerSpell.updateMany({ where: at(a), data: { appearances: 100 + i, goals: 14 } });
  await prisma.careerSpell.updateMany({ where: at(b), data: { appearances: 60, goals: 20 + i } });
  hlRounds.push({ metric: i % 2 ? ('goals' as const) : ('games' as const), a: at(a), b: at(b) });
}
await live({ mode: 'HIGHER_LOWER', params: { rounds: hlRounds }, createdBy: 'e2e' });
console.log('e2e seed ready');
await prisma.$disconnect();
