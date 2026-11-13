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
