import { describe, expect, it } from 'vitest';
import { isMoment, momentWindows, type MomentEvent } from './moments';

const ev = (kind: string, atMs: number, data: Record<string, number> = {}): MomentEvent => ({
  kind,
  atMs,
  data,
});
// One frame every 250 ms; the clock stops for 10 s after frame 400 (dead ball).
const clocks = Array.from({ length: 2000 }, (_, i) => i * 250 + (i > 400 ? 10_000 : 0));

describe('watching modes', () => {
  it('goals only keeps goals; highlights add big chances, saves and reds; extended adds the rest', () => {
    const shot = ev('shot', 0, { xg: 0.05 });
    const big = ev('shot', 0, { xg: 0.3 });
    const yellow = ev('card', 0, { card: 1 });
    const red = ev('card', 0, { card: 2 });
    const pass = ev('pass', 0);
    expect([ev('goal', 0), big, red, ev('save', 0)].map((e) => isMoment(e, 'goals'))).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect([big, red, ev('save', 0), shot, yellow].map((e) => isMoment(e, 'highlights'))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect([shot, yellow, pass].map((e) => isMoment(e, 'extended'))).toEqual([true, true, false]);
  });

  it('a goal shows its build-up and a little after, from the frame at its clock', () => {
    const w = momentWindows([ev('goal', 100 * 250)], clocks, 'goals');
    expect(w).toEqual([[100 - 56, 100 + 21]]);
    // After the clock jump the frame is found by clock, not by time / 250.
    const late = momentWindows([ev('goal', 1000 * 250 + 10_000)], clocks, 'goals');
    expect(late).toEqual([[1000 - 56, 1000 + 21]]);
  });

  it('close moments merge; windows stay inside the match', () => {
    const w = momentWindows(
      [ev('shot', 10 * 250, { xg: 0.5 }), ev('save', 30 * 250), ev('goal', 1999 * 250 + 10_000)],
      clocks,
      'highlights',
    );
    expect(w).toEqual([
      [0, 51],
      [1999 - 56, 2000],
    ]);
  });
});
