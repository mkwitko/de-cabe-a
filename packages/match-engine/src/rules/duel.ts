/**
 * Contest formula shared by both engine levels (02 §6): P = logistic((Δ − d) / k),
 * Δ the weighted attribute difference on a 0..1 scale, d the context difficulty,
 * k the spread of that contest.
 */
import type { Attributes, AttributeId } from '../contract';
import { logistic } from './math';

/** Attribute on a 0..1 scale (the pack stores 1..99). */
export const norm = (a: number) => a / 99;

export type Weights = Partial<Record<AttributeId, number>>;

/** Weighted mean of attributes on the 0..1 scale; weights need not sum to one. */
export function weighted(a: Attributes, w: Weights): number {
  let s = 0;
  let total = 0;
  for (const [k, v] of Object.entries(w) as [AttributeId, number][]) {
    s += norm(a[k]) * v;
    total += v;
  }
  return total > 0 ? s / total : 0;
}

/** Chance that the side with advantage `delta` wins a contest of difficulty `d` and spread `k`. */
export const contest = (delta: number, d: number, k: number) => logistic((delta - d) / k);

/** Tackle (02 §6 drible × desarme): defender `d` against carrier `c`; from behind is harder. PARAMETERS. */
export function tackleChance(d: Attributes, c: Attributes, behind: boolean): number {
  const att = weighted(d, { tackling: 0.5, anticipation: 0.2, strength: 0.15, aggression: 0.15 });
  const def = weighted(c, { dribbling: 0.35, balance: 0.25, strength: 0.2, technique: 0.2 });
  return contest(att - def, behind ? 0.15 : 0, 0.12);
}

/** Aerial duel strength (02 §6.3): jumping, heading, strength, positioning and height. PARAMETERS. */
export const aerialScore = (a: Attributes, heightCm: number) =>
  weighted(a, { heading: 0.3, jumping: 0.35, strength: 0.15, positioning: 0.2 }) +
  (heightCm - 180) / 200;

/** Dribble (02 §6): carrier `c` beats defender `d` in a 1v1. PARAMETERS. */
export function dribbleChance(c: Attributes, d: Attributes): number {
  const att = weighted(c, { dribbling: 0.45, agility: 0.2, balance: 0.15, acceleration: 0.2 });
  const def = weighted(d, { tackling: 0.4, anticipation: 0.25, positioning: 0.2, pace: 0.15 });
  return contest(att - def, 0.12, 0.12);
}
