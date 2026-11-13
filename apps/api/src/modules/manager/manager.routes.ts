/**
 * Modo Clube routes (/v1/manager). Only the tactical sandbox so far
 * (docs/GAME_DESIGN/MODO_CLUBE/TASKS.md, phase 2): the server simulates and
 * the client only draws frames (ADR-015).
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { generateMiniPack, teamForMatch } from '@decabeca/club-domain';
import {
  CommandSchema,
  FORMATIONS,
  MATCH_MAX_CHUNK,
  MatchInputSchema,
  TeamInstructionsSchema,
  advanceMatch,
  defaultPlan,
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

/**
 * Friendly match of corte 0,5 (TASKS MC-250): two clubs of the fictional
 * development pack, a formation and team instructions each, watched in chunks.
 * Stateless and pure: the same body always returns the same chunk.
 */
const pack = generateMiniPack();
const clubIds = pack.clubs.map((c) => c.id) as [string, ...string[]];
const MAX_TICK = 40_000;

const Side = z.strictObject({
  clubId: z.enum(clubIds),
  formation: z.enum(Object.keys(FORMATIONS) as [string, ...string[]]),
  instructions: TeamInstructionsSchema.partial(),
});
const FriendlyBody = z.strictObject({
  seed: z.number().int().min(0).max(0x7fffffff),
  home: Side,
  away: Side,
  from: z.number().int().min(0).max(MAX_TICK),
  count: z.number().int().min(1).max(MATCH_MAX_CHUNK),
  commands: z
    .array(
      z.strictObject({
        atMs: z
          .number()
          .int()
          .min(0)
          .max(4 * 3_600_000),
        team: z.union([z.literal(0), z.literal(1)]),
        command: CommandSchema,
      }),
    )
    .max(60),
});

function friendlyInput(b: z.infer<typeof FriendlyBody>) {
  const side = (x: z.infer<typeof Side>) => {
    const plan = defaultPlan(x.formation);
    plan.team = { ...plan.team, ...x.instructions } as typeof plan.team;
    return teamForMatch(pack, x.clubId, plan);
  };
  const home = pack.clubs.find((c) => c.id === b.home.clubId)!;
  return MatchInputSchema.parse({
    engineVersion: 0,
    seed: b.seed,
    teams: [side(b.home), side(b.away)],
    conditions: {
      crowd: 0.7,
      altitudeM: 0,
      pitch: home.stadium.pitch,
      weather: 'clear',
      refereeStrictness: 0.5,
    },
    rules: {
      substitutions: 5,
      substitutionWindows: 3,
      extraTime: false,
      penalties: false,
      videoReferee: true,
    },
  });
}

export const managerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/manager/friendly/clubs', async () => ({
    clubs: pack.clubs.map((c) => {
      const squad = pack.players.filter((p) => p.clubId === c.id);
      return {
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        colours: c.colours,
        players: squad.map((p) => ({
          id: p.id,
          name: p.knownAs ?? p.name,
          positions: p.positions.map((x) => x.position),
        })),
      };
    }),
    formations: Object.keys(FORMATIONS),
  }));

  app.post(
    '/manager/friendly/advance',
    { schema: { body: FriendlyBody }, config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (req) => {
      const b = req.body;
      const input = friendlyInput(b);
      const chunk = advanceMatch(input, b.commands, b.from, b.count);
      return { ...chunk, lineups: input.teams.map((t) => t.players.map((p) => p.id)) };
    },
  );

  app.post(
    '/manager/sandbox',
    { schema: { body: Body }, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (req) => simulateSandbox(req.body),
  );
};
