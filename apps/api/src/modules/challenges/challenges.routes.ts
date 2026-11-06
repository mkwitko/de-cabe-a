import { TimelineParams } from './timeline-snapshot';
import { HigherLowerParams } from './higher-lower-snapshot';
import { ImpostorParams } from './impostor-snapshot';
import { GameMode } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../errors';
import {
  careerPathEligibility,
  createChallenge,
  publishChallenge,
  retireChallenge,
  validateChallenge,
} from './challenges.service';
import { buildGridSnapshot, GridParams } from './grid-snapshot';

const Id = z.object({ id: z.string() });
const Tier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const Params = z.union([
  z.object({ playerId: z.string() }),
  GridParams,
  ImpostorParams,
  TimelineParams,
  HigherLowerParams,
]);

export const challengeRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  const editor = (h: unknown) => String(h ?? 'editor').slice(0, 60);

  app.post(
    '/challenges',
    {
      schema: {
        body: z.object({ mode: GameMode, difficultyTier: Tier.optional(), params: Params }),
      },
    },
    async (req, reply) =>
      reply.code(201).send(
        await createChallenge(prisma, {
          ...req.body,
          createdBy: editor(req.headers['x-editor']),
        }),
      ),
  );
  app.post('/challenges/:id/validate', { schema: { params: Id } }, (req) =>
    validateChallenge(prisma, req.params.id),
  );
  app.post('/challenges/:id/publish', { schema: { params: Id } }, (req) =>
    publishChallenge(prisma, req.params.id, now()),
  );
  app.post(
    '/challenges/:id/retire',
    {
      schema: {
        params: Id,
        body: z.object({
          reason: z.string().min(3),
          replacementParams: Params.optional(),
          difficultyTier: Tier.optional(),
        }),
      },
    },
    (req) =>
      retireChallenge(
        prisma,
        req.params.id,
        req.body.reason,
        req.body.replacementParams
          ? { params: req.body.replacementParams, difficultyTier: req.body.difficultyTier }
          : undefined,
        editor(req.headers['x-editor']),
      ),
  );

  /** Levels of each track plus drafts (UX_SPEC.md §7). */
  app.get(
    '/challenges',
    {
      schema: {
        querystring: z.object({
          mode: GameMode.optional(),
          status: z.enum(['draft', 'validated', 'published', 'retired']).optional(),
        }),
      },
    },
    async (req) => {
      const items = await prisma.challenge.findMany({
        where: {
          ...(req.query.mode ? { gameMode: req.query.mode } : {}),
          ...(req.query.status ? { status: req.query.status } : {}),
        },
        omit: { snapshot: true },
        include: { usages: true, _count: { select: { attempts: true } } },
        orderBy: [
          { gameMode: 'asc' },
          { publicNumber: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        take: 1000,
      });
      const names = new Map(
        (
          await prisma.player.findMany({
            where: {
              id: {
                in: items.flatMap((c) =>
                  c.usages.filter((u) => u.role === 'answer').map((u) => u.playerId),
                ),
              },
            },
            select: { id: true, canonicalName: true },
          })
        ).map((p) => [p.id, p.canonicalName]),
      );
      return {
        items: items.map(({ usages, _count, ...c }) => ({
          ...c,
          level: c.publicNumber,
          attempts: _count.attempts,
          answer:
            c.gameMode === 'CAREER_PATH'
              ? (names.get(usages.find((u) => u.role === 'answer')?.playerId ?? '') ?? null)
              : null,
        })),
      };
    },
  );
  /** The only route that returns a full snapshot (ARCHITECTURE.md §8). */
  app.get('/challenges/:id/preview', { schema: { params: Id } }, async (req) => {
    const c = await prisma.challenge.findUnique({ where: { id: req.params.id } });
    if (!c) throw new AppError(404, 'NOT_FOUND', 'Desafio não encontrado.');
    return c;
  });

  app.post(
    '/eligibility/career-path',
    { schema: { body: z.object({ playerId: z.string() }) } },
    async (req) => {
      const { player: _player, ...report } = await careerPathEligibility(prisma, req.body.playerId);
      return report;
    },
  );
  app.post('/eligibility/grid', { schema: { body: GridParams } }, async (req) => {
    const { config: _config, ...report } = await buildGridSnapshot(prisma, req.body, 'daily');
    return report;
  });
};
