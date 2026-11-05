/**
 * Guest sessions (ADR-004): random 256-bit token in an HttpOnly cookie, only its sha256 in
 * the database. No signing needed: the token is unguessable and never stored in clear.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client';

export const COOKIE = 'dc_session';
const MAX_AGE_S = 400 * 24 * 3600;
const TOUCH_AFTER_MS = 3600_000;

declare module 'fastify' {
  interface FastifyRequest {
    sessionId: string;
  }
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
export function guestSession(
  prisma: PrismaClient,
  opts: { secureCookie: boolean; now: () => Date },
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const token = readCookie(req, COOKIE);
    if (token) {
      const s = await prisma.guestSession.findUnique({ where: { tokenHash: hashToken(token) } });
      if (s) {
        req.sessionId = s.id;
        if (opts.now().getTime() - s.lastSeenAt.getTime() > TOUCH_AFTER_MS)
          await prisma.guestSession.update({
            where: { id: s.id },
            data: { lastSeenAt: opts.now() },
          });
        return;
      }
    }
    const fresh = randomBytes(32).toString('base64url');
    const s = await prisma.guestSession.create({
      data: { tokenHash: hashToken(fresh), lastSeenAt: opts.now() },
    });
    req.sessionId = s.id;
    reply.header(
      'set-cookie',
      `${COOKIE}=${fresh}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly; SameSite=Lax${opts.secureCookie ? '; Secure' : ''}`,
    );
  };
}
