/**
 * Modo Clube career (MC-081): every route finds the career through the request's own session
 * (account id, else guest session id); a career id from the client is never trusted (01 §6).
 * One query per request, the world's summary fields only; the world document is not read here.
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { PrismaClient } from '../../generated/prisma/client';

export const ownerOf = (req: { sessionId: string; userId: string | null }) =>
  req.userId ?? req.sessionId;

/** The person's career that is not over, with the world's position in time, or null. */
export function currentCareer(prisma: PrismaClient, pk: string) {
  return prisma.clubCareer.findFirst({
    where: { pk, status: { not: 'ended' } },
    select: {
      id: true,
      clubId: true,
      status: true,
      startMode: true,
      world: { select: { packId: true, season: true, day: true } },
    },
  });
}

export const careerRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.get('/manager/career', async (req) => {
    const c = await currentCareer(prisma, ownerOf(req));
    return {
      career: c && {
        id: c.id,
        clubId: c.clubId,
        status: c.status,
        startMode: c.startMode,
        packId: c.world.packId,
        season: c.world.season,
        day: c.world.day,
      },
    };
  });
};
