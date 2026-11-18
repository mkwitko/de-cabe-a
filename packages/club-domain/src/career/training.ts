/**
 * Training and freshness, first cut (08 §9, corte 1). One choice a week, the intensity, trades
 * two numbers against each other:
 *
 * - **freshness** per player, 0..1: a starter loses a share of it in a match and gets it back
 *   with days of rest, faster under light training. It is the player's stamina at kick-off in
 *   the engine and scales his slot rating in the level 3 result.
 * - **drill**, 0..1, one number for the team: it moves a little every day toward the target of
 *   the intensity. It is the eleven's familiarity with the plan in the engine and adds or takes
 *   points of strength in the level 3 result.
 *
 * The other clubs are not tracked player by player. Each one's eleven tires by the same rule
 * from the days since its last match (`rivalFresh`), on a normal week of training, so a tight
 * calendar costs both sides; what the person adds is rotation and the choice of the week.
 * Exact arithmetic only (ADR-020). Every number here is a PARÂMETRO, not calibrated.
 */
import type { CareerWorld } from './advance';
import {
  bestLineup,
  lineupOf,
  lineupStrength,
  slotRatings,
  type ClubIn,
  type Lineup,
} from './squad';
import { formationOf } from '../match/fixture-input';
import { MISSING, rivalOut } from './health';
import { clubStrengthOf } from '../match/quick';
import type { Pack } from '../pack/schema';
import { bestRoles } from '../player/ratings';

export const INTENSITIES = ['light', 'normal', 'hard'] as const;
export type Intensity = (typeof INTENSITIES)[number];

export interface Training {
  intensity: Intensity;
  drill: number;
  /** Freshness by player id; absent means fully fresh. */
  fresh: Record<string, number>;
  /** The day these numbers are for. */
  day: number;
}

/** Freshness back per day of rest. */
export const RECOVERY: Record<Intensity, number> = { light: 0.06, normal: 0.045, hard: 0.03 };
/** Where the drill settles under each intensity. */
export const DRILL_TARGET: Record<Intensity, number> = { light: 0.55, normal: 0.75, hard: 0.95 };
/** Share of the distance to the target the drill covers in a day. */
const DRILL_RATE = 0.04;
/** Freshness a starter leaves on the pitch. */
export const MATCH_COST = 0.28;
const NEUTRAL_DRILL = DRILL_TARGET.normal;
/** The drill every other club is taken to keep: a normal week. */
export const RIVAL_DRILL = NEUTRAL_DRILL;

/** Share of a slot rating a player delivers at this freshness. */
export const freshFactor = (fresh: number) => 0.8 + 0.2 * fresh;
/** Familiarity with the plan a team has at this drill (engine, 0..1). */
export const drilled = (drill: number) => 0.6 + 0.4 * drill;
/** Points of level 3 strength the drill is worth, against a normal week. */
const drillPoints = (drill: number) => (drill - NEUTRAL_DRILL) * 5;

const start = (day: number): Training => ({
  intensity: 'normal',
  drill: NEUTRAL_DRILL,
  fresh: {},
  day,
});

/** The club's training state as it will stand on `day` (rest and drill in between applied). */
export function trainingOn(w: CareerWorld, day: number): Training {
  const t = w.training ?? start(day);
  const days = Math.max(0, day - t.day);
  const back = RECOVERY[t.intensity] * days;
  const fresh: Record<string, number> = {};
  for (const [id, f] of Object.entries(t.fresh)) if (f + back < 1) fresh[id] = f + back;
  let gap = t.drill - DRILL_TARGET[t.intensity];
  for (let k = 0; k < Math.min(days, 400); k++) gap *= 1 - DRILL_RATE;
  return { intensity: t.intensity, drill: DRILL_TARGET[t.intensity] + gap, fresh, day };
}

/** The week's intensity from today on. */
export function setIntensity(w: CareerWorld, intensity: Intensity): void {
  if (!INTENSITIES.includes(intensity)) throw new Error('training: unknown intensity');
  w.training = { ...trainingOn(w, w.day), intensity };
}

/** After the club's match on `t.day`: the eleven leave their share on the pitch. */
export function tire(t: Training, xi: readonly string[]): Training {
  const fresh = { ...t.fresh };
  for (const id of xi) fresh[id] = Math.max(0, (fresh[id] ?? 1) - MATCH_COST);
  return { ...t, fresh };
}

/**
 * A club's strength for a level 3 result with this eleven in this state: slot ratings scaled by
 * freshness, the five best of the rest, mean of sixteen, plus the drill's points.
 */
export function strengthWith(
  c: ClubIn,
  l: Lineup,
  state: { fresh: (id: string) => number; drill: number },
): number {
  const fit = slotRatings(c, l.formation);
  const eleven = l.xi.reduce((s, id, i) => s + fit.get(id)![i]! * freshFactor(state.fresh(id)), 0);
  const rest = c.pack.players
    .filter((p) => p.clubId === c.clubId && !l.xi.includes(p.id))
    .map((p) => bestRoles(p.attributes, 1)[0]!.rating)
    .sort((a, b) => b - a)
    .slice(0, 5)
    .reduce((a, b) => a + b, 0);
  return (eleven + rest) / 16 + drillPoints(state.drill);
}

/** The person's club's strength on `day`, with the eleven in force and the squad as it stands. */
export function myStrength(w: CareerWorld, t: Training, lineup: Lineup = lineupOf(w)): number {
  return strengthWith(w, lineup, { fresh: (id) => t.fresh[id] ?? 1, drill: t.drill });
}

/**
 * Every club's level 3 measure, rested and on a normal week: `strength` is its best eleven by
 * position in its usual formation (`lineupStrength`), `eleven` the part of it the starters carry,
 * which is what tiredness takes from. A club that cannot field that eleven keeps the plain squad
 * reading.
 */
export function clubLevels(pack: Pack): {
  strength: Map<string, number>;
  eleven: Map<string, number>;
} {
  const strength = new Map<string, number>();
  const eleven = new Map<string, number>();
  for (const club of pack.clubs) {
    const level = clubLevel(pack, club.id);
    strength.set(club.id, level.strength);
    eleven.set(club.id, level.eleven);
  }
  return { strength, eleven };
}

/** One club's measure (see `clubLevels`); recomputed when its squad changes. */
export function clubLevel(pack: Pack, clubId: string): { strength: number; eleven: number } {
  const c = { pack, clubId };
  try {
    const l = bestLineup(c, formationOf(clubId));
    const fit = slotRatings(c, l.formation);
    return {
      strength: lineupStrength(c, l),
      eleven: l.xi.reduce((s, id, i) => s + fit.get(id)![i]!, 0) / 16,
    };
  } catch {
    const plain = clubStrengthOf(pack, clubId) ?? 50;
    return { strength: plain, eleven: (plain * 11) / 16 };
  }
}

/** How fresh another club's eleven is on `day`: a match's cost, less the days since its last. */
export function rivalFresh(w: CareerWorld, clubId: string, day: number): number {
  let last = -1;
  for (const m of w.season.calendar.byClub.get(clubId) ?? [])
    if (m.played && m.day < day && m.day > last) last = m.day;
  return last < 0 ? 1 : Math.min(1, 1 - MATCH_COST + RECOVERY.normal * (day - last));
}

/**
 * Another club's level 3 strength on `day`: its rested measure, less what tired legs take and
 * what the starters it is short of that day cost (health.ts).
 */
export const rivalStrength = (w: CareerWorld, clubId: string, day: number): number =>
  (w.strength.get(clubId) ?? 50) -
  (w.eleven.get(clubId) ?? 0) *
    (1 - freshFactor(rivalFresh(w, clubId, day)) + (rivalOut(w, clubId, day) * MISSING) / 1000);
