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

/**
 * Chance the loser of a contested aerial duel fouls (02 §6.5 carga, puxão): a push or
 * a climb on the opponent. PARAMETERS calibrated on fouls per team (02 §11).
 */
export function aerialFoulChance(d: Tackler): number {
  return 0.06 + 0.1 * norm(d.attrs.aggression);
}

/**
 * Chance a defender beaten by a dribble trips or holds the carrier (02 §6, "falha do
 * defensor pode virar falta"; puxão). PARAMETERS calibrated on fouls per team (02 §11).
 */
export function beatenFoulChance(d: Tackler): number {
  return 0.25 * (0.6 + 0.8 * norm(d.attrs.aggression));
}

export interface FoulContext {
  /** From behind: recorded on the event, not a reason for a card by itself (law 12). */
  behind: boolean;
  /** The foul stops a promising attack (law 12: caution). */
  promising: boolean;
  lastMan: boolean;
  /** A deliberate foul to stop a counter: law 12 cautions it most of the time. */
  tactical?: boolean;
  /** The challenge went for the ball (careless more than reckless when it did). */
  playedBall?: boolean;
}

/**
 * Chance of a yellow (law 12): careless fouls rarely; reckless ones (aggression, no attempt
 * to play the ball) more; stopping a promising attack, and above all a deliberate stop of a
 * counter, most. The direction of the challenge is not a reason by itself. PARAMETERS:
 * yellows per foul, Série A about 0.16 to 0.18 (02 §11).
 */
export function cardChance(strictness: number, d: Tackler, c: FoulContext): number {
  return (
    (0.03 +
      0.06 * norm(d.attrs.aggression) +
      (c.playedBall === false ? 0.03 : 0) +
      (c.promising ? 0.08 : 0) +
      (c.tactical ? 0.3 : 0)) *
    (0.7 + 0.6 * strictness)
  );
}

/** 0 no card, 1 yellow, 2 straight red. `u` and `v` are two uniform draws. */
export function cardFor(
  strictness: number,
  d: Tackler,
  c: FoulContext,
  u: number,
  v: number,
): 0 | 1 | 2 {
  if (c.lastMan && v < 0.02) return 2;
  if (v < 0.0008) return 2;
  return u < cardChance(strictness, d, c) ? 1 : 0;
}
