import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedReference } from '../../seed-reference';
import { ADMIN_TOKEN, testApp, WEB_ORIGIN } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';
import { countryIds, verifiedClubs, verifiedPlayer } from '../../test/factory';

const prisma = testPrisma();
const { app } = testApp({ prisma, now: () => new Date('2026-11-05T15:00:00Z') });
const admin = { 'x-admin-token': ADMIN_TOKEN, 'x-editor': 'tester' };
let answerId = '';

/** A device with a cookie jar (sign-up sets several cookies). */
function device() {
  const jar = new Map<string, string>();
  const req = async (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) => {
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

/** A signed-up player with one row of everything that is keyed by the player. */
async function populated(name: string, withLevel = false) {
  const d = device();
  const email = `${randomUUID()}@example.com`;
  expect(
    (await d.req('POST', '/auth/sign-up/email', { email, password: 'segredo-123', name }))
      .statusCode,
  ).toBe(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const session = await prisma.guestSession.findFirstOrThrow({ where: { userId: user.id } });
  const pk = user.id;
  const start = (await d.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 1 })).json();
  expect(
    (
      await d.req('POST', `/attempts/${start.attempt.id}/actions`, {
        idempotencyKey: randomUUID(),
        input: { kind: 'guess', playerId: answerId },
      })
    ).statusCode,
  ).toBe(200);
  const challengeId = (await prisma.attempt.findFirstOrThrow({ where: { sessionId: session.id } }))
    .challengeId;
  const league = (await d.req('POST', '/leagues', { name: `Liga ${name}` })).json();
  await prisma.careerPlayer.create({
    data: {
      sessionId: session.id,
      name: `Craque ${name}`,
      position: 'FW',
      attributes: {},
      bank: {},
    },
  });
  await prisma.pushSubscription.create({
    data: { endpoint: `https://push.example/${pk}`, pk, p256dh: 'k', auth: 'a' },
  });
  await prisma.fantasySquad.create({ data: { pk, week: new Date('2026-11-02'), playerIds: [] } });
  await prisma.copaRun.create({ data: { pk, difficulty: 'normal', state: {} } });
  await prisma.levelReaction.create({ data: { challengeId, pk, kind: 'craque' } });
  if (withLevel)
    await prisma.communityLevel.create({
      data: { challengeId, authorPk: pk, title: `Nível ${name}` },
    });
  await prisma.communityVote.create({ data: { challengeId, pk, up: true } });
  await prisma.seasonPromotion.create({ data: { pk, season: 1, playerId: answerId } });
  await prisma.roundCheck.create({ data: { pk, monday: new Date('2026-11-02') } });
  return { d, email, user, session, pk, league, challengeId };
}

async function rowsOf(p: { pk: string; session: { id: string }; user: { id: string } }) {
  const pk = { pk: p.pk };
  return {
    attempts: await prisma.attempt.count({ where: { sessionId: p.session.id } }),
    actions: await prisma.attemptAction.count({ where: { attempt: { sessionId: p.session.id } } }),
    careers: await prisma.careerPlayer.count({ where: { sessionId: p.session.id } }),
    stickers: await prisma.sticker.count({ where: pk }),
    members: await prisma.leagueMember.count({ where: pk }),
    push: await prisma.pushSubscription.count({ where: pk }),
    fantasy: await prisma.fantasySquad.count({ where: pk }),
    copa: await prisma.copaRun.count({ where: pk }),
    reactions: await prisma.levelReaction.count({ where: pk }),
    votes: await prisma.communityVote.count({ where: pk }),
    promotions: await prisma.seasonPromotion.count({ where: pk }),
    rounds: await prisma.roundCheck.count({ where: pk }),
    sessions: await prisma.guestSession.count({ where: { userId: p.user.id } }),
    authSessions: await prisma.authSession.count({ where: { userId: p.user.id } }),
    accounts: await prisma.account.count({ where: { userId: p.user.id } }),
    users: await prisma.user.count({ where: { id: p.user.id } }),
  };
}

beforeAll(async () => {
  await resetDb(prisma);
  await seedReference(prisma);
  const clubs = await verifiedClubs(prisma);
  const countries = await countryIds(prisma);
  answerId = (
    await verifiedPlayer(prisma, {
      name: 'Ronaldo',
      clubIds: [clubs.Cruzeiro!.id, clubs.PSV!.id, clubs.Barcelona!.id, clubs['Real Madrid']!.id],
      nationalityId: countries.BR!,
      position: 'FW',
      tier: 'T1',
    })
  ).id;
  const post = (url: string) =>
    app.inject({ method: 'POST', url: `/v1/admin${url}`, headers: admin, payload: {} });
  const created = await app.inject({
    method: 'POST',
    url: '/v1/admin/challenges',
    headers: admin,
    payload: { mode: 'CAREER_PATH', params: { playerId: answerId } },
  });
  const id = created.json().id as string;
  await post(`/challenges/${id}/validate`);
  expect((await post(`/challenges/${id}/publish`)).statusCode).toBe(200);
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('LGPD: exportar e excluir', () => {
  it('exports the player data as a JSON attachment, only theirs', async () => {
    const ana = await populated('Ana Export', true);
    await populated('Bia Export');
    const res = await ana.d.req('GET', '/me/export');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const data = res.json();
    expect(data.account).toMatchObject({ email: ana.email, nickname: 'Ana Export' });
    expect(data.attempts).toHaveLength(1);
    expect(data.attempts[0].actions.length).toBeGreaterThan(0);
    expect(data.stickers).toHaveLength(1);
    expect(data.leagues).toEqual([expect.objectContaining({ name: 'Liga Ana Export' })]);
    expect(data.careers).toHaveLength(1);
    expect(data.fantasySquads).toHaveLength(1);
    expect(data.copaRuns).toHaveLength(1);
    expect(data.communityLevels).toHaveLength(1);
    expect(data.account.signInMethods).toEqual([
      expect.objectContaining({ providerId: 'credential' }),
    ]);
    expect(data.account.signIns.length).toBeGreaterThan(0);
    expect(JSON.stringify(data)).not.toMatch(/Bia Export|scrypt|p256dh|tokenHash|"token"/);
  });

  it('deletes everything of the account in one go, ends the session, spares others', async () => {
    await prisma.communityLevel.deleteMany();
    const ana = await populated('Ana Delete', true);
    const bia = await populated('Bia Delete');
    const before = await rowsOf(ana);
    expect(Object.values(before).every((n) => n >= 1)).toBe(true);
    const biaBefore = await rowsOf(bia);

    const res = await ana.d.req('DELETE', '/me');
    expect(res.statusCode).toBe(204);
    expect(Object.values(await rowsOf(ana)).every((n) => n === 0)).toBe(true);
    expect(await prisma.league.count({ where: { code: ana.league.code } })).toBe(0);
    // The Oficina level stays for others, without the author.
    expect(await prisma.communityLevel.count({ where: { authorPk: 'deleted' } })).toBe(1);
    expect(await prisma.communityLevel.count({ where: { authorPk: ana.pk } })).toBe(0);

    // The session cookie is gone: the next call is a fresh guest.
    expect(ana.d.jar.has('dc_session')).toBe(false);
    expect((await ana.d.req('GET', '/me')).json()).toMatchObject({ account: null, nickname: null });
    expect(
      (
        await device().req('POST', '/auth/sign-in/email', {
          email: ana.email,
          password: 'segredo-123',
        })
      ).statusCode,
    ).toBeGreaterThanOrEqual(400);

    expect(await rowsOf(bia)).toEqual(biaBefore);
  });

  it('erasing an account needs a live sign-in, not only the device link', async () => {
    const ana = await populated('Ana Expired');
    for (const k of [...ana.d.jar.keys()]) if (k.includes('better-auth')) ana.d.jar.delete(k);
    const res = await ana.d.req('DELETE', '/me');
    expect(res.statusCode).toBe(401);
    expect(await prisma.user.count({ where: { id: ana.pk } })).toBe(1);
  });

  it('a guest can erase their device data too', async () => {
    const g = device();
    await g.req('PATCH', '/me', { nickname: 'Visitante X' });
    const s = await prisma.guestSession.findFirstOrThrow({ where: { nickname: 'Visitante X' } });
    expect((await g.req('DELETE', '/me')).statusCode).toBe(204);
    expect(await prisma.guestSession.count({ where: { id: s.id } })).toBe(0);
  });
});
