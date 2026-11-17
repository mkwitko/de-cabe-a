/**
 * Modo Clube career (MC-081, MC-176, MC-177). Every route finds the career through the request's
 * own session (account id, else guest session id); a career id from the client is never trusted
 * (01 §6). The solo career is simulated in the browser (ADR-020): the server picks the seed,
 * validates the start and keeps the record.
 */
import { createHash, randomInt } from 'node:crypto';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  canStartAt,
  generateDevPack,
  jobOffers,
  nationalDivisions,
  START_MODES,
} from '@decabeca/club-domain';
import { MATCH_ENGINE_VERSION } from '@decabeca/match-engine';
import { AppError } from '../../errors';
import type { PrismaClient } from '../../generated/prisma/client';

export const ownerOf = (req: { sessionId: string; userId: string | null }) =>
  req.userId ?? req.sessionId;

/**
 * The career pack. The browser downloads the same pack as a static file named by its checksum
 * (apps/web vite.config.ts worldPacks, ADR-020); the API never serves it.
 */
const pack = generateDevPack();
const packVersion = pack.checksum;
const divisions = nationalDivisions(pack);
const clubById = new Map(pack.clubs.map((c) => [c.id, c]));

/** The person's career that is not over, with the world's position in time, or null. */
export function currentCareer(prisma: PrismaClient, pk: string) {
  return prisma.clubCareer.findFirst({
    where: { pk, status: { not: 'ended' } },
    select: {
      id: true,
      clubId: true,
      status: true,
      startMode: true,
      world: { select: { packId: true, packVersion: true, seed: true, season: true, day: true } },
    },
  });
}

/**
 * Offers are the same however often the page is reloaded: their seed comes from the person and
 * how many careers they have had, never from the request.
 */
async function offersFor(prisma: PrismaClient, pk: string) {
  const n = await prisma.clubCareer.count({ where: { pk } });
  const seed = createHash('sha256').update(`${pk}:${n}`).digest().readUInt32BE(0) & 0x7fffffff;
  return jobOffers(pack, seed);
}

const CreateBody = z.strictObject({
  startMode: z.enum(START_MODES),
  clubId: z.string().min(1).max(40),
});

export const careerRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;

  const view = (c: NonNullable<Awaited<ReturnType<typeof currentCareer>>>) => ({
    id: c.id,
    clubId: c.clubId,
    status: c.status,
    startMode: c.startMode,
    packId: c.world.packId,
    packVersion: c.world.packVersion,
    // Solo career: the browser simulates, so it needs the seed (ADR-020; cheating only hurts
    // the person). Multiplayer worlds will never send it.
    seed: c.world.seed,
    season: c.world.season,
    day: c.world.day,
  });

  app.get('/manager/career', async (req) => {
    const c = await currentCareer(prisma, ownerOf(req));
    return { career: c && view(c) };
  });

  // What the start screen shows: the divisions to pick from and this person's three offers.
  app.get('/manager/career/options', async (req) => {
    const club = (id: string) => {
      const c = clubById.get(id)!;
      return {
        id,
        name: c.name,
        shortName: c.shortName,
        colours: c.colours,
        reputation: c.reputation,
      };
    };
    return {
      packId: pack.id,
      packVersion,
      divisions: divisions.map((d) => ({
        id: d.id,
        name: d.name,
        tier: d.tier,
        clubs: d.clubIds.map(club),
      })),
      offers: (await offersFor(prisma, ownerOf(req))).map((o) => ({
        ...club(o.clubId),
        profile: o.profile,
      })),
    };
  });

  app.post(
    '/manager/career',
    { schema: { body: CreateBody }, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const pk = ownerOf(req);
      const { startMode, clubId } = req.body;
      const offers = startMode === 'job_offers' ? await offersFor(prisma, pk) : [];
      if (!canStartAt(pack, startMode, clubId, offers))
        throw new AppError(400, 'VALIDATION_ERROR', 'Esse clube não está entre as opções.');
      try {
        const career = await prisma.clubCareer.create({
          data: {
            pk,
            startMode,
            clubId,
            world: {
              create: {
                packId: pack.id,
                packVersion,
                engineVersion: MATCH_ENGINE_VERSION,
                seed: randomInt(0, 0x7fffffff),
                season: pack.season,
                // Day one is the pack itself: nothing to store until the first snapshot (ADR-020).
                data: new Uint8Array(),
              },
            },
          },
          select: { id: true },
        });
        const c = (await currentCareer(prisma, pk))!;
        reply.code(201);
        return { career: view({ ...c, id: career.id }) };
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err;
        throw new AppError(409, 'CAREER_EXISTS', 'Você já tem uma carreira em andamento.');
      }
    },
  );
};
