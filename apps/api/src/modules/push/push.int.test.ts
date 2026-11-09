import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testApp, WEB_ORIGIN } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';
import { runPushJobs, type PushMessage, type PushTarget } from './push';

const prisma = testPrisma();
const { app } = testApp({
  prisma,
  push: { publicKey: 'test-key', send: async () => 201 },
  now: () => new Date('2026-11-09T15:00:00Z'),
});

async function device() {
  let cookie = '';
  const req = async (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) => {
    const res = await app.inject({
      method,
      url: `/v1${url}`,
      headers: { origin: WEB_ORIGIN, ...(cookie ? { cookie } : {}) },
      ...(payload ? { payload } : {}),
    });
    const set = res.headers['set-cookie'];
    if (set) cookie = String([set].flat()[0]).split(';')[0]!;
    return res;
  };
  await req('GET', '/push/key');
  return req;
}
const sub = (n: number, daily = true, league = true) => ({
  endpoint: `https://push.example/${n}`,
  keys: { p256dh: 'p', auth: 'a' },
  daily,
  league,
});

beforeAll(() => resetDb(prisma));
afterAll(() => app.close());

describe('Notificações (GROWTH_PLAN.md 2.9)', () => {
  it('opt-in per device; daily after 9:00 once; league week on Monday; gone ones removed', async () => {
    const ana = await device();
    expect((await ana('GET', '/push/key')).json()).toEqual({ publicKey: 'test-key' });
    expect((await ana('POST', '/push/subscriptions', sub(1))).statusCode).toBe(204);
    await ana('PATCH', '/me', { nickname: 'Ana' });
    const { code } = (await ana('POST', '/leagues', { name: 'Pelada' })).json();
    const bia = await device();
    await bia('PATCH', '/me', { nickname: 'Bia' });
    await bia('POST', `/leagues/${code}/join`);
    await bia('POST', '/push/subscriptions', sub(2, false, true));
    const gone = await device();
    await gone('POST', '/push/subscriptions', sub(3, true, false));

    const out: [string, PushMessage][] = [];
    const send = async (to: PushTarget, m: PushMessage) => {
      out.push([to.endpoint.slice(-1), m]);
      return to.endpoint.endsWith('3') ? 410 : 201;
    };
    // Monday 08:59 in Brasília: too early.
    expect(await runPushJobs(prisma, send, new Date('2026-11-16T11:59:00Z'))).toBe(0);
    expect(await runPushJobs(prisma, send, new Date('2026-11-16T12:00:00Z'))).toBe(3);
    expect(out.map(([e, m]) => `${e}:${m.url}`).sort()).toEqual([
      '1:/d/hoje',
      `1:/liga/${code}`,
      `2:/liga/${code}`,
      '3:/d/hoje',
    ]);
    expect(out.find(([e, m]) => e === '2' && m.url.includes('liga'))![1].body).toMatch(
      /você terminou em [12]º de 2/,
    );
    // Same day again: nothing; the 410 subscription is gone.
    expect(await runPushJobs(prisma, send, new Date('2026-11-16T20:00:00Z'))).toBe(0);
    expect(await prisma.pushSubscription.count()).toBe(2);

    expect(
      (await ana('DELETE', '/push/subscriptions', { endpoint: sub(1).endpoint })).statusCode,
    ).toBe(204);
    expect(await prisma.pushSubscription.count()).toBe(1);
  });
});
