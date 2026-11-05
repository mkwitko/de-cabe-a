import { z } from 'zod';

/** GET /v1/health */
export const HealthResponse = z.strictObject({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof HealthResponse>;
