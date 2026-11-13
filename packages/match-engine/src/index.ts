/**
 * Public surface of @decabeca/match-engine (MC-145): the contract, the seeded
 * random generator (01-ARQUITETURA.md §2) and the `simulate*` functions.
 * Anything else stays internal; deep imports are a lint error outside this package.
 */
export const MATCH_ENGINE_VERSION = 0;

export * from './contract';
export * from './random';
export {
  simulateSandbox,
  SandboxInstructionsSchema,
  SANDBOX_MAX_CHUNK,
  SANDBOX_MAX_TICK,
  type SandboxInstructions,
} from './sandbox';
export { FORMATIONS, coachOf, defaultPlan, type Formation } from './presets';
export { simulateMatch } from './match/simulate';
export { advanceMatch, MATCH_MAX_CHUNK, type MatchChunk } from './match/advance';
