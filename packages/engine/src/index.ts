/** Engine ids (GAME_ENGINE_CONTRACT.md §2). Engines arrive in slices 3 and 8. */
export const ENGINE_IDS = ['career-path', 'football-grid', 'impostor', 'timeline'] as const;
export type EngineId = (typeof ENGINE_IDS)[number];
export { normalizeName } from './text/normalize';
export * from './contract';
export * from './career-path/engine';
export * from './career-path/trajectory';
export * from './career-path/eligibility';
export * from './football-grid/engine';
export * from './impostor/engine';
export * from './timeline/engine';
export * from './stars';
