import { z } from 'zod';

/** GET /v1/health */
export const HealthResponse = z.strictObject({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof HealthResponse>;

/** GET /v1/config: what the web needs to know about the server's setup (public, no secrets). */
export const PublicConfig = z.strictObject({
  /** Sign-in with Google is configured (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET). */
  google: z.boolean(),
});
export type PublicConfig = z.infer<typeof PublicConfig>;
