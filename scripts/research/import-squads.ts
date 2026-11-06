// Completes the knowledge base for the Grid (FOOTBALL_GRID.md, revision 2026-11-05): imports from
// Wikidata every player who played for the clubs our levels use, not only the best known ones.
// Imported data is Wikidata only (status imported): good enough to accept a Grid answer, never
// used to build a Career Path level. Re-runnable: players already in the base are skipped.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/import-squads.ts [--min 10] [--clubs 400]
import { createPrisma } from '../../apps/api/src/db';
import { importWikidataPlayers } from '../../apps/api/src/modules/data-import/import.service';
import { fetchEntities, sparql } from '../../apps/api/src/modules/data-import/wikidata-client';

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
const MIN = arg('--min', 10);
const MAX_CLUBS = arg('--clubs', 1000);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

// Clubs with at least MIN verified players, Brazilian clubs first, then by size.
const clubs = await prisma.$queryRaw<{ wikidataId: string; shortName: string }[]>`
  SELECT c."wikidataId", c."shortName"
  FROM "Club" c
  JOIN "Country" k ON k.id = c."countryId"
  JOIN "CareerSpell" cs ON cs."clubId" = c.id
  JOIN "Player" p ON p.id = cs."playerId" AND p."verificationStatus" = 'verified'
  WHERE c."wikidataId" IS NOT NULL
  GROUP BY c.id, k."isoCode"
  HAVING COUNT(DISTINCT p.id) >= ${MIN}
  ORDER BY (k."isoCode" = 'BR') DESC, COUNT(DISTINCT p.id) DESC
  LIMIT ${MAX_CLUBS}`;
log(`${clubs.length} clubs`);

const known = new Set(
  (
    await prisma.player.findMany({
      where: { wikidataId: { not: null } },
      select: { wikidataId: true },
    })
  ).map((p) => p.wikidataId!),
);
// Clubs and countries repeat across batches: fetch each entity once (Wikidata ≤ 1 req/s).
const cache = new Map<string, Awaited<ReturnType<typeof fetchEntities>>[string]>();
// Player entities (the batch itself) are big and never asked twice, so they are not kept.
let batchIds = new Set<string>();
const cachedFetch: typeof fetchEntities = async (ids) => {
  if (ids.every((id) => batchIds.has(id))) return fetchEntities(ids);
  const missing = ids.filter((id) => !cache.has(id));
  if (missing.length)
    for (const [id, e] of Object.entries(await fetchEntities(missing))) cache.set(id, e);
  return Object.fromEntries(ids.flatMap((id) => (cache.has(id) ? [[id, cache.get(id)!]] : [])));
};
let created = 0;
for (const [n, club] of clubs.entries()) {
  // Every human who was a member of the club's team (P54); association footballers only.
  // Network hiccups are retried; a club that still fails is picked up by the next run.
  let rows: Awaited<ReturnType<typeof sparql>> = [];
  for (let tries = 0; tries < 4; tries++) {
    try {
      rows = await sparql(`SELECT DISTINCT ?p WHERE {
        ?p wdt:P54 wd:${club.wikidataId}; wdt:P31 wd:Q5; wdt:P106 wd:Q937857.
      }`);
      break;
    } catch (e) {
      log(`  ${club.shortName}: ${(e as Error).message.slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
    }
  }
  const fresh = rows.map((r) => r.p!.value.split('/').pop()!).filter((q) => !known.has(q));
  for (let i = 0; i < fresh.length; i += 50) {
    const batch = fresh.slice(i, i + 50);
    batchIds = new Set(batch);
    try {
      const out = await importWikidataPlayers(prisma, batch, cachedFetch);
      created += out.created.length;
    } catch (e) {
      log(`  ${club.shortName} batch failed: ${String((e as Error).message || e).slice(0, 300)}`);
    }
    for (const q of batch) known.add(q);
  }
  log(
    `${n + 1}/${clubs.length} ${club.shortName}: ${rows.length} in Wikidata, ${fresh.length} new (total created ${created})`,
  );
}
log('players in the base:', await prisma.player.count());
await prisma.$disconnect();
