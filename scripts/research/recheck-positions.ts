// Re-reads the main position of every curator-verified player from the Wikipedia article the
// career was checked against (Player.notes), now that the infobox wins over Wikidata
// (Wikidata had Kaká only as "winger"). Prints the changes and the published levels affected.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/recheck-positions.ts
import { writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import {
  fetchWikitext,
  positionsFromInfobox,
  type WikiLang,
} from '../../apps/api/src/modules/data-import/wikipedia';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const players = await prisma.player.findMany({
  where: { verificationStatus: 'verified', notes: { contains: 'wikipedia.org/wiki/' } },
  select: {
    id: true,
    canonicalName: true,
    primaryPositionGroup: true,
    secondaryPositionGroups: true,
    notes: true,
  },
});
log(`${players.length} players`);
const changes: { id: string; name: string; from: string | null; to: string }[] = [];
for (const [i, p] of players.entries()) {
  const m = /https:\/\/(\w+)\.wikipedia\.org\/wiki\/(\S+)/.exec(p.notes ?? '');
  if (!m) continue;
  // Network hiccups (DNS, 5xx) are retried; a page that still fails is skipped, not fatal.
  let text: string | null = null;
  for (let tries = 0; tries < 4; tries++) {
    try {
      text = await fetchWikitext(m[1] as WikiLang, decodeURIComponent(m[2]!).replace(/_/g, ' '));
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
    }
  }
  const [position, ...secondary] = text ? positionsFromInfobox(text) : [];
  if (position && position !== p.primaryPositionGroup)
    changes.push({ id: p.id, name: p.canonicalName, from: p.primaryPositionGroup, to: position });
  if (
    position &&
    (position !== p.primaryPositionGroup || secondary.join() !== p.secondaryPositionGroups.join())
  )
    await prisma.player.update({
      where: { id: p.id },
      data: { primaryPositionGroup: position, secondaryPositionGroups: secondary },
    });
  if ((i + 1) % 200 === 0) log(`${i + 1}/${players.length}, ${changes.length} changed`);
}

// Career Path levels show the position from their (immutable) snapshot.
const levels = await prisma.challenge.findMany({
  where: { gameMode: 'CAREER_PATH', status: 'published' },
  select: { id: true, publicNumber: true, snapshot: true },
});
const changed = new Map(changes.map((c) => [c.id, c]));
const affected = levels.flatMap((l) => {
  const c = changed.get((l.snapshot as { answerPlayerId?: string }).answerPlayerId ?? '');
  return c ? [{ level: l.publicNumber, challengeId: l.id, ...c }] : [];
});
writeFileSync(
  new URL('./position-recheck.json', import.meta.url),
  JSON.stringify({ ranAt: new Date().toISOString(), changes, affectedLevels: affected }, null, 1) +
    '\n',
);
log(`${changes.length} positions changed; ${affected.length} published levels affected`);
for (const a of affected) log(`  fase ${a.level}: ${a.name} ${a.from} -> ${a.to}`);
await prisma.$disconnect();
