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

/**
 * Body contact (02 §2): a mover going from `from` to where he stands now cannot pass through
 * any of `others`. He stops where his path first comes within `body` metres of one of them
 * and loses the part of his velocity heading into that player, so he has to go round him.
 */
export function blockBody(m: Mover, from: { x: number; y: number }, others: Mover[], body: number) {
  const vx = m.pos.x - from.x;
  const vy = m.pos.y - from.y;
  const vv = vx * vx + vy * vy;
  if (vv === 0) return;
  let tMin = Infinity;
  let hit: Mover | null = null;
  for (const o of others) {
    // Solve |from + t v - o| = body for the first t in [0, 1].
    const fx = from.x - o.pos.x;
    const fy = from.y - o.pos.y;
    const b = fx * vx + fy * vy;
    const c = fx * fx + fy * fy - body * body;
    if (c <= 0 || b >= 0) continue; // already in contact, or moving away from him
    const disc = b * b - vv * c;
    if (disc < 0) continue;
    const t = (-b - Math.sqrt(disc)) / vv;
    if (t >= 0 && t <= 1 && t < tMin) [tMin, hit] = [t, o];
  }
  if (!hit) return;
  m.pos.x = from.x + vx * tMin;
  m.pos.y = from.y + vy * tMin;
  const nx = hit.pos.x - m.pos.x;
  const ny = hit.pos.y - m.pos.y;
  const n = Math.sqrt(nx * nx + ny * ny) || 1;
  const into = (m.vel.x * nx + m.vel.y * ny) / n;
  if (into > 0) {
    m.vel.x -= (into * nx) / n;
    m.vel.y -= (into * ny) / n;
  }
}
