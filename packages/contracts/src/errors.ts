import { z } from 'zod';

/** Stable error codes (ARCHITECTURE.md §6). Messages are PT-BR and may change; codes may not. */
export const ErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INTERNAL_ERROR',
  'RATE_LIMITED',
  'INVALID_TRANSITION',
  'DATA_QUALITY_VIOLATION',
  'CHALLENGE_NOT_ELIGIBLE',
  'ATTEMPT_NOT_FOUND',
  'GAME_ALREADY_COMPLETED',
  'DUPLICATE_GUESS',
  'CELL_ALREADY_FILLED',
  'PLAYER_ALREADY_USED',
  'HINT_ALREADY_USED',
  'NO_HINTS_LEFT',
  'UNKNOWN_PLAYER',
  'LEVEL_NOT_FOUND',
  'LEVEL_LOCKED',
  'NICKNAME_TAKEN',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'LEVEL_NOT_FINISHED',
  'PLAYER_NOT_IN_ROUND',
  'CAREER_EXISTS',
  'SEASON_OVER',
  'NEEDS_TRAINING',
  'SEASON_NOT_OVER',
  'NICKNAME_REQUIRED',
  'TOO_MANY_LEAGUES',
  'LEAGUE_FULL',
  'SQUAD_LOCKED',
  'COPA_NOT_STARTED',
  'COPA_CONFLICT',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorBody = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.record(z.string(), z.unknown()),
  }),
});
export type ErrorBody = z.infer<typeof ErrorBody>;
