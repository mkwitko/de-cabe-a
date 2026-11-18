/**
 * What a player is worth (07 §1). There is no single price read off his attributes:
 *
 * - his **market value** is what the market would pay today: the going wage for his level, more
 *   months of it the better and the younger he is, more again for what he may still become, less as his
 *   contract runs out;
 * - his **sporting value** to one club is how much he helps that club (plan.ts, deals.ts).
 *
 * Everything is read from the pack: the going wage for a level is the median wage the pack's
 * clubs pay players of that level, so values follow the pack's own economy. Exact arithmetic
 * only (ADR-020). Every number is a PARÂMETRO, not calibrated.
 */
import type { Pack, PackPlayer } from '../pack/schema';
import { bestRoles } from '../player/ratings';
import { WHOLE, cached } from '../lib/pack-cache';

/** What the market reads of a player, cached per pack object (a transfer makes a new pack). */
export interface Reading {
  /** His best role's rating, 1..99. */
  level: number;
  /** Where his attributes may get to, on the same scale. */
  ceiling: number;
  keeper: boolean;
}

export function readingsOf(pack: Pack): Map<string, Reading> {
  // Attributes do not change with a transfer: one reading for the whole pack, carried on.
  return cached(pack, 'readings', WHOLE, () => {
    const by = new Map<string, Reading>();
    for (const p of pack.players) {
      const c = p.potential.ceiling;
      by.set(p.id, {
        level: bestRoles(p.attributes, 1)[0]!.rating,
        ceiling: Math.round((c.technical + c.mental + c.physical) / 3),
        keeper: p.positions.some((x) => x.position === 'GK'),
      });
    }
    return by;
  });
}

export const ageOf = (p: PackPlayer, season: number) => season - Number(p.birthDate.slice(0, 4));
export const thousands = (x: number) => Math.round(x / 1000) * 1000;

/**
 * The going monthly wage for each level, 0..99: the median of what the pack's clubs pay players
 * of that level, made non-decreasing and filled where no player sits.
 */
export function goingWages(pack: Pack): number[] {
  // Read once from the pack the career opened with and carried on: the market's yardstick
  // does not move with each signing.
  return cached(pack, 'goingWages', WHOLE, () => {
    const by: number[][] = Array.from({ length: 100 }, () => []);
    const read = readingsOf(pack);
    for (const p of pack.players)
      if (p.clubId && p.contract) by[read.get(p.id)!.level]!.push(p.contract.wage);
    const table = by.map((ws) => (ws.length ? ws.sort((a, b) => a - b)[ws.length >> 1]! : 0));
    // Fill the gaps from below, then keep it from ever going down as the level rises.
    for (let l = 1; l < 100; l++) table[l] = Math.max(table[l]!, table[l - 1]!);
    const first = table.find((x) => x > 0) ?? 0;
    for (let l = 0; l < 100 && table[l] === 0; l++) table[l] = first;
    return table;
  });
}
export const goingWage = (pack: Pack, level: number) =>
  goingWages(pack)[Math.max(0, Math.min(99, level))]!;

/**
 * Months of the going wage a player in his prime is worth, by level: a squad player sells for
 * about a year of wages, a Série A starter for six, the league's best for eight (fewer months past 69: the going wage itself climbs steeply there). PARÂMETRO,
 * fitted on the FM26 save's transfer values of Brazilian players (median per level and age,
 * 2026-11-18): the old flat 12 months left a Série A starter at a tenth of what FM prices him.
 */
const LEVEL_MONTHS: readonly [number, number][] = [
  [57, 10],
  [60, 13],
  [63, 35],
  [66, 75],
  [69, 95],
  [74, 45],
];
/** Percent of the prime months by age, same fit: youth sells on promise, veterans hold to 33. */
const AGE_PERCENT: readonly [number, number][] = [
  [19, 600],
  [21, 400],
  [23, 160],
  [33, 100],
  [36, 30],
  [99, 10],
];

function monthsFor(level: number, age: number): number {
  const first = LEVEL_MONTHS[0]!;
  let months = first[1];
  for (let i = 1; i < LEVEL_MONTHS.length; i++) {
    const [l0, m0] = LEVEL_MONTHS[i - 1]!;
    const [l1, m1] = LEVEL_MONTHS[i]!;
    if (level >= l1) months = m1;
    else if (level > l0) months = m0 + Math.round(((m1 - m0) * (level - l0)) / (l1 - l0));
  }
  const pct = AGE_PERCENT.find(([until]) => age <= until)![1];
  return Math.round((months * pct) / 100);
}

/** Whole years left on a contract on 1 January of `season`; 0 when it ends that year. */
export const yearsLeft = (p: PackPlayer, season: number) =>
  p.contract ? Math.max(0, Number(p.contract.until.slice(0, 4)) - season) : 0;

/**
 * Market value: the going wage for his level × months by age × what he may still grow (only
 * while young) × what his contract still protects. In hundredths to stay exact.
 */
/** A player object does not change (a move makes a new one): his value is read once a season. */
const values = new WeakMap<PackPlayer, { season: number; value: number }>();

export function marketValue(pack: Pack, p: PackPlayer, season: number): number {
  const known = values.get(p);
  if (known?.season === season) return known.value;
  const value = readValue(pack, p, season);
  values.set(p, { season, value });
  return value;
}

function readValue(pack: Pack, p: PackPlayer, season: number): number {
  const r = readingsOf(pack).get(p.id)!;
  const age = ageOf(p, season);
  // Up to +100% for 20 points of room at 21 or under, fading to nothing at 27.
  const room = Math.max(0, r.ceiling - r.level);
  const young = Math.max(0, Math.min(6, 27 - age));
  const promise = 100 + Math.round((Math.min(room, 20) * 5 * young) / 6);
  const left = yearsLeft(p, season);
  const contract = left >= 3 ? 100 : left === 2 ? 88 : left === 1 ? 65 : 35;
  return thousands((goingWage(pack, r.level) * monthsFor(r.level, age) * promise * contract) / 10_000);
}

/**
 * The level a club expects him to play at in `years`: toward his ceiling until his peak age,
 * sliding after it. PARÂMETRO: 1.5 points lost a year past the peak.
 */
export function levelIn(pack: Pack, p: PackPlayer, season: number, years: number): number {
  const r = readingsOf(pack).get(p.id)!;
  const age = ageOf(p, season);
  const peak = p.potential.peakAge;
  const rising = Math.max(0, Math.min(years, peak - age));
  const toPeak = Math.max(1, peak - age);
  const grown = r.level + Math.round((Math.max(0, r.ceiling - r.level) * rising) / toPeak);
  const falling = Math.max(0, age + years - Math.max(age, peak));
  return Math.max(1, grown - Math.round((falling * 3) / 2));
}
