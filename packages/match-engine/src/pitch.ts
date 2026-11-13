/** Pitch geometry (02-MATCH-ENGINE.md §1). Metres. */
export const LENGTH = 105;
export const WIDTH = 68;
export const CENTER = { x: LENGTH / 2, y: WIDTH / 2 } as const;
export const BOX_DEPTH = 16.5;

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Team frame <-> world frame. In its own frame every team attacks towards +x.
 * Team 0 is the world frame; team 1 is rotated half a turn. Self-inverse.
 */
export const flip = (team: 0 | 1, v: Vec2): Vec2 =>
  team === 0 ? { x: v.x, y: v.y } : { x: LENGTH - v.x, y: WIDTH - v.y };

export const dist = (a: Vec2, b: Vec2) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Analysis grid, 12 columns by 8 rows. */
export const zoneOf = (v: Vec2) => ({
  col: clamp(Math.floor((v.x / LENGTH) * 12), 0, 11),
  row: clamp(Math.floor((v.y / WIDTH) * 8), 0, 7),
});

/** Five lanes split at the penalty-area and six-yard-box lines: 0 and 4 wings, 1 and 3 half-spaces, 2 centre. */
const LANE_EDGES = [13.84, 24.84, 43.16, 54.16];
export const laneOf = (y: number) => LANE_EDGES.filter((edge) => y >= edge).length;
