import { ImportWikidataRequest, ImportWikidataResponse } from '@decabeca/contracts';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { importWikidataPlayers } from './import.service';

export const importRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/import/wikidata',
    { schema: { body: ImportWikidataRequest, response: { 200: ImportWikidataResponse } } },
    (req) => importWikidataPlayers(app.deps.prisma, req.body.wikidataIds, app.deps.fetchEntities),
  );

  app.get(
    '/import/diffs',
    {
      schema: {
        querystring: z.object({ status: z.enum(['open', 'applied', 'dismissed']).default('open') }),
      },
    },
    async (req) => ({
      items: await app.deps.prisma.importDiff.findMany({
        where: { status: req.query.status },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
    }),
  );
};
