import {
  AttemptResponse,
  GamesResponse,
  PlayerSearchQuery,
  PlayerSearchResponse,
  StartAttemptRequest,
  SubmitActionRequest,
} from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { normalizeName } from '@decabeca/engine';
import { z } from 'zod';
import { civilDate } from '../challenges/civil-date';
import { todaysChallenge } from '../challenges/challenges.service';
import { searchPlayers } from '../knowledge/search';
import { guestSession } from '../session/session';
import { getAttempt, startAttempt, submitAction } from './attempts.service';
import { progressionRoutes } from '../progression/progression.routes';
import { analyticsRoutes } from '../analytics/analytics';

const GAMES = [
  { mode: 'CAREER_PATH', name: 'Career Path' },
  { mode: 'FOOTBALL_GRID', name: 'Grid' },
] as const;

/** Public game routes; every request runs with a guest session (created on first visit). */
export const publicRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now, random, secureCookie } = app.deps;
  app.addHook('onRequest', guestSession(prisma, { secureCookie, now }));
  await app.register(progressionRoutes);
  await app.register(analyticsRoutes);

  app.get('/games', { schema: { response: { 200: GamesResponse } } }, async (req) => {
    const at = now();
    const games = await Promise.all(
      GAMES.map(async (g) => {
        const challenge = await todaysChallenge(prisma, g.mode, at);
        if (!challenge) return { ...g, daily: null };
        const attempt = await prisma.attempt.findFirst({
          where: { sessionId: req.sessionId, challengeId: challenge.id, kind: 'daily' },
          select: { id: true, status: true, score: true },
        });
        return {
          ...g,
          daily: { challengeId: challenge.id, publicNumber: challenge.publicNumber, attempt },
        };
      }),
    );
    return { today: civilDate(at), games };
  });

  app.get(
    '/players/search',
    { schema: { querystring: PlayerSearchQuery, response: { 200: PlayerSearchResponse } } },
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
        req.sessionId,
        req.body.mode,
        req.body.kind,
        now(),
        random,
      );
      return reply.code(created ? 201 : 200).send(response);
    },
  );

  app.get(
    '/attempts/:id',
    { schema: { params: z.object({ id: z.string() }), response: { 200: AttemptResponse } } },
    (req) => getAttempt(prisma, req.params.id, req.sessionId),
  );

  app.post(
    '/attempts/:id/actions',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: SubmitActionRequest,
        response: { 200: AttemptResponse },
      },
    },
    (req) =>
      submitAction(
        prisma,
        req.params.id,
        req.sessionId,
        req.body.idempotencyKey,
        req.body.input,
        now(),
      ),
  );
};
