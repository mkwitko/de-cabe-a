// Enrich players/spells from dcaribou/transfermarkt-datasets (scraped Transfermarkt data; see
// DATA_SOURCES.md for the legal note). Reads CSVs from a gitignored cache dir; never commit them.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/import-transfermarkt.ts [--dry] [--all] [--download]
//   --download  fetch the tables into scripts/research/.cache/transfermarkt first
//   --dry       no writes, only counts
//   --all       skip the Brazil scope (Brazilian citizen or a Brazilian club spell)
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { gunzipSync } from 'node:zlib';
import { createPrisma } from '../../apps/api/src/db';
import { importTransfermarkt } from '../../apps/api/src/modules/data-import/transfermarkt-import';
import { parseCsv } from '../../apps/api/src/modules/data-import/transfermarkt-mapper';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const url = process.env.DATABASE_URL!;
// Local dev DB only: refuse anything that is not localhost.
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url))
  throw new Error('DATABASE_URL is not local; aborting');

const dir = new URL('./.cache/transfermarkt/', import.meta.url);
const TABLES = ['players', 'transfers', 'clubs', 'competitions'] as const;
const BASE = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data';
if (process.argv.includes('--download')) {
  mkdirSync(dir, { recursive: true });
  for (const t of TABLES) {
    const r = await fetch(`${BASE}/${t}.csv.gz`);
    if (!r.ok || !r.body) throw new Error(`${t}: HTTP ${r.status}`);
    await pipeline(r.body as never, createWriteStream(new URL(`${t}.csv.gz`, dir)));
  }
}
const read = (t: string) => {
  const f = new URL(`${t}.csv.gz`, dir);
  if (!existsSync(f)) throw new Error(`missing ${f.pathname}; run with --download`);
  return parseCsv(gunzipSync(readFileSync(f)).toString('utf8'));
};

const prisma = createPrisma(url);
const dryRun = process.argv.includes('--dry');
const r = await importTransfermarkt(
  prisma,
  {
    players: read('players'),
    transfers: read('transfers'),
    clubs: read('clubs'),
    competitions: read('competitions'),
  },
  { dryRun, scopeBrazil: !process.argv.includes('--all') },
);
const top = [...r.unmatchedClubs].sort((a, b) => b[1] - a[1]);
console.log(dryRun ? '[dry run]' : '[written]', {
  ...r,
  unmatchedClubs: top.length,
  diffSample: undefined,
});
console.log('top unmatched clubs', top.slice(0, 25));
console.log('diff sample', r.diffSample.slice(0, 12));
await prisma.$disconnect();
