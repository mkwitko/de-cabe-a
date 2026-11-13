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
