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
 * The other clubs are not tracked day by day: they stand at a managed squad's level
 * (`OTHERS`), so the person gains by managing well and loses by overplaying the same eleven.
 * Exact arithmetic only (ADR-020). Every number here is a PARÂMETRO, not calibrated.
 */
import type { CareerWorld } from './advance';
import { clubStrengths, lineupOf, slotRatings, type ClubIn, type Lineup } from './squad';
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
/** What every other club is taken to be at: a managed squad on a normal week. */
export const OTHERS = { fresh: 0.95, drill: NEUTRAL_DRILL } as const;

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
export function myStrength(w: CareerWorld, t: Training): number {
  return strengthWith(w, lineupOf(w), { fresh: (id) => t.fresh[id] ?? 1, drill: t.drill });
}

/** Every club's level 3 strength at the managed level (`OTHERS`): its best eleven by position. */
export const othersStrengths = (pack: Pack): Map<string, number> =>
  clubStrengths(pack, (c, l) =>
    strengthWith(c, l, { fresh: () => OTHERS.fresh, drill: OTHERS.drill }),
  );
