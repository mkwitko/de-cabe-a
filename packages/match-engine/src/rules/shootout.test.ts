import { describe, expect, it } from 'vitest';
import { ATTRIBUTES, type Attributes } from '../contract';
import { fork, rngFrom } from '../random';
import { kickChance, shootout, type Taker } from './shootout';

const attrs = (v: number) => Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Attributes;
const team = (tag: string, v: number): Taker[] =>
  Array.from({ length: 11 }, (_, i) => ({
    id: `${tag}${i}`,
    attrs: attrs(v),
    nerve: 10,
    keeper: i === 0,
  }));

describe('the penalty shoot-out (IFAB Law 10)', () => {
  it('scores about three in four at average level, ends as the law says', () => {
    let kicks = 0;
    let scored = 0;
    for (let i = 0; i < 400; i++) {
      const r = shootout(
        [team('a', 65), team('b', 65)],
        [attrs(65), attrs(65)],
        fork(rngFrom(i), 's'),
      );
      expect(r.score[0]).not.toBe(r.score[1]);
      const taken = [0, 1].map((t) => r.kicks.filter((k) => k.team === t).length);
      // Best of five, or sudden death in pairs.
      expect(Math.abs(taken[0]! - taken[1]!)).toBeLessThanOrEqual(1);
      if (taken[0]! > 5) expect(taken[0]).toBe(taken[1]);
      kicks += r.kicks.length;
      scored += r.kicks.filter((k) => k.scored).length;
    }
    expect(scored / kicks).toBeGreaterThan(0.68);
    expect(scored / kicks).toBeLessThan(0.8);
  });

  it('a better taker scores more, a better keeper saves more, nerves fail when a miss loses', () => {
    const t = team('a', 65)[1]!;
    expect(kickChance({ ...t, attrs: attrs(85) }, attrs(65), false)).toBeGreaterThan(
      kickChance(t, attrs(65), false),
    );
    expect(kickChance(t, attrs(85), false)).toBeLessThan(kickChance(t, attrs(65), false));
    expect(kickChance(t, attrs(65), true)).toBeLessThan(kickChance(t, attrs(65), false));
  });
});
