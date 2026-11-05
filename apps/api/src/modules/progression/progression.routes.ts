import { HistoryQuery, HistoryResponse, StatsResponse } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { civilDate } from '../challenges/civil-date';
import { streaks } from './streak';

/** RF-08: history and personal stats, derived from attempts (no materialised streak). */
export const progressionRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;

  app.get(
    '/me/history',
    { schema: { querystring: HistoryQuery, response: { 200: HistoryResponse } } },
    async (req) => {
      const { mode, cursor, limit } = req.query;
      const [cAt, cId] = cursor ? cursor.split('_') : [];
      const rows = await prisma.attempt.findMany({
        where: {
          sessionId: req.sessionId,
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
          kind: a.kind,
          publicNumber: a.kind === 'daily' ? a.challenge.publicNumber : null,
          status: a.status,
          score: a.score,
          completedAt: a.completedAt!.toISOString(),
        })),
        nextCursor:
          rows.length > limit && last ? `${last.completedAt!.toISOString()}_${last.id}` : null,
      };
    },
  );

  app.get('/me/stats', { schema: { response: { 200: StatsResponse } } }, async (req) => {
    const done = await prisma.attempt.findMany({
      where: { sessionId: req.sessionId, completedAt: { not: null } },
      include: { challenge: { select: { scheduledFor: true } } },
    });
    const today = civilDate(now());
    const of = (mode: 'CAREER_PATH' | 'FOOTBALL_GRID') => {
      const daily = done.filter((a) => a.gameMode === mode && a.kind === 'daily');
      const s = streaks(
        daily.map((a) => (a.challenge.scheduledFor ?? a.completedAt!).toISOString().slice(0, 10)),
        today,
      );
      return {
        daily,
        common: {
          currentStreak: s.current,
          maxStreak: s.max,
          practicePlayed: done.filter((a) => a.gameMode === mode && a.kind === 'practice').length,
        },
      };
    };
    const cp = of('CAREER_PATH');
    const grid = of('FOOTBALL_GRID');
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
    for (const a of cp.daily.filter((x) => x.status === 'WON')) {
      const used = 7 - a.score / 10;
      distribution[String(used)] = (distribution[String(used)] ?? 0) + 1;
    }
    return {
      CAREER_PATH: {
        played: cp.daily.length,
        won: cp.daily.filter((a) => a.status === 'WON').length,
        distribution,
        ...cp.common,
      },
      FOOTBALL_GRID: {
        played: grid.daily.length,
        avgScore: grid.daily.length
          ? Math.round((grid.daily.reduce((s, a) => s + a.score, 0) / grid.daily.length) * 10) / 10
          : 0,
        perfect: grid.daily.filter((a) => a.score === 9).length,
        ...grid.common,
      },
    };
  });
};
