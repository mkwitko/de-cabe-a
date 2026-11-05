import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { AppError } from '../../errors';

const digest = (s: string) => createHash('sha256').update(s).digest();

/** preHandler for /v1/admin: X-Admin-Token compared in constant time (ARCHITECTURE.md §8). */
export function adminAuth(adminToken: string) {
  if (adminToken.length < 16) throw new Error('ADMIN_TOKEN must have at least 16 characters');
  const expected = digest(adminToken);
  return async (req: FastifyRequest) => {
    const given = req.headers['x-admin-token'];
    if (typeof given !== 'string' || !timingSafeEqual(digest(given), expected))
      throw new AppError(401, 'UNAUTHORIZED', 'Token de administrador ausente ou inválido.');
  };
}
