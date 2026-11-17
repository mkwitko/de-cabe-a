/** Public surface of @decabeca/club-domain (01-ARQUITETURA.md §2). */
export * from './pack/schema';
export * from './player/ratings';
export { generateAttributes, generatePlayer, generateSquad, SQUAD } from './generate/player';
export { generateDevPack, generateMiniPack, packChecksum } from './generate/pack';
export { teamForMatch } from './match/lineup';
export * from './competition/schema';
export { roundRobin, standings, type Played, type Row } from './competition/league';
export { applyOutcomes, regulationsFor, type Turnover } from './competition/outcomes';
export { dayOf, isoOf } from './competition/calendar';
export {
  checkSeason,
  finishSeason,
  matchCount,
  matchesOn,
  nextDay,
  record,
  runSeason,
  startSeason,
  type Outcome,
  type SeasonState,
} from './competition/season';
export { matchInputFor, outcomeOf } from './match/fixture-input';
export * from './finance/ledger';
export * from './career/start';
export * from './career/advance';
export { clubStrength, quickResult } from './match/quick';
export * from './career/save';
export * from './career/squad';
export * from './career/training';
export * from './career/market';
export * from './career/board';
export * from './career/inbox';
export { attendance, tierOf } from './career/finance';
export * from './match/moments';
