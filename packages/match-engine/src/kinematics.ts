/**
 * The single arrival model (MC-247; 02-MATCH-ENGINE.md §4 and §4.1):
 *   t_arrival = t_reaction + t_turn + t_travel
 * with travel under constant acceleration up to top speed, starting from the
 * current speed projected on the direction of the target. Every "who gets
 * there first" question in the engine goes through `arrivalTime`.
 * Only + − × ÷ and Math.sqrt (ADR-013 item 6).
 *
 * PARAMETERS (checked in kinematics.test.ts against research 11 §3):
 * - top speed 6.0 + 3.2 × pace/99 m/s (6.0 to 9.2);
 * - acceleration 3.0 + 4.0 × acceleration/99 m/s² (3 to 7; 7 is the public
 *   pitch-control code's maximum);
 * - reaction 0.95 − 0.5 × (0.6 anticipation + 0.4 concentration)/99 s
 *   (0.45 to 0.95; mean player ≈ 0.65, reference 0.7);
 * - half-turn 0.9 − 0.5 × agility/99 s, scaled by (1 − cos θ)/2.
 */
import type { Vec2 } from './pitch';

/** What the arrival model needs from a player; derived once from attributes and fatigue. */
export interface Kin {
  pos: Vec2;
  vel: Vec2;
  vmax: number;
  accel: number;
  reaction: number;
  halfTurn: number;
}

export interface PhysicalAttrs {
  pace: number;
  acceleration: number;
  agility: number;
  anticipation: number;
  concentration: number;
}

export const topSpeed = (pace: number) => 6.0 + 3.2 * (pace / 99);
export const acceleration = (acc: number) => 3.0 + 4.0 * (acc / 99);
export const reactionTime = (a: PhysicalAttrs) =>
  0.95 - (0.5 * (0.6 * a.anticipation + 0.4 * a.concentration)) / 99;
export const halfTurnTime = (agility: number) => 0.9 - (0.5 * agility) / 99;

/**
 * Fatigue below 0.3 stamina lowers top speed and acceleration (02 §4).
 * PARAMETER: at stamina 0 both are 80% of fresh.
 */
const fatigue = (stamina: number) => (stamina >= 0.3 ? 1 : 0.8 + (0.2 * stamina) / 0.3);

export function kinOf(
  a: PhysicalAttrs,
  pos: Vec2,
  vel: Vec2,
  stamina = 1,
): Kin {
  const f = fatigue(stamina);
  return {
    pos,
    vel,
    vmax: topSpeed(a.pace) * f,
    accel: acceleration(a.acceleration) * f,
    reaction: reactionTime(a),
    halfTurn: halfTurnTime(a.agility),
  };
}

/** Time to cover `d` metres starting at speed v0 ≥ 0, accelerating at `a` up to `vmax`. */
export function travelTime(d: number, v0: number, a: number, vmax: number): number {
  if (d <= 0) return 0;
  const v = v0 < vmax ? v0 : vmax;
  const t1 = (vmax - v) / a;
  const d1 = v * t1 + 0.5 * a * t1 * t1;
  if (d <= d1) return (Math.sqrt(v * v + 2 * a * d) - v) / a;
  return t1 + (d - d1) / vmax;
}

/**
 * Seconds for `k` to reach `p`. `reacting` = the player already knows (no
 * reaction delay): true for planned runs, false for a sudden event.
 */
export function arrivalTime(k: Kin, p: Vec2, reacting = false): number {
  const dx = p.x - k.pos.x;
  const dy = p.y - k.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1e-9) return reacting ? 0 : k.reaction;
  const speed = Math.sqrt(k.vel.x * k.vel.x + k.vel.y * k.vel.y);
  let turn = 0;
  let v0 = 0;
  if (speed > 1e-9) {
    const cos = (k.vel.x * dx + k.vel.y * dy) / (speed * d);
    turn = (k.halfTurn * (1 - cos)) / 2;
    v0 = cos > 0 ? speed * cos : 0;
  }
  return (reacting ? 0 : k.reaction) + turn + travelTime(d, v0, k.accel, k.vmax);
}

/** Distance covered in `t` seconds from v0 along a straight line (inverse of travelTime). */
export function reach(t: number, v0: number, a: number, vmax: number): number {
  if (t <= 0) return 0;
  const v = v0 < vmax ? v0 : vmax;
  const t1 = (vmax - v) / a;
  if (t <= t1) return v * t + 0.5 * a * t * t;
  return v * t1 + 0.5 * a * t1 * t1 + vmax * (t - t1);
}
