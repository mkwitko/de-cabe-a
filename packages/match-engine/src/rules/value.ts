/**
 * Possession value by position (02 §5.4: grid 12 × 8 shared by both levels).
 * Team frame, attacking +x. The value of holding the ball at a point: what a
 * shot from there is worth, plus a smooth reward for territory.
 * The three coefficients are a least-squares fit to the open expected-threat
 * grid 12 × 8 (Karun Singh, "Introducing Expected Threat", open_xt_12x8_v1):
 * RMSE 0.004 against the grid, down from 0.017 with the earlier hand-set
 * 0.004 / 0.04 / 0.8, which valued the area in front of the box at almost
 * twice the reference and so made carrying beat shooting.
 */
import { xg } from './xg';

const COLS = 12;
const ROWS = 8;
const L = 105;
const W = 68;

const raw = (x: number, y: number) =>
  0.0095 +
  0.0133 * (x / L) * (x / L) +
  0.64 *
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
