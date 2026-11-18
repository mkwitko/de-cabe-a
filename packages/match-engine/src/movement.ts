/** Player movement (02-MATCH-ENGINE.md §4). Speeds are provisional parameters. */
import { acceleration, topSpeed } from './kinematics';
import { type Vec2 } from './pitch';

export const DT = 0.25;
const MIN_GAP = 0.6;

export interface Mover {
  pos: Vec2;
  vel: Vec2;
  /** 1..99 */
  pace: number;
  /** 1..99 */
  acceleration: number;
  /** Share of top speed and acceleration left by fatigue, 0..1 (1 when absent). */
  sharp?: number;
}

export const maxSpeed = (m: Mover) => topSpeed(m.pace) * (m.sharp ?? 1);
const maxAccel = (m: Mover) => acceleration(m.acceleration) * (m.sharp ?? 1);

/**
 * One step towards `target`: the wanted velocity slows on arrival and the
 * change of velocity is capped by acceleration, which also limits turning.
 */
export function moveTowards(m: Mover, target: Vec2, speedCap = Infinity): void {
  const dx = target.x - m.pos.x;
  const dy = target.y - m.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.min(maxSpeed(m), speedCap, d * 2);
  const wantX = d > 0 ? (dx / d) * speed : 0;
  const wantY = d > 0 ? (dy / d) * speed : 0;

  const ax = wantX - m.vel.x;
  const ay = wantY - m.vel.y;
  const a = Math.sqrt(ax * ax + ay * ay);
  const cap = maxAccel(m) * DT;
  const k = a > cap ? cap / a : 1;
  m.vel.x += ax * k;
  m.vel.y += ay * k;
  m.pos.x += m.vel.x * DT;
  m.pos.y += m.vel.y * DT;
}

/** Pushes apart any two players standing on the same spot. */
export function separate(all: Mover[]): void {
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]!.pos;
      const b = all[j]!.pos;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= MIN_GAP) continue;
      // Same spot: split along y by index so the result stays deterministic.
      const ux = d > 0 ? dx / d : 0;
      const uy = d > 0 ? dy / d : 1;
      const push = (MIN_GAP - d) / 2;
      a.x -= ux * push;
      a.y -= uy * push;
      b.x += ux * push;
      b.y += uy * push;
    }
  }
}
