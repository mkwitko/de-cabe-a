import { afterAll, describe, expect, it } from 'vitest';
import { testApp, WEB_ORIGIN } from '../../test/app';
import { testPrisma } from '../../test/db';

const prisma = testPrisma();
const { app } = testApp({ prisma });
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

/** A device keeping its own guest cookie. */
function guest() {
  let cookie = '';
  return async (url: string) => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1${url}`,
      headers: { origin: WEB_ORIGIN, ...(cookie ? { cookie } : {}) },
    });
    const set = res.headers['set-cookie'];
    if (set) cookie = String([set].flat()[0]).split(';')[0]!;
    return res;
  };
}

const world = () =>
  prisma.clubWorld.create({
    data: {
      packId: 'br-dev-1',
      packVersion: '1',
      engineVersion: 0,
      seed: 1,
      season: 2027,
      data: Buffer.from('{}'),
    },
  });

describe('Modo Clube career ownership (MC-081)', () => {
  it('each person sees only their own career, found through their session', async () => {
    const [a, b] = [guest(), guest()];
    expect((await a('/manager/career')).json()).toEqual({ career: null });
    const sa = await prisma.guestSession.findFirstOrThrow({ orderBy: { createdAt: 'desc' } });
    await b('/manager/career');
    const sb = await prisma.guestSession.findFirstOrThrow({
      where: { id: { not: sa.id } },
      orderBy: { createdAt: 'desc' },
    });
    const w = await world();
    await prisma.clubCareer.create({
      data: { pk: sa.id, worldId: w.id, startMode: 'free_choice', clubId: 'c1' },
    });
    await prisma.clubCareer.create({
      data: { pk: sb.id, worldId: (await world()).id, startMode: 'job_offers', clubId: 'c9' },
    });

    const ca = (await a('/manager/career')).json().career;
    const cb = (await b('/manager/career')).json().career;
    expect(ca).toMatchObject({ clubId: 'c1', startMode: 'free_choice', season: 2027, day: 0 });
    expect(cb).toMatchObject({ clubId: 'c9', startMode: 'job_offers' });
    // The seed and the world document never reach the client.
    expect(ca).not.toHaveProperty('seed');
    expect(ca).not.toHaveProperty('data');

    // One career not over per person; one manager per club in a world.
    await expect(
      prisma.clubCareer.create({
        data: { pk: sa.id, worldId: (await world()).id, startMode: 'free_choice' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.clubCareer.create({
        data: { pk: 'someone', worldId: w.id, startMode: 'free_choice', clubId: 'c1' },
      }),
    ).rejects.toThrow();
    // An ended career frees the person for a new one.
    await prisma.clubCareer.updateMany({ where: { pk: sa.id }, data: { status: 'ended' } });
    expect((await a('/manager/career')).json()).toEqual({ career: null });
    await prisma.clubCareer.create({
      data: { pk: sa.id, worldId: (await world()).id, startMode: 'free_choice' },
    });
  });
});
