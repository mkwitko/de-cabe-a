/**
 * Modo Clube routes (/v1/manager). Only the tactical sandbox so far
 * (docs/GAME_DESIGN/MODO_CLUBE/TASKS.md, phase 2): the server simulates and
 * the client only draws frames (ADR-015).
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  DEFAULT_INSTRUCTIONS,
  DT,
  InstructionsSchema,
  createSandbox,
  frame,
  step,
} from '@decabeca/match-engine';

const MAX_TICK = (90 * 60) / DT;
/** Ten minutes of play per request keeps the response under 300 KB gzipped. */
const MAX_CHUNK = (10 * 60) / DT;

const Body = z.strictObject({
  seed: z.number().int().min(0).max(0x7fffffff),
  /** First tick wanted; frames for from+1 … from+count come back. */
  from: z.number().int().min(0).max(MAX_TICK),
  count: z.number().int().min(1).max(MAX_CHUNK),
  /** Team 0 instruction changes, each valid from its tick on. */
  commands: z
    .array(
      z.strictObject({
        tick: z.number().int().min(0).max(MAX_TICK),
        instructions: InstructionsSchema,
      }),
    )
    .max(40),
});

export const managerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/manager/sandbox',
    { schema: { body: Body }, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (req) => {
      const { seed, from, count } = req.body;
      const commands = [...req.body.commands].sort((a, b) => a.tick - b.tick);
      const end = Math.min(from + count, MAX_TICK);
      // ponytail: stateless, so every request re-simulates from tick 0 (about 100 ms for a
      // whole match). Real matches persist the state between chunks (ADR-015 §4).
      const s = createSandbox(seed);
      const frames: number[][] = [];
      let next = 0;
      while (s.tick < end) {
        while (next < commands.length && commands[next]!.tick <= s.tick)
          s.instructions[0] = commands[next++]!.instructions;
        step(s);
        if (s.tick > from) frames.push(frame(s));
      }
      return { dt: DT, defaults: DEFAULT_INSTRUCTIONS, frames, done: end >= MAX_TICK };
    },
  );
};
