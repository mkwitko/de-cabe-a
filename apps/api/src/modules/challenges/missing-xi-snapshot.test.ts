import { describe, expect, it } from 'vitest';
import { pickHidden } from './missing-xi-snapshot';

const slots = [
  { playerId: 'gk', tier: 'T2' as const },
  { playerId: null, tier: null },
  { playerId: 'a', tier: 'T3' as const },
  { playerId: 'b', tier: 'T1' as const },
  { playerId: 'c', tier: 'T1' as const },
  { playerId: 'd', tier: 'T3' as const },
  { playerId: 'e', tier: 'T2' as const },
  { playerId: 'f', tier: 'T3' as const },
  { playerId: 'g', tier: 'T3' as const },
  { playerId: null, tier: null },
  { playerId: 'h', tier: 'T3' as const },
];

describe('pickHidden', () => {
  it('hides the most notable linked players first: 5 on tier 1, 7 on tier 2, all on tier 3', () => {
    expect([...pickHidden(slots, 1)].sort((x, y) => x - y)).toEqual([0, 2, 3, 4, 6]);
    expect(pickHidden(slots, 2).size).toBe(7);
    const all = pickHidden(slots, 3);
    expect(all.size).toBe(9);
    expect(all.has(1) || all.has(9)).toBe(false);
  });
});
