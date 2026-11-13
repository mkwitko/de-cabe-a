import { afterAll, describe, expect, it } from 'vitest';
import { testApp, WEB_ORIGIN } from '../../test/app';
import { testPrisma } from '../../test/db';

const prisma = testPrisma();
const { app } = testApp({ prisma });
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const post = (payload: object) =>
  app.inject({
    method: 'POST',
    url: '/v1/manager/sandbox',
    headers: { origin: WEB_ORIGIN },
    payload,
  });

const wide = { width: 5, lineHeight: 3, inverted: null };

describe('POST /v1/manager/sandbox', () => {
  it('returns the same frames for the same request, and chunks join into one run', async () => {
    const whole = (await post({ seed: 5, from: 0, count: 400, commands: [] })).json();
    expect(whole.frames).toHaveLength(400);
    expect(whole.frames[0]).toHaveLength(47);
    expect(whole.frames[0][0]).toBe(1);

    const a = (await post({ seed: 5, from: 0, count: 150, commands: [] })).json();
    const b = (await post({ seed: 5, from: 150, count: 250, commands: [] })).json();
    expect([...a.frames, ...b.frames]).toEqual(whole.frames);
  });

  it('applies a command from its tick on and not before', async () => {
    const plain = (await post({ seed: 5, from: 0, count: 400, commands: [] })).json();
    const changed = (
      await post({ seed: 5, from: 0, count: 400, commands: [{ tick: 200, instructions: wide }] })
    ).json();
    expect(changed.frames.slice(0, 200)).toEqual(plain.frames.slice(0, 200));
    expect(changed.frames.slice(200)).not.toEqual(plain.frames.slice(200));
  });

  it('rejects fields the client must not send and oversized requests', async () => {
    const base = { seed: 5, from: 0, count: 10, commands: [] };
    expect((await post({ ...base, score: [3, 0] })).statusCode).toBe(400);
    expect((await post({ ...base, count: 100000 })).statusCode).toBe(400);
    expect(
      (await post({ ...base, commands: [{ tick: 0, instructions: { ...wide, width: 9 } }] }))
        .statusCode,
    ).toBe(400);
    expect(
      (await post({ ...base, commands: Array(41).fill({ tick: 0, instructions: wide }) }))
        .statusCode,
    ).toBe(400);
  });
});

describe('friendly match', () => {
  const advance = (payload: object) =>
    app.inject({
      method: 'POST',
      url: '/v1/manager/friendly/advance',
      headers: { origin: WEB_ORIGIN },
      payload,
    });

  it('lists the clubs of the development pack', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/manager/friendly/clubs',
      headers: { origin: WEB_ORIGIN },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.clubs.length).toBe(8);
    expect(body.formations).toContain('4-3-3');
  });

  it('returns chunks that join, and the same answer twice', async () => {
    const clubs = (await app.inject({ method: 'GET', url: '/v1/manager/friendly/clubs' })).json()
      .clubs;
    const base = {
      seed: 9,
      home: { clubId: clubs[0].id, formation: '4-3-3', instructions: { pressIntensity: 4 } },
      away: { clubId: clubs[1].id, formation: '4-4-2', instructions: {} },
      commands: [],
    };
    const whole = (await advance({ ...base, from: 0, count: 300 })).json();
    expect(whole.frames).toHaveLength(300);
    expect(whole.frames[0]).toHaveLength(48);
    const a = (await advance({ ...base, from: 0, count: 120 })).json();
    const b = (await advance({ ...base, from: 120, count: 180 })).json();
    expect([...a.frames, ...b.frames]).toEqual(whole.frames);
    expect((await advance({ ...base, from: 0, count: 300 })).json()).toEqual(whole);
  });

  it('rejects unknown clubs, extra fields and oversized chunks', async () => {
    const ok = {
      seed: 1,
      home: { clubId: 'x', formation: '4-3-3', instructions: {} },
      away: { clubId: 'x', formation: '4-3-3', instructions: {} },
      from: 0,
      count: 10,
      commands: [],
    };
    expect((await advance(ok)).statusCode).toBe(400);
    const clubs = (await app.inject({ method: 'GET', url: '/v1/manager/friendly/clubs' })).json()
      .clubs;
    const good = {
      ...ok,
      home: { ...ok.home, clubId: clubs[0].id },
      away: { ...ok.away, clubId: clubs[1].id },
    };
    expect((await advance({ ...good, userTeam: 0 })).statusCode).toBe(400);
    expect((await advance({ ...good, count: 5000 })).statusCode).toBe(400);
  });
});
