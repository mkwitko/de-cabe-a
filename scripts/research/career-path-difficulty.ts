// Career Path track by difficulty: scores every published level (how hard the player is to guess),
// writes a markdown report and, with --apply, renumbers the track easiest first.
// Safe for live players: a level someone has played (any version, any attempt) or that a Desafio do
// Dia drew keeps its number, so progress, the lock rule (attempts.service assertUnlocked), daily
// history and shared links are untouched; only levels nobody has seen trade numbers. Attempts,
// stickers, reports and reactions point at challenge ids, which never change.
// Dry run by default (read only). --apply re-plans inside one transaction that locks Attempt and
// DailyPick, so nobody can start a level between the plan and the write. Re-runnable: a second run
// moves nothing.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/career-path-difficulty.ts [--apply] [--out file.md]
import { writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import {
  type CareerLevelFacts,
  type Notability,
  type Placement,
  WEIGHTS,
  orderTrack,
  scoreCareerLevel,
} from '../../apps/api/src/modules/challenges/career-path-difficulty';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const APPLY = process.argv.includes('--apply');
const outAt = process.argv.indexOf('--out');
const OUT =
  outAt > 0
    ? process.argv[outAt + 1]!
    : new URL('./career-path-difficulty.md', import.meta.url).pathname;
const NOW = new Date();
type Db = Pick<typeof prisma, '$queryRaw'>;

// ── Facts
const challenges = await prisma.challenge.findMany({
  where: { gameMode: 'CAREER_PATH', status: 'published', publicNumber: { not: null } },
  select: { id: true, publicNumber: true, difficultyTier: true, snapshot: true },
});
type Snap = {
  answerPlayerId: string;
  trajectory: (CareerLevelFacts['trajectory'][number] & { clubId: string })[];
};
const snap = (s: unknown) => s as Snap;
const players = new Map(
  (
    await prisma.player.findMany({
      where: { id: { in: challenges.map((c) => snap(c.snapshot).answerPlayerId) } },
      select: {
        id: true,
        canonicalName: true,
        notabilityTier: true,
        nationality: { select: { isoCode: true } },
      },
    })
  ).map((p) => [p.id, p]),
);
const selecao = new Set(
  (
    await prisma.$queryRaw<{ playerId: string }[]>`
      SELECT DISTINCT l."playerId" FROM "MatchLineup" l JOIN "Match" m ON m.id = l."matchId"
      WHERE l."playerId" IS NOT NULL
        AND ((m."homeTeam" = 'Brazil' AND l.side = 'home') OR (m."awayTeam" = 'Brazil' AND l.side = 'away'))`
  ).map((r) => r.playerId),
);
const spells = await prisma.$queryRaw<{ clubId: string; n: number }[]>`
  SELECT "clubId", count(*)::int AS n FROM "CareerSpell" GROUP BY 1`;
const maxSpells = Math.max(...spells.map((s) => s.n));
const clubFame = new Map(spells.map((s) => [s.clubId, Math.log1p(s.n) / Math.log1p(maxSpells)]));
const openings = new Map(
  (
    await prisma.$queryRaw<{ c1: string; c2: string; n: number }[]>`
      WITH s AS (
        SELECT "playerId", "clubId",
               row_number() OVER (PARTITION BY "playerId" ORDER BY "startDate" NULLS LAST, "sortIndex") AS rn
        FROM "CareerSpell")
      SELECT a."clubId" AS c1, b."clubId" AS c2, count(*)::int AS n
      FROM s a JOIN s b ON a."playerId" = b."playerId" AND a.rn = 1 AND b.rn = 2
      GROUP BY 1, 2`
  ).map((r) => [`${r.c1}|${r.c2}`, r.n]),
);

const levels = challenges.map((c) => {
  const s = snap(c.snapshot);
  const p = players.get(s.answerPlayerId)!;
  const t = s.trajectory;
  const facts: CareerLevelFacts = {
    id: c.id,
    number: c.publicNumber!,
    notability: p.notabilityTier as Notability,
    brazilian: p.nationality.isoCode === 'BR',
    selecao: selecao.has(p.id),
    trajectory: t,
    clubFame: t.map((x) => clubFame.get(x.clubId) ?? 0),
    openingShared: Math.max(0, (openings.get(`${t[0]?.clubId}|${t[1]?.clubId}`) ?? 1) - 1),
  };
  const { score, parts } = scoreCareerLevel(facts, NOW.getFullYear());
  return { ...facts, score, parts, name: p.canonicalName, stored: c.difficultyTier };
});
const byId = new Map(levels.map((l) => [l.id, l]));

/** Level numbers someone depends on: any attempt on any version, or a Desafio do Dia draw. */
async function pinnedNumbers(db: Db) {
  const rows = await db.$queryRaw<{ n: number }[]>`
    SELECT DISTINCT c."publicNumber" AS n FROM "Attempt" a JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE c."gameMode" = 'CAREER_PATH' AND c."publicNumber" IS NOT NULL
    UNION SELECT level FROM "DailyPick" WHERE "gameMode" = 'CAREER_PATH'`;
  return new Set(rows.map((r) => r.n));
}

// ── Report
const pinned = await pinnedNumbers(prisma);
const plan = orderTrack(levels, pinned);
const moves = plan.filter((p) => p.from !== p.to);
const retiers = plan.filter((p) => p.tier !== byId.get(p.id)!.stored);

/** Spearman rank correlation of the track position with the score: 1 = perfectly ordered. */
function spearman(pairs: [number, number][]) {
  const rank = (xs: number[]) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return xs.map((x) => sorted.indexOf(x) + (sorted.lastIndexOf(x) - sorted.indexOf(x)) / 2);
  };
  const a = rank(pairs.map((p) => p[0]));
  const b = rank(pairs.map((p) => p[1]));
  const n = pairs.length;
  const d2 = a.reduce((s, x, i) => s + (x - b[i]!) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}
const before = spearman(levels.map((l) => [l.number, l.score]));
const after = spearman(plan.map((p) => [p.to, p.score]));

const row = (p: Placement) => {
  const l = byId.get(p.id)!;
  return `| ${p.to} | ${p.from} | ${l.name} | ${l.notability} | ${l.score.toFixed(1)} | ${l.stored} | ${p.tier} | ${p.pinned ? 'pinned' : ''} |`;
};
const table = (ps: Placement[]) =>
  [
    '| proposed # | current # | player | notability | score | stored tier | proposed tier | |',
    '|---:|---:|---|---|---:|---:|---:|---|',
    ...ps.map(row),
  ].join('\n');
const count = <T>(xs: T[], f: (x: T) => string) =>
  Object.entries(
    xs.reduce<Record<string, number>>((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {}),
  )
    .sort()
    .map(([k, n]) => `${k}: ${n}`)
    .join(', ');
const band = (from: number, to: number) => plan.filter((p) => p.to >= from && p.to <= to);
const pos = (n: number) => plan.find((p) => p.to === n);
// Misplaced today: the furthest between the current number and the proposed one.
const latest = [...moves].sort((a, b) => b.from - b.to - (a.from - a.to)).slice(0, 15);
const earliest = [...moves].sort((a, b) => a.from - a.to - (b.from - b.to)).slice(0, 15);
const pinnedOff = plan.filter(
  (p) => p.pinned && p.to <= 20 && !['T1', 'T2'].includes(byId.get(p.id)!.notability),
);
const host = new URL(process.env.DATABASE_URL!).host;

const md = `# Career Path: difficulty and track order

Generated ${NOW.toISOString().slice(0, 16)}Z by \`scripts/research/career-path-difficulty.ts\` against \`${host}\` (${APPLY ? 'APPLY' : 'dry run'}).

## Summary

- ${levels.length} published levels; notability ${count(levels, (l) => l.notability)}.
- Order today vs difficulty: Spearman ${before.toFixed(2)} (1 = easiest first, 0 = random). After the reorder: ${after.toFixed(2)}.
- Pinned (someone played them or a Desafio do Dia drew them, keep their number): ${pinned.size} (${[...pinned].sort((a, b) => a - b).join(', ') || 'none'}).
- **${moves.length} levels move**; ${levels.length - moves.length} stay. difficultyTier changes on ${retiers.length} levels.
- Stored difficultyTier today: ${count(levels, (l) => `tier ${l.stored}`)}. Proposed: ${count(plan, (p) => `tier ${p.tier}`)}.
- Proposed tiers by band: 1–20 ${count(band(1, 20), (p) => `t${p.tier}`)}; 21–60 ${count(band(21, 60), (p) => `t${p.tier}`)}; 61–150 ${count(band(61, 150), (p) => `t${p.tier}`)}; 151+ ${count(band(151, 1e9), (p) => `t${p.tier}`)}.
- Notability by band: 1–20 ${count(band(1, 20), (p) => byId.get(p.id)!.notability)}; 21–60 ${count(band(21, 60), (p) => byId.get(p.id)!.notability)}; 61+ ${count(band(61, 1e9), (p) => byId.get(p.id)!.notability)}.
${pinnedOff.length ? `- Pinned levels in the first 20 that break the opening rule (stay where they are): ${pinnedOff.map((p) => `${p.to} ${byId.get(p.id)!.name} (${byId.get(p.id)!.notability}, ${p.score.toFixed(1)})`).join('; ')}.\n` : ''}
## Score (0 = easiest, 100 = hardest)

The level shows the first club and one more per wrong guess, 6 guesses in all, so a player sees at
most the first 6 clubs. Each part is 0..1 (1 = harder); the score is the weighted sum.

| part | weight | what it measures |
|---|---:|---|
| fame | ${WEIGHTS.fame} | Player.notabilityTier: T1 0, T2 .35, T3 .7, T4 1. The strongest single signal: whether a fan has heard of the player at all. |
| brazil | ${WEIGHTS.brazil} | 1 − anchor. Anchor: started for Brazil in a World Cup / Copa América lineup we hold 1; 30+ league games at one of the 12 grandes .9; any spell at a grande .6; any Brazilian club .3; +.2 if Brazilian. The audience is Brazilian (PRODUCT.md): a Série A path is recognised far more easily. |
| clubs | ${WEIGHTS.clubs} | .6 × (1 − fame of the visible clubs) + .4 × journeyman. Club fame = log of how many careers in the database pass through the club (data driven, ~516k spells), averaged over the first 6 clubs with weights 6..1 (the first club is seen by everyone). Journeyman: 0 at ≤ 4 clubs, 1 at 12+. |
| era | ${WEIGHTS.era} | Years since the last club ended (active = 0), full at 30+ years. Covers retired vs active: today's players are on TV and in games. |
| opening | ${WEIGHTS.opening} | How many other players open their career with the same two clubs (log, full at 63+). A shared academy opening (Santos → …) is ambiguous until more clubs show. |

Ordering: levels nobody has seen fill the free numbers easiest first; each slot takes the easiest
level the track rules allow there: levels 1–20 only T1/T2 players, no T4 before level 60. Proposed
difficultyTier: 1 for levels 1–20, then by score (< 35 → 1, < 55 → 2, else 3), never falling along
the free levels. Seleção is a proxy: only players in the StatsBomb Brazil lineups are flagged.

## First 30 (proposed)

${table(band(1, 30))}

## Samples across the track

${table([40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400].map(pos).filter((p): p is Placement => !!p))}

## Outliers: easy levels buried late today

${table(latest)}

## Outliers: hard levels too early today

${table(earliest)}

## Dry-run diff

${moves.length} moves (current → proposed): ${moves
  .sort((a, b) => a.from - b.from)
  .map((p) => `${p.from}→${p.to}`)
  .join(', ')}.
`;
writeFileSync(OUT, md);
console.log(
  `${levels.length} levels, ${pinned.size} pinned, ${moves.length} move, ${retiers.length} tier changes; Spearman ${before.toFixed(2)} → ${after.toFixed(2)}. Report: ${OUT}`,
);

// ── Apply
if (APPLY) {
  console.log(`Applying on ${host} …`);
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`LOCK TABLE "Attempt", "DailyPick" IN SHARE MODE`;
      const live = orderTrack(levels, await pinnedNumbers(tx));
      const go = live.filter((p) => p.from !== p.to);
      // Through negatives: the published (gameMode, publicNumber) index is unique. Retired
      // versions of a number move with it, as startAttempt finds a level by all its versions.
      for (const p of go)
        await tx.$executeRaw`UPDATE "Challenge" SET "publicNumber" = ${-p.to}
          WHERE "gameMode" = 'CAREER_PATH' AND "publicNumber" = ${p.from} AND status IN ('published', 'retired')`;
      await tx.$executeRaw`UPDATE "Challenge" SET "publicNumber" = -"publicNumber"
        WHERE "gameMode" = 'CAREER_PATH' AND "publicNumber" < 0`;
      for (const p of live)
        if (p.tier !== byId.get(p.id)!.stored)
          await tx.challenge.update({ where: { id: p.id }, data: { difficultyTier: p.tier } });
      console.log(`Moved ${go.length} levels.`);
    },
    { timeout: 120_000 },
  );
}
await prisma.$disconnect();
