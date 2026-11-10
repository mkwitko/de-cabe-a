import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testApp, WEB_ORIGIN } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';

const prisma = testPrisma();
const mails: { subject: string; text: string }[] = [];
const { app } = testApp({
  prisma,
  notifyFeedback: async (subject, text) => void mails.push({ subject, text }),
});

/** A device with a cookie jar. */
function device() {
  const jar = new Map<string, string>();
  const req = async (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => {
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
  return { req };
}

const valid = { kind: 'suggestion', text: 'Queria ver mais ligas no jogo, por favor.' };

beforeAll(() => resetDb(prisma));
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('POST /v1/feedback', () => {
  it('stores a guest suggestion and e-mails the owner', async () => {
    const g = device();
    const res = await g.req('POST', '/feedback', valid);
    expect(res.statusCode).toBe(201);
    const row = await prisma.feedback.findFirstOrThrow({ where: { text: valid.text } });
    expect(row).toMatchObject({ kind: 'suggestion', status: 'novo', userId: null, email: null });
    expect(row.sessionId).toBeTruthy();
    expect(mails.at(-1)?.subject).toContain('Sugestão');
  });

  it('keeps the account, e-mail, route and version of a problem', async () => {
    const d = device();
    const email = `${randomUUID()}@example.com`;
    expect(
      (
        await d.req('POST', '/auth/sign-up/email', {
          email,
          password: 'segredo-123',
          name: 'Fb Um',
        })
      ).statusCode,
    ).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const res = await d.req('POST', '/feedback', {
      kind: 'problem',
      text: 'A fase 3 do Grid trava ao abrir.',
      email,
      route: '/grid/3',
      appVersion: 'abc1234',
    });
    expect(res.statusCode).toBe(201);
    expect(await prisma.feedback.findFirstOrThrow({ where: { userId: user.id } })).toMatchObject({
      kind: 'problem',
      email,
      route: '/grid/3',
      appVersion: 'abc1234',
    });
  });

  it('rejects bad input', async () => {
    const g = device();
    for (const body of [
      { ...valid, text: 'curto' },
      { ...valid, text: 'x'.repeat(1001) },
      { ...valid, kind: 'outro' },
      { ...valid, email: 'nao-e-email' },
      { ...valid, extra: 1 },
    ])
      expect((await g.req('POST', '/feedback', body)).statusCode).toBe(400);
  });

  it('allows 5 an hour per session', async () => {
    const g = device();
    for (let i = 0; i < 5; i++)
      expect((await g.req('POST', '/feedback', valid)).statusCode).toBe(201);
    expect((await g.req('POST', '/feedback', valid)).statusCode).toBe(429);
    expect((await device().req('POST', '/feedback', valid)).statusCode).toBe(201);
  });

  it('is exported with the account and erased with it', async () => {
    const d = device();
    const email = `${randomUUID()}@example.com`;
    await d.req('POST', '/auth/sign-up/email', { email, password: 'segredo-123', name: 'Fb Dois' });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await d.req('POST', '/feedback', { kind: 'praise', text: 'Adorei o jogo, parabéns!' });
    const exported = (await d.req('GET', '/me/export')).json();
    expect(exported.feedback).toHaveLength(1);
    const others = (await prisma.feedback.count()) - 1;
    expect((await d.req('DELETE', '/me')).statusCode).toBe(204);
    expect(await prisma.feedback.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.feedback.count({ where: { text: 'Adorei o jogo, parabéns!' } })).toBe(0);
    expect(await prisma.feedback.count()).toBe(others);
  });
});
