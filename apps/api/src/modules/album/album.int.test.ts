import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { seedReference } from '../../seed-reference';
import { ADMIN_TOKEN, testApp, WEB_ORIGIN } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';
import { countryIds, verifiedClubs, verifiedPlayer } from '../../test/factory';

const prisma = testPrisma();
const { app } = testApp({ prisma, now: () => new Date('2026-11-05T15:00:00Z') });
const admin = { 'x-admin-token': ADMIN_TOKEN, 'x-editor': 'tester' };
let answerId = '';

async function adminPost(url: string) {
  return app.inject({ method: 'POST', url: `/v1/admin${url}`, headers: admin, payload: {} });
}

/** A device keeping its own cookie, started on Career Path level 1. */
async function startLevel() {
  let cookie = '';
  const req = async (method: 'GET' | 'POST', url: string, payload?: object) => {
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
  const start = (await req('POST', '/attempts', { mode: 'CAREER_PATH', level: 1 })).json();
  const attemptId = start.attempt.id as string;
  const { sessionId } = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
  const act = async (input: object) =>
    (
      await req('POST', `/attempts/${attemptId}/actions`, { idempotencyKey: randomUUID(), input })
    ).json();
  return { act, sessionId, req, attemptId };
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
  const created = await app.inject({
    method: 'POST',
    url: '/v1/admin/challenges',
    headers: admin,
    payload: { mode: 'CAREER_PATH', params: { playerId: answerId } },
  });
  const id = created.json().id as string;
  await adminPost(`/challenges/${id}/validate`);
  expect((await adminPost(`/challenges/${id}/publish`)).statusCode).toBe(200);
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.sticker.deleteMany();
});

const stickers = () => prisma.sticker.findMany();
const setDifficulty = (difficultyTier: number) =>
  prisma.challenge.updateMany({ where: { gameMode: 'CAREER_PATH' }, data: { difficultyTier } });

describe('award sticker', () => {
  it('won career path level awards a sticker', async () => {
    const g = await startLevel();
    const res = await g.act({ kind: 'guess', playerId: answerId });
    expect(res.sticker).toMatchObject({
      isNew: true,
      upgradedFrom: null,
      sticker: { playerId: answerId, name: 'Ronaldo', mode: 'CAREER_PATH' },
    });
    expect(await stickers()).toHaveLength(1);
  });

  it('lost attempt awards no sticker', async () => {
    const g = await startLevel();
    const res = await g.act({ kind: 'give_up' });
    expect(res.attempt.status).toBe('LOST');
    expect(res.sticker).toBeUndefined();
    expect(await stickers()).toHaveLength(0);
  });

  it('replay keeps the best sticker', async () => {
    const g = await startLevel();
    await prisma.sticker.create({
      data: {
        pk: g.sessionId,
        playerId: answerId,
        rarity: 'ouro_brilhante',
        mode: 'CAREER_PATH',
        challengeId: 'old',
      },
    });
    await g.act({ kind: 'skip' });
    const res = await g.act({ kind: 'guess', playerId: answerId });
    expect(res.sticker).toMatchObject({ isNew: false, upgradedFrom: null });
    expect(res.sticker.sticker.rarity).toBe('ouro_brilhante');
    expect((await stickers())[0]!.rarity).toBe('ouro_brilhante');
  });

  it('higher result upgrades', async () => {
    await setDifficulty(3);
    const g = await startLevel();
    await prisma.sticker.create({
      data: {
        pk: g.sessionId,
        playerId: answerId,
        rarity: 'bronze',
        mode: 'CAREER_PATH',
        challengeId: 'old',
      },
    });
    const res = await g.act({ kind: 'guess', playerId: answerId });
    expect(res.attempt.stars).toBe(3);
    expect(res.sticker).toMatchObject({ isNew: false, upgradedFrom: 'bronze' });
    expect((await stickers())[0]!.rarity).toBe(res.sticker.sticker.rarity);
    expect(res.sticker.sticker.rarity).not.toBe('bronze');
  });
});

async function giveStickers(pk: string, rarities: ('bronze' | 'prata' | 'ouro' | 'lenda')[]) {
  const clubs = await verifiedClubs(prisma);
  const countries = await countryIds(prisma);
  for (const [i, rarity] of rarities.entries()) {
    const p = await verifiedPlayer(prisma, {
      name: `Craque ${randomUUID().slice(0, 6)}`,
      clubIds: [clubs.Cruzeiro!.id],
      nationalityId: countries.BR!,
    });
    await prisma.sticker.create({
      data: {
        pk,
        playerId: p.id,
        rarity,
        mode: 'CAREER_PATH',
        challengeId: 'x',
        earnedAt: new Date(Date.UTC(2026, 10, 1 + i)),
      },
    });
  }
}

describe('album routes', () => {
  it('album lists my stickers best first', async () => {
    const g = await startLevel();
    await giveStickers(g.sessionId, ['bronze', 'lenda', 'ouro']);
    const res = (await g.req('GET', '/me/album')).json();
    expect(res.owned).toBe(3);
    expect(res.total).toBeGreaterThanOrEqual(3);
    expect(res.stickers.map((s: { rarity: string }) => s.rarity)).toEqual([
      'lenda',
      'ouro',
      'bronze',
    ]);
    expect(res.byRarity).toMatchObject({ lenda: 1, ouro: 1, bronze: 1, prata: 0 });
  });

  it('album follows linked guest', async () => {
    const g = await startLevel();
    await giveStickers(g.sessionId, ['prata']);
    const user = await prisma.user.create({
      data: { email: `${randomUUID()}@t.test`, nickname: 'Vinculado', nicknameKey: randomUUID() },
    });
    await prisma.guestSession.update({ where: { id: g.sessionId }, data: { userId: user.id } });
    expect((await g.req('GET', '/me/album')).json().owned).toBe(1);
  });

  it('private profile album is 404', async () => {
    const g = await startLevel();
    await giveStickers(g.sessionId, ['prata']);
    await prisma.guestSession.update({
      where: { id: g.sessionId },
      data: { nickname: 'Reservado', nicknameKey: 'reservado', publicProfile: false },
    });
    expect((await g.req('GET', '/profiles/Reservado/album')).statusCode).toBe(404);
  });

  it('public profile shows at most 6', async () => {
    const g = await startLevel();
    await giveStickers(g.sessionId, Array(8).fill('bronze'));
    await prisma.guestSession.update({
      where: { id: g.sessionId },
      data: { nickname: 'Vitrine', nicknameKey: 'vitrine', publicProfile: true },
    });
    const res = (await g.req('GET', '/profiles/Vitrine/album')).json();
    expect(res.showcase).toHaveLength(6);
    expect(res.owned).toBe(8);
  });

  it('top 10 of a closed round upgrades that week to destaque_rodada', async () => {
    const g = await startLevel();
    await giveStickers(g.sessionId, ['bronze', 'lenda']);
    const week = await prisma.sticker.findMany({ orderBy: { earnedAt: 'asc' } });
    // earned the week of 2026-10-26, already closed on 2026-11-05
    await prisma.sticker.update({
      where: { pk_playerId: { pk: week[0]!.pk, playerId: week[0]!.playerId } },
      data: { earnedAt: new Date('2026-10-27T15:00:00Z') },
    });
    await prisma.dailyPick.upsert({
      where: { day_gameMode: { day: new Date('2026-10-26T00:00:00Z'), gameMode: 'CAREER_PATH' } },
      create: { day: new Date('2026-10-26T00:00:00Z'), gameMode: 'CAREER_PATH', level: 1 },
      update: {},
    });
    await prisma.attempt.update({
      where: { id: g.attemptId },
      data: {
        startedAt: new Date('2026-10-26T15:00:00Z'),
        completedAt: new Date('2026-10-26T15:05:00Z'),
        stars: 3,
      },
    });
    const first = (await g.req('GET', '/me/album')).json();
    expect(first.byRarity).toMatchObject({ destaque_rodada: 1, lenda: 1, bronze: 0 });
    expect((await g.req('GET', '/me/album')).json().byRarity.destaque_rodada).toBe(1);
    await prisma.dailyPick.deleteMany({ where: { day: new Date('2026-10-26T00:00:00Z') } });
  });
});
