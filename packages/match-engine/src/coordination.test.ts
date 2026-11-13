/**
 * MC-246: coordination proof. Team shape and collective tasks only, with the
 * ball moved by a script, in six fixed scenarios and eight seeds each.
 * T1, T2, T3, T5 and T9 must stay inside BANDS (02-MATCH-ENGINE.md §5.11).
 */
import { describe, expect, it } from 'vitest';
import { DT } from './movement';
import { SCENARIOS, play } from './coordination.scenarios';
import { BANDS, t1, t2, t3, t5, t9 } from './trajectories';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
/** Ten seconds of samples at DT: below that a share is noise (ADR-018 item 4). */
const T5_MIN_SAMPLES = 40;

describe('MC-246 coordination proof', () => {
  for (const sc of SCENARIOS) {
    it(sc.name, () => {
      const report: string[] = [];
      const losses: [number[], number[]] = [[], []];
      const pairs: [number, number] = [0, 0];
      const guard: [[number, number], [number, number]] = [
        [0, 0],
        [0, 0],
      ];
      for (const seed of SEEDS) {
        const { w, samples } = play(sc, seed, 240);
        for (const team of [0, 1] as const) {
          const a = t1(samples, team, DT);
          const b = t2(samples, team, sc.plans[team].roles, sc.plans[team].shapes.outOfPossession);
          const c = t3(samples, team, DT);
          const d = t5(samples, team);
          const fail = [
            a.mean > BANDS.T1mean && `T1 mean ${a.mean.toFixed(2)}`,
            a.max > BANDS.T1max && `T1 max ${a.max}`,
            a.maxInBox > BANDS.T1maxInBox && `T1 box max ${a.maxInBox}`,
            b.backGapP95 > BANDS.T2backGapP95 && `T2 back gap ${b.backGapP95.toFixed(1)}`,
            b.betweenLinesP95 > BANDS.T2betweenLinesP95[sc.plans[team].team.block] &&
              `T2 lines ${b.betweenLinesP95.toFixed(1)}`,
          ].filter(Boolean);
          if (fail.length)
            report.push(`${sc.name.slice(0, 2)} seed ${seed} team ${team}: ${fail.join(', ')}`);
          losses[team].push(...t9(samples, team).counts);
          pairs[team] += c.per10min;
          guard[team][0] += d.samples;
          guard[team][1] += d.emptyShare * d.samples;
        }
        expect(w.log.length).toBeGreaterThan(0);
      }
      // T3 as a rate over all eight seeds' 32 minutes (ADR-018 item 4).
      for (const team of [0, 1] as const)
        if (pairs[team] / SEEDS.length > BANDS.T3per10min)
          report.push(
            `${sc.name.slice(0, 2)} team ${team}: T3 ${(pairs[team] / SEEDS.length).toFixed(2)}`,
          );
      // T5 as a share of all eight seeds' time, judged on at least 10 s of it (ADR-018 item 4).
      for (const team of [0, 1] as const) {
        const [n, empty] = guard[team];
        if (n >= T5_MIN_SAMPLES && empty / n > BANDS.T5emptyShare)
          report.push(`${sc.name.slice(0, 2)} team ${team}: T5 ${(empty / n).toFixed(2)} of ${n}`);
      }
      // T9 on the mean over all losses of the eight seeds (02 §5.9: "na média").
      for (const team of [0, 1] as const) {
        const xs = losses[team];
        if (xs.length < 5) continue;
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
        const want = sc.plans[team].team.restDefence;
        if (Math.abs(mean - want) > BANDS.T9tolerance)
          report.push(
            `${sc.name.slice(0, 2)} team ${team}: T9 ${mean.toFixed(2)} vs ${want} (${xs.length} losses)`,
          );
      }
      expect(report).toEqual([]);
    });
  }

  it('T9 is measured: S4 has established losses in the opponents half for both teams', () => {
    for (const team of [0, 1] as const) {
      const n = SEEDS.reduce(
        (a, seed) => a + t9(play(SCENARIOS[3]!, seed, 240).samples, team).losses,
        0,
      );
      expect(n).toBeGreaterThanOrEqual(5);
    }
  });

  it('tasks show up in the log with their kinds', () => {
    const { w } = play(SCENARIOS[1]!, 1, 30);
    const kinds = new Set(w.log.map((l) => l.task));
    for (const k of ['press', 'restDefence', 'support', 'mark'] as const)
      expect(kinds).toContain(k);
  });

  it('is deterministic', () => {
    const a = play(SCENARIOS[0]!, 3, 30).samples;
    const b = play(SCENARIOS[0]!, 3, 30).samples;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
