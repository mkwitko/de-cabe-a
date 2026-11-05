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
console.log('e2e seed ready');
await prisma.$disconnect();
