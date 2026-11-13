/**
 * Possession value by position (02 §5.4: grid 12 × 8 shared by both levels).
 * Team frame, attacking +x. The value of holding the ball at a point: what a
 * shot from there is worth, plus a smooth reward for territory.
 * PARAMETERS: territory term and the share of shot value (a point is worth
 * less than a free shot from it because the shot is not always available).
 */
import { xg } from './xg';

const COLS = 12;
const ROWS = 8;
const L = 105;
const W = 68;

const raw = (x: number, y: number) =>
  0.004 +
  0.04 * (x / L) * (x / L) +
  0.8 *
    xg({
      x,
      y,
      header: false,
      pressure: 0,
      keeperOut: 0,
      afterCross: false,
      counter: false,
      directFreeKick: false,
    });

/** Cell centres, row-major by column: GRID[col][row]. */
export const VALUE_GRID: number[][] = Array.from({ length: COLS }, (_, c) =>
  Array.from({ length: ROWS }, (_, r) => raw(((c + 0.5) * L) / COLS, ((r + 0.5) * W) / ROWS)),
);

/** Value at a point (team frame), bilinear over the grid. */
export function valueAt(x: number, y: number): number {
  const fx = Math.min(Math.max((x / L) * COLS - 0.5, 0), COLS - 1);
  const fy = Math.min(Math.max((y / W) * ROWS - 0.5, 0), ROWS - 1);
  const c0 = Math.floor(fx);
  const r0 = Math.floor(fy);
  const c1 = Math.min(c0 + 1, COLS - 1);
  const r1 = Math.min(r0 + 1, ROWS - 1);
  const tx = fx - c0;
  const ty = fy - r0;
  const g = VALUE_GRID;
  return (
    g[c0]![r0]! * (1 - tx) * (1 - ty) +
    g[c1]![r0]! * tx * (1 - ty) +
    g[c0]![r1]! * (1 - tx) * ty +
    g[c1]![r1]! * tx * ty
  );
}
