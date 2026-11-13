/**
 * Modo Clube routes (/v1/manager). Only the tactical sandbox so far
 * (docs/GAME_DESIGN/MODO_CLUBE/TASKS.md, phase 2): the server simulates and
 * the client only draws frames (ADR-015).
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  SANDBOX_MAX_CHUNK,
  SANDBOX_MAX_TICK,
  SandboxInstructionsSchema,
  simulateSandbox,
} from '@decabeca/match-engine';

const Body = z.strictObject({
  seed: z.number().int().min(0).max(0x7fffffff),
  /** First tick wanted; frames for from+1 … from+count come back. */
  from: z.number().int().min(0).max(SANDBOX_MAX_TICK),
  count: z.number().int().min(1).max(SANDBOX_MAX_CHUNK),
  /** Team 0 instruction changes, each valid from its tick on. */
  commands: z
    .array(
      z.strictObject({
        tick: z.number().int().min(0).max(SANDBOX_MAX_TICK),
        instructions: SandboxInstructionsSchema,
      }),
    )
    .max(40),
});

export const managerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/manager/sandbox',
    { schema: { body: Body }, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (req) => simulateSandbox(req.body),
  );
};
