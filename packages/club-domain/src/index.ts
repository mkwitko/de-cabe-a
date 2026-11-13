/** Public surface of @decabeca/club-domain (01-ARQUITETURA.md §2). */
export * from './pack/schema';
export * from './player/ratings';
export { generateAttributes, generatePlayer, generateSquad, SQUAD } from './generate/player';
export { generateMiniPack, packChecksum } from './generate/pack';
export { teamForMatch } from './match/lineup';
