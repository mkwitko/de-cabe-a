import { describe, expect, it } from 'vitest';
import { chemistry, overall, record, simulate, table, won, type Rated } from './manager';

/** Deterministic rng for the checks. */
const seq =
  (seed = 1) =>
  () =>
    ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const P = (o: Partial<Rated>): Rated => ({
  id: o.name!,
  name: o.name!,
  slot: 'FW',
  overall: 80,
  facts: { cups: 1, starts: 1, finals: 0, titles: 0 },
  team: 'Brazil',
  season: '1970',
  sides: [],
  nationality: 'BR',
  clubs: [],
  ...o,
});

describe('Copa dos Sonhos', () => {
  it('rates from World Cup facts, within 60–96', () => {
    const legend = overall({ cups: 4, starts: 14, finals: 2, titles: 3, depth: 4, tier: 'T1' });
    const squad = overall({ cups: 1, starts: 1, finals: 0, titles: 0, depth: 0, tier: 'T3' });
    expect(legend).toBe(96);
    expect(squad).toBeGreaterThanOrEqual(60);
    expect(squad).toBeLessThan(70);
  });

  it('affinity: same side at a World Cup beats same club beats same country', () => {
    const c = chemistry([
      P({ name: 'A', sides: ['Brazil|1970'] }),
      P({ name: 'B', sides: ['Brazil|1970'] }),
      P({ name: 'C', clubs: [['x', 'Santos', 1960, 1970]] }),
      P({ name: 'D', clubs: [['x', 'Santos', 1968, 1975]], nationality: 'AR' }),
    ]);
    expect(c.links.map((l) => [l.a, l.b, l.points])).toContainEqual(['A', 'B', 3]);
    expect(c.links.map((l) => [l.a, l.b, l.points])).toContainEqual(['C', 'D', 2]);
    expect(c.links.map((l) => [l.a, l.b, l.points])).toContainEqual(['A', 'C', 1]);
  });

  it('a much stronger side wins most matches; knockouts always have a winner', () => {
    const strong = { strength: 92, scorers: [{ name: 'S', weight: 1 }] };
    const weak = { strength: 70, scorers: [{ name: 'W', weight: 1 }] };
    const rng = seq(7);
    let wins = 0;
    for (let i = 0; i < 400; i++) {
      const r = simulate(strong, weak, 'equilibrado', true, rng);
      if (won(r)) wins++;
      expect(
        r.penalties ? r.penalties.mine !== r.penalties.theirs : r.goalsFor !== r.goalsAgainst,
      ).toBe(true);
      expect(r.events.filter((e) => e.side === 'mine')).toHaveLength(r.goalsFor);
    }
    expect(wins).toBeGreaterThan(300);
  });

  it('group table orders by points, goal difference, goals', () => {
    const rows = ['A', 'B', 'C'].map((team) => ({ team, played: 0, points: 0, gf: 0, ga: 0 }));
    record(rows, 'A', 1, 0);
    record(rows, 'B', 3, 0);
    record(rows, 'C', 0, 0);
    expect(table(rows).map((r) => r.team)).toEqual(['B', 'A', 'C']);
  });
});
