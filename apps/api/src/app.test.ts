import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { createPrisma } from './db';

describe('app', () => {
  // The client connects lazily; these routes never touch the database.
  const app = buildApp(
    { logger: false },
    { prisma: createPrisma('postgresql://unused'), adminToken: 'x'.repeat(16) },
  );
  afterAll(() => app.close());

  it('GET /v1/health returns { ok: true }', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('unknown routes return 404 in the error format', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Rota não encontrada.', details: {} },
    });
  });

  it('admin routes require the token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/import/diffs' });
    expect(res.statusCode).toBe(401);
  });
});
