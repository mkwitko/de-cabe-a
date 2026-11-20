/**
 * Modo Clube career (MC-081, MC-176, MC-177). Every route finds the career through the request's
 * own session (account id, else guest session id); a career id from the client is never trusted
 * (01 §6). The solo career is simulated in the browser (ADR-020): the server picks the seed,
 * validates the start and keeps the record.
 */
import { createHash, randomInt } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  canStartAt,
  jobOffers,
  nationalDivisions,
  CAREER_RULES_VERSION,
  START_MODES,
} from '@decabeca/club-domain';
import { MATCH_ENGINE_VERSION } from '@decabeca/match-engine';
import { AppError } from '../../errors';
import type { PrismaClient } from '../../generated/prisma/client';
import { pack, packOf, packVersion } from './packs';

export const ownerOf = (req: { sessionId: string; userId: string | null }) =>
  req.userId ?? req.sessionId;

/** The newest pack, for new careers; a career keeps its own (packs.ts, ADR-023). */
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
  to: z.coerce.number().int().min(0),
  /** Season the snapshot is in: the same, or the next one after a season turn. */
  season: z.coerce.number().int().min(1900).max(2200),
  /** A decision changed the world on the same day (the line-up): the snapshot alone is kept. */
  still: z.literal('1').optional(),
});
/** PARÂMETRO: a season spans about a year of days; no single step goes beyond it. */
const MAX_STEP = 400;
/** PARÂMETRO: a snapshot is ~45–70 KB gzip for the big pack (MC-084); room for growth. */
const MAX_SNAPSHOT = 512 * 1024;

/** The backup file (ADR-023). `snapshot` is the parsed `saveCareer` JSON; null on day one. */
const CAREER_FILE_KIND = 'decabeca-career';
const CareerFileSchema = z.strictObject({
  kind: z.literal(CAREER_FILE_KIND),
  v: z.literal(1),
  packId: z.string().min(1).max(60),
  packVersion: z.string().min(1).max(80),
  rules: z.number().int().min(1).nullable(),
  seed: z.number().int().min(0).max(0x7fffffff),
  startMode: z.enum(START_MODES),
  clubId: z.string().min(1).max(40).nullable(),
  season: z.number().int().min(1900).max(2200),
  day: z.number().int().min(0).max(1_000_000),
  snapshot: z.record(z.string(), z.unknown()).nullable(),
});
type CareerFile = z.infer<typeof CareerFileSchema>;
/** PARÂMETRO: the unzipped file; a snapshot is a few MB of JSON at most. Bounds a zip bomb. */
const MAX_UNZIPPED = 32 * 1024 * 1024;

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
   * 01 §6). `still` keeps a new snapshot of the same day, for a decision that moves no day
   * (the line-up). The server does not replay the days here: only when the result affects someone else
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
      const { from, to, season, still } = req.query;
      const bytes = req.body;
      if (!(bytes instanceof Buffer) || bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b)
        throw new AppError(400, 'VALIDATION_ERROR', 'Fotografia inválida.');
      // Day 0 is "nothing played yet": the first step lands on a calendar day.
      if (to < from || (from > 0 && to - from > MAX_STEP))
        throw new AppError(400, 'VALIDATION_ERROR', 'Avanço fora do calendário.');
      const c = await currentCareer(prisma, ownerOf(req));
      if (!c) throw new AppError(404, 'NOT_FOUND', 'Nenhuma carreira em andamento.');
      if (still) {
        if (to !== from || season !== c.world.season)
          throw new AppError(400, 'VALIDATION_ERROR', 'Avanço fora do calendário.');
        const kept = await prisma.clubWorld.updateMany({
          where: { id: c.world.id, day: from, season },
          data: { revision: { increment: 1 }, data: new Uint8Array(bytes) },
        });
        if (kept.count === 0)
          throw new AppError(409, 'INVALID_TRANSITION', 'A carreira já avançou em outra aba.');
        return { career: view(c) };
      }
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

  /**
   * Ends the person's career (the board dismissed them, or they gave it up). The world stays for
   * audit; the person may start another career.
   */
  app.post('/manager/career/end', async (req) => {
    const c = await currentCareer(prisma, ownerOf(req));
    if (!c) throw new AppError(404, 'NOT_FOUND', 'Nenhuma carreira em andamento.');
    await prisma.clubCareer.update({ where: { id: c.id }, data: { status: 'ended' } });
    return { ended: true };
  });

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

  /**
   * The player's backup (ADR-023): the career as one gzip JSON file, naming the pack and rules
   * version it needs. The snapshot travels as the JSON it is, so the file is one gzip, not two.
   */
  app.get('/manager/career/export', async (req, reply) => {
    const c = await currentCareer(prisma, ownerOf(req));
    if (!c) throw new AppError(404, 'NOT_FOUND', 'Nenhuma carreira em andamento.');
    const w = await prisma.clubWorld.findUniqueOrThrow({
      where: { id: c.world.id },
      select: { data: true },
    });
    const snapshot = w.data.length ? JSON.parse(gunzipSync(w.data).toString()) : null;
    const file: CareerFile = {
      kind: CAREER_FILE_KIND,
      v: 1,
      packId: c.world.packId,
      packVersion: c.world.packVersion,
      rules: snapshot ? (snapshot.v as number) : null,
      seed: c.world.seed,
      startMode: c.startMode as (typeof START_MODES)[number],
      clubId: c.clubId,
      season: c.world.season,
      day: c.world.day,
      snapshot,
    };
    reply.header('cache-control', 'no-store');
    reply.header('content-disposition', 'attachment; filename="carreira.json.gz"');
    reply.type('application/gzip');
    return gzipSync(JSON.stringify(file));
  });

  /**
   * Restores a backup as the person's career, replacing the one in progress. Everything is
   * validated here: size, schema, that the pack still exists and that the rules version is not
   * newer than this server's. The snapshot is stored as it was (older rules still load, ADR-023).
   */
  app.post(
    '/manager/career/import',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const bad = () => new AppError(400, 'VALIDATION_ERROR', 'Arquivo de carreira inválido.');
      const bytes = req.body;
      if (!(bytes instanceof Buffer) || bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b)
        throw bad();
      let file: CareerFile;
      try {
        const text = gunzipSync(bytes, { maxOutputLength: MAX_UNZIPPED }).toString();
        file = CareerFileSchema.parse(JSON.parse(text));
      } catch {
        throw bad();
      }
      const { snapshot } = file;
      const p = packOf(file.packId, file.packVersion);
      if (!p)
        throw new AppError(
          422,
          'VALIDATION_ERROR',
          'Os dados desta carreira não estão mais disponíveis.',
        );
      if ((file.day === 0) !== (snapshot === null)) throw bad();
      if (snapshot) {
        if (
          typeof snapshot.v !== 'number' ||
          snapshot.v < 1 ||
          snapshot.v !== file.rules ||
          snapshot.day !== file.day
        )
          throw bad();
        if (snapshot.v > CAREER_RULES_VERSION)
          throw new AppError(
            422,
            'VALIDATION_ERROR',
            'Esta carreira é de uma versão mais nova do jogo.',
          );
      }
      if (
        file.clubId &&
        !(snapshot && snapshot.clubs) &&
        !p.clubs.some((x) => x.id === file.clubId)
      )
        throw bad();
      const data = snapshot ? new Uint8Array(gzipSync(JSON.stringify(snapshot))) : new Uint8Array();
      if (data.length > MAX_SNAPSHOT)
        throw new AppError(413, 'VALIDATION_ERROR', 'Arquivo grande demais.');
      const pk = ownerOf(req);
      const world = {
        packId: file.packId,
        packVersion: file.packVersion,
        engineVersion: MATCH_ENGINE_VERSION,
        seed: file.seed,
        season: file.season,
        day: file.day,
        data,
      };
      await prisma.$transaction(async (tx) => {
        // The one in progress (if any) is over: the backup takes its place.
        await tx.clubCareer.updateMany({
          where: { pk, status: { not: 'ended' } },
          data: { status: 'ended' },
        });
        await tx.clubCareer.create({
          data: { pk, startMode: file.startMode, clubId: file.clubId, world: { create: world } },
        });
      });
      const c = (await currentCareer(prisma, pk))!;
      reply.code(201);
      return { career: view(c) };
    },
  );
};
