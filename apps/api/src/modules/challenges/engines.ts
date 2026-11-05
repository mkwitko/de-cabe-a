import { careerPathV1, footballGridV1, type GameEngine } from '@decabeca/engine';

export type GameModeCode = 'CAREER_PATH' | 'FOOTBALL_GRID';

/** Engine registry (ADR-005): one literal object, keyed by game mode. */
export const ENGINES = {
  CAREER_PATH: careerPathV1,
  FOOTBALL_GRID: footballGridV1,
} as const;

/** Untyped access for the generic attempt flow; per-game presenters keep the types. */
export const engineFor = (mode: GameModeCode) =>
  ENGINES[mode] as unknown as GameEngine<unknown, unknown, unknown, unknown>;
