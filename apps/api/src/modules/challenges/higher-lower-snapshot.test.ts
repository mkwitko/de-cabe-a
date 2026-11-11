import { describe, expect, it } from 'vitest';
import { clearWinner, comparableGoals, evenDuel, maxRatio } from './higher-lower-snapshot';

describe('clearWinner (Quem fez mais? fairness)', () => {
  it('holds even if one number counts all competitions and the other only the league', () => {
    expect(clearWinner(786, 619)).toBe(false); // Totti: all competitions vs league, same player
    expect(clearWinner(100, 75)).toBe(false); // 33% apart: could flip
    expect(clearWinner(200, 140)).toBe(true);
    expect(clearWinner(5, 2)).toBe(false); // needs 5 more
    expect(clearWinner(12, 7)).toBe(true);
  });
});

describe('evenDuel (numbers close enough to be a question)', () => {
  it('loosens the upper bound on early levels only', () => {
    expect(maxRatio(1)).toBe(2.5);
    expect(maxRatio(20)).toBe(2.5);
    expect(maxRatio(21)).toBe(2);
    expect(maxRatio(60)).toBe(2);
    expect(maxRatio(61)).toBe(1.8);
  });
  it('keeps the lower bound and adds the upper one', () => {
    expect(evenDuel(100, 75, 1)).toBe(false); // too close, as before
    expect(evenDuel(250, 100, 1)).toBe(true); // 2.5× on level 1
    expect(evenDuel(250, 100, 21)).toBe(false); // over 2× on level 21
    expect(evenDuel(200, 100, 21)).toBe(true);
    expect(evenDuel(190, 100, 61)).toBe(false); // over 1.8× late
    expect(evenDuel(180, 100, 61)).toBe(true);
    expect(evenDuel(200, 0, 1)).toBe(false); // a striker's goals against a keeper's
  });
});

describe('comparableGoals (goals only between like players)', () => {
  const fw = (goals: number) => ({ position: 'FW' as const, goals });
  it('needs the same outfield position and 5+ goals each', () => {
    expect(comparableGoals(fw(40), fw(20))).toBe(true);
    expect(comparableGoals(fw(40), { position: 'MF', goals: 20 })).toBe(false);
    expect(comparableGoals({ position: 'GK', goals: 6 }, { position: 'GK', goals: 12 })).toBe(
      false,
    );
    expect(comparableGoals(fw(40), fw(4))).toBe(false);
    expect(comparableGoals({ position: null, goals: 40 }, { position: null, goals: 20 })).toBe(
      false,
    );
  });
});
