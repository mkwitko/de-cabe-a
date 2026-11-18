/**
 * A year passes for every player (03 §3): the young grow toward what they can become, the old
 * lose their legs and then leave the game, and each club's academy brings in a new crop. Run
 * once at each season's turn.
 *
 * How much a young player grows is not his alone: the club's training ground, the minutes he
 * played and the week the person trained him all move it (`growthOf`). No attribute is stored
 * in the snapshot: the career keeps, for each finished season, one character per player with
 * how much he grew that year (`SeasonLog`), and a loaded career runs the years again from the
 * pack it opened with. Everything else a year does (age, the year he had, retirement, the
 * academies' crop) comes from the seed. Integer arithmetic and the seeded generator
 * only (ADR-020); every number is a PARÂMETRO, not calibrated.
 */
import { ABROAD } from '../market/abroad';
import {
  GOALKEEPING,
  MENTAL,
  PHYSICAL,
  TACTICAL,
  TECHNICAL,
  fork,
  pick,
  rngFrom,
  type AttributeId,
} from '@decabeca/match-engine';
import { generateAttributes, generatePlayer, SQUAD } from '../generate/player';
import { WHOLE, cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { goingWage } from '../market/value';
import { bestRoles } from '../player/ratings';
import type { Intensity } from './training';

type Group = 'technical' | 'mental' | 'physical';
const GROUP = new Map<AttributeId, Group>([
  ...TECHNICAL.map((a) => [a, 'technical'] as const),
  ...GOALKEEPING.map((a) => [a, 'technical'] as const),
  ...MENTAL.map((a) => [a, 'mental'] as const),
  ...TACTICAL.map((a) => [a, 'mental'] as const),
  ...PHYSICAL.map((a) => [a, 'physical'] as const),
]);

/** A fixed number 0..99 for a player, a season and a purpose. */
function draw(seed: number, playerId: string, season: number, salt: number): number {
  let h = Math.imul(2166136261 ^ salt, 16777619) ^ seed ^ Math.imul(season, 40503);
  for (let i = 0; i < playerId.length; i++) h = Math.imul(h ^ playerId.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) % 100;
}

const clamp = (x: number) => Math.max(1, Math.min(99, x));
const ageIn = (p: PackPlayer, season: number) => season - Number(p.birthDate.slice(0, 4));

/** The legs peak before the rest: two years early, one on a late curve, three on an early one. */
const legsPeak = (p: PackPlayer) =>
  p.potential.peakAge -
  (p.potential.physicalCurve === 'early' ? 3 : p.potential.physicalCurve === 'late' ? 1 : 2);

/**
 * How hard he works at getting better, in percent, from who he is: professionalism most,
 * then ambition and resilience (each 1..20). About 60% for the idle to 125% for the driven.
 */
export const drive = (p: PackPlayer) =>
  55 +
  2 * p.personality.professionalism +
  p.personality.ambition +
  Math.round(p.personality.resilience / 2);

/**
 * The year he had, in percent: most are ordinary, one in six goes nowhere (a slump, a niggle,
 * a bad dressing room) and one in six is the year it all clicks.
 */
function year(seed: number, p: PackPlayer, season: number): number {
  const roll = draw(seed, p.id, season, 0);
  return roll < 16 ? 25 : roll >= 84 ? 170 : 80 + (roll % 5) * 10;
}

/**
 * One player a year older, at the start of `season`.
 *
 * His ceiling is what he may become, not what he will: each year he closes a share of the gap
 * to it, and that share is his talent for learning, times how hard he works (`drive`), times
 * the year he had, times `growth` (where he trained, how much he played, the week his coach
 * set: `growthOf`). The window shuts at his peak age. Measured on a crop followed to its peak:
 * an ordinary player in an ordinary club ends about two thirds of the way and one in fifty
 * gets within a tenth of his ceiling; well looked after, four fifths and nearly one in five;
 * neglected, under half and none. What age takes away none of this
 * changes.
 */
export function develop(p: PackPlayer, seed: number, season: number, growth = 100): PackPlayer {
  const age = ageIn(p, season);
  const peak = p.potential.peakAge;
  const legs = legsPeak(p);
  const out = { ...p.attributes };
  // All three factors in one percentage, so a point of rate stays a point.
  const effort = Math.round((drive(p) * year(seed, p, season) * growth) / 10_000);
  /** A share of what is left to the ceiling; a single point only now and then. */
  const gain = (gap: number, rate: number, roll: number, often: number) =>
    Math.max(roll < (often * effort) / 100 ? 1 : 0, Math.round((gap * rate * effort) / 10_000));
  let k = 0;
  for (const a of Object.keys(out) as AttributeId[]) {
    const group = GROUP.get(a) ?? 'technical';
    const roll = draw(seed, p.id, season, ++k);
    const v = out[a];
    if (group === 'physical') {
      if (age <= legs) {
        const gap = p.potential.ceiling.physical - v;
        if (gap > 0)
          out[a] = clamp(v + gain(gap, 9 + Math.round(p.potential.learning / 2), roll, 30));
      } else {
        // Past the peak the legs go: a point a year at first, two, then three.
        const past = age - legs;
        const loss =
          past <= 2 ? (roll < 50 ? 1 : 0) : past <= 5 ? (roll < 70 ? 2 : 1) : roll < 60 ? 3 : 2;
        out[a] = clamp(v - loss);
      }
      continue;
    }
    const ceiling = p.potential.ceiling[group];
    if (age <= peak) {
      const gap = ceiling - v;
      // 11% to 18% of the gap a year up to 21, 6% to 11% after: the early years are the ones.
      const rate =
        age <= 21
          ? 9 + Math.round(p.potential.learning / 2)
          : 5 + Math.round(p.potential.learning / 3);
      if (gap > 0) out[a] = clamp(v + gain(gap, rate, roll, 25));
    } else if (group === 'mental') {
      // Experience still adds a little for some years, then holds.
      if (age <= peak + 4 && v < ceiling && roll < 35) out[a] = clamp(v + 1);
    } else if (age > peak + 3) {
      // Technique fades late and slowly.
      if (roll < (age > peak + 6 ? 70 : 40)) out[a] = clamp(v - 1);
    }
  }
  return { ...p, attributes: out };
}

/**
 * True when he hangs up his boots before `season`: from 36 on, surer each year. Keepers go two
 * years later; players of the lowest levels, who never lived well off the game, up to three
 * years sooner.
 */
export function retires(p: PackPlayer, seed: number, season: number): boolean {
  const keeper = p.positions.some((x) => x.position === 'GK');
  const level = bestRoles(p.attributes, 1)[0]!.rating;
  const from = 36 + (keeper ? 2 : 0) - (level < 32 ? 3 : level < 42 ? 1 : 0);
  const over = ageIn(p, season) - from;
  return over >= 0 && draw(seed, p.id, season, 99) < (over + 1) * 25;
}

/** Each club's standing in the pack the career opened with: the median level of its squad. */
const baseLevels = (origin: Pack) =>
  cached(origin, 'baseLevels', WHOLE, () => {
    const by = new Map<string, number[]>();
    for (const p of origin.players)
      if (p.clubId)
        (by.get(p.clubId) ?? by.set(p.clubId, []).get(p.clubId)!).push(
          bestRoles(p.attributes, 1)[0]!.rating,
        );
    return new Map(
      [...by].map(([id, rs]) => [id, rs.sort((a, b) => a - b)[rs.length >> 1] ?? 40] as const),
    );
  });

/** Boys a club's academy brings up in a year, by its youth level 1..5. */
const CROP = [3, 3, 4, 5, 6] as const;

/**
 * A club's crop for `season`: fifteen to seventeen years old, well under the first team today,
 * a few of them with a ceiling far above it. Better academies bring more and better.
 */
export function crop(origin: Pack, clubId: string, seed: number, season: number): PackPlayer[] {
  const club = origin.clubs.find((c) => c.id === clubId)!;
  const level = baseLevels(origin).get(clubId) ?? 40;
  const youth = club.facilities.youth;
  const root = fork(rngFrom(seed), `crop:${season}:${clubId}`);
  const out: PackPlayer[] = [];
  for (let k = 0; k < CROP[youth - 1]!; k++) {
    const r = fork(root, `boy:${k}`);
    const position = SQUAD[pick(r, SQUAD.length)]!;
    const age = 15 + pick(r, 3);
    const quality = Math.max(20, level - 13 + youth + pick(r, 7));
    const made = generatePlayer(r, {
      id: `y${season}-${clubId}-${k}`,
      position,
      quality,
      clubId,
      season,
    });
    // One in six is the kind that outgrows the club; the rest reach about its level.
    const gem = pick(r, 6) === 0 ? 10 + pick(r, 12) : 0;
    const reach = (base: number) => clamp(level + base + gem + pick(r, 8));
    const attributes = generateAttributes(fork(r, 'attributes'), position, quality, age);
    // A first contract: two fifths of what the market pays a man of his level today.
    const wage = Math.round((goingWage(origin, bestRoles(attributes, 1)[0]!.rating) * 40) / 100);
    out.push({
      ...made,
      birthDate: `${season - age}${made.birthDate.slice(4)}`,
      attributes,
      potential: {
        ...made.potential,
        ceiling: { technical: reach(-2), mental: reach(0), physical: reach(-4) },
      },
      contract: { wage, until: `${season + 2}-12-31`, releaseFee: null },
    });
  }
  return out;
}

/**
 * What a season leaves behind: for each player of the pack as it stood at the season's end, in
 * the pack's order, one character with his growth for the year that follows (`codeOf`).
 */
export interface SeasonLog {
  season: number;
  growth: string;
}

/** What the person did in the season that the growth of their players reads. */
export interface Mine {
  clubId: string;
  intensity: Intensity;
  /** How much each player started: 0 left out, 1 a squad player, 2 a starter. */
  played: Record<string, number>;
}

/** A player who leaves the game at the turn (a whole season without a club). */
const GONE = '!';
/** Growth is kept in steps of two points from 40%: one printable character a player. */
const FLOOR = 40;
const STEP = 2;
const BASE_CODE = 48;
const codeFor = (growth: number) =>
  String.fromCharCode(BASE_CODE + Math.max(0, Math.min(70, Math.round((growth - FLOOR) / STEP))));
/** The growth a character stands for; null for a player who leaves the game. */
const growthAt = (code: string, i: number): number | null =>
  code[i] === GONE || code[i] === undefined
    ? null
    : FLOOR + STEP * (code.charCodeAt(i) - BASE_CODE);

/** Percent of growth by the club's training ground, level 1..5. */
const BY_GROUND = [-10, -5, 0, 8, 15] as const;
/** By minutes: left out, a squad player, a starter. */
const BY_MINUTES = [-30, 0, 25] as const;
/** By the week the person trained. */
const BY_WEEK: Record<Intensity, number> = { light: -5, normal: 0, hard: 8 };

/**
 * How much each player of the pack grows this year, in percent, from where he spent the season:
 * his club's training ground, the minutes he had (the eleven best of a squad start, the next
 * seven are squad players; in the person's club, who they really started), and the person's
 * training week. A player without a club trains alone: the least.
 */
export function growthOf(pack: Pack, mine: Mine): Map<string, number> {
  const grounds = new Map(pack.clubs.map((c) => [c.id, BY_GROUND[c.facilities.training - 1]!]));
  const squads = new Map<string, { id: string; level: number }[]>();
  for (const p of pack.players)
    if (p.clubId)
      (squads.get(p.clubId) ?? squads.set(p.clubId, []).get(p.clubId)!).push({
        id: p.id,
        level: bestRoles(p.attributes, 1)[0]!.rating,
      });
  const out = new Map<string, number>();
  for (const [clubId, squad] of squads) {
    if (clubId === ABROAD) {
      // Abroad: a good training ground and a squad player's minutes, whoever he is.
      for (const p of squad) out.set(p.id, 100 + BY_GROUND[3]! + BY_MINUTES[1]);
      continue;
    }
    squad.sort((a, b) => b.level - a.level || (a.id < b.id ? -1 : 1));
    const own = clubId === mine.clubId;
    for (const [rank, p] of squad.entries()) {
      const minutes = own ? (mine.played[p.id] ?? 0) : rank < 11 ? 2 : rank < 18 ? 1 : 0;
      out.set(
        p.id,
        100 + grounds.get(clubId)! + BY_MINUTES[minutes]! + (own ? BY_WEEK[mine.intensity] : 0),
      );
    }
  }
  for (const p of pack.players) if (!p.clubId) out.set(p.id, 100 + BY_GROUND[0] + BY_MINUTES[0]);
  return out;
}

/**
 * The season's line for the log: each player's growth in the pack's order. A player without a
 * club who was not released this season (`released`) has gone a whole year unsigned and leaves.
 */
export function codeOf(pack: Pack, mine: Mine, released: ReadonlySet<string>): string {
  const growth = growthOf(pack, mine);
  let code = '';
  for (const p of pack.players)
    code += p.clubId === null && !released.has(p.id) ? GONE : codeFor(growth.get(p.id) ?? 100);
  return code;
}

/**
 * The pack a year on, for the season after `log.season`: everyone a year older and changed by
 * it, the retired and those the log marks as gone removed, each club's crop in. `origin` is the
 * pack the career opened with. It reads nothing a transfer changes (no club, no contract), so
 * a loaded career can run it on the opening pack and apply its moves after.
 */
export function evolve(pack: Pack, origin: Pack, seed: number, log: SeasonLog): Pack {
  const season = log.season + 1;
  const players: PackPlayer[] = [];
  for (const [i, p] of pack.players.entries()) {
    const growth = growthAt(log.growth, i);
    if (growth === null || retires(p, seed, season)) continue;
    players.push(develop(p, seed, season, growth));
  }
  for (const c of origin.clubs) players.push(...crop(origin, c.id, seed, season));
  return { ...pack, players };
}
