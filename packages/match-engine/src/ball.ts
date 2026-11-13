/**
 * Ball motion and contact inside a step (MC-248, MC-161 base; 02-MATCH-ENGINE.md
 * §2 and §6.1). Players move in steps of DT; the ball is solved analytically
 * within the step: the instant it enters a player's reach or crosses a line is
 * computed, so a 30 m/s ball never tunnels through anyone.
 * Only + − × ÷ and Math.sqrt.
 *
 * Approximation (declared): inside one step the ball's speed relative to a
 * player is taken as its mean over the step. Rolling deceleration is
 * ROLL_DECEL, so the position error is at most ROLL_DECEL × DT² / 8 ≈ 0.02 m.
 */
import { LENGTH, WIDTH, type Vec2 } from './pitch';

/** PARAMETERS. */
export const ROLL_DECEL = 3.0; // m/s² on dry grass
export const GRAVITY = 9.81;
export const BOUNCE = 0.5; // vertical restitution
export const BOUNCE_ROLL = 0.75; // horizontal speed kept on a bounce
export const GOAL_HALF = 3.66;
export const GOAL_HEIGHT = 2.44;
/** Above this height nobody plays the ball except the keeper (02 §6.1). */
export const PLAYABLE_HEIGHT = 2.6;

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface Reacher {
  /** Position at the start of the step and velocity during it. */
  pos: Vec2;
  vel: Vec2;
  /** Horizontal reach (control area), metres. */
  reach: number;
  /** Highest ball this player can play. */
  height: number;
}

export type Contact =
  | { kind: 'player'; index: number; t: number }
  | { kind: 'line'; side: 'goal0' | 'goal1' | 'byline0' | 'byline1' | 'touchline'; t: number };

const hspeed = (b: Ball) => Math.sqrt(b.vx * b.vx + b.vy * b.vy);

/** Advances the ball by `t` seconds of free flight or roll. Mutates `b`. */
export function advanceBall(b: Ball, t: number): void {
  if (b.z > 0 || b.vz !== 0) {
    // In the air: straight horizontal line, parabola in z, bounce on the ground.
    let left = t;
    while (left > 0) {
      const tGround =
        b.vz > 0 || b.z > 0 ? (b.vz + Math.sqrt(b.vz * b.vz + 2 * GRAVITY * b.z)) / GRAVITY : 0;
      const dt = tGround > 0 && tGround < left ? tGround : left;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt - 0.5 * GRAVITY * dt * dt;
      b.vz -= GRAVITY * dt;
      left -= dt;
      if (dt === tGround) {
        b.z = 0;
        b.vz = -b.vz * BOUNCE;
        b.vx *= BOUNCE_ROLL;
        b.vy *= BOUNCE_ROLL;
        if (b.vz < 1) b.vz = 0; // settles into a roll
        if (b.vz === 0) break;
      }
    }
    if (left > 0) advanceBall(b, left);
    return;
  }
  const v = hspeed(b);
  if (v === 0) return;
  const stop = v / ROLL_DECEL;
  const tt = t < stop ? t : stop;
  const s = v * tt - 0.5 * ROLL_DECEL * tt * tt;
  b.x += (b.vx / v) * s;
  b.y += (b.vy / v) * s;
  const nv = v - ROLL_DECEL * tt;
  b.vx = (b.vx / v) * nv;
  b.vy = (b.vy / v) * nv;
}

/** Ball height at time t within the step (exact parabola, ignoring a bounce inside it). */
const heightAt = (b: Ball, t: number) =>
  b.z > 0 || b.vz !== 0 ? Math.max(0, b.z + b.vz * t - 0.5 * GRAVITY * t * t) : 0;

/** Mean horizontal velocity over [0, dt] (rolling slows down; flight keeps it). */
function meanVel(b: Ball, dt: number): Vec2 {
  const v = hspeed(b);
  if (v === 0) return { x: 0, y: 0 };
  if (b.z > 0 || b.vz !== 0) return { x: b.vx, y: b.vy };
  const stop = v / ROLL_DECEL;
  const tt = dt < stop ? dt : stop;
  const s = v * tt - 0.5 * ROLL_DECEL * tt * tt;
  const m = s / dt / v;
  return { x: b.vx * m, y: b.vy * m };
}

/** Earliest t in [0, dt] with |d0 + w t| ≤ r, or -1. */
function enterTime(d0x: number, d0y: number, wx: number, wy: number, r: number, dt: number) {
  const c = d0x * d0x + d0y * d0y - r * r;
  if (c <= 0) return 0;
  const a = wx * wx + wy * wy;
  if (a === 0) return -1;
  const bq = 2 * (d0x * wx + d0y * wy);
  const disc = bq * bq - 4 * a * c;
  if (disc < 0) return -1;
  const t = (-bq - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= dt ? t : -1;
}

/**
 * First contact of the ball within the next `dt` seconds: a player's reach or
 * a line. `skip` excludes players (the passer just after the pass). Ties go to
 * the earlier instant, then to the lower index (02 §2: fixed order).
 */
export function firstContact(
  b: Ball,
  players: readonly Reacher[],
  dt: number,
  skip: ReadonlySet<number> = new Set(),
): Contact | null {
  const w = meanVel(b, dt);
  let best: Contact | null = null;
  for (let i = 0; i < players.length; i++) {
    if (skip.has(i)) continue;
    const p = players[i]!;
    const t = enterTime(b.x - p.pos.x, b.y - p.pos.y, w.x - p.vel.x, w.y - p.vel.y, p.reach, dt);
    if (t < 0 || heightAt(b, t) > p.height) continue;
    if (!best || t < best.t) best = { kind: 'player', index: i, t };
  }
  // Lines: x = 0, x = LENGTH, y = 0, y = WIDTH, along the same mean motion.
  const line = (pos: number, vel: number, limit: number) =>
    vel < 0 && pos + vel * dt < 0
      ? -pos / vel
      : vel > 0 && pos + vel * dt > limit
        ? (limit - pos) / vel
        : -1;
  const tx = line(b.x, w.x, LENGTH);
  const ty = line(b.y, w.y, WIDTH);
  if (tx >= 0 && (!best || tx < best.t) && (ty < 0 || tx <= ty)) {
    const y = b.y + w.y * tx;
    const inGoal = Math.abs(y - WIDTH / 2) < GOAL_HALF && heightAt(b, tx) < GOAL_HEIGHT;
    const end = w.x < 0 ? 0 : 1;
    best = {
      kind: 'line',
      side: inGoal ? (end === 0 ? 'goal0' : 'goal1') : end === 0 ? 'byline0' : 'byline1',
      t: tx,
    };
  } else if (ty >= 0 && (!best || ty < best.t)) {
    best = { kind: 'line', side: 'touchline', t: ty };
  }
  return best;
}

/** Initial velocity for a ground pass that arrives at `to` with speed `arrive`. */
export function groundPass(from: Vec2, to: Vec2, arrive: number): Ball {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const v = Math.sqrt(arrive * arrive + 2 * ROLL_DECEL * d);
  return {
    x: from.x,
    y: from.y,
    z: 0,
    vx: d > 0 ? (dx / d) * v : 0,
    vy: d > 0 ? (dy / d) * v : 0,
    vz: 0,
  };
}

/** Seconds for a rolling ball to cover `d` metres, or Infinity if it stops first. */
export function rollTime(speed: number, d: number): number {
  const disc = speed * speed - 2 * ROLL_DECEL * d;
  if (disc < 0) return Infinity;
  return (speed - Math.sqrt(disc)) / ROLL_DECEL;
}

// ── Clocks (02 §2) ───────────────────────────────────────────────────────────

/** Steps per clock period at DT = 0.25 s. PARAMETERS measured on the bench. */
export const CLOCK = {
  carrierDecision: 2,
  offBallDecision: 4,
  perception: 2,
  coordination: 4,
} as const;

/**
 * Whether player `index` (0..21) runs the clock on this tick. Off-ball decision
 * and perception are staggered (a quarter or a half of the team per step), so
 * the cost per step is flat. Coordination runs for the whole team at once.
 */
export function due(clock: keyof typeof CLOCK, tick: number, index = 0): boolean {
  const period = CLOCK[clock];
  if (clock === 'coordination') return tick % period === 0;
  return (tick + index) % period === 0;
}
