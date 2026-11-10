/**
 * The game modes and their web paths, apart from the zod schemas: the web app imports these in
 * its entry chunk (`@decabeca/contracts/modes`), where building every schema would cost startup time.
 */
export const GAME_MODES = [
  'CAREER_PATH',
  'FOOTBALL_GRID',
  'IMPOSTOR',
  'TIMELINE',
  'HIGHER_LOWER',
  'MISSING_XI',
  'MYSTERY_PLAYER',
  'CONNECTIONS',
  'DRAFT',
] as const;
export type GameMode = (typeof GAME_MODES)[number];

/** Web path of each game's track; a level is `${GAME_PATH[mode]}/${level}`. */
export const GAME_PATH = {
  CAREER_PATH: '/career-path',
  FOOTBALL_GRID: '/grid',
  IMPOSTOR: '/impostor',
  TIMELINE: '/linha-do-tempo',
  HIGHER_LOWER: '/mais-ou-menos',
  MISSING_XI: '/escalacao',
  CONNECTIONS: '/conexoes',
  DRAFT: '/draft',
  MYSTERY_PLAYER: '/craque-misterioso',
} as const satisfies Record<GameMode, string>;
