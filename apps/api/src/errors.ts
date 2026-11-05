import type { ErrorCode } from '@decabeca/contracts';

/** An error with a stable code and HTTP status, rendered as ARCHITECTURE.md §6. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AppError';
  }
}
