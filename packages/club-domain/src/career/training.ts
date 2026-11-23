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
  foreignLimit,
  lineupOf,
  lineupStrength,
  slotRatings,
  squadPlayers,
  type ClubIn,
  type Lineup,
} from './squad';
import { formationOf } from '../match/fixture-input';
import { MISSING, rivalOut } from './health';
import { bannedStarters } from './discipline';
import { calledOf } from './callups';
import { clubStrengthOf } from '../match/quick';
import type { Pack } from '../pack/schema';
import { bestRoles } from '../player/ratings';

export const INTENSITIES = ['light', 'normal', 'hard'] as const;
export type Intensity = (typeof INTENSITIES)[number];

/**
 * A week of training as the person plans it (08 §9, corte 2): two sessions a day, Monday first.
 * The plan sets the week's intensity by its load (`planLoad`), moves where the drill settles by
 * its share of tactical work, gives back freshness with recovery sessions, and a match
 * preparation the day before a match is worth points in it. Every number is a PARÂMETRO.
 */
export const SESSIONS = [
  'rest',
  'recovery',
  'physical',
  'technical',
  'tactical',
  'setPieces',
  'matchPrep',
] as const;
export type Session = (typeof SESSIONS)[number];
/** Seven days of two sessions, Monday first. */
export type Plan = Session[][];

/** What a session weighs on the legs. */
export const SESSION_LOAD: Record<Session, number> = {
  rest: 0,
  recovery: 0,
  physical: 3,
  technical: 2,
  tactical: 2,
  setPieces: 1,
  matchPrep: 1,
};

/**
 * The week's load, and the intensity it amounts to: up to 12 light, up to 20 normal. On a match
 * day (`matchDays`, Monday 0) the squad plays instead: its sessions weigh nothing.
 */
export const planLoad = (plan: Plan, matchDays: ReadonlySet<number> = new Set()) =>
  plan.reduce(
    (sum, d, i) => sum + (matchDays.has(i) ? 0 : d.reduce((s, x) => s + SESSION_LOAD[x], 0)),
    0,
  );
export const intensityOf = (plan: Plan, matchDays?: ReadonlySet<number>): Intensity => {
  const load = planLoad(plan, matchDays);
  return load <= 12 ? 'light' : load <= 20 ? 'normal' : 'hard';
};
/** Share of the working sessions (not rest, not recovery) that are tactical, in percent. */
const tacticalShare = (plan: Plan) => {
  const work = plan.flat().filter((x) => x !== 'rest' && x !== 'recovery');
  const tactical = work.filter((x) => x === 'tactical' || x === 'matchPrep').length;
  return work.length === 0 ? 0 : Math.round((tactical * 100) / work.length);
};
/** The tactical share of the ready normal week: the drill settles where a normal week puts it. */
const NEUTRAL_SHARE = 38;
/** Where the drill settles under a plan: its intensity's, moved by its tactical share. */
export const drillTargetOf = (plan: Plan): number =>
  Math.max(
    0.4,
    Math.min(0.98, DRILL_TARGET[intensityOf(plan)] + (tacticalShare(plan) - NEUTRAL_SHARE) * 0.004),
  );
/** Freshness a recovery session gives back over the week, a little a day. */
const RECOVERY_SESSION = 0.003;
/** Points of level 3 strength a match preparation the day before is worth. */
export const PREP_POINTS = 0.6;

/** Ready plans: one for each intensity, the week of a single Sunday match. */
const W = (am: Session, pm: Session): Session[] => [am, pm];
export const PLANS: Record<Intensity, Plan> = {
  light: [
    W('recovery', 'rest'),
    W('technical', 'rest'),
    W('tactical', 'rest'),
    W('technical', 'rest'),
    W('tactical', 'setPieces'),
    W('matchPrep', 'rest'),
    W('rest', 'rest'),
  ],
  normal: [
    W('recovery', 'rest'),
    W('physical', 'technical'),
    W('tactical', 'rest'),
    W('physical', 'technical'),
    W('tactical', 'setPieces'),
    W('matchPrep', 'rest'),
    W('rest', 'rest'),
  ],
  hard: [
    W('recovery', 'physical'),
    W('physical', 'technical'),
    W('tactical', 'physical'),
    W('physical', 'technical'),
    W('tactical', 'setPieces'),
    W('matchPrep', 'technical'),
    W('rest', 'rest'),
  ],
};

/** Monday 0 .. Sunday 6 of an epoch day (1 January 1970 was a Thursday). */
export const weekdayOf = (day: number) => (day + 3) % 7;

/** What the season's growth leans to (development.ts): a group of attributes, or none. */
export const GROWTH_FOCUSES = ['technical', 'mental', 'physical'] as const;
export type GrowthFocus = (typeof GROWTH_FOCUSES)[number];

export interface Training {
  intensity: Intensity;
  /** The attributes the season's work leans to; absent, an even spread. */
  focus?: GrowthFocus;
  /** The week's plan, when the person laid one out; the intensity is then its own. */
  plan?: Plan;
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
  const recovery = t.plan ? t.plan.flat().filter((x) => x === 'recovery').length : 0;
  const back = (RECOVERY[t.intensity] + (recovery * RECOVERY_SESSION) / 7) * days;
  const fresh: Record<string, number> = {};
  for (const [id, f] of Object.entries(t.fresh)) if (f + back < 1) fresh[id] = f + back;
  const target = t.plan ? drillTargetOf(t.plan) : DRILL_TARGET[t.intensity];
  let gap = t.drill - target;
  for (let k = 0; k < Math.min(days, 400); k++) gap *= 1 - DRILL_RATE;
  return {
    intensity: t.intensity,
    ...(t.focus && { focus: t.focus }),
    ...(t.plan && { plan: t.plan }),
    drill: target + gap,
    fresh,
    day,
  };
}

/** The week's plan from today on; its load sets the intensity. */
export function setPlan(w: CareerWorld, plan: Plan): void {
  if (plan.length !== 7 || plan.some((d) => d.length !== 2 || d.some((x) => !SESSIONS.includes(x))))
    throw new Error('training: a plan is seven days of two sessions');
  w.training = {
    ...trainingOn(w, w.day),
    intensity: intensityOf(plan, matchDaysOf(w, w.day)),
    plan,
  };
}

/** The weekdays (Monday 0) the club plays on in the seven days after `day`. */
export function matchDaysOf(w: CareerWorld, day: number): Set<number> {
  const out = new Set<number>();
  for (const m of w.season.calendar.byClub.get(w.clubId) ?? [])
    if (m.day > day && m.day <= day + 7) out.add(weekdayOf(m.day));
  return out;
}

/** The intensity of the person's plan read again for the week ahead of `t.day`, its matches out. */
export const reweigh = (w: CareerWorld, t: Training): Training =>
  t.plan ? { ...t, intensity: intensityOf(t.plan, matchDaysOf(w, t.day)) } : t;

/** What the season's growth leans to; null for an even spread. */
export function setFocus(w: CareerWorld, focus: GrowthFocus | null): void {
  if (focus !== null && !GROWTH_FOCUSES.includes(focus)) throw new Error('training: unknown focus');
  const { focus: _old, ...t } = trainingOn(w, w.day);
  w.training = { ...t, ...(focus && { focus }) };
}

/** Points a match on `day` is worth from the plan: a match preparation the day before. */
export function prepPoints(t: Training, day: number): number {
  if (!t.plan) return 0;
  const eve = t.plan[weekdayOf(day - 1)]!;
  return eve.includes('matchPrep') ? PREP_POINTS : 0;
}

/** The week's intensity from today on. */
export function setIntensity(w: CareerWorld, intensity: Intensity): void {
  if (!INTENSITIES.includes(intensity)) throw new Error('training: unknown intensity');
  // A plain intensity drops the plan: the week is then the club's usual one at that load.
  const { plan: _plan, ...t } = trainingOn(w, w.day);
  w.training = { ...t, intensity };
}

/** After the club's match on `t.day`: the eleven leave their share on the pitch. */
export function tire(t: Training, xi: readonly string[], travel = 0): Training {
  const fresh = { ...t.fresh };
  for (const id of xi) fresh[id] = Math.max(0, (fresh[id] ?? 1) - MATCH_COST - travel);
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
  const rest = squadPlayers(c)
    .filter((p) => !l.xi.includes(p.id))
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
export function clubLevels(
  pack: Pack,
  /** The season: its limit of foreigners holds the eleven (squad.ts). */
  season: number,
): {
  strength: Map<string, number>;
  eleven: Map<string, number>;
} {
  const strength = new Map<string, number>();
  const eleven = new Map<string, number>();
  for (const club of pack.clubs) {
    const level = clubLevel(pack, club.id, season);
    strength.set(club.id, level.strength);
    eleven.set(club.id, level.eleven);
  }
  return { strength, eleven };
}

/** One club's measure (see `clubLevels`); recomputed when its squad changes. */
export function clubLevel(
  pack: Pack,
  clubId: string,
  season: number,
): { strength: number; eleven: number } {
  const c = { pack, clubId };
  try {
    const l = bestLineup(c, formationOf(clubId), undefined, foreignLimit(season));
    const fit = slotRatings(c, l.formation);
    return {
      strength: lineupStrength(c, l),
      eleven: l.xi.reduce((s, id, i) => s + fit.get(id)![i]!, 0) / 16,
    };
  } catch {
    const plain = clubStrengthOf(squadPlayers(c)) ?? 50;
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
    (1 -
      freshFactor(rivalFresh(w, clubId, day)) +
      ((rivalOut(w, clubId, day) +
        bannedStarters(w, clubId, day) +
        calledOf(w, clubId, day).length) *
        MISSING) /
        1000);
