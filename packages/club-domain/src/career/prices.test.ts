import { describe, expect, it } from 'vitest';
import { PRICE_BASE, nextPrices, pricesOf } from './prices';

describe('inflation (04 §4.7)', () => {
  it('draws a rate of 3% to 7% each season; wages run a point ahead of prices', () => {
    let now = pricesOf({});
    expect(now.prices).toBe(PRICE_BASE);
    for (let year = 2027; year < 2047; year++) {
      const next = nextPrices(7, year, now);
      expect(next.rate).toBeGreaterThanOrEqual(30);
      expect(next.rate).toBeLessThanOrEqual(70);
      expect(next.prices).toBeGreaterThan(now.prices);
      expect(next.wages * now.prices).toBeGreaterThan(next.prices * now.wages);
      expect(nextPrices(7, year, now)).toEqual(next);
      now = next;
    }
    // Twenty years at 3% to 7% a year.
    expect(now.prices).toBeGreaterThan(PRICE_BASE * 1.8);
    expect(now.prices).toBeLessThan(PRICE_BASE * 3.9);
  });
});
