/**
 * Nickname and optional account (ADR-007, ADR-008). Guests keep playing without one; an account
 * keeps progress across devices. Sign-in itself is Better Auth, mounted at /v1/auth/*.
 */
import { MeResponse, UpdateMeRequest } from '@decabeca/contracts';
import { titleFor } from '@decabeca/engine';
import { APIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../../errors';
import { newSession, playerAttempts } from '../session/session';
import { assertNicknameFree, authRequest } from './auth';

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
    };
  }

  app.get('/me', { schema: { response: { 200: MeResponse } } }, (req) => me(req));

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
      if (store.signedIn) await link(req, reply, store.signedIn);
      reply.status(res.status);
      res.headers.forEach((value, key) => {
        if (key !== 'set-cookie') reply.header(key, value);
      });
      for (const c of res.headers.getSetCookie()) reply.header('set-cookie', c);
      return reply.send(res.body ? await res.text() : null);
    },
  });
};
