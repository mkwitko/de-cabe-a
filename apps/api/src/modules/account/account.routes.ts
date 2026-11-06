/**
 * Nickname and optional account (ADR-007). Guests keep playing without one; an account keeps
 * progress across devices. Passwords: scrypt (node:crypto), constant-time verification.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { LoginRequest, MeResponse, RegisterRequest, UpdateMeRequest } from '@decabeca/contracts';
import { normalizeName, titleFor } from '@decabeca/engine';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { newSession, playerAttempts } from '../session/session';

const scryptAsync = promisify(scrypt) as (
  pw: string,
  salt: Buffer,
  len: number,
  opts: object,
) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, n, salt, hash] = stored.split('$');
  if (!n || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const got = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
    ...SCRYPT,
    N: Number(n),
  });
  return timingSafeEqual(got, expected);
}

// Small blocklist; the ranking is public. ponytail: extend from the rejection report as needed.
const BLOCKED = /(porra|caralho|merda|buceta|puta|viado|fdp|pqp|cuzao|nazi|hitler)/;
const nicknameKey = (n: string) => normalizeName(n).replace(/\s+/g, '');

async function assertNicknameFree(
  prisma: PrismaClient,
  nickname: string,
  mine: { sessionId: string; userId: string | null },
) {
  const key = nicknameKey(nickname);
  if (key.length < 3 || BLOCKED.test(key))
    throw new AppError(400, 'VALIDATION_ERROR', 'Escolha outro apelido.');
  const [user, guest] = await Promise.all([
    prisma.user.findUnique({ where: { nicknameKey: key } }),
    prisma.guestSession.findUnique({ where: { nicknameKey: key } }),
  ]);
  if ((user && user.id !== mine.userId) || (guest && guest.id !== mine.sessionId))
    throw new AppError(409, 'NICKNAME_TAKEN', 'Esse apelido já está em uso.');
  return key;
}

export const accountRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now, secureCookie } = app.deps;
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
      account: user ? { email: user.email } : null,
      totalStars,
      title: titleFor(totalStars),
    };
  }

  app.get('/me', { schema: { response: { 200: MeResponse } } }, (req) => me(req));

  app.patch(
    '/me',
    { schema: { body: UpdateMeRequest, response: { 200: MeResponse } } },
    async (req) => {
      const key = await assertNicknameFree(prisma, req.body.nickname, req);
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

  /** Creates an account and links the current guest session: its progress is kept. */
  app.post(
    '/auth/register',
    { config: authLimit, schema: { body: RegisterRequest, response: { 201: MeResponse } } },
    async (req, reply) => {
      if (req.userId) throw new AppError(409, 'EMAIL_TAKEN', 'Você já está conectado a uma conta.');
      const email = req.body.email.toLowerCase();
      if (await prisma.user.findUnique({ where: { email } }))
        throw new AppError(409, 'EMAIL_TAKEN', 'Esse e-mail já tem conta. Entre com ele.');
      const key = await assertNicknameFree(prisma, req.body.nickname, req);
      const user = await prisma.$transaction(async (tx) => {
        // The guest nickname moves to the account.
        await tx.guestSession.update({
          where: { id: req.sessionId },
          data: { nickname: null, nicknameKey: null },
        });
        const u = await tx.user.create({
          data: {
            email,
            passwordHash: await hashPassword(req.body.password),
            nickname: req.body.nickname,
            nicknameKey: key,
          },
        });
        await tx.guestSession.update({ where: { id: req.sessionId }, data: { userId: u.id } });
        return u;
      });
      req.userId = user.id;
      return reply.code(201).send(await me(req));
    },
  );

  /** Links this device to the account. A guest session with its own progress is merged in. */
  app.post(
    '/auth/login',
    { config: authLimit, schema: { body: LoginRequest, response: { 200: MeResponse } } },
    async (req, reply) => {
      const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
      // Same error and similar cost for unknown e-mail and wrong password.
      const ok = await verifyPassword(
        req.body.password,
        user?.passwordHash ?? 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA',
      );
      if (!user || !ok)
        throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
      if (req.userId && req.userId !== user.id) {
        const s = await newSession(prisma, reply, {
          secure: secureCookie,
          now: now(),
          userId: user.id,
        });
        req.sessionId = s.id;
      } else {
        await prisma.guestSession.update({
          where: { id: req.sessionId },
          data: { userId: user.id, nickname: null, nicknameKey: null },
        });
      }
      req.userId = user.id;
      return me(req);
    },
  );

  /** Back to a fresh guest session on this device. */
  app.post('/auth/logout', { schema: { response: { 200: MeResponse } } }, async (req, reply) => {
    const s = await newSession(prisma, reply, { secure: secureCookie, now: now() });
    req.sessionId = s.id;
    req.userId = null;
    return me(req);
  });
};
