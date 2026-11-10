import rateLimit from '@fastify/rate-limit';
import {
  AttemptResponse,
  GameMode,
  GamesResponse,
  PlayerCard,
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
import { playerCard } from '../knowledge/player-card';
import { AppError } from '../../errors';
import { guestSession, playerAttempts } from '../session/session';
import { progressionRoutes } from '../progression/progression.routes';
import { analyticsRoutes } from '../analytics/analytics';
import { accountRoutes } from '../account/account.routes';
import { levelReportRoutes } from '../reports/level-reports';
import { reactionRoutes } from '../reports/reactions';
import { pushRoutes } from '../push/push';
import { fantasyRoutes } from '../fantasy/fantasy';
import { copaRoutes } from '../copa/copa';
import { oficinaRoutes } from '../oficina/oficina';
import { careerRoutes } from '../career/career.routes';
import { dailyRoutes } from '../daily/daily';
import { albumRoutes } from '../album/album.routes';
import { leagueRoutes } from '../leagues/leagues';
import { modeVoteRoutes } from '../votes/mode-votes';
import { civilDate, dateColumn } from '../challenges/civil-date';
import { getAttempt, startAttempt, submitAction } from './attempts.service';

const GAMES = [
  { mode: 'CAREER_PATH', name: 'Career Path' },
  { mode: 'FOOTBALL_GRID', name: 'Grid' },
  { mode: 'IMPOSTOR', name: 'Impostor' },
  { mode: 'TIMELINE', name: 'Linha do tempo' },
  { mode: 'HIGHER_LOWER', name: 'Mais ou Menos' },
  { mode: 'MISSING_XI', name: 'Escalação' },
  { mode: 'MYSTERY_PLAYER', name: 'Craque Misterioso' },
  { mode: 'CONNECTIONS', name: 'Conexões' },
  { mode: 'DRAFT', name: 'Draft' },
] as const;

/** Public game routes; every request runs with a guest session (created on first visit). */
export const publicRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now, secureCookie, limits } = app.deps;
  app.addHook(
    'onRequest',
    guestSession(prisma, {
      secureCookie,
      now,
      sessionsPerIp: limits.sessionsPerIp,
      trustedOrigins: app.deps.auth.options.trustedOrigins as string[],
    }),
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
  await app.register(levelReportRoutes);
  await app.register(reactionRoutes);
  await app.register(pushRoutes);
  await app.register(fantasyRoutes);
  await app.register(copaRoutes);
  await app.register(oficinaRoutes);
  await app.register(careerRoutes);
  await app.register(dailyRoutes);
  await app.register(leagueRoutes);
  await app.register(albumRoutes);
  await app.register(modeVoteRoutes);

  /** The player's track of one game: every published level with its state (ADR-007). */
  async function track(req: { sessionId: string; userId: string | null }, mode: GameMode) {
    const levels = await prisma.challenge.findMany({
      // Community (Oficina) levels have no number and live outside the track.
      where: { gameMode: mode, status: 'published', publicNumber: { not: null } },
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
        timed: true,
        _count: { select: { actions: true } },
        challenge: { select: { publicNumber: true } },
      },
    });
    const best = new Map<number, (typeof attempts)[number]>();
    for (const a of attempts) {
      const n = a.challenge.publicNumber!;
      const prev = best.get(n);
      if (!prev || (a.completedAt && !prev.completedAt) || a.stars > prev.stars) best.set(n, a);
    }
    // Desafio do Dia levels (today and the archive) open out of order; they never open the next.
    const daily = new Set(
      (
        await prisma.dailyPick.findMany({
          where: { gameMode: mode, day: { lte: dateColumn(civilDate(now())) } },
          select: { level: true },
        })
      ).map((p) => p.level),
    );
    let open = true;
    return levels.map((l) => {
      const a = best.get(l.publicNumber!);
      // A level only opened (no guess, no skip, no clock running) is still "Jogar", not "Continuar".
      const state = a?.completedAt
        ? 'done'
        : a && (a.timed || a._count.actions > 0)
          ? 'in_progress'
          : open || daily.has(l.publicNumber!)
            ? 'open'
            : 'locked';
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
    '/players/:id/card',
    {
      config: { rateLimit: { max: limits.search, timeWindow: '1 minute' } },
      schema: { params: z.object({ id: z.string() }), response: { 200: PlayerCard } },
    },
    async (req) => {
      const card = await playerCard(prisma, req.params.id);
      if (!card) throw new AppError(404, 'NOT_FOUND', 'Jogador não encontrado.');
      return card;
    },
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
        req.body.timed,
        req.body.challengeId,
      );
      return reply.code(created ? 201 : 200).send(response);
    },
  );

  app.get(
    '/attempts/:id',
    { schema: { params: z.object({ id: z.string() }), response: { 200: AttemptResponse } } },
    (req) => getAttempt(prisma, req.params.id, req, now()),
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
