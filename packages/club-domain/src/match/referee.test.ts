import { describe, expect, it } from 'vitest';
import { quickResult } from './quick';
import { cardsOf, panelOf, redsOf } from './referee';

describe('referees (mapa §2.12)', () => {
  it('a panel leaning lenient, averaging about five cards and 0.31 sendings-off a match', () => {
    const panel = panelOf(11);
    expect(panel).toHaveLength(40);
    expect(panelOf(11)).toBe(panel);
    const mean = (f: (r: (typeof panel)[number]) => number) =>
      panel.reduce((s, r) => s + f(r), 0) / panel.length;
    expect(mean(cardsOf)).toBeGreaterThan(4.6);
    expect(mean(cardsOf)).toBeLessThan(5.8);
    expect(mean(redsOf)).toBeGreaterThan(0.25);
    expect(mean(redsOf)).toBeLessThan(0.4);
    expect(Math.min(...panel.map(cardsOf))).toBeGreaterThanOrEqual(4);
    expect(Math.max(...panel.map(cardsOf))).toBeLessThanOrEqual(7.3);
  });

  it('a strict referee books more than a lenient one, and the score does not change', () => {
    let strict = 0;
    let lenient = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const a = quickResult(seed, 60, 60, 0.6, { cards: 7.3, reds: 0.5 });
      const b = quickResult(seed, 60, 60, 0.6, { cards: 4, reds: 0.2 });
      expect(a.goals).toEqual(b.goals);
      strict += a.cards[0][0] + a.cards[1][0];
      lenient += b.cards[0][0] + b.cards[1][0];
    }
    expect(strict).toBeGreaterThan(lenient);
  });
});

it('a derby draws more cards than an ordinary match with the same referee', async () => {
  const { whistleOf, DERBY_CARDS } = await import('./referee');
  expect(DERBY_CARDS).toBeGreaterThan(100);
  const s = { seed: 5 } as Parameters<typeof whistleOf>[0];
  const plain = whistleOf(s, 'm1');
  const hot = whistleOf(s, 'm1', true);
  expect(hot.cards / plain.cards).toBeCloseTo(DERBY_CARDS / 100);
  expect(hot.reds / plain.reds).toBeCloseTo(DERBY_CARDS / 100);
});
