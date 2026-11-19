/** Time on the ball, shared by both engine levels (02 §5.4, §12). PARAMETERS. */
import type { Attributes } from '../contract';
import { norm } from './duel';

/**
 * Seconds a receiver takes to settle the ball before the next decision: the plan's tempo
 * (1..5) and first touch; under pressure the ball is played sooner, receiving half-turned
 * (body orientation, ADR-019) saves the extra touch, and on a counter it goes forward at once.
 */
export const settleSeconds = (tempo: number, a: Attributes, pressure: number, counter: boolean) =>
  (1.3 + 0.3 * (5 - tempo) + 0.5 * (1 - norm(a.firstTouch))) *
  (1 - 0.65 * pressure) *
  (1.1 - 0.2 * norm(a.bodyOrientation)) *
  (counter ? 0.7 : 1);
