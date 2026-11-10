/**
 * Sign-in (ADR-008): Better Auth handles e-mail + password (verification, password reset) and
 * Google. Game progress stays on the guest session (ADR-004): after a sign-in the guest session
 * of this device is linked to the account, as before.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { isOffensive, normalizeName } from '@decabeca/engine';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { Nickname } from '@decabeca/contracts';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { PrismaClient } from '../../generated/prisma/client';
import { hashPassword, verifyPassword } from './password';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface AuthOptions {
  secret: string;
  /** Public origin of the web app; auth routes are served under it at /v1/auth (Vite proxy in dev). */
  baseURL: string;
  trustedOrigins: string[];
  google?: { clientId: string; clientSecret: string } | undefined;
  sendEmail: (mail: Mail) => Promise<void>;
}

/** The guest session of the request being handled, for the hooks below. */
export const authRequest = new AsyncLocalStorage<{
  sessionId: string;
  userId: string | null;
  /** Set when the request signed a user in: the route links the guest session to it. */
  signedIn?: string;
}>();

// Small blocklist; the ranking is public. ponytail: extend from the rejection report as needed.
export const nicknameKey = (n: string) => normalizeName(n).replace(/\s+/g, '');
/** Names shown publicly (nicknames, career footballers) pass the same word filter. */
export const isBlockedName = (n: string) => isOffensive(n);

/** Throws when the nickname is invalid or used by another account or another guest. */
export async function assertNicknameFree(
  prisma: PrismaClient,
  nickname: string,
  mine: { sessionId: string; userId: string | null },
) {
  const key = nicknameKey(nickname);
  if (key.length < 3 || isOffensive(nickname))
    throw new APIError('BAD_REQUEST', {
      message: 'Esse apelido não pode. Escolha outro ou peça uma sugestão.',
    });
  const [user, guest] = await Promise.all([
    prisma.user.findUnique({ where: { nicknameKey: key } }),
    prisma.guestSession.findUnique({ where: { nicknameKey: key } }),
  ]);
  if ((user && user.id !== mine.userId) || (guest && guest.id !== mine.sessionId))
    throw new APIError('CONFLICT', { message: 'Esse apelido já está em uso.' });
  return key;
}

/** A free nickname from a social profile name: "Mauricio Oliveira", then "Mauricio Oliveira 2"... */
async function freeNickname(prisma: PrismaClient, name: string) {
  const base = name.trim().slice(0, 20) || 'Jogador';
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? base : `${base.slice(0, 17)} ${i}`;
    const key = nicknameKey(candidate);
    if (key.length < 3 || isOffensive(candidate)) return freeNickname(prisma, 'Jogador');
    const taken =
      (await prisma.user.findUnique({ where: { nicknameKey: key } })) ||
      (await prisma.guestSession.findUnique({ where: { nicknameKey: key } }));
    if (!taken) return { nickname: candidate, key };
  }
}

export function createAuth(prisma: PrismaClient, opts: AuthOptions) {
  return betterAuth({
    secret: opts.secret,
    baseURL: opts.baseURL,
    basePath: '/v1/auth',
    // PATCH /v1/me is the only way to change a nickname (it checks charset, blocklist, uniqueness).
    disabledPaths: ['/update-user'],
    trustedOrigins: opts.trustedOrigins,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    user: {
      fields: { name: 'nickname' },
      additionalFields: { nicknameKey: { type: 'string', required: false, input: false } },
    },
    session: { modelName: 'authSession' },
    // Rate limits come from the API (per IP on the auth routes).
    rateLimit: { enabled: false },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Same scrypt format as the accounts created before Better Auth (migrated as they are).
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) => verifyPassword(password, hash),
      },
      sendResetPassword: async ({ user, url }) => {
        void opts.sendEmail({
          to: user.email,
          subject: 'De Cabeça F.C.: crie uma nova senha',
          text: `Para criar uma nova senha, abra o link (vale por 1 hora):\n${url}\n\nSe não foi você, ignore este e-mail.`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      // Off: a verification link must not sign in whoever opens it (login CSRF, security scan F4).
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        void opts.sendEmail({
          to: user.email,
          subject: 'De Cabeça F.C.: confirme seu e-mail',
          text: `Confirme seu e-mail abrindo o link:\n${url}`,
        });
      },
    },
    socialProviders: opts.google ? { google: { ...opts.google, prompt: 'select_account' } } : {},
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            const req = authRequest.getStore();
            const mine = { sessionId: req?.sessionId ?? '', userId: null };
            if (ctx?.path?.startsWith('/callback') || !user.name?.trim()) {
              // Social sign-up, or e-mail sign-up with the optional nickname left empty: the
              // guest's nickname if it has one, else a free one from the profile ("Jogador N").
              const guest = req
                ? await prisma.guestSession.findUnique({ where: { id: req.sessionId } })
                : null;
              const picked = guest?.nickname
                ? { nickname: guest.nickname, key: guest.nicknameKey! }
                : await freeNickname(prisma, user.name);
              return { data: { ...user, name: picked.nickname, nicknameKey: picked.key } };
            }
            const name = Nickname.safeParse(user.name);
            if (!name.success)
              throw new APIError('BAD_REQUEST', { message: name.error.issues[0]!.message });
            const key = await assertNicknameFree(prisma, name.data, mine);
            return { data: { ...user, name: name.data, nicknameKey: key } };
          },
        },
        // /update-user is disabled; this keeps any other write path from skipping the checks.
        update: {
          before: async (data, ctx) => {
            if (data.name === undefined) return;
            const name = Nickname.safeParse(data.name);
            if (!name.success)
              throw new APIError('BAD_REQUEST', { message: name.error.issues[0]!.message });
            const id = ctx?.context.session?.user.id ?? null;
            const key = await assertNicknameFree(prisma, name.data, { sessionId: '', userId: id });
            return { data: { ...data, name: name.data, nicknameKey: key } };
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const signedIn = ctx.context.newSession?.user.id;
        const req = authRequest.getStore();
        if (signedIn && req) req.signedIn = signedIn;
      }),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * The device link to an account lives for 400 days; what needs the account itself (erasing it,
 * voting) also asks for a live Better Auth sign-in of that same account.
 */
export async function isLiveSignIn(
  auth: Auth,
  req: { userId: string | null; headers: Record<string, string | string[] | undefined> },
) {
  if (!req.userId) return false;
  const live = await auth.api
    .getSession({ headers: fromNodeHeaders(req.headers) })
    .catch(() => null);
  return live?.user.id === req.userId;
}
