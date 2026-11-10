import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { seedReference } from '../../seed-reference';
import { ADMIN_TOKEN, testApp, WEB_ORIGIN } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';
import { countryIds, verifiedClubs, verifiedPlayer } from '../../test/factory';

const prisma = testPrisma();
const START = new Date('2026-11-05T15:00:00Z');
let clock = START;
const { app } = testApp({ prisma, now: () => clock });
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
  clock = START;
  await prisma.sticker.deleteMany();
  await prisma.seasonPromotion.deleteMany();
  await prisma.roundCheck.deleteMany();
  await prisma.attempt.updateMany({
    where: { completedAt: { gte: new Date('2026-11-09T00:00:00Z') } },
    data: { completedAt: null, stars: 0 },
  });
});

const stickers = () => prisma.sticker.findMany();
const setDifficulty = (difficultyTier: number) =>
  prisma.challenge.updateMany({ where: { gameMode: 'CAREER_PATH' }, data: { difficultyTier } });

describe('award sticker', () => {
  it('won career path level awards a sticker', async () => {
    await prisma.player.update({
      where: { id: answerId },
      data: { photoFile: 'Ronaldo 2002.jpg', photoAuthor: 'Fulano', photoLicense: 'CC BY-SA 4.0' },
    });
    const g = await startLevel();
    const res = await g.act({ kind: 'guess', playerId: answerId });
    expect(res.sticker).toMatchObject({
      isNew: true,
      upgradedFrom: null,
      sticker: {
        playerId: answerId,
        name: 'Ronaldo',
        mode: 'CAREER_PATH',
        photo: expect.stringContaining('Ronaldo%202002.jpg'),
        photoCredit: 'Foto: Fulano · CC BY-SA 4.0',
      },
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

  /** Two bronze stickers in the closed week of 2026-10-26; only `daily` comes from the drawn level. */
  async function closedRound(earnedAt: { daily: string; other: string }) {
    const g = await startLevel();
    await giveStickers(g.sessionId, ['bronze', 'bronze']);
    const [daily, other] = await prisma.sticker.findMany({ orderBy: { earnedAt: 'asc' } });
    const { challengeId } = await prisma.attempt.findUniqueOrThrow({ where: { id: g.attemptId } });
    for (const [row, at, cid] of [
      [daily!, earnedAt.daily, challengeId],
      [other!, earnedAt.other, 'x'],
    ] as const)
      await prisma.sticker.update({
        where: { pk_playerId: { pk: row.pk, playerId: row.playerId } },
        data: { earnedAt: new Date(at), challengeId: cid },
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
    return g;
  }
  const cleanRound = async () => {
    await prisma.dailyPick.deleteMany({ where: { day: new Date('2026-10-26T00:00:00Z') } });
    await prisma.roundCheck.deleteMany();
  };

  it('top 10 of a closed round upgrades only the daily-pick sticker, once', async () => {
    const g = await closedRound({ daily: '2026-10-27T15:00:00Z', other: '2026-10-27T16:00:00Z' });
    const first = (await g.req('GET', '/me/album')).json();
    expect(first.byRarity).toMatchObject({ destaque_rodada: 1, bronze: 1 });
    expect(await prisma.roundCheck.count()).toBe(1);
    expect((await g.req('GET', '/me/album')).json().byRarity.destaque_rodada).toBe(1);
    await cleanRound();
  });

  it('weekend stickers are not upgraded', async () => {
    const g = await closedRound({ daily: '2026-11-01T15:00:00Z', other: '2026-10-31T15:00:00Z' });
    const res = (await g.req('GET', '/me/album')).json();
    expect(res.byRarity).toMatchObject({ destaque_rodada: 0, bronze: 2 });
    await cleanRound();
  });
});

describe('sticker keep-best across linked pks', () => {
  it('linked user with a better guest sticker gets isNew false and no downgrade', async () => {
    await setDifficulty(1);
    const g = await startLevel();
    const user = await prisma.user.create({
      data: { email: `${randomUUID()}@t.test`, nickname: 'Dono', nicknameKey: randomUUID() },
    });
    await prisma.guestSession.update({ where: { id: g.sessionId }, data: { userId: user.id } });
    await prisma.sticker.create({
      data: {
        pk: g.sessionId,
        playerId: answerId,
        rarity: 'ouro_brilhante',
        mode: 'CAREER_PATH',
        challengeId: 'old',
      },
    });
    const res = await g.act({ kind: 'guess', playerId: answerId });
    expect(res.sticker).toMatchObject({ isNew: false, upgradedFrom: null });
    expect(res.sticker.sticker.rarity).toBe('ouro_brilhante');
    expect((await stickers()).every((s) => s.rarity === 'ouro_brilhante')).toBe(true);
  });

  it('community levels award no sticker', async () => {
    const g = await startLevel();
    await prisma.challenge.updateMany({
      where: { gameMode: 'CAREER_PATH' },
      data: { publicNumber: null },
    });
    try {
      const res = await g.act({ kind: 'guess', playerId: answerId });
      expect(res.sticker).toBeUndefined();
      expect(await stickers()).toHaveLength(0);
    } finally {
      await prisma.challenge.updateMany({
        where: { gameMode: 'CAREER_PATH' },
        data: { publicNumber: 1 },
      });
    }
  });
});

describe('Seleção da Temporada', () => {
  /** A nicknamed player with 3 stars in season 1, now in season 2. */
  async function podiumPlayer() {
    const g = await startLevel();
    await prisma.guestSession.update({
      where: { id: g.sessionId },
      data: { nickname: 'Pódio', nicknameKey: randomUUID() },
    });
    await prisma.attempt.update({
      where: { id: g.attemptId },
      data: { completedAt: new Date('2026-11-10T15:00:00Z'), stars: 3 },
    });
    clock = new Date('2026-12-08T15:00:00Z');
    return g;
  }

  it('podium player promotes one sticker', async () => {
    const g = await podiumPlayer();
    await giveStickers(g.sessionId, ['bronze', 'lenda']);
    const album = (await g.req('GET', '/me/album')).json();
    expect(album.promotions).toEqual([{ season: 1, theme: 'Copa do Mundo' }]);
    const bronze = album.stickers.find((s: { rarity: string }) => s.rarity === 'bronze');
    const res = await g.req('POST', '/me/album/promote', { playerId: bronze.playerId });
    expect(res.statusCode).toBe(200);
    expect(res.json().promotions).toEqual([]);
    expect(res.json().byRarity).toMatchObject({ selecao_temporada: 1, lenda: 1, bronze: 0 });
  });

  it('promoting a higher rarity keeps it but consumes the season', async () => {
    const g = await podiumPlayer();
    await giveStickers(g.sessionId, ['lenda']);
    const [lenda] = (await g.req('GET', '/me/album')).json().stickers;
    const res = await g.req('POST', '/me/album/promote', { playerId: lenda.playerId });
    expect(res.statusCode).toBe(200);
    expect(res.json().byRarity).toMatchObject({ lenda: 1, selecao_temporada: 0 });
    expect(res.json().promotions).toEqual([]);
  });

  it('second promote for the same season is 409', async () => {
    const g = await podiumPlayer();
    await giveStickers(g.sessionId, ['bronze', 'prata']);
    const [a, b] = (await g.req('GET', '/me/album')).json().stickers;
    expect((await g.req('POST', '/me/album/promote', { playerId: a.playerId })).statusCode).toBe(
      200,
    );
    const res = await g.req('POST', '/me/album/promote', { playerId: b.playerId });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('NO_PROMOTION');
  });

  it('non-podium player has no promotion', async () => {
    const g = await startLevel();
    await giveStickers(g.sessionId, ['bronze']);
    clock = new Date('2026-12-08T15:00:00Z');
    const [s] = (await g.req('GET', '/me/album')).json().stickers;
    const res = await g.req('POST', '/me/album/promote', { playerId: s.playerId });
    expect(res.json().error.code).toBe('NO_PROMOTION');
  });

  it('cannot promote a sticker you do not own', async () => {
    const g = await podiumPlayer();
    const res = await g.req('POST', '/me/album/promote', { playerId: answerId });
    expect(res.statusCode).toBe(404);
  });
});
