import {
  AchievementsResponse,
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
import { achievements } from './achievements';
import { myPks } from '../leagues/leagues';
import { civilDate } from '../challenges/civil-date';
import type { GameModeCode } from '../challenges/engines';

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

  app.get(
    '/me/achievements',
    { schema: { response: { 200: AchievementsResponse } } },
    async (req) => {
      const [done, picks, leagues] = await Promise.all([
        prisma.attempt.findMany({
          where: { ...playerAttempts(req), completedAt: { not: null } },
          select: {
            gameMode: true,
            stars: true,
            score: true,
            timed: true,
            startedAt: true,
            challenge: { select: { publicNumber: true } },
          },
        }),
        // ponytail: every draw (8 rows a day); filter by the player's days when this grows.
        prisma.dailyPick.findMany(),
        prisma.league.findMany({
          where: { members: { some: { pk: { in: await myPks(prisma, req) } } } },
          select: { _count: { select: { members: true } } },
        }),
      ]);
      const day = (d: Date) => d.toISOString().slice(0, 10);
      const drawn = new Set(picks.map((p) => `${day(p.day)}|${p.gameMode}|${p.level}`));
      const dailyModes = new Map<string, number>();
      for (const p of picks) dailyModes.set(day(p.day), (dailyModes.get(day(p.day)) ?? 0) + 1);
      return {
        items: achievements({
          attempts: done.map((a) => {
            // A level counts as that day's Desafio do Dia when started on the day it was drawn.
            const played = civilDate(a.startedAt);
            return {
              ...a,
              daily: drawn.has(`${played}|${a.gameMode}|${a.challenge.publicNumber}`)
                ? played
                : null,
            };
          }),
          dailyModes,
          biggestLeague: Math.max(0, ...leagues.map((l) => l._count.members)),
        }),
      };
    },
  );

  app.get('/me/stats', { schema: { response: { 200: StatsResponse } } }, async (req) => {
    const done = await prisma.attempt.findMany({
      where: { ...playerAttempts(req), completedAt: { not: null } },
    });
    const of = (mode: GameModeCode) => done.filter((a) => a.gameMode === mode);
    const cp = of('CAREER_PATH');
    const grid = of('FOOTBALL_GRID');
    const imp = of('IMPOSTOR');
    const tl = of('TIMELINE');
    const hl = of('HIGHER_LOWER');
    const xi = of('MISSING_XI');
    const mp = of('MYSTERY_PLAYER');
    const cn = of('CONNECTIONS');
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
      IMPOSTOR: {
        completed: imp.length,
        stars: sum(imp),
        threeStars: imp.filter((a) => a.stars === 3).length,
        perfect: imp.filter((a) => a.score === 5).length,
      },
      TIMELINE: {
        completed: tl.length,
        stars: sum(tl),
        threeStars: tl.filter((a) => a.stars === 3).length,
        perfect: tl.filter((a) => a.score === 5).length,
      },
      HIGHER_LOWER: {
        completed: hl.length,
        stars: sum(hl),
        threeStars: hl.filter((a) => a.stars === 3).length,
        perfect: hl.filter((a) => a.score === 5).length,
      },
      MISSING_XI: {
        completed: xi.length,
        stars: sum(xi),
        threeStars: xi.filter((a) => a.stars === 3).length,
        perfect: xi.filter((a) => a.score === 100).length,
      },
      MYSTERY_PLAYER: {
        completed: mp.length,
        stars: sum(mp),
        threeStars: mp.filter((a) => a.stars === 3).length,
        perfect: mp.filter((a) => a.score === 8).length,
      },
      CONNECTIONS: {
        completed: cn.length,
        stars: sum(cn),
        threeStars: cn.filter((a) => a.stars === 3).length,
        perfect: cn.filter((a) => a.score === 44).length,
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
