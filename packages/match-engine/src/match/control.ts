/**
 * Field control from the arrival model (MC-032; 02 §4.1, §5.4): who gets to a
 * point first, how safe a pass is, and how much pressure a player is under.
 * Team frame helpers take world-frame players and convert on the fly.
 */
import { arrivalTime, kinOf, type Kin } from '../kinematics';
import { rollTime, ROLL_DECEL } from '../ball';
import { logistic } from '../rules/math';
import { lineOf } from '../team';
import { pressResistance } from '../rules/duel';
import { CENTER, LENGTH, flip, type Vec2 } from '../pitch';
import type { MatchPlayer, MatchState } from './state';

export const kin = (p: MatchPlayer): Kin => kinOf(p.attrs, p.pos, p.vel, p.stamina, p.acute);

/**
 * An opponent reading a pass: during his reaction time he carries on at his
 * current velocity (as the simulation moves him), then reacts from there.
 */
/** PARAMETER: share of the reaction time (a sudden event) a defender needs to read a pass. */
export const PASS_READ = 0.4;
export const readTime = (p: MatchPlayer) => PASS_READ * kin(p).reaction;
const reading = (p: MatchPlayer): Kin => {
  const t = readTime(p);
  return { ...kin(p), pos: { x: p.pos.x + p.vel.x * t, y: p.pos.y + p.vel.y * t } };
};
export const readingArrival = (p: MatchPlayer, pt: Vec2) =>
  readTime(p) + arrivalTime(reading(p), pt, true);

export const opponents = (s: MatchState, team: 0 | 1) =>
  s.players.filter((p) => p.active && p.team !== team);
export const mates = (s: MatchState, team: 0 | 1) =>
  s.players.filter((p) => p.active && p.team === team);

/** Pressure on `p`: 0 with nobody within 5 m, 1 with an opponent touching him. */
export function pressureOn(s: MatchState, p: MatchPlayer): number {
  let best = Infinity;
  for (const o of opponents(s, p.team)) {
    const dx = o.pos.x - p.pos.x;
    const dy = o.pos.y - p.pos.y;
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  const d = Math.sqrt(best);
  return d >= 5 ? 0 : d <= 1 ? 1 : (5 - d) / 4;
}

/** Fastest arrival among `ps` at `pt` (world frame), seconds. */
export function firstArrival(ps: MatchPlayer[], pt: Vec2, reacting = false): number {
  let best = Infinity;
  for (const p of ps) {
    const t = arrivalTime(kin(p), pt, reacting);
    if (t < best) best = t;
  }
  return best;
}

/**
 * Chance that an opponent in front of the kick and within reach (1.6 m, about
 * 45°) gets a leg to the ball as it leaves the foot (PARAMETERS; anticipation
 * helps, a press-resistant passer disguises it; research 13 §2). Used by the
 * kick itself and by the passer's estimate.
 */
export function footBlock(o: MatchPlayer, c: MatchPlayer, ux: number, uy: number): number {
  const dx = o.pos.x - c.pos.x;
  const dy = o.pos.y - c.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d >= 1.6 || d < 1e-6 || (dx * ux + dy * uy) / d < 0.7) return 0;
  return (0.2 + 0.2 * (o.attrs.anticipation / 99)) * (1.45 - pressResistance(c.attrs));
}

/** Extra reach of the marker within 3 m of the receiver of a pass: he steps in front (ADR-019). PARAMETER. */
export const markerReach = (o: MatchPlayer) => 0.3 * (o.attrs.marking / 99);

/** Reach of an outfield body blocking a shot: it needs the body in the line (PARAMETER). */
export const shotBlockReach = (o: MatchPlayer) => 0.35 + 0.2 * (o.attrs.bravery / 99);

/**
 * Share of the goal mouth the shooter sees past the outfield opponents in front of
 * him (research 18 H1: the shooter's estimate uses the same reach as the flight).
 * Each body casts the shadow of its block reach on the goal line; the shot goes
 * somewhere across the mouth, so the shadowed share is the chance of a block.
 * Team frame, goal mouth 30.34 to 37.66 m.
 */
const SHOT_DRIFT = 2;
export function shotClear(s: MatchState, c: MatchPlayer): number {
  const me = flip(c.team, c.pos);
  const D = LENGTH - me.x;
  let clear = 1;
  for (const o of opponents(s, c.team)) {
    if (lineOf(o.role) === 'gk') continue;
    const q = flip(c.team, o.pos);
    const a = q.x - me.x;
    // A body level with him still meets the ball as it leaves the foot (PARAMETER: 0.3 m).
    if (a <= -0.3 || a >= D) continue;
    const k = D / Math.max(a, 0.3);
    const yc = me.y + (q.y - me.y) * k;
    // He also steps across while the ball travels to him (PARAMETERS: 23 m/s shot, SHOT_DRIFT m/s).
    const hw = (shotBlockReach(o) + (SHOT_DRIFT * a) / 23) * k;
    const shade = Math.min(yc + hw, CENTER.y + 3.66) - Math.max(yc - hw, CENTER.y - 3.66);
    if (shade > 0) clear *= 1 - shade / 7.32;
  }
  return clear;
}

/**
 * PARAMETERS: an opponent who reaches the ball's path this much later than the
 * ball still gets a foot to it half of the time, and the spread of that guess.
 */
const CUT_MARGIN = 0.15;
const CUT_SPREAD = 0.2;
/** A defender this close to the line of a ground pass blocks it where he stands. */
const LANE_REACH = 1.3;

/**
 * Chance that a ball played from `from` to `to` reaches the end without an
 * opponent cutting it out, and that the receiver gets there first. Ground
 * passes are checked along the path; a lofted ball only where it lands.
 */
export function passSafety(
  s: MatchState,
  team: 0 | 1,
  from: Vec2,
  to: Vec2,
  speed: number,
  lofted: boolean,
  receiver: MatchPlayer | null,
  /** The receiver already knows where the ball goes (a pass to feet or a timed run). */
  receiverKnows = true,
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const opp = opponents(s, team);
  let safe = 1;
  // The passer is the player on the ball at `from`: a presser in front of the kick may block it.
  const c = s.owner !== null ? s.players[s.owner] : undefined;
  if (
    c &&
    c.team === team &&
    d > 0 &&
    Math.abs(c.pos.x - from.x) + Math.abs(c.pos.y - from.y) < 0.01
  )
    for (const o of opp) safe *= 1 - footBlock(o, c, dx / d, dy / d);
  const samples = lofted ? [1] : [0.25, 0.5, 0.75, 1];
  for (const o of opp) {
    let worst = 0;
    // Already standing in the lane: the ball meets his reach without him moving.
    if (!lofted && d > 0) {
      const u = ((o.pos.x - from.x) * dx + (o.pos.y - from.y) * dy) / (d * d);
      if (u > 0 && u < 1) {
        const px = from.x + dx * u - o.pos.x;
        const py = from.y + dy * u - o.pos.y;
        if (px * px + py * py < LANE_REACH * LANE_REACH) worst = 0.85;
      }
    }
    for (const f of samples) {
      const pt = { x: from.x + dx * f, y: from.y + dy * f };
      const tb = lofted ? d / speed : rollTime(speed, d * f);
      if (!Number.isFinite(tb)) continue;
      const to_ = readingArrival(o, pt);
      const r = logistic((tb - to_ + CUT_MARGIN) / CUT_SPREAD);
      if (r > worst) worst = r;
    }
    safe *= 1 - worst;
  }
  if (receiver) {
    // A marker tight on the receiver (within 3 m) can step in front of the ball (PARAMETER).
    let tight = Infinity;
    let marker: MatchPlayer | null = null;
    for (const o of opp) {
      const dx = o.pos.x - receiver.pos.x;
      const dy = o.pos.y - receiver.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < tight) {
        tight = d;
        marker = o;
      }
    }
    // How often he gets in front depends on his marking (ADR-019; the flight gives him the same extra reach).
    if (tight < 3 && marker) safe *= 1 - (0.18 - 0.06 * tight) * (0.5 + marker.attrs.marking / 99);
    // The receiver must beat the nearest opponent to the end point.
    const tr = arrivalTime(kin(receiver), to, receiverKnows);
    const tOpp = Math.min(...opp.map((o) => readingArrival(o, to)));
    safe *= logistic((tOpp - tr + 0.2) / 0.3);
  }
  return safe;
}

/** Speed for a ground pass of `d` metres, arriving firm but controllable. PARAMETERS. */
export function groundSpeed(d: number): number {
  const arrive = 5 + 0.12 * d;
  return Math.min(Math.sqrt(arrive * arrive + 2 * ROLL_DECEL * d), 27);
}
