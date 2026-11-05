import { GameMode, ChallengeKind } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../errors';
import {
  careerPathEligibility,
  createChallenge,
  publishChallenge,
  retireChallenge,
  scheduleChallenge,
  validateChallenge,
} from './challenges.service';
import { buildGridSnapshot, GridParams } from './grid-snapshot';
import { dateColumn } from './civil-date';

const Id = z.object({ id: z.string() });
const Tier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const CivilDate = z.iso.date();
const Params = z.union([z.object({ playerId: z.string() }), GridParams]);

export const challengeRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  const editor = (h: unknown) => String(h ?? 'editor').slice(0, 60);

  app.post(
    '/challenges',
    {
      schema: {
        body: z.object({
          mode: GameMode,
          kind: ChallengeKind,
          scheduledFor: CivilDate.optional(),
          difficultyTier: Tier.optional(),
          params: Params,
        }),
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
  app.post(
    '/challenges/:id/schedule',
    { schema: { params: Id, body: z.object({ scheduledFor: CivilDate }) } },
    (req) => scheduleChallenge(prisma, req.params.id, req.body.scheduledFor),
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
  app.get(
    '/challenges',
    {
      schema: {
        querystring: z.object({
          mode: GameMode.optional(),
          status: z.enum(['draft', 'validated', 'scheduled', 'published', 'retired']).optional(),
          kind: ChallengeKind.optional(),
          from: CivilDate.optional(),
          to: CivilDate.optional(),
        }),
      },
    },
    async (req) => {
      const { mode, status, kind, from, to } = req.query;
      const items = await prisma.challenge.findMany({
        where: {
          ...(mode ? { gameMode: mode } : {}),
          ...(status ? { status } : {}),
          ...(kind ? { kind } : {}),
          ...(from || to
            ? {
                scheduledFor: {
                  ...(from ? { gte: dateColumn(from) } : {}),
                  ...(to ? { lte: dateColumn(to) } : {}),
                },
              }
            : {}),
        },
        omit: { snapshot: true },
        include: {
          usages: { include: { challenge: false } },
          _count: { select: { attempts: true } },
        },
        orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
        take: 500,
      });
      const names = new Map(
        (
          await prisma.player.findMany({
            where: { id: { in: items.flatMap((c) => c.usages.map((u) => u.playerId)) } },
            select: { id: true, canonicalName: true },
          })
        ).map((p) => [p.id, p.canonicalName]),
      );
      return {
        items: items.map(({ usages, _count, ...c }) => ({
          ...c,
          scheduledFor: c.scheduledFor?.toISOString().slice(0, 10) ?? null,
          attempts: _count.attempts,
          answer:
            c.gameMode === 'CAREER_PATH' ? (names.get(usages[0]?.playerId ?? '') ?? null) : null,
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
    {
      schema: {
        body: z.object({
          playerId: z.string(),
          kind: ChallengeKind.default('daily'),
          scheduledFor: CivilDate.optional(),
        }),
      },
    },
    async (req) => {
      const { player: _player, ...report } = await careerPathEligibility(
        prisma,
        req.body.playerId,
        req.body.kind,
        req.body.scheduledFor,
      );
      return report;
    },
  );
  app.post(
    '/eligibility/grid',
    { schema: { body: GridParams.extend({ kind: ChallengeKind.default('daily') }) } },
    async (req) => {
      const { config: _config, ...report } = await buildGridSnapshot(
        prisma,
        req.body,
        req.body.kind,
      );
      return report;
    },
  );
};
