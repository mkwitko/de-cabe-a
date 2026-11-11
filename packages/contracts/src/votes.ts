import { z } from 'zod';

/** The modes still closed at launch (lib/launch.ts on the web): players vote for the next one. */
export const VotableMode = z.enum([
  'FOOTBALL_GRID',
  'IMPOSTOR',
  'TIMELINE',
  'MISSING_XI',
  'MYSTERY_PLAYER',
  'CONNECTIONS',
  'DRAFT',
  'career',
  'copa',
  'oficina',
]);
export type VotableMode = z.infer<typeof VotableMode>;

/** GET /v1/mode-votes: every closed mode with its votes (most voted first) and this account's vote. */
export const ModeVotesResponse = z.strictObject({
  modes: z.array(z.strictObject({ mode: VotableMode, votes: z.number().int() })),
  total: z.number().int(),
  /** null for guests and for accounts that have not voted. */
  mine: VotableMode.nullable(),
});
export type ModeVotesResponse = z.infer<typeof ModeVotesResponse>;

/** PUT /v1/mode-votes: one current vote per account; voting again moves it. */
export const ModeVoteRequest = z.strictObject({ mode: VotableMode });
export type ModeVoteRequest = z.infer<typeof ModeVoteRequest>;
