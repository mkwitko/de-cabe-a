/**
 * Oficina De Cabeça (GROWTH_PLAN.md 3.1–3.5). Players build a Football Grid on our data; the
 * server validates it with the editors' snapshot builder (8 valid answers per cell, sound
 * combinations) and it waits for an editor before anyone plays it. Votes only after finishing;
 * lists by Wilson lower bound (Recomendados), plays (Populares) and date (Novos). Reports put a
 * level under review, never remove it on their own. Creator pages rank the audience on the
 * creator's levels; events open a set of levels for a window, optionally "apresentado por".
 * Oficina levels never count for stars, titles or rankings outside these pages.
 */
import {
  CommunityList,
  CommunityLevelView,
  CreateCommunityLevelRequest,
  CreatorResponse,
  EventResponse,
  EventsResponse,
  OficinaCriteriaResponse,
  VoteRequest,
} from '@decabeca/contracts';
import { isOffensive } from '@decabeca/engine';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { buildSnapshot } from '../challenges/challenges.service';
import { snapshotHash } from '../challenges/hash';
import { effectivePks, myPks } from '../leagues/leagues';

type Req = { sessionId: string; userId: string | null };
const pkOf = (req: Req) => req.userId ?? req.sessionId;
export const MAX_IN_REVIEW = 5;
export const REPORTS_TO_REVIEW = 3;
const PLAYABLE = ['published', 'featured'];

/** Wilson score lower bound (95%) of the share of up votes. */
export function wilson(up: number, total: number) {
  if (!total) return 0;
  const z2 = 1.96 ** 2;
  const p = up / total;
  return (
    (p + z2 / (2 * total) - 1.96 * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) /
    (1 + z2 / total)
  );
}

async function names(prisma: PrismaClient, pks: string[]) {
  const [users, guests] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: pks } }, select: { id: true, nickname: true } }),
    prisma.guestSession.findMany({
      where: { id: { in: pks } },
      select: { id: true, nickname: true },
    }),
  ]);
  return new Map([...users, ...guests].map((p) => [p.id, p.nickname]));
}

/** Plays, completions and votes of some levels. */
async function stats(prisma: PrismaClient, ids: string[]) {
  const [plays, done, votes] = await Promise.all([
    prisma.attempt.groupBy({
      by: ['challengeId'],
      where: { challengeId: { in: ids } },
      _count: true,
    }),
    prisma.attempt.groupBy({
      by: ['challengeId'],
      where: { challengeId: { in: ids }, completedAt: { not: null }, stars: { gt: 0 } },
      _count: true,
    }),
    prisma.communityVote.groupBy({
      by: ['challengeId', 'up'],
      where: { challengeId: { in: ids } },
      _count: true,
    }),
  ]);
  const get = (rows: { challengeId: string; _count: number }[], id: string) =>
    rows.find((r) => r.challengeId === id)?._count ?? 0;
  return (id: string) => {
    const up = votes.find((v) => v.challengeId === id && v.up)?._count ?? 0;
    const down = votes.find((v) => v.challengeId === id && !v.up)?._count ?? 0;
    const p = get(plays, id);
    return {
      plays: p,
      solved: p ? get(done, id) / p : 0,
      up,
      down,
      quality: wilson(up, up + down),
    };
  };
}

type LevelRow = Prisma.CommunityLevelGetPayload<object>;
async function views(prisma: PrismaClient, levels: LevelRow[]) {
  const ids = levels.map((l) => l.challengeId);
  const [s, who] = await Promise.all([
    stats(prisma, ids),
    names(
      prisma,
      levels.map((l) => l.authorPk),
    ),
  ]);
  return levels.map((l) => ({
    id: l.challengeId,
    title: l.title,
    author: who.get(l.authorPk) ?? 'Anônimo',
    state: l.state as CommunityLevelView['state'],
    sponsor: l.sponsor,
    createdAt: l.createdAt.toISOString(),
    ...s(l.challengeId),
  }));
}

/** Stars per player on some levels (best attempt per level), optionally inside a window. */
async function audience(prisma: PrismaClient, ids: string[], from?: Date, to?: Date) {
  if (!ids.length) return [];
  const rows = await prisma.$queryRaw<{ pk: string; stars: bigint; levels: bigint }[]>`
    WITH best AS (
      SELECT COALESCE(s."userId", s.id) AS pk, a."challengeId", MAX(a.stars) AS stars
      FROM "Attempt" a JOIN "GuestSession" s ON s.id = a."sessionId"
      WHERE a."challengeId" = ANY(${ids}) AND a."completedAt" IS NOT NULL
        AND (${from ?? null}::timestamp IS NULL OR a."startedAt" >= ${from ?? null}::timestamp)
        AND (${to ?? null}::timestamp IS NULL OR a."startedAt" < ${to ?? null}::timestamp)
      GROUP BY 1, 2
    )
    SELECT pk, SUM(stars) AS stars, COUNT(*) AS levels FROM best GROUP BY pk
    ORDER BY stars DESC, levels DESC, pk LIMIT 50`;
  const who = await names(
    prisma,
    rows.map((r) => r.pk),
  );
  return rows
    .filter((r) => who.get(r.pk))
    .slice(0, 20)
    .map((r, i) => ({
      position: i + 1,
      nickname: who.get(r.pk)!,
      stars: Number(r.stars),
      levels: Number(r.levels),
    }));
}

export const oficinaRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  const Id = z.object({ id: z.string().max(64) });

  app.get(
    '/oficina/criteria',
    { schema: { response: { 200: OficinaCriteriaResponse } } },
    async () => {
      // Clubs and countries with enough verified players for 8 answers per cell.
      const [clubs, countries] = await Promise.all([
        prisma.$queryRaw<{ id: string; name: string }[]>`
        SELECT c.id, c."shortName" AS name FROM "Club" c
        JOIN "CareerSpell" s ON s."clubId" = c.id AND s."verificationStatus" = 'verified'
        GROUP BY c.id HAVING COUNT(DISTINCT s."playerId") >= 15
        ORDER BY COUNT(DISTINCT s."playerId") DESC LIMIT 400`,
        prisma.$queryRaw<{ id: string; name: string }[]>`
        SELECT c.id, c.name AS name FROM "Country" c
        JOIN "Player" p ON p."nationalityCountryId" = c.id AND p."verificationStatus" = 'verified'
        GROUP BY c.id HAVING COUNT(*) >= 10 ORDER BY COUNT(*) DESC`,
      ]);
      return {
        clubs: clubs.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        countries: countries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      };
    },
  );

  app.post(
    '/oficina',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { body: CreateCommunityLevelRequest, response: { 201: CommunityLevelView } },
    },
    async (req, reply) => {
      const pk = pkOf(req);
      if (isOffensive(req.body.title))
        throw new AppError(400, 'VALIDATION_ERROR', 'Esse título não pode. Escolha outro.');
      const who = (await names(prisma, [pk])).get(pk);
      if (!who)
        throw new AppError(
          409,
          'NICKNAME_REQUIRED',
          'Escolha um apelido para assinar seus desafios.',
        );
      const pending = await prisma.communityLevel.count({
        where: { authorPk: { in: await myPks(prisma, req) }, state: 'review' },
      });
      if (pending >= MAX_IN_REVIEW)
        throw new AppError(
          409,
          'VALIDATION_ERROR',
          `Você já tem ${MAX_IN_REVIEW} desafios esperando revisão.`,
        );
      const { config, difficultyTier } = await buildSnapshot(prisma, {
        mode: 'FOOTBALL_GRID',
        params: { rows: req.body.rows, cols: req.body.cols },
      });
      const c = await prisma.challenge.create({
        data: {
          gameMode: 'FOOTBALL_GRID',
          engineVersion: (config as { engineVersion: number }).engineVersion,
          difficultyTier,
          snapshot: config as unknown as Prisma.InputJsonValue,
          snapshotHash: snapshotHash(config),
          status: 'validated',
          createdBy: `oficina:${pk}`,
          community: { create: { authorPk: pk, title: req.body.title } },
        },
        include: { community: true },
      });
      return reply.code(201).send((await views(prisma, [c.community!]))[0]!);
    },
  );

  app.get(
    '/oficina',
    {
      schema: {
        querystring: z.object({ list: CommunityList.default('recomendados') }),
        response: { 200: z.object({ levels: z.array(CommunityLevelView) }) },
      },
    },
    async (req) => {
      const levels = await prisma.communityLevel.findMany({
        where: { state: { in: PLAYABLE } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      const all = await views(prisma, levels);
      const sorted =
        req.query.list === 'novos'
          ? all
          : req.query.list === 'populares'
            ? [...all].sort((a, b) => b.plays - a.plays)
            : [...all].sort(
                (a, b) =>
                  Number(b.state === 'featured') - Number(a.state === 'featured') ||
                  b.quality - a.quality,
              );
      return { levels: sorted.slice(0, 50) };
    },
  );

  app.get(
    '/oficina/mine',
    { schema: { response: { 200: z.object({ levels: z.array(CommunityLevelView) }) } } },
    async (req) => ({
      levels: await views(
        prisma,
        await prisma.communityLevel.findMany({
          where: { authorPk: { in: await myPks(prisma, req) } },
          orderBy: { createdAt: 'desc' },
        }),
      ),
    }),
  );

  app.get(
    '/oficina/:id',
    {
      schema: {
        params: Id,
        response: {
          200: CommunityLevelView.extend({ myVote: z.boolean().nullable(), finished: z.boolean() }),
        },
      },
    },
    async (req) => {
      const l = await prisma.communityLevel.findUnique({ where: { challengeId: req.params.id } });
      const mine = await myPks(prisma, req);
      if (
        !l ||
        (!PLAYABLE.includes(l.state) && !mine.includes(l.authorPk) && l.state !== 'flagged')
      )
        throw new AppError(404, 'NOT_FOUND', 'Desafio não encontrado.');
      const [v] = await views(prisma, [l]);
      const vote = await prisma.communityVote.findUnique({
        where: { challengeId_pk: { challengeId: l.challengeId, pk: pkOf(req) } },
      });
      const finished = !!(await prisma.attempt.findFirst({
        where: {
          challengeId: l.challengeId,
          completedAt: { not: null },
          session: req.userId ? { userId: req.userId } : { id: req.sessionId },
        },
      }));
      return { ...v!, myVote: vote?.up ?? null, finished };
    },
  );

  app.put(
    '/oficina/:id/vote',
    { schema: { params: Id, body: VoteRequest } },
    async (req, reply) => {
      const finished = await prisma.attempt.findFirst({
        where: {
          challengeId: req.params.id,
          completedAt: { not: null },
          challenge: { community: { state: { in: [...PLAYABLE, 'flagged'] } } },
          session: req.userId ? { userId: req.userId } : { id: req.sessionId },
        },
      });
      if (!finished) throw new AppError(409, 'LEVEL_NOT_FINISHED', 'Termine o desafio para votar.');
      const pk = pkOf(req);
      await prisma.communityVote.upsert({
        where: { challengeId_pk: { challengeId: req.params.id, pk } },
        create: { challengeId: req.params.id, pk, up: req.body.up },
        update: { up: req.body.up },
      });
      return reply.code(204).send();
    },
  );

  app.post('/oficina/:id/report', { schema: { params: Id } }, async (req, reply) => {
    const l = await prisma.communityLevel
      .update({
        where: { challengeId: req.params.id },
        data: { reports: { increment: 1 } },
      })
      .catch(() => null);
    if (!l) throw new AppError(404, 'NOT_FOUND', 'Desafio não encontrado.');
    // Enough reports put it under review; an editor decides, nothing is removed automatically.
    if (l.reports >= REPORTS_TO_REVIEW && PLAYABLE.includes(l.state))
      await prisma.communityLevel.update({
        where: { challengeId: l.challengeId },
        data: { state: 'flagged' },
      });
    return reply.code(204).send();
  });

  app.get(
    '/criador/:nickname',
    {
      schema: {
        params: z.object({ nickname: z.string().max(40) }),
        response: { 200: CreatorResponse },
      },
    },
    async (req) => {
      const n = req.params.nickname;
      const [u, g] = await Promise.all([
        prisma.user.findFirst({ where: { nickname: { equals: n, mode: 'insensitive' } } }),
        prisma.guestSession.findFirst({ where: { nickname: { equals: n, mode: 'insensitive' } } }),
      ]);
      const owner = u?.id ?? g?.id;
      if (!owner) throw new AppError(404, 'NOT_FOUND', 'Criador não encontrado.');
      const pks = u
        ? [
            u.id,
            ...(
              await prisma.guestSession.findMany({ where: { userId: u.id }, select: { id: true } })
            ).map((s) => s.id),
          ]
        : await effectivePks(prisma, [owner]);
      const levels = await prisma.communityLevel.findMany({
        where: { authorPk: { in: pks }, state: { in: PLAYABLE } },
        orderBy: { createdAt: 'desc' },
      });
      const list = await views(prisma, levels);
      return {
        nickname: u?.nickname ?? g?.nickname ?? n,
        levels: list,
        plays: list.reduce((s, l) => s + l.plays, 0),
        ranking: await audience(
          prisma,
          levels.map((l) => l.challengeId),
        ),
      };
    },
  );

  async function eventView(e: Prisma.GameEventGetPayload<object>) {
    const levels = await prisma.communityLevel.findMany({
      where: { challengeId: { in: e.challengeIds } },
    });
    const t = now();
    return {
      slug: e.slug,
      title: e.title,
      description: e.description,
      sponsor: e.sponsor,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      status: (t < e.startsAt ? 'upcoming' : t >= e.endsAt ? 'over' : 'live') as
        'upcoming' | 'live' | 'over',
      levels: t < e.startsAt ? [] : await views(prisma, levels),
    };
  }

  app.get('/eventos', { schema: { response: { 200: EventsResponse } } }, async () => {
    const events = await prisma.gameEvent.findMany({ orderBy: { startsAt: 'desc' }, take: 20 });
    return { events: await Promise.all(events.map(eventView)) };
  });

  app.get(
    '/eventos/:slug',
    {
      schema: { params: z.object({ slug: z.string().max(60) }), response: { 200: EventResponse } },
    },
    async (req) => {
      const e = await prisma.gameEvent.findUnique({ where: { slug: req.params.slug } });
      if (!e) throw new AppError(404, 'NOT_FOUND', 'Evento não encontrado.');
      return {
        ...(await eventView(e)),
        // Only what was played inside the window counts.
        ranking: await audience(prisma, e.challengeIds, e.startsAt, e.endsAt),
      };
    },
  );
};

/** Editors: review queue, state changes, sponsor label, events. */
export const oficinaAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.get(
    '/oficina',
    { schema: { querystring: z.object({ state: z.string().default('review') }) } },
    async (req) => ({
      levels: await views(
        prisma,
        await prisma.communityLevel.findMany({
          where: { state: req.query.state },
          orderBy: { createdAt: 'asc' },
        }),
      ),
    }),
  );
  app.post(
    '/oficina/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({
          state: z.enum(['review', 'published', 'featured', 'flagged', 'archived']),
          sponsor: z.string().max(60).nullable().optional(),
        }),
      },
    },
    async (req) => {
      const l = await prisma.communityLevel.findUnique({ where: { challengeId: req.params.id } });
      if (!l) throw new AppError(404, 'NOT_FOUND', 'Desafio não encontrado.');
      const live = PLAYABLE.includes(req.body.state) || req.body.state === 'flagged';
      await prisma.$transaction([
        prisma.communityLevel.update({
          where: { challengeId: l.challengeId },
          data: {
            state: req.body.state,
            ...(req.body.sponsor !== undefined ? { sponsor: req.body.sponsor } : {}),
            ...(req.body.state === 'published' ? { reports: 0 } : {}),
          },
        }),
        prisma.challenge.update({
          where: { id: l.challengeId },
          data: {
            status: live ? 'published' : req.body.state === 'archived' ? 'retired' : 'validated',
            publishedAt: live ? new Date() : null,
          },
        }),
      ]);
      return { ok: true };
    },
  );
  app.post(
    '/eventos',
    {
      schema: {
        body: z.object({
          slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
          title: z.string().min(3).max(80),
          description: z.string().max(300),
          sponsor: z.string().max(60).nullable().default(null),
          startsAt: z.iso.datetime(),
          endsAt: z.iso.datetime(),
          challengeIds: z.array(z.string()).min(1).max(20),
        }),
      },
    },
    async (req, reply) => {
      const e = await prisma.gameEvent.create({
        data: {
          ...req.body,
          startsAt: new Date(req.body.startsAt),
          endsAt: new Date(req.body.endsAt),
        },
      });
      return reply.code(201).send({ slug: e.slug });
    },
  );
};
