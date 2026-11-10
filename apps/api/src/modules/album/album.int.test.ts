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
  return { act, sessionId };
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
    await prisma.sticker.deleteMany();
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
    await prisma.sticker.deleteMany();
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
