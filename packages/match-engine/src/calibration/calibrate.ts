/**
 * MC-044: the statistical bench against 02 §11. Run:
 *   pnpm --filter @decabeca/match-engine exec tsx src/calibration/calibrate.ts [matches]
 * Prints each line with its band and a verdict. CAL_THREADS caps the worker threads.
 * DUMP=file keeps every match summary; compare two dumps (same seeds) with
 *   npx tsx src/calibration/paired.ts a.json b.json
 */
import { writeFileSync } from 'node:fs';
import { matchInput } from '../match/fixture';
import { runMany } from './runner';

export const BANDS_11: Record<string, [number, number]> = {
  goals: [2.2, 2.5],
  shotsPerTeam: [12.6, 13.6],
  onTargetPerTeam: [4.0, 4.6],
  // Série A: goals over shots, a conversion rate (02 §11; Premier League 0.10 to 0.12 secondary).
  goalsPerShot: [0.085, 0.1],
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
  if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(rs));
  const sum = (f: (s: (typeof rs)[number]) => number) => rs.reduce((a, s) => a + f(s), 0) / n;
  const both = (k: keyof (typeof rs)[number]) =>
    sum((s) => (s[k] as [number, number])[0] + (s[k] as [number, number])[1]);
  const v: Record<string, number> = {
    goals: both('score'),
    shotsPerTeam: both('shots') / 2,
    onTargetPerTeam: both('onTarget') / 2,
    goalsPerShot: both('score') / both('shots'),
    passesPerTeam: both('passes') / 2,
    passCompletion: both('completed') / both('passes'),
    foulsPerTeam: both('fouls') / 2,
    yellowsPerTeam: both('yellows') / 2,
    redsPerTeam: both('reds') / 2,
    cornersPerTeam: both('corners') / 2,
    offsidesPerTeam: both('offsides') / 2,
    distanceKm: sum((s) => s.distance) / 1000,
  };
  // The engine's own chance quality per shot: no band with this definition in 02 §11.
  console.log(
    `xG per shot (engine chance quality, no band) ${(both('xg') / both('shots')).toFixed(3)}`,
  );
  // Transition metrics (no band in 02 §11; references in research 18 §1).
  console.log(
    `high turnovers per team ${(both('highTurnovers') / 2).toFixed(1)}, shot-ending (same sequence) ${((100 * both('highTurnoverShots')) / both('highTurnovers')).toFixed(0)}% (Opta 13-21%); losses won back within 5 s ${((100 * both('regained5s')) / both('losses')).toFixed(0)}%`,
  );
  // Big chances (02 §11: Série A 2026 about 2.2 created per team, Statz.ai; "created" counts
  // those from a pass).
  console.log(
    `big chances per team ${(both('bigChances') / 2).toFixed(2)}, from a pass ${(both('bigFromPass') / 2).toFixed(2)} (Statz 2026 about 2.2), converted ${((100 * both('bigGoals')) / both('bigChances')).toFixed(0)}%`,
  );
  console.log(
    `progressive passes per team ${(both('progressive') / 2).toFixed(1)} (FBref definition)`,
  );
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
