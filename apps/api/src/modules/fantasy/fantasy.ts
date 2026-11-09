/**
 * Fantasy de conhecimento (GROWTH_PLAN.md onda 3, versão mínima): pick 5 real players for the
 * week. Every level you finish afterwards in which one of them is in the level's answer (Career
 * Path answer, a hidden starter, the impostor, a Draft starter...) scores for that player:
 * 5 per star, +5 for 3 stars. The squad is locked once saved, so knowledge picks it, not hindsight.
 * Fantasy histórico (3.7): each week has a World Cup as theme and only players who were in its
 * line-ups can be picked; the cups rotate week by week.
 */
import { FANTASY_SIZE, FantasyResponse, SaveSquadRequest } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { civilDate, dateColumn } from '../challenges/civil-date';
import { ranking, weekStart } from '../progression/ranking';

/** At most this many players of one position group in a squad. */
export const MAX_PER_POSITION = 2;
export const POINTS_PER_STAR = 5;
export const PERFECT_BONUS = 5;
/** A World Cup becomes a theme when this many verified players are in its line-ups. */
export const MIN_CUP_PLAYERS = 20;
const EPOCH = Date.parse('2026-11-09T03:00:00Z');
const WEEK = 7 * 86400_000;

/** The week's World Cup and its verified players, or null when no cup has enough of them. */
export async function weekCup(prisma: PrismaClient, monday: Date) {
  const cups = await prisma.$queryRaw<{ season: string }[]>`
    SELECT m.season FROM "Match" m
    JOIN "MatchLineup" l ON l."matchId" = m.id
    JOIN "Player" p ON p.id = l."playerId" AND p."verificationStatus" = 'verified'
    WHERE m.competition = 'FIFA World Cup'
    GROUP BY 1 HAVING COUNT(DISTINCT p.id) >= ${MIN_CUP_PLAYERS}
    ORDER BY 1`;
  if (!cups.length) return null;
  const n = Math.floor((monday.getTime() - EPOCH) / WEEK);
  const season = cups[((n % cups.length) + cups.length) % cups.length]!.season;
  const players = await prisma.$queryRaw<
    { id: string; name: string; position: 'GK' | 'DF' | 'MF' | 'FW' | null }[]
  >`
    SELECT DISTINCT p.id, p."canonicalName" AS name, p."primaryPositionGroup"::text AS position
    FROM "Match" m
    JOIN "MatchLineup" l ON l."matchId" = m.id
    JOIN "Player" p ON p.id = l."playerId" AND p."verificationStatus" = 'verified'
    WHERE m.competition = 'FIFA World Cup' AND m.season = ${season}
    ORDER BY name`;
  return { season, players };
}

/** Points per (squad owner, player) for the week starting on `monday` (YYYY-MM-DD). */
export async function fantasyPoints(prisma: PrismaClient, monday: string) {
  const end = new Date(Date.parse(`${monday}T03:00:00Z`) + 7 * 86400_000);
  const rows = await prisma.$queryRaw<{ pk: string; playerId: string; points: bigint }[]>`
    WITH hits AS (
      SELECT DISTINCT f.pk, a.id AS attempt, u."playerId", a.stars
      FROM "FantasySquad" f
      JOIN "GuestSession" s ON COALESCE(s."userId", s.id) = f.pk
      JOIN "Attempt" a ON a."sessionId" = s.id AND a."completedAt" IS NOT NULL
        AND a."startedAt" >= f."createdAt" AND a."startedAt" < ${end}
      JOIN "ChallengePlayerUsage" u ON u."challengeId" = a."challengeId"
        AND u.role <> 'example' AND u."playerId" = ANY(f."playerIds")
      WHERE f.week = ${monday}::date
    )
    SELECT pk, "playerId", SUM(stars * ${POINTS_PER_STAR}::int
      + CASE WHEN stars = 3 THEN ${PERFECT_BONUS}::int ELSE 0 END) AS points
    FROM hits GROUP BY 1, 2`;
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = out.get(r.pk) ?? new Map<string, number>();
    m.set(r.playerId, Number(r.points));
    out.set(r.pk, m);
  }
  return out;
}

export const fantasyRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  const pk = (req: { sessionId: string; userId: string | null }) => req.userId ?? req.sessionId;

  async function view(req: { sessionId: string; userId: string | null }) {
    const monday = civilDate(weekStart(now()));
    const [squads, points, cup] = await Promise.all([
      prisma.fantasySquad.findMany({ where: { week: dateColumn(monday) } }),
      fantasyPoints(prisma, monday),
      weekCup(prisma, weekStart(now())),
    ]);
    const me = pk(req);
    const mine = squads.find((s) => s.pk === me);
    const players = mine
      ? await prisma.player.findMany({
          where: { id: { in: mine.playerIds } },
          select: { id: true, canonicalName: true, primaryPositionGroup: true },
        })
      : [];
    const byId = new Map(players.map((p) => [p.id, p]));
    const totals = squads.map((s) => ({
      pk: s.pk,
      total: [...(points.get(s.pk)?.values() ?? [])].reduce((a, b) => a + b, 0),
    }));
    // ponytail: two lookups for every squad of the week; one query when squads number thousands.
    const [users, guests] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: totals.map((t) => t.pk) } },
        select: { id: true, nickname: true },
      }),
      prisma.guestSession.findMany({
        where: { id: { in: totals.map((t) => t.pk) } },
        select: { id: true, nickname: true },
      }),
    ]);
    const names = new Map([...users, ...guests].map((p) => [p.id, p.nickname]));
    const rows = totals
      .map((t) => ({ pk: t.pk, nickname: names.get(t.pk) ?? null, stars: t.total, score: 0 }))
      .sort((a, b) => b.stars - a.stars || a.pk.localeCompare(b.pk));
    const r = ranking(rows, me);
    return {
      weekStart: monday,
      cup,
      squad: mine
        ? mine.playerIds.map((id) => ({
            id,
            name: byId.get(id)?.canonicalName ?? '?',
            position: byId.get(id)?.primaryPositionGroup ?? null,
            points: points.get(me)?.get(id) ?? 0,
          }))
        : null,
      total: totals.find((t) => t.pk === me)?.total ?? 0,
      me: { position: r.me.position },
      entries: r.entries,
    };
  }

  app.get('/fantasy', { schema: { response: { 200: FantasyResponse } } }, async (req) => view(req));

  app.post(
    '/fantasy',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { body: SaveSquadRequest, response: { 201: FantasyResponse } },
    },
    async (req, reply) => {
      const ids = req.body.playerIds;
      if (new Set(ids).size !== FANTASY_SIZE)
        throw new AppError(400, 'VALIDATION_ERROR', 'Escolha 5 jogadores diferentes.');
      const players = await prisma.player.findMany({
        where: { id: { in: ids }, verificationStatus: 'verified' },
        select: { primaryPositionGroup: true },
      });
      if (players.length !== FANTASY_SIZE)
        throw new AppError(400, 'VALIDATION_ERROR', 'Algum jogador não está na nossa base.');
      const cup = await weekCup(prisma, weekStart(now()));
      if (cup && !ids.every((id) => cup.players.some((p) => p.id === id)))
        throw new AppError(400, 'VALIDATION_ERROR', `Só vale quem jogou a Copa de ${cup.season}.`);
      const per = new Map<string, number>();
      for (const p of players)
        if (p.primaryPositionGroup)
          per.set(p.primaryPositionGroup, (per.get(p.primaryPositionGroup) ?? 0) + 1);
      if ([...per.values()].some((n) => n > MAX_PER_POSITION))
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          `No máximo ${MAX_PER_POSITION} jogadores da mesma posição.`,
        );
      const week = dateColumn(civilDate(weekStart(now())));
      try {
        await prisma.fantasySquad.create({
          data: { pk: pk(req), week, playerIds: ids, createdAt: now() },
        });
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err;
        throw new AppError(409, 'SQUAD_LOCKED', 'Sua escalação da semana já está fechada.');
      }
      return reply.code(201).send(await view(req));
    },
  );
};
