import { describe, expect, it } from 'vitest';
import { summary } from './summary';
import { simulateMatch } from '../match/simulate';
import { matchInput } from '../match/fixture';
import { bootstrap } from './paired';

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

describe('transition metrics in the summary (research 18 §1)', () => {
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
