// Replaces one published level in place (ADR-002, revision 2026-11-06), rebuilt from the current
// base: same answer (Career Path) or same criteria (Grid), same number, same difficulty.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/replace-level.ts CAREER_PATH 7 "Posição corrigida"
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
const [mode, levelArg, ...why] = process.argv.slice(2);
if ((mode !== 'CAREER_PATH' && mode !== 'FOOTBALL_GRID') || !Number(levelArg) || !why.length) {
  console.error('usage: replace-level.ts <CAREER_PATH|FOOTBALL_GRID> <level> "<reason>"');
  process.exit(1);
}
const old = await prisma.challenge.findFirstOrThrow({
  where: { gameMode: mode, publicNumber: Number(levelArg), status: 'published' },
});
type Crit = { type: string; clubId?: string; countryId?: string; positionGroup?: string };
const snap = old.snapshot as {
  answerPlayerId?: string;
  difficultyTier: 1 | 2 | 3;
  rows?: Crit[];
  cols?: Crit[];
};
// Grid snapshots keep the criteria with display labels; the params are the ids only.
const param = ({ type, clubId, countryId, positionGroup }: Crit) =>
  type === 'club'
    ? { type, clubId }
    : type === 'position'
      ? { type, positionGroup }
      : { type, countryId };
const params =
  mode === 'CAREER_PATH'
    ? { playerId: snap.answerPlayerId! }
    : { rows: snap.rows!.map(param), cols: snap.cols!.map(param) };
const { replacement } = await retireChallenge(
  prisma,
  old.id,
  why.join(' '),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- params shape checked by createChallenge
  { params: params as any, difficultyTier: snap.difficultyTier },
  'ai-curator',
);
await validateChallenge(prisma, replacement!.id);
const pub = await publishChallenge(prisma, replacement!.id, new Date());
console.log(`${mode} fase ${pub.publicNumber}: ${old.id} -> ${pub.id}`);
await prisma.$disconnect();
