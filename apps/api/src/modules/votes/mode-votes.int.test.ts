import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testApp, WEB_ORIGIN } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';

const prisma = testPrisma();
const { app } = testApp({ prisma });

/** A device with a cookie jar (sign-up sets several cookies). */
function device() {
  const jar = new Map<string, string>();
  const req = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) => {
    const res = await app.inject({
      method,
      url: `/v1${url}`,
      headers: {
        origin: WEB_ORIGIN,
        ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
      },
      ...(payload ? { payload } : {}),
    });
    for (const c of [res.headers['set-cookie'] ?? []].flat()) {
      const [kv] = String(c).split(';');
      const [k, ...v] = kv!.split('=');
      if (/Max-Age=0/i.test(String(c))) jar.delete(k!);
      else jar.set(k!, v.join('='));
    }
    return res;
  };
  return { req, jar };
}

async function account(name: string) {
  const d = device();
  const res = await d.req('POST', '/auth/sign-up/email', {
    email: `${randomUUID()}@example.com`,
    password: 'segredo-123',
    name,
  });
  expect(res.statusCode, res.body).toBe(200);
  return d;
}

const votesOf = (body: { modes: { mode: string; votes: number }[] }) =>
  Object.fromEntries(body.modes.filter((m) => m.votes).map((m) => [m.mode, m.votes]));

beforeAll(() => resetDb(prisma));
afterAll(() => app.close());

describe('mode votes ("Quero esse primeiro")', () => {
  it('guests see the counts but cannot vote', async () => {
    const guest = device();
    const view = (await guest.req('GET', '/mode-votes')).json();
    expect(view).toMatchObject({ total: 0, mine: null });
    expect(view.modes).toHaveLength(10);
    const put = await guest.req('PUT', '/mode-votes', { mode: 'copa' });
    expect(put.statusCode).toBe(401);
    expect(put.json().error.code).toBe('UNAUTHORIZED');
    expect((await guest.req('DELETE', '/mode-votes')).statusCode).toBe(401);
  });

  it('one vote per account; voting again moves it; withdraw', async () => {
    const ana = await account('Ana Voto');
    const bia = await account('Bia Voto');
    expect((await ana.req('PUT', '/mode-votes', { mode: 'copa' })).json()).toMatchObject({
      total: 1,
      mine: 'copa',
    });
    const both = (await bia.req('PUT', '/mode-votes', { mode: 'copa' })).json();
    expect(both.modes[0]).toEqual({ mode: 'copa', votes: 2 }); // most voted first
    expect(both.total).toBe(2);

    const moved = (await ana.req('PUT', '/mode-votes', { mode: 'DRAFT' })).json();
    expect(votesOf(moved)).toEqual({ copa: 1, DRAFT: 1 });
    expect(moved).toMatchObject({ total: 2, mine: 'DRAFT' });
    expect(await prisma.modeVote.count()).toBe(2);

    // Anyone sees the same counts, without a vote of their own.
    expect((await device().req('GET', '/mode-votes')).json()).toMatchObject({
      total: 2,
      mine: null,
    });

    const out = (await ana.req('DELETE', '/mode-votes')).json();
    expect(out).toMatchObject({ total: 1, mine: null });
    expect(votesOf(out)).toEqual({ copa: 1 });
  });

  it('only closed modes can be voted for', async () => {
    const d = await account('Cris Voto');
    for (const mode of ['CAREER_PATH', 'HIGHER_LOWER', 'nope', ''])
      expect((await d.req('PUT', '/mode-votes', { mode })).statusCode).toBe(400);
    expect((await d.req('PUT', '/mode-votes', {})).statusCode).toBe(400);
  });

  it('a signed-out device keeps its link but cannot vote; erasing the account removes its vote', async () => {
    const d = await account('Duda Voto');
    await d.req('PUT', '/mode-votes', { mode: 'oficina' });
    const user = await prisma.user.findFirstOrThrow({ where: { nickname: 'Duda Voto' } });
    expect((await d.req('GET', '/me/export')).json().modeVote).toMatchObject({ mode: 'oficina' });

    // Without the Better Auth cookie the device link alone is not a live sign-in.
    const linkOnly = device();
    for (const [k, v] of d.jar) if (!k.includes('better-auth')) linkOnly.jar.set(k, v);
    expect((await linkOnly.req('GET', '/mode-votes')).json().mine).toBe('oficina');
    expect((await linkOnly.req('PUT', '/mode-votes', { mode: 'copa' })).statusCode).toBe(401);

    expect((await d.req('DELETE', '/me')).statusCode).toBe(204);
    expect(await prisma.modeVote.findUnique({ where: { userId: user.id } })).toBeNull();
  });
});
