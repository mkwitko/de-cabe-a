import { describe, expect, it } from 'vitest';
import { roundRobin, standings, type Played } from './league';

const pts = { win: 3, draw: 1, loss: 0 };
const cbf = [
  'wins',
  'goalDifference',
  'goalsFor',
  'headToHead',
  'redCards',
  'yellowCards',
  'draw',
] as const;
const g = (
  home: string,
  away: string,
  hg: number,
  ag: number,
  cards?: Played['cards'],
): Played => ({
  home,
  away,
  goals: [hg, ag],
  cards: cards ?? [
    [0, 0],
    [0, 0],
  ],
});

describe('MC-169 round robin', () => {
  it.each([4, 7, 20])('%i clubs, double: everyone meets everyone home and away', (n) => {
    const clubs = Array.from({ length: n }, (_, i) => `c${i}`);
    const rounds = roundRobin(clubs, 2, 99);
    const perLeg = n % 2 ? n : n - 1;
    expect(rounds).toHaveLength(2 * perLeg);
    const seen = new Set<string>();
    for (const r of rounds) {
      const today = r.flat();
      expect(new Set(today).size).toBe(today.length); // nobody twice in a round
      for (const [h, a] of r) seen.add(`${h}>${a}`);
    }
    expect(seen.size).toBe(n * (n - 1));
    // Balanced home games: each club hosts n-1 over the double round.
    for (const c of clubs) expect(rounds.flat().filter(([h]) => h === c)).toHaveLength(n - 1);
    // Single round: home count differs by at most one between clubs.
    const single = roundRobin(clubs, 1, 99).flat();
    const homes = clubs.map((c) => single.filter(([h]) => h === c).length);
    expect(Math.max(...homes) - Math.min(...homes)).toBeLessThanOrEqual(1);
  });

  it('same seed, same fixtures; another seed, another order', () => {
    const clubs = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(roundRobin(clubs, 2, 1)).toEqual(roundRobin(clubs, 2, 1));
    expect(roundRobin(clubs, 2, 1)).not.toEqual(roundRobin(clubs, 2, 2));
  });
});

describe('MC-169 standings with tie-breakers in order', () => {
  const order = (games: Played[], clubs: string[], breakers = [...cbf]) =>
    standings(clubs, games, { points: pts, tieBreakers: breakers, seed: 5 }).map((r) => r.clubId);

  it('points first', () => {
    expect(order([g('a', 'b', 0, 1)], ['a', 'b'])).toEqual(['b', 'a']);
  });

  it('wins break a tie on points', () => {
    // a: 1 win 1 loss = 3; b: 3 draws = 3.
    const games = [
      g('a', 'x', 1, 0),
      g('a', 'y', 0, 1),
      g('b', 'x', 0, 0),
      g('b', 'y', 0, 0),
      g('b', 'z', 0, 0),
    ];
    expect(order(games, ['b', 'a', 'x', 'y', 'z']).slice(0, 3)).toEqual(['y', 'a', 'b']);
  });

  it('goal difference, then goals for', () => {
    const gd = [g('a', 'x', 3, 0), g('b', 'y', 1, 0)];
    expect(order(gd, ['b', 'a', 'x', 'y']).slice(0, 2)).toEqual(['a', 'b']);
    const gf = [g('a', 'x', 3, 2), g('b', 'y', 1, 0)];
    expect(order(gf, ['b', 'a', 'x', 'y']).slice(0, 2)).toEqual(['a', 'b']);
  });

  it('head to head only between two tied clubs', () => {
    // Clean case: identical records, meeting won by b.
    const clean = [g('a', 'b', 0, 1), g('a', 'y', 1, 0), g('b', 'z', 0, 1), g('y', 'z', 0, 0)];
    // z 4 pts; a and b 3 pts, 1 win, GD 0, 1 goal each; b won the meeting.
    expect(order(clean, ['a', 'b', 'y', 'z'])).toEqual(['z', 'b', 'a', 'y']);
    // Three tied in a cycle: head to head skipped, goes on to the next criterion.
    const cycle = [g('a', 'b', 1, 0), g('b', 'c', 1, 0), g('c', 'a', 1, 0)];
    const reds: Played['cards'] = [
      [0, 1],
      [0, 0],
    ];
    const withCards = [...cycle, g('a', 'q', 0, 0, reds), g('b', 'q', 0, 0), g('c', 'q', 0, 0)];
    const r = order(withCards, ['a', 'b', 'c', 'q']);
    expect(r[2]).toBe('a'); // a has the red card; b and c then go to yellow cards and the draw
    expect(r.slice(0, 2).sort()).toEqual(['b', 'c']);
  });

  it('red cards, then yellow cards (fewer is better)', () => {
    const red = [
      g('a', 'x', 0, 0, [
        [0, 1],
        [0, 0],
      ]),
      g('b', 'y', 0, 0),
    ];
    expect(order(red, ['a', 'b', 'x', 'y'], ['redCards']).at(-1)).toBe('a');
    const yellow = [
      g('a', 'x', 0, 0, [
        [3, 0],
        [0, 0],
      ]),
      g('b', 'y', 0, 0, [
        [1, 0],
        [0, 0],
      ]),
    ];
    expect(order(yellow, ['a', 'b', 'x', 'y'], ['redCards', 'yellowCards']).slice(2)).toEqual([
      'b',
      'a',
    ]);
  });

  it('draw is seeded: same seed, same order', () => {
    const clubs = ['a', 'b', 'c', 'd', 'e'];
    const a = standings(clubs, [], { points: pts, tieBreakers: ['draw'], seed: 1 }).map(
      (r) => r.clubId,
    );
    const b = standings(clubs, [], { points: pts, tieBreakers: ['draw'], seed: 1 }).map(
      (r) => r.clubId,
    );
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(5);
  });

  it('carried rows start the table (points carry to the next phase)', () => {
    const start = standings(['a', 'b'], [g('a', 'b', 1, 0)], {
      points: pts,
      tieBreakers: [],
      seed: 1,
    });
    const next = standings(['a', 'b'], [g('a', 'b', 0, 1)], {
      points: pts,
      tieBreakers: ['goalsFor'],
      seed: 1,
      carry: start,
    });
    expect(next.map((r) => [r.clubId, r.points, r.played])).toEqual([
      ['a', 3, 2],
      ['b', 3, 2],
    ]);
  });
});
