/**
 * Pilot metrics (ANALYTICS.md §2) for the editorial panel and the AI curator
 * (scripts/research/metrics.ts): players, retention, completion, sharing, per-level difficulty,
 * and the API's own latency and errors since it started.
 */
import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';

const n = (x: bigint | number | null) => Number(x ?? 0);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

export async function pilotMetrics(prisma: PrismaClient, days: number, now: Date) {
  const since = new Date(now.getTime() - days * 86400_000);
  // A player is an account (all its sessions) or a guest session; days in São Paulo time.
  const daily = await prisma.$queryRaw<
    { day: string; players: bigint; started: bigint; completed: bigint; timed: bigint }[]
  >`
    SELECT to_char(a."startedAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
           COUNT(DISTINCT COALESCE(s."userId", s.id)) AS players,
           COUNT(*) AS started,
           COUNT(a."completedAt") AS completed,
           COUNT(*) FILTER (WHERE a.timed) AS timed
    FROM "Attempt" a JOIN "GuestSession" s ON s.id = a."sessionId"
    WHERE a."startedAt" >= ${since}
    GROUP BY 1 ORDER BY 1`;

  // Retention: of the players whose first level was on day X, how many played on X+1 / X+7.
  const [ret] = await prisma.$queryRaw<
    { cohort: bigint; d1: bigint; d7: bigint; d1base: bigint; d7base: bigint }[]
  >`
    WITH days AS (
      SELECT DISTINCT COALESCE(s."userId", s.id) AS pk,
             (a."startedAt" AT TIME ZONE 'America/Sao_Paulo')::date AS d
      FROM "Attempt" a JOIN "GuestSession" s ON s.id = a."sessionId"
    ), first AS (SELECT pk, MIN(d) AS d0 FROM days GROUP BY pk)
    SELECT COUNT(*) AS cohort,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM days x WHERE x.pk = f.pk AND x.d = f.d0 + 1)) AS d1,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM days x WHERE x.pk = f.pk AND x.d = f.d0 + 7)) AS d7,
      COUNT(*) FILTER (WHERE f.d0 + 1 < (${now}::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date) AS d1base,
      COUNT(*) FILTER (WHERE f.d0 + 7 < (${now}::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date) AS d7base
    FROM first f WHERE f.d0 >= (${since}::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date`;

  const [shared] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "Event" WHERE name = 'result_shared' AND ts >= ${since}`;
  const rejected = await prisma.$queryRaw<{ code: string; n: bigint }[]>`
    SELECT props->>'code' AS code, COUNT(*) AS n FROM "Event"
    WHERE name = 'action_rejected' AND ts >= ${since} GROUP BY 1 ORDER BY 2 DESC`;

  // Per level (all time): too hard, too easy, abandoned, slow; with open error reports.
  const levels = await prisma.$queryRaw<
    {
      mode: string;
      level: number;
      started: bigint;
      completed: bigint;
      won: bigint;
      avgStars: number | null;
      avgSec: number | null;
      reports: bigint;
    }[]
  >`
    SELECT c."gameMode" AS mode, c."publicNumber" AS level,
           COUNT(a.id) AS started, COUNT(a."completedAt") AS completed,
           COUNT(*) FILTER (WHERE a.status = 'WON' OR (c."gameMode" = 'FOOTBALL_GRID' AND a.stars >= 2)) AS won,
           AVG(a.stars) FILTER (WHERE a."completedAt" IS NOT NULL)::float AS "avgStars",
           AVG(EXTRACT(EPOCH FROM a."completedAt" - a."startedAt"))::float AS "avgSec",
           (SELECT COUNT(*) FROM "LevelReport" r WHERE r."challengeId" = c.id AND r.status = 'open') AS reports
    FROM "Challenge" c JOIN "Attempt" a ON a."challengeId" = c.id
    WHERE c.status = 'published'
    GROUP BY c.id ORDER BY c."gameMode", c."publicNumber"`;

  const totals = daily.reduce(
    (t, d) => ({ started: t.started + n(d.started), completed: t.completed + n(d.completed) }),
    { started: 0, completed: 0 },
  );
  const MIN_SAMPLE = 5;
  return {
    period: { days, since: since.toISOString() },
    daily: daily.map((d) => ({
      day: d.day,
      players: n(d.players),
      started: n(d.started),
      completed: n(d.completed),
      timed: n(d.timed),
    })),
    totals: {
      ...totals,
      completionRate: pct(totals.completed, totals.started),
      shared: n(shared?.n ?? 0),
      shareRate: pct(n(shared?.n ?? 0), totals.completed),
    },
    retention: {
      cohort: n(ret?.cohort ?? 0),
      d1: pct(n(ret?.d1 ?? 0), n(ret?.d1base ?? 0)),
      d7: pct(n(ret?.d7 ?? 0), n(ret?.d7base ?? 0)),
    },
    actionRejected: rejected.map((r) => ({ code: r.code, n: n(r.n) })),
    levels: levels.map((l) => {
      const completed = n(l.completed);
      const winRate = pct(n(l.won), completed);
      return {
        mode: l.mode,
        level: l.level,
        started: n(l.started),
        completed,
        abandonRate: pct(n(l.started) - completed, n(l.started)),
        winRate,
        avgStars: l.avgStars === null ? null : Math.round(l.avgStars * 10) / 10,
        avgSec: l.avgSec === null ? null : Math.round(l.avgSec),
        openReports: n(l.reports),
        flag:
          completed < MIN_SAMPLE
            ? null
            : winRate !== null && winRate < 25
              ? 'too_hard'
              : winRate !== null && winRate > 90
                ? 'too_easy'
                : null,
      };
    }),
  };
}

/** In-process request metrics since the API started (latency and errors per route). */
// ponytail: memory of one process, reset on restart; use Sentry performance or Prometheus for history.
export function serverMetrics(app: FastifyInstance) {
  const startedAt = new Date();
  const routes = new Map<
    string,
    { durations: number[]; s4xx: number; s5xx: number; s429: number }
  >();
  app.addHook('onResponse', async (req, reply) => {
    const key = `${req.method} ${req.routeOptions.url ?? 'unknown'}`;
    const r = routes.get(key) ?? { durations: [], s4xx: 0, s5xx: 0, s429: 0 };
    r.durations.push(reply.elapsedTime);
    if (r.durations.length > 2000) r.durations.splice(0, 1000);
    if (reply.statusCode === 429) r.s429++;
    else if (reply.statusCode >= 500) r.s5xx++;
    else if (reply.statusCode >= 400) r.s4xx++;
    routes.set(key, r);
  });
  const q = (sorted: number[], p: number) =>
    sorted.length
      ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!)
      : null;
  return () => ({
    startedAt: startedAt.toISOString(),
    routes: [...routes]
      .map(([route, r]) => {
        const sorted = [...r.durations].sort((a, b) => a - b);
        return {
          route,
          requests: r.durations.length,
          p50ms: q(sorted, 0.5),
          p95ms: q(sorted, 0.95),
          errors4xx: r.s4xx,
          errors5xx: r.s5xx,
          rateLimited: r.s429,
        };
      })
      .sort((a, b) => b.requests - a.requests),
  });
}

export const metricsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  app.get(
    '/metrics',
    {
      schema: {
        querystring: z.object({ days: z.coerce.number().int().min(1).max(90).default(14) }),
      },
    },
    async (req) => ({
      ...(await pilotMetrics(prisma, req.query.days, now())),
      server: app.serverMetrics(),
    }),
  );
};

declare module 'fastify' {
  interface FastifyInstance {
    serverMetrics: () => ReturnType<ReturnType<typeof serverMetrics>>;
  }
}
