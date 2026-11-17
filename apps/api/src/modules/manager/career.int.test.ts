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
    // The world document never reaches the client; the seed does, for the solo career that the
    // browser simulates (ADR-020).
    expect(ca).not.toHaveProperty('data');
    expect(ca).toHaveProperty('seed', 1);

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

describe('Modo Clube career start (MC-176, MC-177)', () => {
  /** A device keeping its cookie, for GET and POST. */
  function device() {
    let cookie = '';
    return async (method: 'GET' | 'POST', url: string, payload?: object) => {
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
  }

  it('shows the divisions and three offers that stay the same, and starts by free choice', async () => {
    const d = device();
    const o = (await d('GET', '/manager/career/options')).json();
    expect(o.divisions.map((x: { tier: number }) => x.tier)).toEqual([1, 2, 3, 4]);
    expect(o.offers).toHaveLength(3);
    expect((await d('GET', '/manager/career/options')).json().offers).toEqual(o.offers);
    const last = o.divisions.at(-1).clubs.map((c: { id: string }) => c.id);
    for (const offer of o.offers) expect(last).toContain(offer.id);

    const top = o.divisions[0].clubs[0].id;
    const created = await d('POST', '/manager/career', { startMode: 'free_choice', clubId: top });
    expect(created.statusCode, created.body).toBe(201);
    const career = created.json().career;
    expect(career).toMatchObject({
      clubId: top,
      startMode: 'free_choice',
      packId: o.packId,
      day: 0,
    });
    expect(Number.isInteger(career.seed)).toBe(true);
    expect((await d('GET', '/manager/career')).json().career).toEqual(career);
    // One career at a time.
    const again = await d('POST', '/manager/career', { startMode: 'free_choice', clubId: top });
    expect(again.statusCode).toBe(409);
  });

  it('job offers: only an offered club, and nothing the client may add', async () => {
    const d = device();
    const o = (await d('GET', '/manager/career/options')).json();
    const top = o.divisions[0].clubs[0].id;
    expect(
      (await d('POST', '/manager/career', { startMode: 'job_offers', clubId: top })).statusCode,
    ).toBe(400);
    expect(
      (
        await d('POST', '/manager/career', {
          startMode: 'job_offers',
          clubId: o.offers[1].id,
          seed: 1,
        })
      ).statusCode,
    ).toBe(400);
    const ok = await d('POST', '/manager/career', {
      startMode: 'job_offers',
      clubId: o.offers[1].id,
    });
    expect(ok.statusCode, ok.body).toBe(201);
    expect(ok.json().career.clubId).toBe(o.offers[1].id);
  });
});

describe('Modo Clube calendar advance (MC-084)', () => {
  it('keeps the day and the snapshot together, once, and refuses a step from a stale day', async () => {
    const { gzipSync, gunzipSync } = await import('node:zlib');
    let cookie = '';
    const d = async (method: 'GET' | 'POST' | 'PUT', url: string, payload?: object | Buffer) => {
      const res = await app.inject({
        method,
        url: `/v1${url}`,
        headers: {
          origin: WEB_ORIGIN,
          ...(cookie ? { cookie } : {}),
          ...(payload instanceof Buffer ? { 'content-type': 'application/octet-stream' } : {}),
        },
        ...(payload ? { payload } : {}),
      });
      const set = res.headers['set-cookie'];
      if (set) cookie = String([set].flat()[0]).split(';')[0]!;
      return res;
    };
    const snap = (day: number) => gzipSync(JSON.stringify({ v: 1, day }));
    expect(
      (await d('PUT', '/manager/career/world?from=0&to=5&season=2026', snap(5))).statusCode,
    ).toBe(404);
    const o = (await d('GET', '/manager/career/options')).json();
    await d('POST', '/manager/career', { startMode: 'job_offers', clubId: o.offers[0].id });
    expect((await d('GET', '/manager/career/world')).rawPayload.length).toBe(0);

    const step = await d('PUT', '/manager/career/world?from=0&to=20500&season=2026', snap(20500));
    expect(step.statusCode, step.body).toBe(200);
    expect(step.json().career.day).toBe(20500);
    const back = await d('GET', '/manager/career/world');
    expect(JSON.parse(gunzipSync(back.rawPayload).toString())).toEqual({ v: 1, day: 20500 });
    // A retry answers the same; a step from the old day is a conflict.
    expect(
      (await d('PUT', '/manager/career/world?from=0&to=20500&season=2026', snap(20500))).json(),
    ).toEqual(step.json());
    expect(
      (await d('PUT', '/manager/career/world?from=0&to=20510&season=2026', snap(20510))).statusCode,
    ).toBe(409);
    expect(
      (await d('PUT', '/manager/career/world?from=20500&to=20400&season=2026', snap(1))).statusCode,
    ).toBe(400);
    expect(
      (await d('PUT', '/manager/career/world?from=20500&to=21000&season=2026', snap(1))).statusCode,
    ).toBe(400);
    expect(
      (await d('PUT', '/manager/career/world?from=20500&to=20507&season=2026', Buffer.from('{}')))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await d(
          'PUT',
          '/manager/career/world?from=20500&to=20507&season=2026',
          Buffer.alloc(600_000, 0x1f),
        )
      ).statusCode,
    ).toBe(413);
    expect((await d('GET', '/manager/career')).json().career.day).toBe(20500);
    // A decision on the same day (the line-up) replaces the snapshot and moves nothing.
    const still = '/manager/career/world?from=20500&to=20500&season=2026&still=1';
    const pick = gzipSync(JSON.stringify({ v: 1, day: 20500, lineup: true }));
    expect((await d('PUT', still, pick)).json().career.day).toBe(20500);
    expect(
      JSON.parse(gunzipSync((await d('GET', '/manager/career/world')).rawPayload).toString()),
    ).toEqual({ v: 1, day: 20500, lineup: true });
    expect(
      (await d('PUT', '/manager/career/world?from=20400&to=20400&season=2026&still=1', pick))
        .statusCode,
    ).toBe(409);
    expect(
      (await d('PUT', '/manager/career/world?from=20500&to=20507&season=2026&still=1', pick))
        .statusCode,
    ).toBe(400);
    // A season turn moves the season once; skipping a season is refused.
    expect(
      (await d('PUT', '/manager/career/world?from=20500&to=20520&season=2028', snap(1))).statusCode,
    ).toBe(400);
    const turn = await d(
      'PUT',
      '/manager/career/world?from=20500&to=20520&season=2027',
      snap(20520),
    );
    expect(turn.json().career).toMatchObject({ day: 20520, season: 2027 });
  });
});
