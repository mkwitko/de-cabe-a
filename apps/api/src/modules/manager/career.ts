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
      world: {
        select: { id: true, packId: true, packVersion: true, seed: true, season: true, day: true },
      },
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

/** The browser played the days from `from` to `to` and sends the world as it stands (ADR-020). */
const AdvanceQuery = z.strictObject({
  from: z.coerce.number().int().min(0),
  to: z.coerce.number().int().min(1),
  /** Season the snapshot is in: the same, or the next one after a season turn. */
  season: z.coerce.number().int().min(1900).max(2200),
});
/** PARÂMETRO: a season spans about a year of days; no single step goes beyond it. */
const MAX_STEP = 400;
/** PARÂMETRO: a snapshot is ~45–70 KB gzip for the big pack (MC-084); room for growth. */
const MAX_SNAPSHOT = 512 * 1024;

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

  // Snapshots travel as raw gzip bytes, never as JSON: no base64, no parsing on the server.
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: MAX_SNAPSHOT },
    (_req, body, done) => done(null, body),
  );

  /**
   * The browser played up to `to` and sends the snapshot (gzip JSON of `saveCareer`). Day and
   * snapshot change together. Idempotent and safe against two tabs: the same step twice answers
   * the same career; a step from a day the world is no longer at is a conflict (optimistic lock,
   * 01 §6). The server does not replay the days here: only when the result affects someone else
   * (ADR-020). ponytail: the bytes go to Postgres (measured ~5–20 ms a write); to R2 by a signed
   * upload when the deploy has its bucket.
   */
  app.put(
    '/manager/career/world',
    {
      schema: { querystring: AdvanceQuery },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    },
    async (req) => {
      const { from, to, season } = req.query;
      const bytes = req.body;
      if (!(bytes instanceof Buffer) || bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b)
        throw new AppError(400, 'VALIDATION_ERROR', 'Fotografia inválida.');
      // Day 0 is "nothing played yet": the first step lands on a calendar day.
      if (to < from || (from > 0 && to - from > MAX_STEP))
        throw new AppError(400, 'VALIDATION_ERROR', 'Avanço fora do calendário.');
      const c = await currentCareer(prisma, ownerOf(req));
      if (!c) throw new AppError(404, 'NOT_FOUND', 'Nenhuma carreira em andamento.');
      if (c.world.day === to && c.world.season === season) return { career: view(c) };
      // Standing still is only a season turn.
      if (to === from && season === c.world.season)
        throw new AppError(400, 'VALIDATION_ERROR', 'Avanço fora do calendário.');
      if (season !== c.world.season && season !== c.world.season + 1)
        throw new AppError(400, 'VALIDATION_ERROR', 'Temporada fora de ordem.');
      const moved = await prisma.clubWorld.updateMany({
        where: { id: c.world.id, day: from, season: c.world.season },
        data: { day: to, season, revision: { increment: 1 }, data: new Uint8Array(bytes) },
      });
      if (moved.count === 0)
        throw new AppError(409, 'INVALID_TRANSITION', 'A carreira já avançou em outra aba.');
      return { career: view({ ...c, world: { ...c.world, day: to, season } }) };
    },
  );

  /** The last snapshot as sent (gzip); empty on day one, when the world is the pack itself. */
  app.get('/manager/career/world', async (req, reply) => {
    const c = await currentCareer(prisma, ownerOf(req));
    if (!c) throw new AppError(404, 'NOT_FOUND', 'Nenhuma carreira em andamento.');
    const w = await prisma.clubWorld.findUniqueOrThrow({
      where: { id: c.world.id },
      select: { data: true },
    });
    reply.header('cache-control', 'no-store');
    reply.type('application/octet-stream');
    return Buffer.from(w.data);
  });
};
