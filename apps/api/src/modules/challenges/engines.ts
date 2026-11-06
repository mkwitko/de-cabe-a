import {
  careerPath,
  footballGrid,
  higherLower,
  impostor,
  timeline,
  type GameEngine,
} from '@decabeca/engine';

export type GameModeCode =
  'CAREER_PATH' | 'FOOTBALL_GRID' | 'IMPOSTOR' | 'TIMELINE' | 'HIGHER_LOWER';

/** Engine registry (ADR-005): one literal object, keyed by game mode. */
export const ENGINES = {
  CAREER_PATH: careerPath,
  FOOTBALL_GRID: footballGrid,
  IMPOSTOR: impostor,
  TIMELINE: timeline,
  HIGHER_LOWER: higherLower,
} as const;

/** Untyped access for the generic attempt flow; per-game presenters keep the types. */
export const engineFor = (mode: GameModeCode) =>
  ENGINES[mode] as unknown as GameEngine<unknown, unknown, unknown, unknown>;
