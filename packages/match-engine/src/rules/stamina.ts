/**
 * Fatigue (02 §4; MC-037): drain per second proportional to a base plus the
 * square of speed relative to top speed, scaled by the stamina attribute;
 * recovery while the ball is dead. PARAMETERS calibrated against 02 §11
 * (distance per player, late drop in intense running).
 */
import { norm } from './duel';

interface Tired {
  stamina: number;
  attrs: { stamina: number; pace: number };
}

const BASE = 0.00002; // per second, standing in play
const RUN = 0.0012; // per second at top speed, times (v / vmax)²
const RECOVER = 0.00012; // per second while the ball is dead

export function drain(p: Tired, speed: number, dt: number): void {
  const vmax = 6.0 + 3.2 * norm(p.attrs.pace);
  const r = speed / vmax;
  const tank = 1.25 - 0.5 * norm(p.attrs.stamina);
  p.stamina = Math.max(0, p.stamina - (BASE + RUN * r * r) * tank * dt);
}

export function recover(p: Tired, seconds: number): void {
  p.stamina = Math.min(1, p.stamina + RECOVER * seconds);
}
