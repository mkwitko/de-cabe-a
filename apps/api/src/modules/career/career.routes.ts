/** Modo Carreira routes (/v1/career). */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { isBlockedName } from '../account/auth';
import { AppError } from '../../errors';
import {
  careerView,
  chooseOffer,
  createCareer,
  playMatch,
  retireCareer,
  startOptions,
} from './career.service';

export const careerRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.get('/career', async (req) => careerView(prisma, req));
  app.get('/career/options', async () => startOptions(prisma));
  app.post(
    '/career',
    {
      schema: {
        body: z.object({
          name: z.string().trim().min(3).max(24),
          position: z.enum(['GK', 'DF', 'MF', 'FW']),
          start: z.enum(['youth', 'serieC']),
          clubId: z.string(),
        }),
      },
    },
    async (req, reply) => {
      // Same word filter as public nicknames (the name shows on shared cards).
      if (isBlockedName(req.body.name))
        throw new AppError(400, 'VALIDATION_ERROR', 'Escolha outro nome.');
      await createCareer(prisma, req, req.body);
      return reply.code(201).send(await careerView(prisma, req));
    },
  );
  app.post('/career/play', async (req) => {
    await playMatch(prisma, req);
    return careerView(prisma, req);
  });
  app.post(
    '/career/offer',
    { schema: { body: z.object({ index: z.number().int().min(-1).max(5) }) } },
    async (req) => {
      await chooseOffer(prisma, req, req.body.index);
      return careerView(prisma, req);
    },
  );
  app.post('/career/retire', async (req) => {
    await retireCareer(prisma, req);
    return careerView(prisma, req);
  });
};
