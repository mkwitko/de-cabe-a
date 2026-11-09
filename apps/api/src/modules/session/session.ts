/**
 * Guest sessions (ADR-004): random 256-bit token in an HttpOnly cookie, only its sha256 in
 * the database. No signing needed: the token is unguessable and never stored in clear.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';

export const COOKIE = 'dc_session';
const MAX_AGE_S = 400 * 24 * 3600;
const TOUCH_AFTER_MS = 3600_000;

declare module 'fastify' {
  interface FastifyRequest {
    sessionId: string;
    /** Account linked to this session (ADR-007), null for guests. */
    userId: string | null;
  }
}

/**
 * Prisma filter for "this player's attempts" on the tracks: every session of the account, or this
 * guest session. Oficina levels (no track number) never count for stars, titles or achievements.
 */
export const playerAttempts = (req: { sessionId: string; userId: string | null }) => ({
  ...(req.userId ? { session: { userId: req.userId } } : { sessionId: req.sessionId }),
  challenge: { publicNumber: { not: null } },
});

export function setSessionCookie(reply: FastifyReply, token: string, secure: boolean) {
  reply.header(
    'set-cookie',
    `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
  );
}

/** New guest session (fresh cookie), optionally linked to an account. */
export async function newSession(
  prisma: PrismaClient,
  reply: FastifyReply,
  opts: { secure: boolean; now: Date; userId?: string },
) {
  const token = randomBytes(32).toString('base64url');
  const s = await prisma.guestSession.create({
    data: { tokenHash: hashToken(token), lastSeenAt: opts.now, userId: opts.userId ?? null },
  });
  setSessionCookie(reply, token, opts.secure);
  return s;
}

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
/** Short, non-reversible id for logs and analytics. */
export const sessionHash = (sessionId: string) =>
  createHash('sha256').update(sessionId).digest('hex').slice(0, 16);

function readCookie(req: FastifyRequest, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/** onRequest hook for public routes: loads the guest session or creates one. */
// ponytail: in-memory per-IP window, fine for one API process; use a shared store if the API scales out.
function creationLimiter(perMinute: number, now: () => Date) {
  const hits = new Map<string, { start: number; n: number }>();
  return (ip: string) => {
    const t = now().getTime();
    const h = hits.get(ip);
    if (!h || t - h.start >= 60_000) {
      if (hits.size > 10_000) hits.clear();
      hits.set(ip, { start: t, n: 1 });
      return true;
    }
    h.n++;
    return h.n <= perMinute;
  };
}

export function guestSession(
  prisma: PrismaClient,
  opts: { secureCookie: boolean; now: () => Date; sessionsPerIp: number },
) {
  const allowCreation = creationLimiter(opts.sessionsPerIp, opts.now);
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const token = readCookie(req, COOKIE);
    if (token) {
      const s = await prisma.guestSession.findUnique({ where: { tokenHash: hashToken(token) } });
      if (s) {
        req.sessionId = s.id;
        req.userId = s.userId;
        if (opts.now().getTime() - s.lastSeenAt.getTime() > TOUCH_AFTER_MS)
          await prisma.guestSession.update({
            where: { id: s.id },
            data: { lastSeenAt: opts.now() },
          });
        return;
      }
    }
    if (!allowCreation(req.ip))
      throw new AppError(429, 'RATE_LIMITED', 'Muitas sessões novas. Tente de novo em um minuto.');
    const s = await newSession(prisma, reply, { secure: opts.secureCookie, now: opts.now() });
    req.sessionId = s.id;
    req.userId = null;
  };
}
