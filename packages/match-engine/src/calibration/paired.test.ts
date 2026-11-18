import { describe, expect, it } from 'vitest';
import { summary, transitions } from './summary';
import type { MatchEvent } from '../contract';
import { simulateMatch } from '../match/simulate';
import { matchInput } from '../match/fixture';
import { bootstrap, pairedBench } from './paired';
import type { Summary } from './summary';

describe('paired bootstrap', () => {
  it('a constant change has no spread', () => {
    expect(bootstrap(Array(50).fill(0.5))).toEqual([0.5, 0.5, 0.5]);
  });
  it('a centred change straddles zero and is deterministic', () => {
    const d = Array.from({ length: 200 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const [m, lo, hi] = bootstrap(d);
    expect(m).toBe(0);
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(0);
    expect(bootstrap(d)).toEqual([m, lo, hi]);
  });
});

describe('paired bench comparison', () => {
  it('reports the per-match change on the same seeds, and flags a change outside the interval', () => {
    const one = (goals: number) =>
      ({
        score: [goals, 0],
        shots: [10, 10],
        xg: [1, 1],
        onTarget: [4, 4],
        fouls: [13, 13],
        yellows: [2, 2],
        reds: [0, 0],
        corners: [5, 5],
        passes: [400, 400],
        offsides: [1, 1],
      }) as unknown as Summary;
    const A = Array.from({ length: 40 }, (_, i) => one(i % 4));
    const B = A.map((s) => one(s.score[0] + 1));
    const goals = pairedBench(A, B).find((l) => l.startsWith('goals'))!;
    expect(goals).toContain('B−A +1.000 [1.000, 1.000] *');
    expect(pairedBench(A, A).find((l) => l.startsWith('shotsPerTeam'))).not.toContain('*');
  });
});

describe('transition metrics in the summary (research 18 §1)', () => {
  it('a high turnover is shot-ending only if the shot comes before play stops (Opta sequence)', () => {
    const ev = (id: number, kind: string, team: 0 | 1, atMs: number, x = 800) =>
      ({ id, kind, team, atMs, at: [x, 340] }) as unknown as MatchEvent;
    const cut = transitions({
      events: [ev(1, 'phaseChange', 0, 0), ev(2, 'throwIn', 0, 4000), ev(3, 'shot', 0, 9000)],
    });
    const slow = transitions({ events: [ev(1, 'phaseChange', 0, 0), ev(2, 'shot', 0, 15000)] });
    expect([cut.ht[0], cut.hts[0]]).toEqual([1, 0]);
    expect([slow.ht[0], slow.hts[0]]).toEqual([1, 1]);
  });
  it('counts high turnovers, their shots, losses and quick regains consistently', () => {
    const s = summary(simulateMatch(matchInput(2)));
    for (const t of [0, 1] as const) {
      expect(s.highTurnovers[t]).toBeGreaterThan(0);
      expect(s.highTurnoverShots[t]).toBeLessThanOrEqual(s.highTurnovers[t]);
      expect(s.regained5s[t]).toBeLessThanOrEqual(s.losses[t]);
      expect(s.losses[t]).toBeGreaterThan(20);
    }
  });
});
