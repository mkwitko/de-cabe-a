import {
  GameMode,
  HistoryQuery,
  HistoryResponse,
  LevelRankingResponse,
  RankingQuery,
  RankingResponse,
  StatsResponse,
} from '@decabeca/contracts';
import { titleFor } from '@decabeca/engine';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../errors';
import { playerAttempts } from '../session/session';
import { ranking, rankRows, weekStart } from './ranking';

/** History, stats and ranking, derived from attempts (ADR-007). */
export const progressionRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  const me = (req: { sessionId: string; userId: string | null }) => req.userId ?? req.sessionId;

  app.get(
    '/me/history',
    { schema: { querystring: HistoryQuery, response: { 200: HistoryResponse } } },
    async (req) => {
      const { mode, cursor, limit } = req.query;
      const [cAt, cId] = cursor ? cursor.split('_') : [];
      const rows = await prisma.attempt.findMany({
        where: {
          ...playerAttempts(req),
          completedAt: { not: null },
          ...(mode ? { gameMode: mode } : {}),
          ...(cAt && cId
            ? {
                OR: [
                  { completedAt: { lt: new Date(cAt) } },
                  { completedAt: new Date(cAt), id: { lt: cId } },
                ],
              }
            : {}),
        },
        include: { challenge: { select: { publicNumber: true } } },
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      });
      const page = rows.slice(0, limit);
      const last = page.at(-1);
      return {
        items: page.map((a) => ({
          attemptId: a.id,
          mode: a.gameMode,
          level: a.challenge.publicNumber ?? 0,
          status: a.status,
          score: a.score,
          stars: a.stars,
          completedAt: a.completedAt!.toISOString(),
        })),
        nextCursor:
          rows.length > limit && last ? `${last.completedAt!.toISOString()}_${last.id}` : null,
      };
    },
  );

  app.get('/me/stats', { schema: { response: { 200: StatsResponse } } }, async (req) => {
    const done = await prisma.attempt.findMany({
      where: { ...playerAttempts(req), completedAt: { not: null } },
    });
    const of = (mode: 'CAREER_PATH' | 'FOOTBALL_GRID') => done.filter((a) => a.gameMode === mode);
    const cp = of('CAREER_PATH');
    const grid = of('FOOTBALL_GRID');
    const sum = (xs: typeof done) => xs.reduce((s, a) => s + a.stars, 0);
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
    for (const a of cp.filter((x) => x.status === 'WON')) distribution[String(7 - a.score / 10)]!++;
    const totalStars = sum(done);
    const [all, week] = await Promise.all([
      rankRows(prisma, null),
      rankRows(prisma, weekStart(now())),
    ]);
    return {
      totalStars,
      title: titleFor(totalStars),
      rank: { all: ranking(all, me(req)).me.position, week: ranking(week, me(req)).me.position },
      CAREER_PATH: {
        completed: cp.length,
        won: cp.filter((a) => a.status === 'WON').length,
        stars: sum(cp),
        threeStars: cp.filter((a) => a.stars === 3).length,
        distribution,
      },
      FOOTBALL_GRID: {
        completed: grid.length,
        stars: sum(grid),
        threeStars: grid.filter((a) => a.stars === 3).length,
        avgScore: grid.length
          ? Math.round((grid.reduce((s, a) => s + a.score, 0) / grid.length) * 10) / 10
          : 0,
        perfect: grid.filter((a) => a.score === 9).length,
      },
    };
  });

  app.get(
    '/ranking',
    { schema: { querystring: RankingQuery, response: { 200: RankingResponse } } },
    async (req) => {
      const rows = await rankRows(
        prisma,
        req.query.scope === 'week' ? weekStart(now()) : null,
        req.query.scope === 'timed',
      );
      return { scope: req.query.scope, ...ranking(rows, me(req)) };
    },
  );

  app.get(
    '/ranking/levels/:mode/:level',
    {
      schema: {
        params: z.object({ mode: GameMode, level: z.coerce.number().int().min(1) }),
        response: { 200: LevelRankingResponse },
      },
    },
    async (req) => {
      const c = await prisma.challenge.findFirst({
        where: { gameMode: req.params.mode, publicNumber: req.params.level },
      });
      if (!c) throw new AppError(404, 'LEVEL_NOT_FOUND', 'Fase não encontrada.');
      const rows = await prisma.$queryRaw<
        { pk: string; nickname: string; score: number; stars: number; duration: number }[]
      >`
        SELECT DISTINCT ON (COALESCE(s."userId", s.id)) COALESCE(s."userId", s.id) AS pk,
               COALESCE(u.nickname, s.nickname) AS nickname, a.score, a.stars,
               EXTRACT(EPOCH FROM (a."completedAt" - a."startedAt"))::int AS duration
        FROM "Attempt" a JOIN "GuestSession" s ON s.id = a."sessionId" LEFT JOIN "User" u ON u.id = s."userId"
        WHERE a."challengeId" = ${c.id} AND a."completedAt" IS NOT NULL AND COALESCE(u.nickname, s.nickname) IS NOT NULL
        ORDER BY COALESCE(s."userId", s.id), a.score DESC, a."completedAt" - a."startedAt"`;
      rows.sort((a, b) => b.score - a.score || a.duration - b.duration);
      return {
        entries: rows.slice(0, 10).map((r, i) => ({
          position: i + 1,
          nickname: r.nickname,
          score: r.score,
          stars: r.stars,
          durationSec: r.duration,
          isMe: r.pk === me(req),
        })),
      };
    },
  );
};
