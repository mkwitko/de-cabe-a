import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('GET /v1/health', () => {
  const app = buildApp({ logger: false });
  afterAll(() => app.close());

  it('returns { ok: true }', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('returns 404 for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/nope' });
    expect(res.statusCode).toBe(404);
  });
});
