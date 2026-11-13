/**
 * Fouls and cards (02 §6.5; MC-039). PARAMETERS calibrated against 02 §11:
 * 13.4 to 15.9 fouls, 2.15 to 2.59 yellows and 0.10 to 0.15 reds per team.
 */
import { norm } from './duel';

interface Tackler {
  attrs: { aggression: number; tackling: number };
  input: { traits: readonly string[] };
}

/** Chance a tackle attempt is a foul: aggression, from behind, and missing the ball. */
export function foulChance(d: Tackler, behind: boolean, won: boolean): number {
  return (
    0.12 +
    0.16 * norm(d.attrs.aggression) -
    0.08 * norm(d.attrs.tackling) +
    (behind ? 0.15 : 0) +
    (won ? 0 : 0.1) +
    (d.input.traits.includes('divesIntoTackles') ? 0.04 : 0)
  );
}

export interface FoulContext {
  behind: boolean;
  promising: boolean;
  lastMan: boolean;
}

/** 0 no card, 1 yellow, 2 straight red. `u` and `v` are two uniform draws. */
export function cardFor(
  strictness: number,
  d: Tackler,
  c: FoulContext,
  u: number,
  v: number,
): 0 | 1 | 2 {
  if (c.lastMan && v < 0.05) return 2;
  if (v < 0.0015) return 2;
  const p =
    (0.05 + (c.behind ? 0.1 : 0) + (c.promising ? 0.1 : 0) + 0.05 * norm(d.attrs.aggression)) *
    (0.7 + 0.6 * strictness);
  return u < p ? 1 : 0;
}
