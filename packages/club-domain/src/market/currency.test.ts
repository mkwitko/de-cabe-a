import { expect, it } from 'vitest';
import { dayOf } from '../competition/calendar';
import { OPENING, rateOn } from './currency';

const months = (seed: number, currency: 'USD' | 'EUR', n: number) =>
  Array.from({ length: n }, (_, k) =>
    rateOn(
      seed,
      2027,
      currency,
      dayOf(`${2027 + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}-15`),
    ),
  );

it('opens at the PTAX and walks the same path for the same seed', () => {
  expect(rateOn(5, 2027, 'USD', dayOf('2027-01-20'))).toBe(OPENING.USD);
  expect(months(5, 'EUR', 120)).toEqual(months(5, 'EUR', 120));
  expect(months(5, 'USD', 60)).not.toEqual(months(6, 'USD', 60));
});

it('moves like the real: about 3.5-4% a month, dollar and euro together, no wandering off', () => {
  const sds: number[] = [];
  let together = 0;
  let pairs = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const usd = months(seed, 'USD', 360);
    const eur = months(seed, 'EUR', 360);
    const r = usd.slice(1).map((x, k) => Math.log(x / usd[k]!));
    const e = eur.slice(1).map((x, k) => Math.log(x / eur[k]!));
    const mean = r.reduce((a, b) => a + b, 0) / r.length;
    sds.push(Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length));
    for (let k = 0; k < r.length; k++, pairs++)
      if (Math.sign(r[k]!) === Math.sign(e[k]!)) together++;
    // Thirty years on, within a band around a 3% a year trend (x2.4).
    const end = usd.at(-1)! / OPENING.USD;
    expect(end).toBeGreaterThan(1);
    expect(end).toBeLessThan(6);
  }
  const sd = sds.reduce((a, b) => a + b, 0) / sds.length;
  expect(sd).toBeGreaterThan(0.03);
  expect(sd).toBeLessThan(0.045);
  expect(together / pairs).toBeGreaterThan(0.7);
});
