/**
 * What a player is worth (07 §1). There is no single price read off his attributes:
 *
 * - his **market value** is what the market would pay today: the going wage for his level, more
 *   months of it the younger he is, more again for what he may still become, less as his
 *   contract runs out;
 * - his **sporting value** to one club is how much he helps that club (plan.ts, deals.ts).
 *
 * Everything is read from the pack: the going wage for a level is the median wage the pack's
 * clubs pay players of that level, so values follow the pack's own economy. Exact arithmetic
 * only (ADR-020). Every number is a PARÂMETRO, not calibrated.
 */
import type { Pack, PackPlayer } from '../pack/schema';
import { bestRoles } from '../player/ratings';

/** What the market reads of a player, cached per pack object (a transfer makes a new pack). */
export interface Reading {
  /** His best role's rating, 1..99. */
  level: number;
  /** Where his attributes may get to, on the same scale. */
  ceiling: number;
  keeper: boolean;
}

const readings = new WeakMap<Pack, Map<string, Reading>>();
export function readingsOf(pack: Pack): Map<string, Reading> {
  let by = readings.get(pack);
  if (!by) {
    by = new Map();
    for (const p of pack.players) {
      const c = p.potential.ceiling;
      by.set(p.id, {
        level: bestRoles(p.attributes, 1)[0]!.rating,
        ceiling: Math.round((c.technical + c.mental + c.physical) / 3),
        keeper: p.positions.some((x) => x.position === 'GK'),
      });
    }
    readings.set(pack, by);
  }
  return by;
}

export const ageOf = (p: PackPlayer, season: number) => season - Number(p.birthDate.slice(0, 4));
export const thousands = (x: number) => Math.round(x / 1000) * 1000;

/**
 * The going monthly wage for each level, 0..99: the median of what the pack's clubs pay players
 * of that level, made non-decreasing and filled where no player sits.
 */
const wages = new WeakMap<Pack, number[]>();
export function goingWages(pack: Pack): number[] {
  let table = wages.get(pack);
  if (!table) {
    const by: number[][] = Array.from({ length: 100 }, () => []);
    const read = readingsOf(pack);
    for (const p of pack.players)
      if (p.clubId && p.contract) by[read.get(p.id)!.level]!.push(p.contract.wage);
    table = by.map((ws) => (ws.length ? ws.sort((a, b) => a - b)[ws.length >> 1]! : 0));
    // Fill the gaps from below, then keep it from ever going down as the level rises.
    for (let l = 1; l < 100; l++) table[l] = Math.max(table[l]!, table[l - 1]!);
    const first = table.find((x) => x > 0) ?? 0;
    for (let l = 0; l < 100 && table[l] === 0; l++) table[l] = first;
    wages.set(pack, table);
  }
  return table;
}
export const goingWage = (pack: Pack, level: number) =>
  goingWages(pack)[Math.max(0, Math.min(99, level))]!;

/** Months of the going wage a player is worth, by age: youth sells for more. */
const monthsFor = (age: number) =>
  age <= 21 ? 22 : age <= 24 ? 18 : age <= 28 ? 12 : age <= 31 ? 6 : 3;

/** Whole years left on a contract on 1 January of `season`; 0 when it ends that year. */
export const yearsLeft = (p: PackPlayer, season: number) =>
  p.contract ? Math.max(0, Number(p.contract.until.slice(0, 4)) - season) : 0;

/**
 * Market value: the going wage for his level × months by age × what he may still grow (only
 * while young) × what his contract still protects. In hundredths to stay exact.
 */
export function marketValue(pack: Pack, p: PackPlayer, season: number): number {
  const r = readingsOf(pack).get(p.id)!;
  const age = ageOf(p, season);
  // Up to +100% for 20 points of room at 21 or under, fading to nothing at 27.
  const room = Math.max(0, r.ceiling - r.level);
  const young = Math.max(0, Math.min(6, 27 - age));
  const promise = 100 + Math.round((Math.min(room, 20) * 5 * young) / 6);
  const left = yearsLeft(p, season);
  const contract = left >= 3 ? 100 : left === 2 ? 88 : left === 1 ? 65 : 35;
  return thousands((goingWage(pack, r.level) * monthsFor(age) * promise * contract) / 10_000);
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
