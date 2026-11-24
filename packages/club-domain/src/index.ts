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
export * from './competition/conmebol';
export { FOREIGN_CLUBS, FOREIGN_COLOURS, type ForeignClubData } from './competition/conmebol-data';
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
export { signingEffect, type SigningEffect } from './career/preview';
export { matchReport, type FactKind, type ReportFact } from './career/report';
export { clubStrength, clubStrengthOf, quickResult } from './match/quick';
export type { Goal } from './match/scorers';
export * from './career/save';
export * from './career/squad';
export * from './career/training';
export * from './career/market';
export * from './career/board';
export * from './career/history';
export * from './career/bridge';
export * from './career/inbox';
export * from './career/todo';
export * from './market/value';
export * from './market/plan';
export * from './market/deals';
export * from './market/books';
export * from './market/rounds';
export * from './market/scouts';
export * from './career/bases';
export * from './market/talks';
export * from './market/judgement';
export * from './market/contracts';
export * from './market/loans';
export * from './market/clauses';
export * from './market/unrest';
export * from './market/fairplay';
export * from './market/abroad';
export * from './market/scouting';
export * from './market/agents';
export * from './career/development';
export * from './career/years';
export * from './career/health';
export * from './career/discipline';
export * from './market/currency';
export * from './career/jobs';
export * from './career/coaches';
export * from './career/coach-pool';
export { attendance, tierOf } from './career/finance';
export { estadualView, type EstadualView } from './career/estadual';
export {
  NORDESTE_ID,
  NORTE_ID,
  CENTRO_OESTE_ID,
  VERDE_ID,
  SUL_SUDESTE_ID,
  SUPERCOPA_ID,
} from './competition/regionais-data';
export { awayLoss, distanceKm, travelCost, travelTire } from './career/travel';
export * from './career/clubs';
export * from './career/prices';
export * from './match/moments';
export { COPA_ID, COPA_PHASES } from './competition/copa';
export { cupReached, cupStage, cupView, restBefore, type CupTie, type CupView } from './career/cup';
