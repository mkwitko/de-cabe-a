import { describe, expect, it } from 'vitest';
import {
  headline,
  offerTiers,
  overall,
  simulateMatch,
  startingAttributes,
  train,
  TRAINS,
} from './career';

describe('career rules', () => {
  it('starts low, the position decides the best attribute, overall weighs by position', () => {
    const fw = startingAttributes('FW');
    expect(fw.finishing).toBe(50);
    expect(overall(fw, 'FW')).toBeGreaterThan(overall(fw, 'DF'));
    expect(TRAINS.HIGHER_LOWER).toBe('finishing');
  });

  it('training costs more as the attribute grows; leftovers are kept', () => {
    expect(train(50, 7)).toEqual({ value: 52, left: 1 });
    expect(train(69, 7)).toEqual({ value: 71, left: 0 }); // 3 for 69, 4 for 70
    expect(train(99, 30)).toEqual({ value: 99, left: 30 });
  });

  it('a seed always gives the same match; a better player scores more over many matches', () => {
    const m = {
      overall: 60,
      position: 'FW' as const,
      team: 60,
      opponent: 60,
      home: true,
      seed: 42,
    };
    expect(simulateMatch(m)).toEqual(simulateMatch(m));
    const goals = (o: number) =>
      Array.from({ length: 400 }, (_, i) => simulateMatch({ ...m, overall: o, seed: i })).reduce(
        (s, x) => s + x.playerGoals,
        0,
      );
    expect(goals(85)).toBeGreaterThan(goals(50));
    const r = simulateMatch(m);
    expect(r.rating).toBeGreaterThanOrEqual(3);
    expect(r.rating).toBeLessThanOrEqual(10);
  });

  it('offers: a strong season brings the next level; the youth team goes up or on loan', () => {
    expect(offerTiers({ tier: 'B', overall: 63, avgRating: 7.4 })).toEqual(['A', 'B']);
    expect(offerTiers({ tier: 'B', overall: 70, avgRating: 7.6 })).toEqual(['A', 'A', 'B']);
    expect(offerTiers({ tier: 'B', overall: 50, avgRating: 6 })).toEqual([]);
    expect(offerTiers({ tier: 'BASE', overall: 45, avgRating: 6 })).toEqual(['C']);
  });

  it('headlines are our own text and depend on what happened', () => {
    const base = { name: 'Zé Craque', club: 'Avaí', opponent: 'Coritiba', seed: 1 };
    expect(
      headline({
        ...base,
        result: { teamGoals: 3, opponentGoals: 0, playerGoals: 3, assists: 0, rating: 9.5 },
      }),
    ).toMatch(/hat-trick|Três de/);
    expect(
      headline({
        ...base,
        result: { teamGoals: 1, opponentGoals: 1, playerGoals: 0, assists: 0, rating: 6 },
      }),
    ).toMatch(/Empate|1 a 1/);
  });
});
