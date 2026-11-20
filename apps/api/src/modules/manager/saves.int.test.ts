import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { CAREER_RULES_VERSION, generateDevPack } from '@decabeca/club-domain';
import { testApp, WEB_ORIGIN } from '../../test/app';
import { testPrisma } from '../../test/db';

const prisma = testPrisma();
const { app } = testApp({ prisma });
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

/** An older pack kept in the archive folder (ADR-023): same data, another checksum. */
const dir = mkdtempSync(join(tmpdir(), 'pack-archive-'));
process.env.CLUB_PACK_ARCHIVE_DIR = dir;
const dev = generateDevPack();
const OLD = 'a'.repeat(64);
writeFileSync(
  join(dir, `${dev.id}.${OLD}.json.gz`),
  gzipSync(JSON.stringify({ ...dev, checksum: OLD })),
);

function device() {
  let cookie = '';
  return async (method: 'GET' | 'POST' | 'PUT', url: string, payload?: object | Buffer) => {
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
}

describe('packs that last (ADR-023)', () => {
  it('serves the current pack and an archived one by id and checksum, and nothing else', async () => {
    const get = (file: string) => app.inject({ method: 'GET', url: `/packs/${file}` });
    const cur = await get(`${dev.id}.${dev.checksum}.json`);
    expect(cur.statusCode).toBe(200);
    expect(cur.headers['cache-control']).toContain('immutable');
    const old = await get(`${dev.id}.${OLD}.json`);
    expect(old.statusCode, old.body).toBe(200);
    expect(old.json().checksum).toBe(OLD);
    // Slimmed for the browser, like the static one.
    expect(Object.keys(old.json().players[0].field)).toHaveLength(0);
    expect((await get(`${dev.id}.nope.json`)).statusCode).toBe(404);
    expect((await get('..%2F..%2Fetc%2Fpasswd')).statusCode).toBe(404);
  });

  it('a career on an older archived pack keeps its pack, and backs up and restores', async () => {
    const d = device();
    const o = (await d('GET', '/manager/career/options')).json();
    await d('POST', '/manager/career', { startMode: 'job_offers', clubId: o.offers[0].id });
    // The pack moved on: this career stays on the archived one.
    await prisma.clubWorld.updateMany({ data: { packVersion: OLD }, where: { seed: { gte: 0 } } });
    const mine = (await d('GET', '/manager/career')).json().career;
    expect(mine.packVersion).toBe(OLD);
    const pack = await app.inject({
      method: 'GET',
      url: `/packs/${mine.packId}.${mine.packVersion}.json`,
    });
    expect(pack.statusCode).toBe(200);

    const snap = gzipSync(JSON.stringify({ v: CAREER_RULES_VERSION - 1, day: 20500, x: [1, 2] }));
    const step = await d('PUT', '/manager/career/world?from=0&to=20500&season=2026', snap);
    expect(step.statusCode, step.body).toBe(200);

    const out = await d('GET', '/manager/career/export');
    expect(out.statusCode).toBe(200);
    const file = JSON.parse(gunzipSync(out.rawPayload).toString());
    expect(file).toMatchObject({
      packId: dev.id,
      packVersion: OLD,
      rules: CAREER_RULES_VERSION - 1,
    });

    // Restore onto a fresh device (another browser): same career, old rules and pack kept.
    const other = device();
    const back = await other('POST', '/manager/career/import', Buffer.from(out.rawPayload));
    expect(back.statusCode, back.body).toBe(201);
    expect(back.json().career).toMatchObject({ packVersion: OLD, day: 20500, seed: mine.seed });
    const w = await other('GET', '/manager/career/world');
    expect(JSON.parse(gunzipSync(w.rawPayload).toString())).toEqual({
      v: CAREER_RULES_VERSION - 1,
      day: 20500,
      x: [1, 2],
    });
    // Importing again replaces the one in progress; there is still exactly one.
    expect(
      (await other('POST', '/manager/career/import', Buffer.from(out.rawPayload))).statusCode,
    ).toBe(201);
    expect((await other('GET', '/manager/career')).json().career.day).toBe(20500);
  });

  it('refuses a file that is not a valid backup', async () => {
    const d = device();
    const make = (patch: object) =>
      Buffer.from(
        gzipSync(
          JSON.stringify({
            kind: 'decabeca-career',
            v: 1,
            packId: dev.id,
            packVersion: dev.checksum,
            rules: 1,
            seed: 1,
            startMode: 'free_choice',
            clubId: dev.clubs[0]!.id,
            season: 2026,
            day: 5,
            snapshot: { v: 1, day: 5 },
            ...patch,
          }),
        ),
      );
    const post = (b: Buffer) => d('POST', '/manager/career/import', b);
    expect((await post(Buffer.from('nope'))).statusCode).toBe(400);
    expect((await post(make({ extra: 1 }))).statusCode).toBe(400);
    expect((await post(make({ snapshot: { v: 1, day: 6 } }))).statusCode).toBe(400);
    expect((await post(make({ packVersion: 'gone' }))).statusCode).toBe(422);
    expect((await post(make({ rules: 9999, snapshot: { v: 9999, day: 5 } }))).statusCode).toBe(422);
    expect((await post(make({ clubId: 'not-a-club' }))).statusCode).toBe(400);
    expect((await post(make({}))).statusCode).toBe(201);
  });
});
