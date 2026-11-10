import { createHash } from 'node:crypto';
import { DailyResponse, GameMode, RoundResponse } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { GameModeCode, PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { civilDate, dateColumn, addDays } from '../challenges/civil-date';
import { playerAttempts } from '../session/session';
import { ranking, weekStart } from '../progression/ranking';

const MODES = GameMode.options;
/** Below this many finished plays the share would be noise, so it stays hidden. */
export const MIN_PLAYS = 30;
const ARCHIVE_DAYS = 60;

/**
 * Draws the day's level for each mode that has none yet. Prefers levels never drawn before, so the
 * archive does not repeat; the hash of day + mode makes the draw the same on every server.
 */
export async function drawDay(prisma: PrismaClient, day: string) {
  const drawn = await prisma.dailyPick.findMany({ where: { day: dateColumn(day) } });
  const missing = MODES.filter((m) => !drawn.some((d) => d.gameMode === m));
  for (const mode of missing) {
    const levels = (
      await prisma.challenge.findMany({
        where: { gameMode: mode, status: 'published' },
        select: { publicNumber: true },
        orderBy: { publicNumber: 'asc' },
      })
    ).map((c) => c.publicNumber!);
    if (!levels.length) continue;
    const used = new Set(
      (await prisma.dailyPick.findMany({ where: { gameMode: mode }, select: { level: true } })).map(
        (p) => p.level,
      ),
    );
    const fresh = levels.filter((l) => !used.has(l));
    const pool = fresh.length ? fresh : levels;
    const n = createHash('sha256').update(`${day}|${mode}`).digest().readUInt32BE(0);
    // A concurrent first visit may insert the same row: the first one wins, both read it back.
    await prisma.dailyPick.createMany({
      data: [{ day: dateColumn(day), gameMode: mode, level: pool[n % pool.length]! }],
      skipDuplicates: true,
    });
  }
}

/** True when the level was a daily challenge up to today: it opens even if the track locks it. */
export async function isDailyLevel(
  prisma: PrismaClient,
  mode: GameModeCode,
  level: number,
  now: Date,
) {
  return !!(await prisma.dailyPick.findFirst({
    where: { gameMode: mode, level, day: { lte: dateColumn(civilDate(now)) } },
    select: { level: true },
  }));
}

/** Start of a civil date in Brasília (UTC−3, no daylight saving since 2019). */
const dayStart = (day: string) => new Date(`${day}T00:00:00-03:00`);

/** Rodada semanal (GROWTH_PLAN.md 2.7): Monday to Friday, best 3 days count. */
const ROUND_DAYS = 5;
const COUNTED = 3;

/** Each player's stars per round day, counting only levels started on the day they were drawn. */
export async function roundRows(prisma: PrismaClient, monday: string) {
  const rows = await prisma.$queryRaw<
    { pk: string; nickname: string | null; account: boolean; day: string; stars: bigint }[]
  >`
    WITH best AS (
      SELECT COALESCE(s."userId", s.id) AS pk, p.day, a."challengeId", MAX(a.stars) AS stars
      FROM "Attempt" a
      JOIN "GuestSession" s ON s.id = a."sessionId"
      JOIN "Challenge" c ON c.id = a."challengeId"
      JOIN "DailyPick" p ON p."gameMode" = a."gameMode" AND p.level = c."publicNumber"
        AND p.day = (a."startedAt" - interval '3 hours')::date
      WHERE a."completedAt" IS NOT NULL
        AND p.day >= ${monday}::date AND p.day < ${monday}::date + ${ROUND_DAYS}::int
      GROUP BY 1, 2, 3
    )
    SELECT b.pk, COALESCE(u.nickname, g.nickname) AS nickname, u.id IS NOT NULL AS account, to_char(b.day, 'YYYY-MM-DD') AS day,
      SUM(b.stars) AS stars
    FROM best b LEFT JOIN "User" u ON u.id = b.pk LEFT JOIN "GuestSession" g ON g.id = b.pk
    GROUP BY 1, 2, 3, 4`;
  const players = new Map<
    string,
    { nickname: string | null; account: boolean; days: Map<string, number> }
  >();
  for (const r of rows) {
    const p = players.get(r.pk) ?? { nickname: r.nickname, account: r.account, days: new Map() };
    p.days.set(r.day, Number(r.stars));
    players.set(r.pk, p);
  }
  return [...players].map(([pk, p]) => {
    const best = [...p.days.values()].sort((a, b) => b - a);
    return {
      pk,
      nickname: p.nickname,
      /** Only accounts are ranked; a guest still sees their own days. */
      account: p.account,
      days: p.days,
      // stars = the best 3 days; score (the tie-break) = every day of the round
      stars: best.slice(0, COUNTED).reduce((s, n) => s + n, 0),
      score: best.reduce((s, n) => s + n, 0),
    };
  });
}

export const dailyRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;

  app.get('/round', { schema: { response: { 200: RoundResponse } } }, async (req) => {
    const today = civilDate(now());
    const monday = civilDate(weekStart(now()));
    const rows = (await roundRows(prisma, monday)).sort(
      (a, b) => b.stars - a.stars || b.score - a.score || a.pk.localeCompare(b.pk),
    );
    const pk = req.userId ?? req.sessionId;
    const r = ranking(
      rows.filter((x) => x.account),
      pk,
    );
    const mine = rows.find((x) => x.pk === pk);
    return {
      weekStart: monday,
      counted: COUNTED,
      days: Array.from({ length: ROUND_DAYS }, (_, i) => {
        const day = addDays(monday, i);
        return { day, open: day <= today, stars: mine?.days.get(day) ?? 0 };
      }),
      me: { position: r.me.position, total: mine?.stars ?? 0 },
      entries: r.entries,
    };
  });

  app.get(
    '/daily/:date',
    {
      schema: {
        params: z.object({ date: z.union([z.literal('hoje'), z.iso.date()]) }),
        response: { 200: DailyResponse },
      },
    },
    async (req) => {
      const today = civilDate(now());
      const date = req.params.date === 'hoje' ? today : req.params.date;
      if (date > today) throw new AppError(404, 'NOT_FOUND', 'Esse dia ainda não chegou.');
      // Only today is drawn on demand; a past day without a draw never had a challenge.
      if (date === today) await drawDay(prisma, today);
      const picks = await prisma.dailyPick.findMany({ where: { day: dateColumn(date) } });
      if (!picks.length) throw new AppError(404, 'NOT_FOUND', 'Não houve desafio nesse dia.');

      const from = dayStart(date);
      const to = dayStart(addDays(date, 1));
      const games = await Promise.all(
        MODES.flatMap((mode) => {
          const pick = picks.find((p) => p.gameMode === mode);
          if (!pick) return [];
          const challenge = { gameMode: mode, publicNumber: pick.level };
          const played = {
            challenge,
            completedAt: { not: null },
            startedAt: { gte: from, lt: to },
          };
          return [
            (async () => {
              const [mine, plays, solved] = await Promise.all([
                prisma.attempt.findFirst({
                  where: { ...playerAttempts(req), challenge },
                  select: { completedAt: true, stars: true },
                  orderBy: { startedAt: 'asc' },
                }),
                prisma.attempt.count({ where: played }),
                prisma.attempt.count({ where: { ...played, stars: { gt: 0 } } }),
              ]);
              return {
                mode,
                level: pick.level,
                state: mine?.completedAt ? 'done' : mine ? 'in_progress' : 'open',
                stars: mine?.completedAt ? mine.stars : 0,
                solvedPct: plays >= MIN_PLAYS ? Math.round((solved / plays) * 100) : null,
              } as const;
            })(),
          ];
        }),
      );
      const archive = await prisma.dailyPick.findMany({
        where: { day: { lt: dateColumn(today), gte: dateColumn(addDays(today, -ARCHIVE_DAYS)) } },
        distinct: ['day'],
        select: { day: true },
        orderBy: { day: 'desc' },
      });
      return {
        date,
        today,
        games,
        archive: archive.map((a) => a.day.toISOString().slice(0, 10)),
      };
    },
  );
};
