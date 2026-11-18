import { describe, expect, it } from 'vitest';
import {
  advance,
  bracketTable,
  decideTie,
  deciderRules,
  legsOf,
  startBracket,
  type LegResult,
} from './knockout';

const e8 = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
const leg = (
  home: string,
  away: string,
  h: number,
  a: number,
  shootout: [number, number] | null = null,
): LegResult => ({
  home,
  away,
  goals: [h, a],
  shootout,
});

describe('MC-171 pairing and bracket', () => {
  it('seeded: 1 v N; fixed: in entrant order; draw: reproducible', () => {
    const pairs = (b: ReturnType<typeof startBracket>) => b.rounds[0]!.map((t) => [t.a, t.b]);
    expect(pairs(startBracket(e8, 'seeded', 1))).toEqual([
      ['s1', 's8'],
      ['s4', 's5'],
      ['s2', 's7'],
      ['s3', 's6'],
    ]); // bracket order: 1 and 2 only meet in the final
    expect(pairs(startBracket(e8, 'fixed', 1))[0]).toEqual(['s1', 's2']);
    const d = pairs(startBracket(e8, 'draw', 4));
    expect(pairs(startBracket(e8, 'draw', 4))).toEqual(d);
    expect(d.flat().sort()).toEqual(e8);
    // The better seed is always listed first.
    for (const [a, b] of d) expect(e8.indexOf(a!)).toBeLessThan(e8.indexOf(b!));
  });

  it('runs to the survivors; the table ranks by round reached, then seed', () => {
    let b = startBracket(e8, 'seeded', 1);
    // Lower seed always wins.
    const play = () => b.rounds.at(-1)!.forEach((t) => (t.winner = t.b));
    play();
    b = advance(b, 1);
    expect(b.rounds).toHaveLength(2);
    expect(b.rounds[1]!.map((t) => [t.a, t.b])).toEqual([
      ['s5', 's8'], // winners of ties 1 and 2 meet; s5 is the better seed
      ['s6', 's7'],
    ]);
    play();
    b = advance(b, 1);
    play();
    expect(advance(b, 1)).toBe(b); // done: one survivor
    expect(bracketTable(b)).toEqual(['s8', 's7', 's5', 's6', 's1', 's2', 's3', 's4']);
    // Série B play-off: four clubs, two survivors, one round.
    const p = startBracket(['b3', 'b4', 'b5', 'b6'], 'seeded', 1);
    p.rounds[0]!.forEach((t) => (t.winner = t.a));
    expect(advance(p, 2)).toBe(p);
    expect(bracketTable(p)).toEqual(['b3', 'b4', 'b5', 'b6']);
  });

  it('refuses a bracket that cannot reach the survivors', () => {
    expect(() => startBracket(['a', 'b', 'c'], 'seeded', 1)).toThrow();
  });
});

describe('MC-171 host and match rules', () => {
  const better = (a: string, b: string) => (a < b ? a : b);
  it('better campaign hosts the single game and the second leg', () => {
    expect(legsOf({ a: 'x', b: 'y' }, 1, 'betterCampaign', 1, better)).toEqual([['x', 'y']]);
    expect(legsOf({ a: 'y', b: 'x' }, 2, 'betterCampaign', 1, better)).toEqual([
      ['y', 'x'],
      ['x', 'y'],
    ]);
    expect(legsOf({ a: 'x', b: 'y' }, 1, 'fixed', 1, better)).toEqual([['x', 'y']]);
    const drawn = legsOf({ a: 'x', b: 'y' }, 1, 'draw', 9, better);
    expect(legsOf({ a: 'x', b: 'y' }, 1, 'draw', 9, better)).toEqual(drawn);
  });

  it('extra time and penalties go to the engine only in a single game', () => {
    expect(deciderRules(1, ['extraTime', 'penalties'])).toEqual({
      extraTime: true,
      penalties: true,
    });
    expect(deciderRules(1, ['penalties'])).toEqual({ extraTime: false, penalties: true });
    // Two legs: the engine sees one match, not the aggregate.
    expect(deciderRules(2, ['extraTime', 'penalties'])).toEqual({
      extraTime: false,
      penalties: false,
    });
  });
});

describe('MC-171 deciding a tie, one case per rule', () => {
  const tie = { a: 'x', b: 'y' };
  it('aggregate', () => {
    const r = decideTie(tie, [leg('y', 'x', 2, 0), leg('x', 'y', 3, 0)], ['penalties'], 1);
    expect(r).toEqual({ winner: 'x', by: 'aggregate' });
  });

  it('away goals only when listed', () => {
    const legs = [leg('y', 'x', 2, 1), leg('x', 'y', 1, 0)];
    expect(decideTie(tie, legs, ['awayGoals', 'penalties'], 1)).toEqual({
      winner: 'x',
      by: 'awayGoals',
    });
    expect(decideTie(tie, legs, ['penalties'], 1).by).toBe('penaltyDraw');
  });

  it('extra time in a single game: the score after 120 minutes decides', () => {
    expect(decideTie(tie, [leg('x', 'y', 2, 1)], ['extraTime', 'penalties'], 1)).toEqual({
      winner: 'x',
      by: 'aggregate',
    });
  });

  it('penalties from the engine shoot-out', () => {
    const r = decideTie(tie, [leg('x', 'y', 1, 1, [3, 4])], ['extraTime', 'penalties'], 1);
    expect(r).toEqual({ winner: 'y', by: 'penalties' });
  });

  it('penalties without an engine shoot-out: seeded draw, reproducible, marked', () => {
    const legs = [leg('y', 'x', 0, 0), leg('x', 'y', 1, 1)];
    const a = decideTie(tie, legs, ['penalties'], 11);
    expect(a.by).toBe('penaltyDraw');
    expect(decideTie(tie, legs, ['penalties'], 11)).toEqual(a);
    const winners = new Set(
      Array.from({ length: 20 }, (_, s) => decideTie(tie, legs, ['penalties'], s).winner),
    );
    expect(winners).toEqual(new Set(['x', 'y']));
  });

  it('better campaign: the better seed goes through on a level aggregate', () => {
    const legs = [leg('y', 'x', 1, 0), leg('x', 'y', 1, 0)];
    expect(decideTie(tie, legs, ['betterCampaign'], 1)).toEqual({
      winner: 'x',
      by: 'betterCampaign',
    });
  });

  it('extra time over two legs is skipped (engine contract), the next rule decides', () => {
    const legs = [leg('y', 'x', 1, 0), leg('x', 'y', 1, 0)];
    expect(decideTie(tie, legs, ['extraTime', 'betterCampaign'], 1)).toEqual({
      winner: 'x',
      by: 'betterCampaign',
    });
  });
});
