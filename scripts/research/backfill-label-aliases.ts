// One-off: players imported before the mapper kept other-language labels as aliases miss the
// name fans use (Dida's pt label is "Nelson de Jesus Silva"). Adds the mul/en/es/it labels.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/backfill-label-aliases.ts
import { normalizeName } from '../../packages/engine/src/index';
import { createPrisma } from '../../apps/api/src/db';
import { fetchEntities } from '../../apps/api/src/modules/data-import/wikidata-client';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const players = await prisma.player.findMany({
  where: { wikidataId: { not: null }, verificationStatus: { not: 'rejected' } },
  select: { id: true, wikidataId: true },
});
const byQid = new Map(players.map((p) => [p.wikidataId!, p.id]));
const qids = [...byQid.keys()];
log(`${qids.length} players`);
let added = 0;
for (let i = 0; i < qids.length; i += 50) {
  const batch = qids.slice(i, i + 50);
  let entities: Awaited<ReturnType<typeof fetchEntities>> = {};
  for (let tries = 0; tries < 4; tries++) {
    try {
      entities = await fetchEntities(batch);
      break;
    } catch (e) {
      log(`  batch ${i}: ${(e as Error).message.slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
    }
  }
  const rows = Object.values(entities).flatMap((e) =>
    ['mul', 'en', 'es', 'it'].flatMap((lang) => {
      const alias = e.labels?.[lang]?.value;
      const normalized = alias ? normalizeName(alias) : '';
      return alias && normalized && byQid.has(e.id)
        ? [{ playerId: byQid.get(e.id)!, alias, normalized, kind: 'variant' as const }]
        : [];
    }),
  );
  added += (await prisma.playerAlias.createMany({ data: rows, skipDuplicates: true })).count;
  if ((i / 50) % 100 === 0) log(`${i + batch.length}/${qids.length}, ${added} aliases added`);
}
log(`done: ${added} aliases added`);
await prisma.$disconnect();
