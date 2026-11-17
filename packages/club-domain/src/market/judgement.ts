/**
 * How well a club's directors judge (06 §2.3, 04 §8.2). Nobody reads a player's level off a
 * sheet: a club sees it through its own departments, and they are not equally good.
 *
 * - **Scouting** sets the error on a player of another club: his level, and more so what he may
 *   become.
 * - **Football** (the director's office) sets the error on the club's own squad, so a poor one
 *   misreads where the team is weak and who is left over, and how hard it bargains.
 *
 * The error a club makes about a player is fixed (same club, same player, same number): it is an
 * opinion, not a dice roll, so the same world always gives the same market. Integer arithmetic
 * only (ADR-020); every number is a PARÂMETRO.
 */
import { WHOLE, cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { ageOf, marketValue, readingsOf, thousands } from './value';

/** The departments that judge, 1 (poor) to 5 (excellent). */
export interface Eye {
  scouting: number;
  football: number;
}

const eyes = (pack: Pack) =>
  cached(
    pack,
    'eyes',
    WHOLE,
    () =>
      new Map<string, Eye>(
        pack.clubs.map((c) => [
          c.id,
          { scouting: c.departments.scouting, football: c.departments.football },
        ]),
      ),
  );
export const eyeOf = (pack: Pack, clubId: string): Eye =>
  eyes(pack).get(clubId) ?? { scouting: 3, football: 3 };

/** Most a club is off, in points, by department level 1..5. */
const OFF = {
  /** Another club's player: his level. */
  level: [7, 5, 4, 2, 1],
  /** Another club's player: his ceiling. */
  ceiling: [12, 9, 7, 4, 2],
  /** The club's own player. */
  own: [4, 3, 2, 1, 0],
} as const;

/** A fixed number in -100..100 for a pair of ids and a purpose: the club's bias on that player. */
function bias(clubId: string, playerId: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (const s of [clubId, '|', playerId])
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  // Final mix, then down to -100..100.
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return ((h >>> 0) % 201) - 100;
}

const off = (spread: number, clubId: string, playerId: string, salt: number) =>
  Math.round((bias(clubId, playerId, salt) * spread) / 100);

/** How far this club is off on this player's level: by its football office if he is its own. */
export function levelError(pack: Pack, clubId: string, p: PackPlayer): number {
  const eye = eyeOf(pack, clubId);
  return p.clubId === clubId
    ? off(OFF.own[eye.football - 1]!, clubId, p.id, 1)
    : off(OFF.level[eye.scouting - 1]!, clubId, p.id, 1);
}

/** The level this club believes he has. */
export const seenLevel = (pack: Pack, clubId: string, p: PackPlayer): number =>
  Math.max(1, Math.min(99, readingsOf(pack).get(p.id)!.level + levelError(pack, clubId, p)));

/** The ceiling this club believes he has; never under the level it sees. */
export function seenCeiling(pack: Pack, clubId: string, p: PackPlayer): number {
  const eye = eyeOf(pack, clubId);
  const spread =
    p.clubId === clubId ? OFF.own[eye.football - 1]! * 2 : OFF.ceiling[eye.scouting - 1]!;
  const seen = readingsOf(pack).get(p.id)!.ceiling + off(spread, clubId, p.id, 2);
  return Math.max(seenLevel(pack, clubId, p), Math.min(99, seen));
}

/**
 * The hand a club plays at the table, in percentage points, by its football office:
 * a good one opens lower and stops sooner when buying, and holds out for more when selling.
 */
export function bargaining(
  pack: Pack,
  clubId: string,
): { opens: number; pays: number; holds: number; haggles: number } {
  const f = eyeOf(pack, clubId).football;
  return {
    // First offer, as a share of the value: 96% down to 80%.
    opens: [96, 92, 88, 84, 80][f - 1]!,
    // Over the value it will go, on top of what the need allows: +25 down to 0.
    pays: [25, 15, 8, 3, 0][f - 1]!,
    // Its floor when selling, against a fair one: -12% up to +10%.
    holds: [-12, -6, 0, 5, 10][f - 1]!,
    // Counter-offers it answers with one of its own before taking the price: none up to three.
    haggles: [0, 0, 1, 2, 3][f - 1]!,
  };
}

/** Share of the value one point of misjudged level is worth, in percent. */
const POINT = 6;

/**
 * What this club thinks he is worth: the market value, moved by how it misreads his level
 * (six percent a point, so at most about forty percent either way for the poorest office).
 */
export function seenValue(pack: Pack, clubId: string, p: PackPlayer, season: number): number {
  const off = levelError(pack, clubId, p);
  const value = marketValue(pack, p, season);
  return off === 0 ? value : thousands((value * (100 + off * POINT)) / 100);
}

/** The points this club expects him to gain in `years`, from the ceiling and the age it sees. */
export function seenRise(
  pack: Pack,
  clubId: string,
  p: PackPlayer,
  season: number,
  years: number,
): number {
  const age = ageOf(p, season);
  const toPeak = p.potential.peakAge - age;
  if (toPeak <= 0) return -Math.round((Math.min(years, age + years - p.potential.peakAge) * 3) / 2);
  const room = seenCeiling(pack, clubId, p) - seenLevel(pack, clubId, p);
  return Math.round((room * Math.min(years, toPeak)) / toPeak);
}
