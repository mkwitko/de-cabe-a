import { describe, expect, it } from 'vitest';
import type { MatchEvent } from '../contract';
import { progressivePasses } from './summary';

// Events in metres ×10, team 0 attacks +x, team 1 attacks −x.
const ev = (kind: string, team: 0 | 1, x: number, y = 34, other: string | null = null) =>
  ({ kind, team, at: [x * 10, y * 10], otherId: other, data: {} }) as unknown as MatchEvent;
const pass = (team: 0 | 1, from: number, to: number, y = 34) => [
  ev('pass', team, from, y),
  ev('reception', team, to, y, 'passer'),
];

describe('progressive passes (FBref definition)', () => {
  it('counts a completed pass 10 yards nearer goal than the furthest of the last six', () => {
    const r = { events: [...pass(0, 50, 62), ...pass(0, 62, 66)] };
    // 50→62 is 12 m forward; 62→66 only 4 m beyond the furthest point.
    expect(progressivePasses(r)).toEqual([1, 0]);
  });
  it('skips passes from the defending 40% and counts any pass into the box', () => {
    const r = { events: [...pass(0, 20, 45), ...pass(0, 80, 90), ...pass(1, 30, 20)] };
    // 20→45 starts in the defending 40%; 80→90 enters the box; team 1 70→85 in its frame.
    expect(progressivePasses(r)).toEqual([1, 1]);
  });
  it('does not count an incomplete pass', () => {
    const r = { events: [ev('pass', 0, 50), ev('interception', 1, 70)] };
    expect(progressivePasses(r)).toEqual([0, 0]);
  });
});
