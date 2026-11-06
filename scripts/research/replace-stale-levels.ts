// Replaces in place (ADR-002, revision 2026-11-06) the published Career Path levels whose frozen
// position no longer matches the player (main or secondary positions). Same player, same level
// number, same difficulty; attempts on the old version stay intact.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/replace-stale-levels.ts [--dry]
import { createPrisma } from '../../apps/api/src/db';
import {
  publishChallenge,
  retireChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const dry = process.argv.includes('--dry');

const levels = await prisma.challenge.findMany({
  where: { gameMode: 'CAREER_PATH', status: 'published' },
  orderBy: { publicNumber: 'asc' },
});
const shown = (h: { position?: string; secondaryPositions?: string[] }) =>
  [h.position, ...(h.secondaryPositions ?? [])].join('/');
for (const l of levels) {
  const snap = l.snapshot as {
    answerPlayerId: string;
    difficultyTier: 1 | 2 | 3;
    extraHints: { position?: string; secondaryPositions?: string[] };
  };
  const p = await prisma.player.findUniqueOrThrow({ where: { id: snap.answerPlayerId } });
  const now = [p.primaryPositionGroup, ...p.secondaryPositionGroups].join('/');
  if (shown(snap.extraHints) === now) continue;
  console.log(`fase ${l.publicNumber}: ${p.canonicalName} ${shown(snap.extraHints)} -> ${now}`);
  if (dry) continue;
  const { replacement } = await retireChallenge(
    prisma,
    l.id,
    `Posição corrigida: ${shown(snap.extraHints)} -> ${now}`,
    { params: { playerId: p.id }, difficultyTier: snap.difficultyTier },
    'curator',
  );
  await validateChallenge(prisma, replacement!.id);
  const published = await publishChallenge(prisma, replacement!.id, new Date());
  if (published.publicNumber !== l.publicNumber)
    throw new Error(`fase ${l.publicNumber} got number ${published.publicNumber}`);
}
await prisma.$disconnect();
