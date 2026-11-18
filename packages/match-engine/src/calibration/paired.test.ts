import { describe, expect, it } from 'vitest';
import { bootstrap } from './paired';

describe('paired bootstrap', () => {
  it('a constant change has no spread', () => {
    expect(bootstrap(Array(50).fill(0.5))).toEqual([0.5, 0.5, 0.5]);
  });
  it('a centred change straddles zero and is deterministic', () => {
    const d = Array.from({ length: 200 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const [m, lo, hi] = bootstrap(d);
    expect(m).toBe(0);
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(0);
    expect(bootstrap(d)).toEqual([m, lo, hi]);
  });
});
