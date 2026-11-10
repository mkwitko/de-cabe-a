/**
 * Nickname and optional account (ADR-007, ADR-008). Guests keep playing without one; an account
 * keeps progress across devices. Sign-in itself is Better Auth, mounted at /v1/auth/*.
 */
import {
  GameMode,
  MeResponse,
  ProfileResponse,
  UpdateMeRequest,
  UpdateProfileRequest,
} from '@decabeca/contracts';
import { z } from 'zod';
import { titleFor } from '@decabeca/engine';
import { APIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { PrismaClient } from '../../generated/prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../../errors';
import { COOKIE, newSession, playerAttempts } from '../session/session';
import { deleteData, exportData } from './account.data';
import { assertNicknameFree, authRequest, nicknameKey } from './auth';
import { playerAchievements } from '../progression/achievements';
import { trophies } from '../progression/seasons';

type Who = { sessionId: string; userId: string | null; nickname: string };

/** The owner of a public profile, with every pk their stickers may sit under; null when private or unknown. */
export async function publicProfileOwner(
  prisma: PrismaClient,
  nickname: string,
): Promise<{ who: Who; pks: string[] } | null> {
  const key = nicknameKey(nickname);
  const [user, guest] = await Promise.all([
    prisma.user.findUnique({ where: { nicknameKey: key } }),
    prisma.guestSession.findUnique({ where: { nicknameKey: key } }),
  ]);
  if (user?.publicProfile) {
    const sessions = await prisma.guestSession.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    return {
      who: { sessionId: '', userId: user.id, nickname: user.nickname },
      pks: [user.id, ...sessions.map((x) => x.id)],
    };
  }
  if (!user && guest?.publicProfile && !guest.userId)
    return {
      who: { sessionId: guest.id, userId: null, nickname: guest.nickname! },
      pks: [guest.id],
    };
  return null;
}

export const accountRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now, secureCookie, auth } = app.deps;
  const authLimit = {
    rateLimit: { max: 10, timeWindow: '1 minute', keyGenerator: (req: { ip: string }) => req.ip },
  };

  async function me(req: { sessionId: string; userId: string | null }) {
    const [session, user, stars] = await Promise.all([
      prisma.guestSession.findUniqueOrThrow({ where: { id: req.sessionId } }),
      req.userId ? prisma.user.findUnique({ where: { id: req.userId } }) : null,
      prisma.attempt.findMany({
        where: { ...playerAttempts(req), completedAt: { not: null } },
        select: { challengeId: true, stars: true },
      }),
    ]);
    const best = new Map<string, number>();
    for (const a of stars) best.set(a.challengeId, Math.max(best.get(a.challengeId) ?? 0, a.stars));
    const totalStars = [...best.values()].reduce((s, x) => s + x, 0);
    return {
      nickname: user?.nickname ?? session.nickname,
      account: user ? { email: user.email, emailVerified: user.emailVerified } : null,
      totalStars,
      title: titleFor(totalStars),
      publicProfile: user?.publicProfile ?? session.publicProfile,
    };
  }

  app.get('/me', { schema: { response: { 200: MeResponse } } }, (req) => me(req));

  /** LGPD: everything held about this player, as a JSON download. */
  app.get('/me/export', async (req, reply) => {
    const data = await exportData(prisma, req, now());
    return reply
      .header('content-type', 'application/json; charset=utf-8')
      .header('content-disposition', 'attachment; filename="de-cabeca-meus-dados.json"')
      .header('cache-control', 'no-store')
      .send(JSON.stringify(data, null, 2));
  });

  /** LGPD: erases the player's data in one transaction and ends the session (cookies expire). */
  app.delete('/me', async (req, reply) => {
    // The device link lives for 400 days; erasing an account also needs a live sign-in.
    if (req.userId) {
      const live = await auth.api
        .getSession({ headers: fromNodeHeaders(req.headers) })
        .catch(() => null);
      if (live?.user.id !== req.userId)
        throw new AppError(
          401,
          'UNAUTHORIZED',
          'Entre na sua conta de novo para excluir os dados.',
        );
    }
    await deleteData(prisma, req);
    const gone = `Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureCookie ? '; Secure' : ''}`;
    reply.header('set-cookie', `${COOKIE}=; ${gone}`);
    for (const name of ['better-auth.session_token', 'better-auth.session_data'])
      reply.header('set-cookie', `${secureCookie ? '__Secure-' : ''}${name}=; ${gone}`);
    return reply.status(204).send();
  });

  app.patch(
    '/me/profile',
    { schema: { body: UpdateProfileRequest, response: { 200: MeResponse } } },
    async (req) => {
      const { publicProfile } = req.body;
      if (publicProfile && !(await me(req)).nickname)
        throw new AppError(409, 'NICKNAME_REQUIRED', 'Escolha um apelido antes de abrir o perfil.');
      if (req.userId)
        await prisma.user.update({ where: { id: req.userId }, data: { publicProfile } });
      else
        await prisma.guestSession.update({ where: { id: req.sessionId }, data: { publicProfile } });
      return me(req);
    },
  );

  /** A public profile; a private or unknown one is the same 404, so names cannot be probed. */
  app.get(
    '/profiles/:nickname',
    {
      schema: {
        params: z.object({ nickname: z.string().max(40) }),
        response: { 200: ProfileResponse },
      },
    },
    async (req) => {
      const owner = await publicProfileOwner(prisma, req.params.nickname);
      if (!owner) throw new AppError(404, 'NOT_FOUND', 'Perfil não encontrado ou privado.');
      const { who } = owner;
      const [done, items] = await Promise.all([
        prisma.attempt.findMany({
          where: { ...playerAttempts(who), completedAt: { not: null } },
          select: { gameMode: true, stars: true },
        }),
        playerAchievements(prisma, who),
      ]);
      const totalStars = done.reduce((s, a) => s + a.stars, 0);
      return {
        nickname: who.nickname,
        title: titleFor(totalStars),
        totalStars,
        games: GameMode.options.map((mode) => {
          const of = done.filter((a) => a.gameMode === mode);
          return { mode, completed: of.length, stars: of.reduce((s, a) => s + a.stars, 0) };
        }),
        achievements: items.filter((x) => x.done).map(({ id, name }) => ({ id, name })),
        trophies: await trophies(prisma, who.userId ?? who.sessionId, now()),
      };
    },
  );

  app.patch(
    '/me',
    { schema: { body: UpdateMeRequest, response: { 200: MeResponse } } },
    async (req) => {
      const key = await assertNicknameFree(prisma, req.body.nickname, req).catch((e: unknown) => {
        if (e instanceof APIError)
          throw new AppError(
            e.statusCode === 409 ? 409 : 400,
            e.statusCode === 409 ? 'NICKNAME_TAKEN' : 'VALIDATION_ERROR',
            e.message,
          );
        throw e;
      });
      if (req.userId)
        await prisma.user.update({
          where: { id: req.userId },
          data: { nickname: req.body.nickname, nicknameKey: key },
        });
      else
        await prisma.guestSession.update({
          where: { id: req.sessionId },
          data: { nickname: req.body.nickname, nicknameKey: key },
        });
      return me(req);
    },
  );

  /** Links this device's guest session to the account that just signed in. */
  async function link(req: FastifyRequest, reply: FastifyReply, userId: string) {
    if (req.userId === userId) return;
    if (req.userId) {
      // This device was signed in to another account: start a fresh session for this one.
      const s = await newSession(prisma, reply, { secure: secureCookie, now: now(), userId });
      req.sessionId = s.id;
    } else {
      // The guest's progress joins the account; its nickname moved to the account at sign-up.
      await prisma.guestSession.update({
        where: { id: req.sessionId },
        data: { userId, nickname: null, nicknameKey: null },
      });
    }
    req.userId = userId;
  }

  /** Back to a fresh guest session on this device, signed out of the account. */
  app.post('/auth/logout', { schema: { response: { 200: MeResponse } } }, async (req, reply) => {
    const out = await auth.api
      .signOut({ headers: fromNodeHeaders(req.headers), asResponse: true })
      .catch(() => null);
    const cookies = out?.headers.getSetCookie() ?? [];
    const s = await newSession(prisma, reply, { secure: secureCookie, now: now() });
    for (const c of cookies) reply.header('set-cookie', c);
    req.sessionId = s.id;
    req.userId = null;
    return me(req);
  });

  /** Better Auth: sign-up/sign-in (e-mail, Google), e-mail verification, password reset. */
  app.route({
    method: ['GET', 'POST'],
    url: '/auth/*',
    config: authLimit,
    async handler(req, reply) {
      const url = new URL(req.url, auth.options.baseURL);
      const request = new Request(url, {
        method: req.method,
        headers: fromNodeHeaders(req.headers),
        ...(req.body ? { body: JSON.stringify(req.body) } : {}),
      });
      const store: { sessionId: string; userId: string | null; signedIn?: string } = {
        sessionId: req.sessionId,
        userId: req.userId,
      };
      const res = await authRequest.run(store, () => auth.handler(request));
      // Only a sign-in this device started (POST, or the OAuth callback bound by its state cookie)
      // takes the guest session: a GET /verify-email link can be opened by someone else's browser.
      const own = req.method === 'POST' || url.pathname.endsWith('/callback/google');
      if (store.signedIn && own) await link(req, reply, store.signedIn);
      reply.status(res.status);
      res.headers.forEach((value, key) => {
        if (key !== 'set-cookie') reply.header(key, value);
      });
      for (const c of res.headers.getSetCookie()) reply.header('set-cookie', c);
      return reply.send(res.body ? await res.text() : null);
    },
  });
};
