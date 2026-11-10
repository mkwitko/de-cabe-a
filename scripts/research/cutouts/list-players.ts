// Players that get a cut-out portrait: every published Career Path answer, every player with a
// sticker in this database, plus the ids passed as arguments; only those with a Commons photo.
// Prints JSON lines for cutout.py (see README in cutout.py's docstring).
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/cutouts/list-players.ts [ids…] > players.jsonl
import { createPrisma } from '../../../apps/api/src/db';

try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);

const answers = await prisma.challenge.findMany({
  where: { gameMode: 'CAREER_PATH', status: 'published' },
  select: { snapshot: true },
});
const stickers = await prisma.sticker.findMany({
  select: { playerId: true },
  distinct: ['playerId'],
});
const ids = new Set([
  ...answers.map((c) => (c.snapshot as { answerPlayerId: string }).answerPlayerId),
  ...stickers.map((s) => s.playerId),
  ...process.argv.slice(2),
]);
const players = await prisma.player.findMany({
  where: { id: { in: [...ids] }, photoFile: { not: null } },
  select: { id: true, canonicalName: true, photoFile: true, photoAuthor: true, photoLicense: true },
  orderBy: { id: 'asc' },
});
for (const p of players) console.log(JSON.stringify(p));
console.error(`${players.length} of ${ids.size} players have a photo`);
await prisma.$disconnect();
