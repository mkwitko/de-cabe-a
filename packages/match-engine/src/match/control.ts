/**
 * Field control from the arrival model (MC-032; 02 §4.1, §5.4): who gets to a
 * point first, how safe a pass is, and how much pressure a player is under.
 * Team frame helpers take world-frame players and convert on the fly.
 */
import { arrivalTime, kinOf, type Kin } from '../kinematics';
import { rollTime, ROLL_DECEL } from '../ball';
import { logistic } from '../rules/math';
import type { Vec2 } from '../pitch';
import type { MatchPlayer, MatchState } from './state';

export const kin = (p: MatchPlayer): Kin => kinOf(p.attrs, p.pos, p.vel, p.stamina, p.acute);

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
      const to_ = arrivalTime(kin(o), pt, false);
      const r = logistic((tb - to_ + CUT_MARGIN) / CUT_SPREAD);
      if (r > worst) worst = r;
    }
    safe *= 1 - worst;
  }
  if (receiver) {
    // A marker tight on the receiver (within 3 m) can step in front of the ball (PARAMETER).
    let tight = Infinity;
    for (const o of opp) {
      const dx = o.pos.x - receiver.pos.x;
      const dy = o.pos.y - receiver.pos.y;
      tight = Math.min(tight, Math.sqrt(dx * dx + dy * dy));
    }
    if (tight < 3) safe *= 0.82 + 0.06 * tight;
    // The receiver must beat the nearest opponent to the end point.
    const tr = arrivalTime(kin(receiver), to, receiverKnows);
    const tOpp = firstArrival(opp, to);
    safe *= logistic((tOpp - tr + 0.2) / 0.3);
  }
  return safe;
}

/** Speed for a ground pass of `d` metres, arriving firm but controllable. PARAMETERS. */
export function groundSpeed(d: number): number {
  const arrive = 5 + 0.12 * d;
  return Math.min(Math.sqrt(arrive * arrive + 2 * ROLL_DECEL * d), 27);
}
