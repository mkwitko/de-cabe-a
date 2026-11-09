import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testApp, WEB_ORIGIN } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';
import { MAX_MEMBERS } from './leagues';

const prisma = testPrisma();
const { app } = testApp({ prisma, now: () => new Date('2026-11-09T15:00:00Z') });

/** A device keeping its own cookie, optionally with a nickname. */
async function player(nickname?: string) {
  let cookie = '';
  const req = async (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) => {
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
  if (nickname) expect((await req('PATCH', '/me', { nickname })).statusCode).toBe(200);
  else await req('GET', '/leagues');
  return { req };
}

beforeAll(() => resetDb(prisma));
afterAll(() => app.close());

describe('Ligas de amigos (GROWTH_PLAN.md 2.1)', () => {
  it('create, join by code, weekly ranking only for members, leave and report', async () => {
    const noName = await player();
    const created = await noName.req('POST', '/leagues', { name: 'Pelada de quinta' });
    expect(created.json().error.code).toBe('NICKNAME_REQUIRED');

    const ana = await player('Ana');
    const league = (await ana.req('POST', '/leagues', { name: 'Pelada de quinta' })).json();
    expect(league).toMatchObject({ name: 'Pelada de quinta', members: 1, isMember: true });
    expect(league.code).toMatch(/^[A-Z2-9]{6}$/);

    const bia = await player('Bia');
    const outside = (await bia.req('GET', `/leagues/${league.code}`)).json();
    expect(outside).toMatchObject({ isMember: false, members: 1, ranking: [] });
    // The code works in any case, as typed on a phone.
    const joined = (await bia.req('POST', `/leagues/${league.code.toLowerCase()}/join`)).json();
    expect(joined.isMember).toBe(true);
    expect(
      joined.ranking.map((r: { nickname: string; isMe: boolean }) => [r.nickname, r.isMe]),
    ).toEqual([
      ['Ana', false],
      ['Bia', true],
    ]);
    // Joining twice changes nothing.
    expect((await bia.req('POST', `/leagues/${league.code}/join`)).json().members).toBe(2);
    expect((await bia.req('GET', '/leagues')).json().leagues).toEqual([
      { code: league.code, name: 'Pelada de quinta', members: 2 },
    ]);

    expect(
      (await bia.req('POST', `/leagues/${league.code}/report`, { reason: 'Nome ofensivo' }))
        .statusCode,
    ).toBe(204);
    expect(await prisma.leagueReport.count()).toBe(1);

    expect((await bia.req('POST', `/leagues/${league.code}/leave`)).statusCode).toBe(204);
    expect((await bia.req('GET', '/leagues')).json().leagues).toEqual([]);
    // The last one out closes the league.
    await ana.req('POST', `/leagues/${league.code}/leave`);
    expect((await ana.req('GET', `/leagues/${league.code}`)).statusCode).toBe(404);
  });

  it(`a league takes at most ${MAX_MEMBERS} players; names are 3 to 40 characters`, async () => {
    const owner = await player('Dono');
    expect((await owner.req('POST', '/leagues', { name: 'ab' })).statusCode).toBe(400);
    const { code } = (await owner.req('POST', '/leagues', { name: 'Liga cheia' })).json();
    for (let i = 1; i < MAX_MEMBERS; i++)
      expect(
        (await (await player(`Craque ${i}`)).req('POST', `/leagues/${code}/join`)).statusCode,
      ).toBe(200);
    const late = await (await player('Atrasado')).req('POST', `/leagues/${code}/join`);
    expect(late.json().error.code).toBe('LEAGUE_FULL');
    expect((await owner.req('GET', '/leagues/ZZZZZZ')).statusCode).toBe(404);
  });
});
