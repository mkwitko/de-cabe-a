/**
 * Quick balance check on the key style matchups (MC-045), both sides alternating home.
 * Run: pnpm --filter @decabeca/match-engine exec tsx src/calibration/matchups.ts [n]
 */
import type { TacticalPlan } from '../contract';
import { matchInput, teamInput } from '../match/fixture';
import { defaultPlan } from '../presets';
import { runMany } from './runner';

const n = Number(process.argv[2] ?? 60);
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
    console.log(
      `${a} vs ${b}: ${a} wins ${((w / n) * 100).toFixed(0)}% draws ${((d / n) * 100).toFixed(0)}% | goals ${(ga / n).toFixed(2)}-${(gb / n).toFixed(2)} | high wins ${(ha / n).toFixed(1)}-${(hb / n).toFixed(1)}`,
    );
  }
}
void main();
