/**
 * Exchange rates (04 §4.7): the real floats against the dollar and the euro, month by month. A
 * foreign club prices a player in its own money, so when the real falls a sale abroad brings
 * more reais home and a signing from abroad costs more of them. Each month the rate moves by a
 * shock common to both (the real's own news) and one of each currency, drifts with the gap
 * between Brazilian and foreign inflation and is pulled back towards that trend, so thirty
 * years never wander off to nonsense. The path is a fixed function of the career's seed, so a
 * loaded career walks the same rates without saving them.
 *
 * Calibrated on the Banco Central's PTAX, Dec 2016 to Nov 2026 (SGS 1 and 21619): the dollar and
 * the euro moved 3.9% and 3.5% a month (standard deviation) and the real lost about 6% a year,
 * much of it in 2020. Every number is a PARÂMETRO.
 */
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { isoOf } from '../competition/calendar';

export const CURRENCIES = ['USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Reais for one unit, times 10 000, when a career opens: PTAX of 18 Nov 2026. */
export const OPENING: Record<Currency, number> = { USD: 58_102, EUR: 63_720 };
/** The trend, parts per million a month: about 3% a year, Brazil's inflation over the world's. */
const DRIFT = 2_500;
/** The shocks: a sum of three draws less 1.5 (sd 0.5), times these, in parts per million. */
const COMMON = 64_000;
const OWN = 36_000;
/** Percent of the distance to the trend closed each month. */
const PULL = 3;

/** Months since year 0, January being 0. */
const monthOf = (day: number) => {
  const iso = isoOf(day);
  return Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
};

const shock = (seed: number, label: string) => {
  const r = fork(rngFrom(seed), label);
  return next(r) + next(r) + next(r) - 1.5;
};

/** Each career's rates so far, and the trend they are pulled to, month by month. */
const paths = new Map<string, { rate: number[]; trend: number[] }>();

/**
 * Reais per unit of `currency` (times 10 000) in the month of `day`, for a career with `seed`
 * that opened in January of `year`. Before that month, the opening rate.
 */
export function rateOn(seed: number, year: number, currency: Currency, day: number): number {
  const key = `${seed}:${year}:${currency}`;
  let path = paths.get(key);
  if (!path) {
    // ponytail: whole memo dropped past 2 000 careers; an LRU if servers ever hold more.
    if (paths.size > 2_000) paths.clear();
    paths.set(key, (path = { rate: [OPENING[currency]], trend: [OPENING[currency]] }));
  }
  const m = monthOf(day) - year * 12;
  if (m <= 0) return OPENING[currency];
  const { rate, trend } = path;
  for (let k = rate.length; k <= m; k++) {
    // Only + - * / (ADR-020): every browser walks the same rates.
    trend.push((trend[k - 1]! * (1e6 + DRIFT)) / 1e6);
    const gap = (rate[k - 1]! / trend[k]! - 1) * 1e6;
    const month = year * 12 + k;
    const ppm =
      DRIFT +
      shock(seed, `fx:${month}`) * COMMON +
      shock(seed, `fx:${currency}:${month}`) * OWN -
      (gap * PULL) / 100;
    rate.push(Math.round((rate[k - 1]! * (1e6 + ppm)) / 1e6));
  }
  return rate[m]!;
}

/** The career's opening year: its first season. */
export const openingYear = (w: {
  log?: readonly { season: number }[];
  season: { season: number };
}) => w.log?.[0]?.season ?? w.season.season;

/** Reais per unit of `currency` (times 10 000) on `day` of this career. */
export const rateOf = (
  w: { seed: number; day: number; log?: readonly { season: number }[]; season: { season: number } },
  currency: Currency,
  day = w.day,
) => rateOn(w.seed, openingYear(w), currency, day);

/**
 * An amount in reais at the opening rate, as it stands today: the same money in `currency`,
 * brought back at this month's rate.
 */
export const atRate = (
  w: Parameters<typeof rateOf>[0],
  currency: Currency,
  amount: number,
  day = w.day,
) => Math.round((amount * rateOf(w, currency, day)) / OPENING[currency]);

/** Europe pays in euros; the Gulf, Asia, the United States and South America in dollars. */
const EUROPE = new Set(
  'PT ES IT FR DE GB EN NL BE CH AT GR TR RU UA PL CZ HR RS DK SE NO IE SC'.split(' '),
);
export const currencyOfNation = (nation: string): Currency => (EUROPE.has(nation) ? 'EUR' : 'USD');
