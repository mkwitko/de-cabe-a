// Adds every Wikidata position (P413) as a secondary position, next to the ones read from the
// Wikipedia infobox. Kaká's pt infobox says only "meio-campista"; Wikidata adds "winger" (FW).
// The main position never changes here. Re-runnable.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/merge-wikidata-positions.ts [--verified]
import { createPrisma } from '../../apps/api/src/db';
import { fetchEntities } from '../../apps/api/src/modules/data-import/wikidata-client';
import { positionGroup } from '../../apps/api/src/modules/data-import/wikidata-mapper';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
type Group = 'GK' | 'DF' | 'MF' | 'FW';

// Verified players first: they are the ones Career Path levels are built from.
const players = await prisma.player.findMany({
  where: {
    wikidataId: { not: null },
    verificationStatus: process.argv.includes('--verified') ? 'verified' : { not: 'rejected' },
  },
  select: { id: true, wikidataId: true, primaryPositionGroup: true, secondaryPositionGroups: true },
  orderBy: { verificationStatus: 'desc' },
});
log(`${players.length} players`);
const groupOf = new Map<string, Group | null>();
let changed = 0;
for (let i = 0; i < players.length; i += 50) {
  const batch = players.slice(i, i + 50);
  let entities: Awaited<ReturnType<typeof fetchEntities>> = {};
  for (let tries = 0; tries < 4; tries++) {
    try {
      entities = await fetchEntities(batch.map((p) => p.wikidataId!));
      break;
    } catch (e) {
      log(`  batch ${i}: ${(e as Error).message.slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
    }
  }
  const qidsOf = (qid: string) =>
    (entities[qid]?.claims?.P413 ?? []).flatMap((c) => {
      const v = c.mainsnak.datavalue?.value as { id?: string } | undefined;
      return v?.id ? [v.id] : [];
    });
  const unknown = [...new Set(batch.flatMap((p) => qidsOf(p.wikidataId!)))].filter(
    (q) => !groupOf.has(q),
  );
  if (unknown.length)
    for (const [q, e] of Object.entries(await fetchEntities(unknown)))
      groupOf.set(q, positionGroup(e.labels?.en?.value ?? ''));
  for (const p of batch) {
    const extra = qidsOf(p.wikidataId!).flatMap((q) => groupOf.get(q) ?? []);
    const secondary = [...new Set([...p.secondaryPositionGroups, ...extra])].filter(
      (g) => g !== p.primaryPositionGroup,
    ) as Group[];
    if (p.primaryPositionGroup && secondary.join() !== p.secondaryPositionGroups.join()) {
      await prisma.player.update({
        where: { id: p.id },
        data: { secondaryPositionGroups: secondary },
      });
      changed++;
    }
  }
  if ((i / 50) % 100 === 0) log(`${i + batch.length}/${players.length}, ${changed} changed`);
}
log(`done: ${changed} players got secondary positions`);
await prisma.$disconnect();
