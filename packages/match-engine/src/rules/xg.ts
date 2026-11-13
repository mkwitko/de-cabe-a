/**
 * Chance quality (02 §7 item 1): xG before the shot, independent of who shoots
 * and who keeps goal. Team frame: the shooter attacks the goal at x = 105.
 *
 * PARAMETERS: logistic coefficients in the shape of the published distance and
 * angle models (research 01), tuned until conversion by distance band matches
 * the reference (MC-038 test): about 0.38 from 6 m central, 0.18 from the
 * penalty spot, 0.05 from 20 m, 0.03 from 25 m; penalty 0.78.
 */
import { atan, logistic } from './math';

const GOAL_X = 105;
const GOAL_Y = 34;
const POST = 3.66;

export interface ShotContext {
  x: number;
  y: number;
  header: boolean;
  /** Nearest defender pressure on the shooter, 0 (free) .. 1 (touching). */
  pressure: number;
  /** Keeper away from the line between ball and goal centre, 0..1. */
  keeperOut: number;
  afterCross: boolean;
  counter: boolean;
  directFreeKick: boolean;
}

export const PENALTY_XG = 0.78;

/** Angle in radians the goal mouth covers from (x, y). */
export function goalAngle(x: number, y: number): number {
  const dx = GOAL_X - x;
  if (dx <= 0) return 0;
  const a1 = atan((GOAL_Y + POST - y) / dx);
  const a2 = atan((GOAL_Y - POST - y) / dx);
  return a1 - a2;
}

export const goalDistance = (x: number, y: number) =>
  Math.sqrt((GOAL_X - x) * (GOAL_X - x) + (GOAL_Y - y) * (GOAL_Y - y));

export function xg(c: ShotContext): number {
  const d = goalDistance(c.x, c.y);
  const z =
    -1.22 +
    1.25 * goalAngle(c.x, c.y) -
    0.105 * d -
    (c.header ? 0.9 : 0) -
    0.7 * c.pressure +
    0.8 * c.keeperOut +
    (c.afterCross ? -0.15 : 0) +
    (c.counter ? 0.25 : 0) +
    (c.directFreeKick ? 0.35 : 0);
  return logistic(z);
}
