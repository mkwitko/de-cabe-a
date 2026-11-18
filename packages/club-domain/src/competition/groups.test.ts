import { describe, expect, it } from 'vitest';
import { drawGroups, groupFixtures, select } from './groups';
import { standings, type Played } from './league';

const clubs = Array.from({ length: 12 }, (_, i) => `c${String(i).padStart(2, '0')}`);
const pts = { win: 3, draw: 1, loss: 0 };
const breakers = ['wins', 'goalDifference', 'goalsFor', 'draw'] as const;
const g = (home: string, away: string, hg: number, ag: number): Played => ({
  home,
  away,
  goals: [hg, ag],
  cards: [
    [0, 0],
    [0, 0],
  ],
});

describe('MC-170 group draw', () => {
  it('pots: one club from each pot in every group, reproducible', () => {
    const groups = drawGroups(clubs, 3, 'pots', 7);
    expect(groups).toHaveLength(3);
    for (const grp of groups) {
      expect(grp).toHaveLength(4);
      const pots = grp.map((c) => Math.floor(clubs.indexOf(c) / 3)).sort();
      expect(pots).toEqual([0, 1, 2, 3]);
    }
    expect(drawGroups(clubs, 3, 'pots', 7)).toEqual(groups);
  });

  it('regional keeps neighbours together; random spreads everyone once', () => {
    const region = (c: string) => (Number(c.slice(1)) % 2 ? 'N' : 'S');
    const reg = drawGroups(clubs, 2, 'regional', 1, region);
    expect(reg.map((grp) => new Set(grp.map(region)).size)).toEqual([1, 1]);
    const rnd = drawGroups(clubs, 4, 'random', 3);
    expect(rnd.flat().sort()).toEqual(clubs);
    expect(rnd.map((x) => x.length)).toEqual([3, 3, 3, 3]);
  });
});

describe('MC-170 group fixtures', () => {
  it('own group: round robin inside each group, nobody twice per round', () => {
    const groups = [clubs.slice(0, 4), clubs.slice(4, 8)];
    const rounds = groupFixtures(groups, 2, 'own', 1);
    expect(rounds).toHaveLength(6);
    for (const r of rounds) {
      expect(r).toHaveLength(4);
      expect(new Set(r.flat()).size).toBe(8);
      for (const [h, a] of r) expect(groups.some((x) => x.includes(h) && x.includes(a))).toBe(true);
    }
  });

  it('against the other group (Copa Sul-Sudeste): every A meets every B once per leg', () => {
    const groups = [clubs.slice(0, 6), clubs.slice(6, 12)];
    const rounds = groupFixtures(groups, 1, 'other', 1);
    expect(rounds).toHaveLength(6);
    const pairs = new Set(rounds.flat().map(([h, a]) => [h, a].sort().join()));
    expect(pairs.size).toBe(36);
    for (const [h, a] of rounds.flat())
      expect(groups[0]!.includes(h) !== groups[0]!.includes(a)).toBe(true);
    const homes = groups[0]!.map((c) => rounds.flat().filter(([h]) => h === c).length);
    expect(Math.max(...homes) - Math.min(...homes)).toBeLessThanOrEqual(1);
  });
});

describe('MC-170 qualifiers', () => {
  // Group A: a1 > a2 > a3 > a4 ; group B: b1 > b2 > b3 > b4. Third places: a3 and b3 3 pts; a3 has the better goal difference.
  const A = ['a1', 'a2', 'a3', 'a4'];
  const B = ['b1', 'b2', 'b3', 'b4'];
  const games: Played[] = [
    g('a1', 'a2', 1, 0),
    g('a1', 'a3', 1, 0),
    g('a1', 'a4', 1, 0),
    g('a2', 'a3', 1, 0),
    g('a2', 'a4', 1, 0),
    g('a3', 'a4', 1, 0),
    g('b1', 'b2', 2, 0),
    g('b1', 'b3', 2, 0),
    g('b1', 'b4', 1, 0),
    g('b2', 'b3', 1, 0),
    g('b2', 'b4', 1, 0),
    g('b3', 'b4', 1, 0),
  ];
  const rules = { points: pts, tieBreakers: [...breakers], seed: 1 };
  const tables = [standings(A, games, rules), standings(B, games, rules)];

  it('first two of each group, ordered by campaign', () => {
    // b1 has the better goal difference among the winners.
    expect(select(tables, { positions: [1, 2] }, rules)).toEqual(['b1', 'a1', 'a2', 'b2']);
  });

  it('best third-placed across groups', () => {
    expect(select(tables, { positions: [3, 3], best: 1 }, rules)).toEqual(['a3']);
  });
});
