/**
 * Bench decisions shared by both engine levels (02 §6.5 substituições, §10): the same
 * rule for both coaches. PARAMETERS: thresholds and timing.
 */
import type { PlayerInput } from '../contract';

/** From this minute tired players go off (the interval and injuries apart). */
export const SUB_FROM_MINUTE = 58;

/** Stamina below which a player is taken off at `minute`: stricter early, looser late. */
export const tiredLimit = (minute: number) => 0.42 - (0.04 * Math.max(0, 75 - minute)) / 15;

/** How well bench player `b` covers the positions of the player going off. */
export function benchFit(b: PlayerInput, out: PlayerInput, outIsKeeper: boolean): number {
  let s = 0;
  for (const [pos, lvl] of Object.entries(out.positions))
    s += Math.min(lvl, b.positions[pos as keyof PlayerInput['positions']] ?? 0);
  return s + (b.positions.GK && !outIsKeeper ? -10 : 0);
}

/** Index in `bench` of the best replacement for `out` (ties: first on the bench). */
export const bestReplacement = (bench: PlayerInput[], out: PlayerInput, outIsKeeper: boolean) =>
  bench
    .map((b, i) => ({ i, f: benchFit(b, out, outIsKeeper) }))
    .sort((a, b) => b.f - a.f || a.i - b.i)[0]!.i;
