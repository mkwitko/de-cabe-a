import { describe, expect, it } from 'vitest';
import { clearWinner } from './higher-lower-snapshot';

describe('clearWinner (Quem fez mais? fairness)', () => {
  it('holds even if one number counts all competitions and the other only the league', () => {
    expect(clearWinner(786, 619)).toBe(false); // Totti: all competitions vs league, same player
    expect(clearWinner(100, 75)).toBe(false); // 33% apart: could flip
    expect(clearWinner(200, 140)).toBe(true);
    expect(clearWinner(5, 2)).toBe(false); // needs 5 more
    expect(clearWinner(12, 7)).toBe(true);
  });
});
