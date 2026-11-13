/**
 * MC-044: the statistical bench against 02 §11. Run:
 *   pnpm --filter @decabeca/match-engine exec tsx src/calibration/calibrate.ts [matches]
 * Prints each line with its band and a verdict.
 */
import { matchInput } from '../match/fixture';
import { runMany } from './runner';

export const BANDS_11: Record<string, [number, number]> = {
  goals: [2.2, 2.5],
  shotsPerTeam: [12.6, 13.6],
  onTargetPerTeam: [4.0, 4.6],
  xgPerShot: [0.1, 0.12],
  passesPerTeam: [415, 428],
  passCompletion: [0.78, 0.82],
  foulsPerTeam: [13.4, 15.9],
  yellowsPerTeam: [2.15, 2.59],
  redsPerTeam: [0.1, 0.15],
  cornersPerTeam: [5.05, 5.51],
  offsidesPerTeam: [1.32, 1.75],
  distanceKm: [9.5, 11.5],
};

async function main() {
  const n = Number(process.argv[2] ?? 60);
  const t0 = Date.now();
  const rs = await runMany(Array.from({ length: n }, (_, i) => matchInput(1000 + i)));
  const sum = (f: (s: (typeof rs)[number]) => number) => rs.reduce((a, s) => a + f(s), 0) / n;
  const both = (k: keyof (typeof rs)[number]) =>
    sum((s) => (s[k] as [number, number])[0] + (s[k] as [number, number])[1]);
  const v: Record<string, number> = {
    goals: both('score'),
    shotsPerTeam: both('shots') / 2,
    onTargetPerTeam: both('onTarget') / 2,
    xgPerShot: both('xg') / both('shots'),
    passesPerTeam: both('passes') / 2,
    passCompletion: both('completed') / both('passes'),
    foulsPerTeam: both('fouls') / 2,
    yellowsPerTeam: both('yellows') / 2,
    redsPerTeam: both('reds') / 2,
    cornersPerTeam: both('corners') / 2,
    offsidesPerTeam: both('offsides') / 2,
    distanceKm: sum((s) => s.distance) / 1000,
  };
  const home = rs.filter((s) => s.score[0] > s.score[1]).length / n;
  const draw = rs.filter((s) => s.score[0] === s.score[1]).length / n;
  for (const [k, [lo, hi]] of Object.entries(BANDS_11))
    console.log(
      `${k.padEnd(18)} ${v[k]!.toFixed(3).padStart(8)}  [${lo}, ${hi}]  ${v[k]! >= lo && v[k]! <= hi ? 'ok' : 'OUT'}`,
    );
  console.log(
    `home/draw/away ${(home * 100).toFixed(0)}/${(draw * 100).toFixed(0)}/${((1 - home - draw) * 100).toFixed(0)} (ref 47.6/27.5/24.9); ${n} matches in ${((Date.now() - t0) / 1000).toFixed(0)} s`,
  );
}
void main();
