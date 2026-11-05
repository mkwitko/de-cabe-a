import { z } from 'zod';

/** Stable error codes (ARCHITECTURE.md §6). Messages are PT-BR and may change; codes may not. */
export const ErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'INTERNAL_ERROR',
  'RATE_LIMITED',
  'INVALID_TRANSITION',
  'DATA_QUALITY_VIOLATION',
  'CHALLENGE_NOT_ELIGIBLE',
  'NO_DAILY_CHALLENGE',
  'PRACTICE_POOL_EXHAUSTED',
  'ATTEMPT_NOT_FOUND',
  'GAME_ALREADY_COMPLETED',
  'DUPLICATE_GUESS',
  'CELL_ALREADY_FILLED',
  'PLAYER_ALREADY_USED',
  'UNKNOWN_PLAYER',
  'DATE_TAKEN',
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
