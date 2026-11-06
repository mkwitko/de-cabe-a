import rateLimit from '@fastify/rate-limit';
import {
  AttemptResponse,
  GameMode,
  GamesResponse,
  PlayerSearchQuery,
  PlayerSearchResponse,
  StartAttemptRequest,
  SubmitActionRequest,
  TrackResponse,
} from '@decabeca/contracts';
import { normalizeName } from '@decabeca/engine';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { searchPlayers } from '../knowledge/search';
import { guestSession, playerAttempts } from '../session/session';
import { progressionRoutes } from '../progression/progression.routes';
import { analyticsRoutes } from '../analytics/analytics';
import { accountRoutes } from '../account/account.routes';
import { getAttempt, startAttempt, submitAction } from './attempts.service';

const GAMES = [
  { mode: 'CAREER_PATH', name: 'Career Path' },
  { mode: 'FOOTBALL_GRID', name: 'Grid' },
] as const;

/** Public game routes; every request runs with a guest session (created on first visit). */
export const publicRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now, secureCookie, limits } = app.deps;
  app.addHook(
    'onRequest',
    guestSession(prisma, { secureCookie, now, sessionsPerIp: limits.sessionsPerIp }),
  );
  // After the session hook, so limits are per guest session (the IP only limits session creation).
  await app.register(rateLimit, {
    hook: 'preHandler',
    max: limits.perSession,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.sessionId,
  });
  await app.register(progressionRoutes);
  await app.register(analyticsRoutes);
  await app.register(accountRoutes);

  /** The player's track of one game: every published level with its state (ADR-007). */
  async function track(req: { sessionId: string; userId: string | null }, mode: GameMode) {
    const levels = await prisma.challenge.findMany({
      where: { gameMode: mode, status: 'published' },
      select: { id: true, publicNumber: true, difficultyTier: true },
      orderBy: { publicNumber: 'asc' },
    });
    // Keyed by level number: an attempt on a version replaced in place still counts.
    const attempts = await prisma.attempt.findMany({
      where: {
        ...playerAttempts(req),
        challenge: { gameMode: mode, publicNumber: { in: levels.map((l) => l.publicNumber!) } },
      },
      select: {
        completedAt: true,
        stars: true,
        score: true,
        challenge: { select: { publicNumber: true } },
      },
    });
    const best = new Map<number, (typeof attempts)[number]>();
    for (const a of attempts) {
      const n = a.challenge.publicNumber!;
      const prev = best.get(n);
      if (!prev || (a.completedAt && !prev.completedAt) || a.stars > prev.stars) best.set(n, a);
    }
    let open = true;
    return levels.map((l) => {
      const a = best.get(l.publicNumber!);
      const state = a?.completedAt ? 'done' : a ? 'in_progress' : open ? 'open' : 'locked';
      if (state !== 'done') open = false;
      return {
        level: l.publicNumber!,
        state,
        stars: a?.completedAt ? a.stars : 0,
        score: a?.completedAt ? a.score : 0,
        difficultyTier: l.difficultyTier,
      } as const;
    });
  }

  app.get('/games', { schema: { response: { 200: GamesResponse } } }, async (req) => ({
    games: await Promise.all(
      GAMES.map(async (g) => {
        const levels = await track(req, g.mode);
        return {
          ...g,
          levels: levels.length,
          completed: levels.filter((l) => l.state === 'done').length,
          stars: levels.reduce((s, l) => s + l.stars, 0),
          nextLevel:
            levels.find((l) => l.state === 'open' || l.state === 'in_progress')?.level ?? null,
        };
      }),
    ),
  }));

  app.get(
    '/tracks/:mode',
    { schema: { params: z.object({ mode: GameMode }), response: { 200: TrackResponse } } },
    async (req) => ({
      mode: req.params.mode,
      levels: await track(req, req.params.mode),
    }),
  );

  app.get(
    '/players/search',
    {
      config: { rateLimit: { max: limits.search, timeWindow: '1 minute' } },
      schema: { querystring: PlayerSearchQuery, response: { 200: PlayerSearchResponse } },
    },
    async (req) => {
      const players = await searchPlayers(prisma, req.query.q, req.query.limit);
      // Editorial signal for missing aliases (DATA_QUALITY.md §5); the text never goes to analytics.
      if (!players.length && req.query.q.length >= 3) {
        const normalized = normalizeName(req.query.q);
        await prisma.searchMiss.upsert({
          where: { normalized },
          create: { normalized, lastAt: now() },
          update: { count: { increment: 1 }, lastAt: now() },
        });
      }
      return { players };
    },
  );

  app.post(
    '/attempts',
    {
      schema: {
        body: StartAttemptRequest,
        response: { 200: AttemptResponse, 201: AttemptResponse },
      },
    },
    async (req, reply) => {
      const { created, response } = await startAttempt(
        prisma,
        req,
        req.body.mode,
        req.body.level,
        now(),
      );
      return reply.code(created ? 201 : 200).send(response);
    },
  );

  app.get(
    '/attempts/:id',
    { schema: { params: z.object({ id: z.string() }), response: { 200: AttemptResponse } } },
    (req) => getAttempt(prisma, req.params.id, req),
  );

  app.post(
    '/attempts/:id/actions',
    {
      config: { rateLimit: { max: limits.actions, timeWindow: '1 minute' } },
      schema: {
        params: z.object({ id: z.string() }),
        body: SubmitActionRequest,
        response: { 200: AttemptResponse },
      },
    },
    (req) =>
      submitAction(prisma, req.params.id, req, req.body.idempotencyKey, req.body.input, now()),
  );
};
