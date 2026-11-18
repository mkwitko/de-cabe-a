/**
 * Inflation (04 §4.7): every season the world draws its own consumer price rate, 3% to 7% and
 * half remembered from the year before, and the money of the game follows it: TV, sponsors,
 * tickets, prizes, works, and the going wage of the market, which in football runs a point
 * ahead of prices. Contracts already signed stay as written; the next renewal or signing pays
 * the new price. The indices are kept in the season's log (`SeasonLog`), so a loaded career
 * walks the same prices. Integers; the base of an index is `PRICE_BASE`; every number is a PARÂMETRO.
 */
import { fork, pick, rngFrom } from '@decabeca/match-engine';
import type { CareerWorld } from './advance';
import type { SeasonLog } from './development';

/** An index of 10 000 is the price of the season the career opened in. */
export const PRICE_BASE = 10_000;
/** The yearly rate, in tenths of a percent: 3.0% to 7.0%. */
const RATE_MIN = 30;
const RATE_MAX = 70;
/** Football wages run this much a year (tenths of a percent) ahead of prices. */
const WAGE_PREMIUM = 10;

export interface Prices {
  /** This season's price rate, tenths of a percent. */
  rate: number;
  /** Prices against the opening season. */
  prices: number;
  /** The market's wages against the opening season. */
  wages: number;
}

const OPENING: Prices = { rate: 45, prices: PRICE_BASE, wages: PRICE_BASE };

/** Prices of the season after `log`'s, or of the opening season with no log. */
const pricesIn = (log: readonly SeasonLog[]): Prices => {
  const last = log.at(-1);
  return last?.prices && last.wages && last.rate
    ? { rate: last.rate, prices: last.prices, wages: last.wages }
    : OPENING;
};

/** The prices the season now being played stands at. */
export const pricesOf = (w: Pick<CareerWorld, 'log'>): Prices => pricesIn(w.log ?? []);

/** The next season's prices: a new rate drawn and both indices carried a year on. */
export function nextPrices(seed: number, year: number, now: Prices): Prices {
  const drawn = RATE_MIN + pick(fork(rngFrom(seed), `prices:${year}`), RATE_MAX - RATE_MIN + 1);
  const rate = Math.round((now.rate + drawn) / 2);
  return {
    rate,
    prices: Math.round((now.prices * (1000 + rate)) / 1000),
    wages: Math.round((now.wages * (1000 + rate + WAGE_PREMIUM)) / 1000),
  };
}

/** An amount at the opening season's prices, brought to an index. */
export const priced = (amount: number, index: number) => Math.round((amount * index) / PRICE_BASE);
