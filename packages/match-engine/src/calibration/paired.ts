/**
 * Paired comparison of two engine versions on the same seeds (research 18 §3):
 * each match is played by both versions, so the difference per match removes
 * most of the seed noise. Run:
 *   git worktree add /tmp/base <commit> && (cd /tmp/base && pnpm i --offline)
 *   (cd /tmp/base/packages/match-engine && DUMP=/tmp/a.json npx tsx src/calibration/matchups.ts 300)
 *   DUMP=/tmp/b.json npx tsx src/calibration/matchups.ts 300
 *   npx tsx src/calibration/paired.ts /tmp/a.json /tmp/b.json
 * Prints, per matchup and metric, the mean change B − A with a 95% bootstrap interval.
 *
 * Bench dumps (calibrate.ts with DUMP=file, one summary per seed) compare the same way:
 *   DUMP=/tmp/a.json npx tsx src/calibration/calibrate.ts 400   (version A)
 *   DUMP=/tmp/b.json npx tsx src/calibration/calibrate.ts 400   (version B)
 *   npx tsx src/calibration/paired.ts /tmp/a.json /tmp/b.json
 */
import { readFileSync } from 'node:fs';
import { next, rngFrom } from '../random';
import type { Summary } from './summary';

type Dump = Record<string, { ai: number[]; s: Summary[] }>;

const METRICS: Record<string, (s: Summary, a: number) => number> = {
  points: (s, a) => (s.score[a]! > s.score[1 - a]! ? 3 : s.score[a] === s.score[1 - a] ? 1 : 0),
  win: (s, a) => (s.score[a]! > s.score[1 - a]! ? 1 : 0),
  goalDiff: (s, a) => s.score[a]! - s.score[1 - a]!,
  xgDiff: (s, a) => s.xg[a]! - s.xg[1 - a]!,
  shotsA: (s, a) => s.shots[a]!,
  shotsB: (s, a) => s.shots[1 - a]!,
  highWinsA: (s, a) => s.highWins[a]!,
  htShotShareA: (s, a) => (s.highTurnovers[a] ? s.highTurnoverShots[a]! / s.highTurnovers[a]! : 0),
  goals: (s) => s.score[0] + s.score[1],
};

/** Mean of d and its 95% percentile bootstrap interval (deterministic). */
export function bootstrap(d: number[], reps = 2000, seed = 7): [number, number, number] {
  const n = d.length;
  const mean = d.reduce((a, b) => a + b, 0) / n;
  const r = rngFrom(seed);
  const means: number[] = [];
  for (let k = 0; k < reps; k++) {
    let t = 0;
    for (let i = 0; i < n; i++) t += d[Math.floor(next(r) * n)]!;
    means.push(t / n);
  }
  means.sort((x, y) => x - y);
  return [mean, means[Math.floor(reps * 0.025)]!, means[Math.floor(reps * 0.975)]!];
}

/** Bench metrics per match, both teams together (per team where the band is per team). */
const BENCH: Record<string, (s: Summary) => number> = {
  goals: (s) => s.score[0] + s.score[1],
  shotsPerTeam: (s) => (s.shots[0] + s.shots[1]) / 2,
  xgPerTeam: (s) => (s.xg[0] + s.xg[1]) / 2,
  onTargetPerTeam: (s) => (s.onTarget[0] + s.onTarget[1]) / 2,
  foulsPerTeam: (s) => (s.fouls[0] + s.fouls[1]) / 2,
  yellowsPerTeam: (s) => (s.yellows[0] + s.yellows[1]) / 2,
  redsPerTeam: (s) => (s.reds[0] + s.reds[1]) / 2,
  cornersPerTeam: (s) => (s.corners[0] + s.corners[1]) / 2,
  passesPerTeam: (s) => (s.passes[0] + s.passes[1]) / 2,
  offsidesPerTeam: (s) => (s.offsides[0] + s.offsides[1]) / 2,
};

/** Paired change B − A per bench metric over two bench dumps of the same seeds. */
export function pairedBench(A: Summary[], B: Summary[]): string[] {
  const n = Math.min(A.length, B.length);
  return Object.entries(BENCH).map(([name, f]) => {
    const va = A.slice(0, n).map(f);
    const d = B.slice(0, n).map((s, i) => f(s) - va[i]!);
    const [m, lo, hi] = bootstrap(d);
    const base = va.reduce((x, y) => x + y, 0) / n;
    const sig = lo > 0 || hi < 0 ? ' *' : '';
    return `${name.padEnd(16)} A ${base.toFixed(2).padStart(7)}  B ${(base + m).toFixed(2).padStart(7)}  B−A ${m >= 0 ? '+' : ''}${m.toFixed(3)} [${lo.toFixed(3)}, ${hi.toFixed(3)}]${sig}`;
  });
}

function main() {
  const [fa, fb] = process.argv.slice(2);
  const rawA = JSON.parse(readFileSync(fa!, 'utf8')) as Dump | Summary[];
  const rawB = JSON.parse(readFileSync(fb!, 'utf8')) as Dump | Summary[];
  if (Array.isArray(rawA) && Array.isArray(rawB)) {
    console.log(`bench (${Math.min(rawA.length, rawB.length)} paired matches)`);
    for (const line of pairedBench(rawA, rawB)) console.log(`  ${line}`);
    return;
  }
  const A = rawA as Dump;
  const B = rawB as Dump;
  for (const key of Object.keys(A)) {
    const a = A[key];
    const b = B[key];
    if (!a || !b || a.s.length !== b.s.length) continue;
    console.log(`${key} (${a.s.length} paired matches)`);
    for (const [name, f] of Object.entries(METRICS)) {
      const va = a.s.map((s, i) => f(s, a.ai[i]!));
      const vb = b.s.map((s, i) => f(s, b.ai[i]!));
      const [m, lo, hi] = bootstrap(vb.map((v, i) => v - va[i]!));
      const base = va.reduce((x, y) => x + y, 0) / va.length;
      const sig = lo > 0 || hi < 0 ? ' *' : '';
      console.log(
        `  ${name.padEnd(10)} A ${base.toFixed(2).padStart(6)}  B−A ${m >= 0 ? '+' : ''}${m.toFixed(3)} [${lo.toFixed(3)}, ${hi.toFixed(3)}]${sig}`,
      );
    }
  }
}
if (process.argv[1]?.endsWith('paired.ts')) main();
