/** Engine ids (GAME_ENGINE_CONTRACT.md §2). Engines arrive in slices 3 and 8. */
export const ENGINE_IDS = ['career-path', 'football-grid'] as const;
export type EngineId = (typeof ENGINE_IDS)[number];
export { normalizeName } from './text/normalize';
