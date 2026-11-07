// After club data fixes (repair-club-names.ts): replaces in place every published level whose
// snapshot shows a changed club, rebuilt from the current base (same players / criteria, same
// number). Mais ou Menos duels with a changed club get new duels via publish-higher-lower.ts.
// --rebuilt: instead, replaces every level whose snapshot differs from a fresh build (after a
// re-curation changed careers); --dry lists them only.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/replace-affected-levels.ts [--rebuilt] [--dry]
import { readFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import {
  buildSnapshot,
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
const { changes } = JSON.parse(
  readFileSync(new URL('./club-name-repair.json', import.meta.url), 'utf8'),
) as {
  changes: { id: string; from: string; to: string }[];
};
const ids = new Set(changes.map((c) => c.id));
type Crit = { type: string; clubId?: string; countryId?: string; positionGroup?: string };
const param = ({ type, clubId, countryId, positionGroup }: Crit) =>
  type === 'club'
    ? { type, clubId }
    : type === 'position'
      ? { type, positionGroup }
      : { type, countryId };

const levels = await prisma.challenge.findMany({
  where: {
    status: 'published',
    gameMode: {
      in: [
        'CAREER_PATH',
        'FOOTBALL_GRID',
        'IMPOSTOR',
        'TIMELINE',
        ...(process.argv.includes('--rebuilt') ? (['HIGHER_LOWER'] as const) : []),
      ],
    },
  },
  orderBy: [{ gameMode: 'asc' }, { publicNumber: 'asc' }],
});
/** JSON with sorted keys: jsonb reorders keys, so a plain stringify never matches a fresh build. */
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  );
if (canonical({ b: 1, a: { d: 2, c: 3 } }) !== canonical({ a: { c: 3, d: 2 }, b: 1 }))
  throw new Error('canonical self-check failed');
const REBUILT = process.argv.includes('--rebuilt');
const DRY = process.argv.includes('--dry');
let replaced = 0;
let failed = 0;
for (const c of levels) {
  const text = JSON.stringify(c.snapshot);
  if (!REBUILT && ![...ids].some((id) => text.includes(id))) continue;
  const s = c.snapshot as Record<string, unknown>;
  // Mais ou Menos snapshots keep the club name, not its id: find it among the player's spells.
  const hlSide = async (x: { playerId: string; clubName: string }) => ({
    playerId: x.playerId,
    clubId:
      (
        await prisma.careerSpell.findFirst({
          where: { playerId: x.playerId, club: { shortName: x.clubName } },
          select: { clubId: true },
        })
      )?.clubId ?? '',
  });
  const hlParams =
    c.gameMode === 'HIGHER_LOWER'
      ? {
          rounds: await Promise.all(
            (
              s.rounds as {
                metric: string;
                a: { playerId: string; clubName: string };
                b: { playerId: string; clubName: string };
              }[]
            ).map(async (r) => ({ metric: r.metric, a: await hlSide(r.a), b: await hlSide(r.b) })),
          ),
        }
      : null;
  const params =
    hlParams ??
    (c.gameMode === 'CAREER_PATH'
      ? { playerId: s.answerPlayerId as string }
      : c.gameMode === 'FOOTBALL_GRID'
        ? { rows: (s.rows as Crit[]).map(param), cols: (s.cols as Crit[]).map(param) }
        : c.gameMode === 'IMPOSTOR'
          ? {
              rounds: (
                s.rounds as { clubId: string; players: { id: string }[]; impostorId: string }[]
              ).map((r) => ({
                clubId: r.clubId,
                memberIds: r.players.map((p) => p.id).filter((id) => id !== r.impostorId),
                impostorId: r.impostorId,
              })),
            }
          : {
              rounds: (s.rounds as { playerId: string }[]).map((r) => ({ playerId: r.playerId })),
            });
  if (REBUILT) {
    const fresh = await buildSnapshot(
      prisma,
      {
        mode: c.gameMode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape checked by buildSnapshot
        params: params as any,
        difficultyTier: c.difficultyTier as 1 | 2 | 3,
      },
      c.id,
    ).catch(
      (e: { details?: unknown }) => (
        console.log(c.gameMode, c.publicNumber, JSON.stringify(e.details ?? e).slice(0, 160)),
        null
      ),
    );
    if (fresh && canonical(fresh.config) === canonical(c.snapshot)) continue;
    if (DRY) {
      console.log(`${c.gameMode} ${c.publicNumber}: ${fresh ? 'changed' : 'no longer eligible'}`);
      replaced++;
      continue;
    }
  }
  try {
    const { replacement } = await retireChallenge(
      prisma,
      c.id,
      REBUILT ? 'Carreira corrigida (recuradoria)' : 'Nome de clube corrigido (repair-club-names)',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape checked by createChallenge
      { params: params as any, difficultyTier: c.difficultyTier as 1 | 2 | 3 },
      'ai-curator',
    );
    await validateChallenge(prisma, replacement!.id);
    await publishChallenge(prisma, replacement!.id, new Date());
    replaced++;
  } catch (e) {
    failed++;
    console.log(`${c.gameMode} ${c.publicNumber}: ${(e as Error).message.slice(0, 100)}`);
  }
}
console.log(`replaced ${replaced} levels in place; ${failed} could not be rebuilt (listed above)`);
await prisma.$disconnect();
