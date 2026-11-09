/**
 * Ligas de amigos (GROWTH_PLAN.md 2.1): a name and a 6-letter code shared by link; up to 20
 * players; weekly ranking of stars among the members; leave and report. No chat.
 */
import { randomInt } from 'node:crypto';
import {
  CreateLeagueRequest,
  LeagueResponse,
  LeaguesResponse,
  ReportLeagueRequest,
} from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { isOffensive } from '@decabeca/engine';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { rankRows, weekStart } from '../progression/ranking';

export const MAX_MEMBERS = 20;
/** Leagues one player can be in, so one device cannot spam codes. */
export const MAX_LEAGUES = 10;
/** No 0/O, 1/I/L: the code is read aloud and typed on phones. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

type Req = { sessionId: string; userId: string | null };
const me = (req: Req) => req.userId ?? req.sessionId;
/** Every pk a member row may hold for this player: the account and each of its sessions. */
export async function myPks(prisma: PrismaClient, req: Req) {
  if (!req.userId) return [req.sessionId];
  const sessions = await prisma.guestSession.findMany({
    where: { userId: req.userId },
    select: { id: true },
  });
  return [req.userId, ...sessions.map((s) => s.id)];
}

/** A member's ranking pk: a guest session that signed up since counts as its account. */
async function effectivePks(prisma: PrismaClient, pks: string[]) {
  const sessions = await prisma.guestSession.findMany({
    where: { id: { in: pks } },
    select: { id: true, userId: true },
  });
  const account = new Map(sessions.map((s) => [s.id, s.userId]));
  return [...new Set(pks.map((pk) => account.get(pk) ?? pk))];
}

async function nickname(prisma: PrismaClient, req: Req) {
  if (req.userId)
    return (await prisma.user.findUnique({ where: { id: req.userId } }))?.nickname ?? null;
  return (await prisma.guestSession.findUnique({ where: { id: req.sessionId } }))?.nickname ?? null;
}

async function findLeague(prisma: PrismaClient, code: string) {
  const league = await prisma.league.findUnique({
    where: { code: code.toUpperCase() },
    include: { members: true },
  });
  if (!league) throw new AppError(404, 'NOT_FOUND', 'Liga não encontrada. Confira o código.');
  return league;
}

export const leagueRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  const Code = z.object({ code: z.string().regex(/^[A-Za-z0-9]{6}$/) });

  async function requireNickname(req: Req) {
    if (!(await nickname(prisma, req)))
      throw new AppError(409, 'NICKNAME_REQUIRED', 'Escolha um apelido para entrar em ligas.');
  }
  async function assertRoom(req: Req) {
    const count = await prisma.leagueMember.count({
      where: { pk: { in: await myPks(prisma, req) } },
    });
    if (count >= MAX_LEAGUES)
      throw new AppError(409, 'TOO_MANY_LEAGUES', `Você já está em ${MAX_LEAGUES} ligas.`);
  }

  app.get('/leagues', { schema: { response: { 200: LeaguesResponse } } }, async (req) => {
    const leagues = await prisma.league.findMany({
      where: { members: { some: { pk: { in: await myPks(prisma, req) } } } },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      leagues: leagues.map((l) => ({ code: l.code, name: l.name, members: l._count.members })),
    };
  });

  app.post(
    '/leagues',
    { schema: { body: CreateLeagueRequest, response: { 201: LeagueResponse } } },
    async (req, reply) => {
      if (isOffensive(req.body.name))
        throw new AppError(400, 'VALIDATION_ERROR', 'Esse nome não pode. Escolha outro.');
      await requireNickname(req);
      await assertRoom(req);
      for (let i = 0; ; i++) {
        try {
          const league = await prisma.league.create({
            data: {
              code: newCode(),
              name: req.body.name,
              createdBy: me(req),
              members: { create: { pk: me(req) } },
            },
          });
          return reply.code(201).send(await view(league.code, req));
        } catch (err) {
          // A code collision (31^6 codes) retries; anything else is a real error.
          if ((err as { code?: string }).code !== 'P2002' || i >= 4) throw err;
        }
      }
    },
  );

  async function view(code: string, req: Req) {
    const league = await findLeague(prisma, code);
    const mine = new Set(await myPks(prisma, req));
    const isMember = league.members.some((m) => mine.has(m.pk));
    const since = weekStart(now());
    let ranking: LeagueResponse['ranking'] = [];
    if (isMember) {
      const pks = await effectivePks(
        prisma,
        league.members.map((m) => m.pk),
      );
      // ponytail: ranks every player of the week and keeps the members; a member-only query
      // when the weekly ranking gets big.
      const stars = new Map((await rankRows(prisma, since)).map((r) => [r.pk, r.stars]));
      const [users, guests] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: pks } }, select: { id: true, nickname: true } }),
        prisma.guestSession.findMany({
          where: { id: { in: pks } },
          select: { id: true, nickname: true },
        }),
      ]);
      const names = new Map([...users, ...guests].map((p) => [p.id, p.nickname]));
      const self = me(req);
      ranking = pks
        .map((pk) => ({ pk, nickname: names.get(pk) ?? 'Sem apelido', stars: stars.get(pk) ?? 0 }))
        .sort((a, b) => b.stars - a.stars || a.nickname.localeCompare(b.nickname, 'pt-BR'))
        .map((r, i) => ({
          position: i + 1,
          nickname: r.nickname,
          stars: r.stars,
          isMe: r.pk === self,
        }));
    }
    return {
      code: league.code,
      name: league.name,
      members: league.members.length,
      maxMembers: MAX_MEMBERS,
      isMember,
      weekStart: since.toISOString(),
      ranking,
    };
  }

  app.get(
    '/leagues/:code',
    { schema: { params: Code, response: { 200: LeagueResponse } } },
    (req) => view(req.params.code, req),
  );

  app.post(
    '/leagues/:code/join',
    { schema: { params: Code, response: { 200: LeagueResponse } } },
    async (req) => {
      const league = await findLeague(prisma, req.params.code);
      const mine = new Set(await myPks(prisma, req));
      if (!league.members.some((m) => mine.has(m.pk))) {
        await requireNickname(req);
        await assertRoom(req);
        if (league.members.length >= MAX_MEMBERS)
          throw new AppError(409, 'LEAGUE_FULL', `A liga já tem ${MAX_MEMBERS} pessoas.`);
        await prisma.leagueMember.create({ data: { leagueId: league.id, pk: me(req) } });
      }
      return view(league.code, req);
    },
  );

  app.post('/leagues/:code/leave', { schema: { params: Code } }, async (req, reply) => {
    const league = await findLeague(prisma, req.params.code);
    await prisma.leagueMember.deleteMany({
      where: { leagueId: league.id, pk: { in: await myPks(prisma, req) } },
    });
    // The last one out closes the league.
    if (!(await prisma.leagueMember.count({ where: { leagueId: league.id } })))
      await prisma.league.delete({ where: { id: league.id } });
    return reply.code(204).send();
  });

  app.post(
    '/leagues/:code/report',
    { schema: { params: Code, body: ReportLeagueRequest } },
    async (req, reply) => {
      const league = await findLeague(prisma, req.params.code);
      await prisma.leagueReport.upsert({
        where: { leagueId_pk: { leagueId: league.id, pk: me(req) } },
        create: { leagueId: league.id, pk: me(req), reason: req.body.reason },
        update: { reason: req.body.reason },
      });
      return reply.code(204).send();
    },
  );
};
