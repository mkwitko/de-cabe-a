import {
  AdminAliasCreate,
  AdminClubCreate,
  AdminClubPatch,
  AdminPlayerListQuery,
  AdminPlayerPatch,
  AdminSpellCreate,
  AdminSpellPatch,
  VerificationStatus,
} from '@decabeca/contracts';
import { normalizeName } from '@decabeca/engine';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../errors';
import {
  addAlias,
  createSpell,
  listPlayers,
  playerDetail,
  updateClub,
  updatePlayer,
  updateSpell,
} from './knowledge.service';

const Id = z.object({ id: z.string() });
const editor = (req: FastifyRequest) => String(req.headers['x-editor'] ?? 'editor').slice(0, 60);
const strip = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };

export const knowledgeRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;

  app.get('/players', { schema: { querystring: AdminPlayerListQuery } }, (req) =>
    listPlayers(prisma, req.query),
  );
  app.get('/players/:id', { schema: { params: Id } }, (req) => playerDetail(prisma, req.params.id));
  app.patch('/players/:id', { schema: { params: Id, body: AdminPlayerPatch } }, (req) =>
    updatePlayer(prisma, req.params.id, strip(req.body), editor(req)),
  );

  app.post(
    '/players/:id/aliases',
    { schema: { params: Id, body: AdminAliasCreate } },
    async (req, reply) => reply.code(201).send(await addAlias(prisma, req.params.id, req.body)),
  );
  app.patch(
    '/players/:id/aliases/:aliasId',
    { schema: { params: Id.extend({ aliasId: z.string() }), body: AdminAliasCreate.partial() } },
    async (req) => {
      const { alias, ...rest } = strip(req.body);
      return prisma.playerAlias.update({
        where: { id: req.params.aliasId, playerId: req.params.id },
        data: { ...rest, ...(alias ? { alias, normalized: normalizeName(alias) } : {}) },
      });
    },
  );
  app.delete(
    '/players/:id/aliases/:aliasId',
    { schema: { params: Id.extend({ aliasId: z.string() }) } },
    async (req, reply) => {
      await prisma.playerAlias.delete({
        where: { id: req.params.aliasId, playerId: req.params.id },
      });
      return reply.code(204).send();
    },
  );

  app.post(
    '/players/:id/spells',
    { schema: { params: Id, body: AdminSpellCreate } },
    async (req, reply) =>
      reply
        .code(201)
        .send(
          await createSpell(prisma, req.params.id, { ...strip(req.body), playerId: req.params.id }),
        ),
  );
  app.patch(
    '/players/:id/spells/:spellId',
    { schema: { params: Id.extend({ spellId: z.string() }), body: AdminSpellPatch } },
    (req) => updateSpell(prisma, req.params.id, req.params.spellId, strip(req.body), editor(req)),
  );
  app.delete(
    '/players/:id/spells/:spellId',
    { schema: { params: Id.extend({ spellId: z.string() }) } },
    async (req, reply) => {
      const { count } = await prisma.careerSpell.deleteMany({
        where: { id: req.params.spellId, playerId: req.params.id },
      });
      if (!count) throw new AppError(404, 'NOT_FOUND', 'Passagem não encontrada.');
      return reply.code(204).send();
    },
  );

  app.get(
    '/clubs',
    {
      schema: {
        querystring: z.object({
          q: z.string().max(40).optional(),
          status: VerificationStatus.optional(),
        }),
      },
    },
    async (req) => ({
      items: await prisma.club.findMany({
        where: {
          ...(req.query.status ? { verificationStatus: req.query.status } : {}),
          ...(req.query.q
            ? {
                OR: [
                  { name: { contains: req.query.q, mode: 'insensitive' } },
                  { shortName: { contains: req.query.q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: { country: true },
        orderBy: { shortName: 'asc' },
        take: 200,
      }),
    }),
  );
  app.post('/clubs', { schema: { body: AdminClubCreate } }, async (req, reply) =>
    reply
      .code(201)
      .send(
        await prisma.club.create({ data: { ...strip(req.body), verificationStatus: 'draft' } }),
      ),
  );
  app.patch('/clubs/:id', { schema: { params: Id, body: AdminClubPatch } }, (req) =>
    updateClub(prisma, req.params.id, strip(req.body)),
  );
};
