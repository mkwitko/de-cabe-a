/**
 * Quick balance check on the key style matchups (MC-045), both sides alternating home.
 * Run: pnpm --filter @decabeca/match-engine exec tsx src/calibration/matchups.ts [n]
 */
import type { TacticalPlan } from '../contract';
import { matchInput, teamInput } from '../match/fixture';
import { defaultPlan } from '../presets';
import { runMany } from './runner';

const n = Number(process.argv[2] ?? 300);
const style = (f: string, team: Partial<TacticalPlan['team']>) => () => {
  const p = defaultPlan(f);
  p.team = { ...p.team, ...team };
  return p;
};
const plans: Record<string, () => TacticalPlan> = {
  mid: style('4-4-2', {}),
  press: style('4-3-3', { block: 'high', pressIntensity: 5, lineHeight: 4 }),
  low: style('4-4-2', { block: 'low', lineHeight: 2, onWin: 'counter' }),
  433: style('4-3-3', {}),
  highOnly: style('4-3-3', { block: 'high', lineHeight: 4 }),
  intensityOnly: style('4-3-3', { pressIntensity: 5 }),
};
async function main() {
  const pairs = (process.argv[3] ?? 'press:mid,low:mid,press:low,433:mid')
    .split(',')
    .map((x) => x.split(':') as [string, string]);
  for (const [a, b] of pairs) {
    const inputs = Array.from({ length: n }, (_, i) => {
      const A = teamInput(9000 + i, 65, plans[a]!(), `a${i}`);
      const B = teamInput(9500 + i, 65, plans[b]!(), `b${i}`);
      return i % 2 === 0 ? matchInput(9000 + i, A, B) : matchInput(9000 + i, B, A);
    });
    const rs = await runMany(inputs);
    let xa = 0,
      xb = 0,
      sa = 0,
      sb = 0;
    rs.forEach((s, i) => {
      const ai = i % 2 === 0 ? 0 : 1;
      xa += s.xg[ai]!;
      xb += s.xg[1 - ai]!;
      sa += s.shots[ai]!;
      sb += s.shots[1 - ai]!;
    });
    console.log(
      `  ${a}: xG ${(xa / n).toFixed(2)} from ${(sa / n).toFixed(1)} shots | ${b}: xG ${(xb / n).toFixed(2)} from ${(sb / n).toFixed(1)} shots`,
    );
    let w = 0,
      d = 0,
      ga = 0,
      gb = 0,
      ha = 0,
      hb = 0;
    rs.forEach((s, i) => {
      const ai = i % 2 === 0 ? 0 : 1;
      const bi = 1 - ai;
      if (s.score[ai]! > s.score[bi]!) w++;
      else if (s.score[ai] === s.score[bi]) d++;
      ga += s.score[ai]!;
      gb += s.score[bi]!;
      ha += s.highWins[ai]!;
      hb += s.highWins[bi]!;
    });
    // 95% margins: a share ± 1.96·sqrt(p(1−p)/n); a mean ± 1.96·sd/sqrt(n).
    const pm = (k: number) => {
      const p = k / n;
      return `${(p * 100).toFixed(0)}% ±${(196 * Math.sqrt((p * (1 - p)) / n)).toFixed(0)}`;
    };
    const goalsA = rs.map((s, i) => s.score[i % 2 === 0 ? 0 : 1]!);
    const mean = ga / n;
    const sd = Math.sqrt(goalsA.reduce((acc, g) => acc + (g - mean) ** 2, 0) / (n - 1));
    console.log(
      `${a} vs ${b} (${n}): ${a} wins ${pm(w)}, draws ${pm(d)} | goals ${mean.toFixed(2)} ±${((1.96 * sd) / Math.sqrt(n)).toFixed(2)} - ${(gb / n).toFixed(2)} | high wins ${(ha / n).toFixed(1)}-${(hb / n).toFixed(1)}`,
    );
  }
}
void main();
