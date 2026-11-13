/**
 * MC-166 zebra suite (TEST_STRATEGY §4) and MC-045 preset tournament, on the
 * parallel runner. Run: pnpm --filter @decabeca/match-engine exec tsx src/calibration/zebra.ts [n]
 */
import type { MatchInput, TacticalPlan } from '../contract';
import { matchInput, teamInput } from '../match/fixture';
import { defaultPlan } from '../presets';
import { runMany } from './runner';
import type { Summary } from './summary';

const n = Number(process.argv[2] ?? 200);

/** Favourite and underdog alternate home and away; returns [summary, favourite side]. */
async function duel(fav: (seed: number) => MatchInput['teams'][0], dog: (seed: number) => MatchInput['teams'][0]) {
  const inputs = Array.from({ length: n }, (_, i) => {
    const seed = 5000 + i;
    const f = fav(seed);
    const d = dog(seed);
    return i % 2 === 0 ? matchInput(seed, f, d) : matchInput(seed, d, f);
  });
  const rs = await runMany(inputs);
  return rs.map((s, i) => ({ s, fav: (i % 2 === 0 ? 0 : 1) as 0 | 1 }));
}
const dogWins = (xs: { s: Summary; fav: 0 | 1 }[]) =>
  xs.filter(({ s, fav }) => s.score[1 - fav]! > s.score[fav]).length / xs.length;

async function main() {
  const out: string[] = [];
  // Z1: underdog wins fall with the strength gap and are never zero nor near a third.
  const z1: number[] = [];
  for (const gap of [5, 10, 15]) {
    const xs = await duel((s) => teamInput(s, 65 + gap / 2, defaultPlan(), `f${s}`), (s) => teamInput(s + 99, 65 - gap / 2, defaultPlan(), `d${s}`));
    z1.push(dogWins(xs));
    if (gap === 10) {
      // Z2: favourite created more and lost; the report leads with conversion.
      const z2 = xs.filter(({ s, fav }) => s.xg[fav] > s.xg[1 - fav]! && s.score[fav] < s.score[1 - fav]!);
      const conv = z2.filter(({ s }) => s.firstFactor === 'match.explain.finishing' || s.firstFactor === 'match.explain.keeper');
      out.push(`Z2 favourite out-created and lost: ${z2.length} of ${xs.length}; report leads with conversion in ${conv.length}`);
      // Z9: xG >= 2 and no goal, against Poisson on the xG.
      let count = 0;
      let expected = 0;
      for (const { s } of xs)
        for (const t of [0, 1] as const)
          if (s.xg[t] >= 2) {
            expected += Math.exp(-s.xg[t]);
            if (s.score[t] === 0) count++;
          }
      out.push(`Z9 xG>=2 with no goal: ${count} seen, ${expected.toFixed(1)} expected by Poisson`);
    }
  }
  out.push(`Z1 underdog wins by gap 5/10/15: ${z1.map((x) => (x * 100).toFixed(1) + '%').join(' / ')} ${z1[0]! > z1[1]! && z1[1]! > z1[2]! && z1[2]! > 0 && z1[0]! < 0.33 ? 'ok' : 'FAIL'}`);
  // Z3: a great keeper for the underdog.
  const keeper = (s: number) => {
    const t = teamInput(s + 99, 60, defaultPlan(), `d${s}`);
    const gk = t.players[0]!.attributes;
    for (const k of ['reflexes', 'handling', 'oneOnOne', 'commandOfArea', 'gkPositioning'] as const) gk[k] = 90;
    return t;
  };
  const z3 = await duel((s) => teamInput(s, 70, defaultPlan(), `f${s}`), keeper);
  out.push(`Z3 underdog with a great keeper wins ${(dogWins(z3) * 100).toFixed(1)}% (Z1 gap 10: ${(z1[1]! * 100).toFixed(1)}%)`);
  // Z12: swapping sides with no crowd changes nothing systematic.
  const sym = await runMany(Array.from({ length: n }, (_, i) => {
    const m = matchInput(7000 + i);
    m.conditions.crowd = 0;
    return m;
  }));
  const homeShare = sym.reduce((a, s) => a + s.score[0], 0) / sym.reduce((a, s) => a + s.score[0] + s.score[1], 0);
  out.push(`Z12 goal share of side 0 with no crowd: ${(homeShare * 100).toFixed(1)}% (home edge base only)`);

  // MC-045: preset tournament, every preset against every other, both sides.
  const presets: [string, () => TacticalPlan][] = [
    ['4-3-3', () => defaultPlan('4-3-3')],
    ['4-4-2', () => defaultPlan('4-4-2')],
    ['4-2-3-1', () => defaultPlan('4-2-3-1')],
    ['4-3-3 high press', () => ({ ...defaultPlan('4-3-3'), team: { ...defaultPlan('4-3-3').team, block: 'high', pressIntensity: 5, lineHeight: 4 } })],
    ['4-4-2 low block', () => ({ ...defaultPlan('4-4-2'), team: { ...defaultPlan('4-4-2').team, block: 'low', lineHeight: 2 } })],
  ];
  const per = Math.max(20, Math.round(n / 5));
  for (const [a, pa] of presets) {
    const row: string[] = [];
    let worst = 0;
    for (const [b, pb] of presets) {
      if (a === b) continue;
      const xs = await duel((s) => teamInput(s, 65, pa(), `a${s}`), (s) => teamInput(s + 99, 65, pb(), `b${s}`));
      const w = xs.slice(0, per).filter(({ s, fav }) => s.score[fav] > s.score[1 - fav]!).length / per;
      worst = Math.max(worst, w);
      row.push(`${b} ${(w * 100).toFixed(0)}%`);
    }
    out.push(`MC-045 ${a}: ${row.join(', ')}`);
  }
  console.log(out.join('\n'));
}
void main();
