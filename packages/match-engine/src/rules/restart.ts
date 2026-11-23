/**
 * Dead ball, shared by both engine levels (02 §6.5): seconds the clock runs while the ball
 * is out, by restart, and what each stoppage adds back at the end of the half. PARAMETERS.
 */
export const DEAD_SECONDS = {
  kickOff: [10, 15],
  goal: [45, 70],
  throwIn: [10, 18],
  corner: [26, 40],
  goalKick: [22, 34],
  freeKick: [24, 40],
  penalty: [55, 85],
} as const satisfies Record<string, readonly [number, number]>;

/** Milliseconds of stoppage added back per goal, card, injury and substitution. */
export const STOPPAGE_MS = {
  goal: 30000,
  card: 15000,
  injury: 60000,
  substitution: 20000,
} as const;
