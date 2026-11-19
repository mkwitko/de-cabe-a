/** Public surface of @decabeca/club-domain (01-ARQUITETURA.md §2). */
export * from './pack/schema';
export * from './player/ratings';
export { generateAttributes, generatePlayer, generateSquad, PEAK, SQUAD } from './generate/player';
export {
  economy,
  estimatedBody,
  generateDevPack,
  generateMiniPack,
  packChecksum,
  slimPack,
  staffing,
} from './generate/pack';
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
export * from './market/value';
export * from './market/plan';
export * from './market/deals';
export * from './market/books';
export * from './market/rounds';
export * from './market/talks';
export * from './market/judgement';
export * from './market/contracts';
export * from './market/loans';
export * from './market/fairplay';
export * from './market/abroad';
export * from './market/scouting';
export * from './market/agents';
export * from './career/development';
export * from './career/years';
export * from './career/health';
export * from './career/jobs';
export { attendance, tierOf } from './career/finance';
export { awayLoss, distanceKm, travelCost, travelTire } from './career/travel';
export * from './career/clubs';
export * from './career/prices';
export * from './match/moments';
