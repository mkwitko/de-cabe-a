/**
 * Reações (GROWTH_PLAN.md 2.5): after finishing a level, a player leaves one predefined reaction
 * on it ("Craque!", "Na trave!"...). Choosing again replaces it; DELETE undoes it. Free text is
 * left out on purpose: nothing to moderate.
 */
import { GameMode, ReactionKind, ReactionsResponse, ReactRequest } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../errors';
import { playerAttempts } from '../session/session';

const Params = z.object({ mode: GameMode, level: z.coerce.number().int().min(1) });

export const reactionRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  const pk = (req: { sessionId: string; userId: string | null }) => req.userId ?? req.sessionId;

  const challengeOf = async (mode: GameMode, level: number) => {
    const c = await prisma.challenge.findFirst({
      where: { gameMode: mode, publicNumber: level },
      select: { id: true },
    });
    if (!c) throw new AppError(404, 'LEVEL_NOT_FOUND', 'Fase não encontrada.');
    return c.id;
  };

  const summary = async (challengeId: string, me: string) => {
    const [groups, mine] = await Promise.all([
      prisma.levelReaction.groupBy({ by: ['kind'], where: { challengeId }, _count: true }),
      prisma.levelReaction.findUnique({ where: { challengeId_pk: { challengeId, pk: me } } }),
    ]);
    const counts = Object.fromEntries(ReactionKind.options.map((k) => [k, 0])) as Record<
      ReactionKind,
      number
    >;
    for (const g of groups) counts[g.kind as ReactionKind] = g._count;
    return { counts, mine: (mine?.kind as ReactionKind | undefined) ?? null };
  };

  app.get(
    '/levels/:mode/:level/reactions',
    { schema: { params: Params, response: { 200: ReactionsResponse } } },
    async (req) => summary(await challengeOf(req.params.mode, req.params.level), pk(req)),
  );

  app.put(
    '/levels/:mode/:level/reactions',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { params: Params, body: ReactRequest, response: { 200: ReactionsResponse } },
    },
    async (req) => {
      const challengeId = await challengeOf(req.params.mode, req.params.level);
      const finished = await prisma.attempt.findFirst({
        where: { ...playerAttempts(req), challengeId, completedAt: { not: null } },
        select: { id: true },
      });
      if (!finished) throw new AppError(403, 'LEVEL_NOT_FINISHED', 'Termine a fase para reagir.');
      const key = { challengeId_pk: { challengeId, pk: pk(req) } };
      await prisma.levelReaction.upsert({
        where: key,
        create: { challengeId, pk: pk(req), kind: req.body.kind },
        update: { kind: req.body.kind },
      });
      return summary(challengeId, pk(req));
    },
  );

  app.delete(
    '/levels/:mode/:level/reactions',
    { schema: { params: Params, response: { 200: ReactionsResponse } } },
    async (req) => {
      const challengeId = await challengeOf(req.params.mode, req.params.level);
      await prisma.levelReaction.deleteMany({ where: { challengeId, pk: pk(req) } });
      return summary(challengeId, pk(req));
    },
  );
};
