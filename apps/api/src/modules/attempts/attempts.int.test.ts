import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedReference } from '../../seed-reference';
import { ADMIN_TOKEN, testApp } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';
import { countryIds, verifiedClubs, verifiedPlayer } from '../../test/factory';

let clock = new Date('2026-11-05T15:00:00Z'); // 12:00 in São Paulo
const prisma = testPrisma();
const { app } = testApp({ prisma, now: () => clock, random: () => 0 });
const admin = { 'x-admin-token': ADMIN_TOKEN, 'x-editor': 'tester' };

let clubs: Awaited<ReturnType<typeof verifiedClubs>>;
let countries: Record<string, string>;
let answerId = '';
let decoyId = '';
const ids: Record<string, string> = {};

async function adminPost(url: string, payload: object = {}) {
  return app.inject({ method: 'POST', url: `/v1/admin${url}`, headers: admin, payload });
}

/** Creates, validates and publishes a challenge; returns its id. */
async function publish(payload: object) {
  const created = await adminPost('/challenges', payload);
  expect(created.statusCode, created.body).toBe(201);
  const id = created.json().id as string;
  expect((await adminPost(`/challenges/${id}/validate`)).statusCode).toBe(200);
  const pub = await adminPost(`/challenges/${id}/publish`);
  expect(pub.statusCode, pub.body).toBe(200);
  return pub.json() as { id: string; publicNumber: number | null };
}

/** A guest client keeping its own cookie. */
function guest() {
  let cookie = '';
  return {
    async req(method: 'GET' | 'POST', url: string, payload?: object) {
      const res = await app.inject({
        method,
        url: `/v1${url}`,
        headers: cookie ? { cookie } : {},
        ...(payload ? { payload } : {}),
      });
      const set = res.headers['set-cookie'];
      if (set) cookie = String(set).split(';')[0]!;
      return res;
    },
    get cookie() {
      return cookie;
    },
  };
}

beforeAll(async () => {
  await resetDb(prisma);
  await seedReference(prisma);
  clubs = await verifiedClubs(prisma);
  countries = await countryIds(prisma);
  const c = (n: string) => clubs[n]!.id;
  answerId = (
    await verifiedPlayer(prisma, {
      name: 'Ronaldo',
      clubIds: [c('Cruzeiro'), c('PSV'), c('Barcelona'), c('Inter de Milão'), c('Real Madrid')],
      nationalityId: countries.BR!,
      position: 'FW',
      tier: 'T1',
      aliases: ['Ronaldo Fenômeno', 'R9'],
    })
  ).id;
  decoyId = (
    await verifiedPlayer(prisma, {
      name: 'Romário',
      clubIds: [c('Vasco'), c('PSV'), c('Barcelona')],
      nationalityId: countries.BR!,
      position: 'FW',
      tier: 'T1',
    })
  ).id;
  ids.ze = (
    await verifiedPlayer(prisma, {
      name: 'Zé Roberto',
      clubIds: [c('Palmeiras'), c('Santos'), c('Grêmio')],
      nationalityId: countries.BR!,
      birthYear: 1974,
    })
  ).id;
  ids.ze2 = (
    await verifiedPlayer(prisma, {
      name: 'Zé Roberto',
      clubIds: [c('Vasco'), c('Flamengo'), c('Botafogo')],
      nationalityId: countries.BR!,
      birthYear: 1980,
      tier: 'T3',
    })
  ).id;
  await prisma.player.create({
    data: {
      canonicalName: 'Rogério Importado',
      nationalityCountryId: countries.BR!,
      aliases: {
        create: [
          { alias: 'Rogério Importado', normalized: 'rogerio importado', kind: 'canonical' },
        ],
      },
    },
  });
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('guest session', () => {
  it('creates an HttpOnly cookie on the first request and reuses the session after', async () => {
    const g = guest();
    const first = await g.req('GET', '/games');
    expect(String(first.headers['set-cookie'])).toMatch(
      /^dc_session=[\w-]{43}; Path=\/; Max-Age=\d+; HttpOnly; SameSite=Lax/,
    );
    const second = await g.req('GET', '/games');
    expect(second.headers['set-cookie']).toBeUndefined();
    expect(await prisma.guestSession.count()).toBeGreaterThanOrEqual(1);
  });
});

describe('daily Career Path', () => {
  let dailyNumber = 0;

  it('without a published daily: games shows null and starting returns 404', async () => {
    const g = guest();
    expect((await g.req('GET', '/games')).json().games[0]).toEqual({
      mode: 'CAREER_PATH',
      name: 'Career Path',
      daily: null,
    });
    const res = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', kind: 'daily' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NO_DAILY_CHALLENGE');
  });

  it('rejects an ineligible player with the reasons', async () => {
    const res = await adminPost('/challenges', {
      mode: 'CAREER_PATH',
      kind: 'daily',
      scheduledFor: '2026-11-04',
      params: { playerId: ids.ze },
    });
    expect(res.statusCode).toBe(201); // 3 clubs: eligible
    const tooShort = await verifiedPlayer(prisma, {
      name: 'Um Clube',
      clubIds: [clubs.Santos!.id],
      nationalityId: countries.BR!,
    });
    const bad = await adminPost('/challenges', {
      mode: 'CAREER_PATH',
      kind: 'practice',
      params: { playerId: tooShort.id },
    });
    expect(bad.statusCode).toBe(422);
    expect(bad.json().error).toMatchObject({
      code: 'CHALLENGE_NOT_ELIGIBLE',
      details: { reasons: ['TRAJECTORY_TOO_SHORT'] },
    });
  });

  it('publish assigns sequential public numbers and a date can hold one live daily', async () => {
    const a = await publish({
      mode: 'CAREER_PATH',
      kind: 'daily',
      scheduledFor: '2026-11-05',
      params: { playerId: answerId },
    });
    const b = await publish({
      mode: 'CAREER_PATH',
      kind: 'daily',
      scheduledFor: '2026-11-06',
      params: { playerId: decoyId },
    });
    expect(b.publicNumber).toBe(a.publicNumber! + 1);
    dailyNumber = a.publicNumber!;
    const clash = await adminPost('/challenges', {
      mode: 'CAREER_PATH',
      kind: 'daily',
      scheduledFor: '2026-11-05',
      params: { playerId: ids.ze2 },
    });
    expect(clash.statusCode).toBe(409);
    expect(clash.json().error.code).toBe('DATE_TAKEN');
  });

  it('the same player cannot be a daily answer twice within 180 days', async () => {
    const res = await adminPost('/challenges', {
      mode: 'CAREER_PATH',
      kind: 'daily',
      scheduledFor: '2027-01-10',
      params: { playerId: answerId },
    });
    expect(res.json().error.details.reasons).toEqual(['USED_IN_LAST_180_DAYS']);
  });

  it('starting the daily twice returns the same attempt (201 then 200), first club only', async () => {
    const g = guest();
    const first = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', kind: 'daily' });
    expect(first.statusCode).toBe(201);
    const second = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', kind: 'daily' });
    expect(second.statusCode).toBe(200);
    expect(second.json().attempt.id).toBe(first.json().attempt.id);
    expect(first.json().view.revealed).toEqual([
      { clubName: 'Cruzeiro', countryCode: 'BR', fromYear: 2000, toYear: 2002, isLoan: false },
    ]);
    expect(first.body).not.toContain(answerId);
  });

  it('plays wrong, skip, right; idempotent replay; answer hidden until the end', async () => {
    const g = guest();
    const start = (await g.req('POST', '/attempts', { mode: 'CAREER_PATH', kind: 'daily' })).json();
    const act = (key: string, input: object) =>
      g.req('POST', `/attempts/${start.attempt.id}/actions`, { idempotencyKey: key, input });

    const k1 = randomUUID();
    const wrong = await act(k1, { kind: 'guess', playerId: decoyId });
    expect(wrong.json()).toMatchObject({
      event: { type: 'wrong', revealed: 'club' },
      view: { attemptsUsed: 1 },
    });
    expect(wrong.json().view.history).toEqual([
      { kind: 'guess', playerId: decoyId, name: 'Romário', correct: false },
    ]);
    expect(wrong.body).not.toContain(answerId);

    const replay = await act(k1, { kind: 'guess', playerId: decoyId });
    expect(replay.json()).toEqual(wrong.json());
    expect(await prisma.attemptAction.count({ where: { attemptId: start.attempt.id } })).toBe(1);

    expect((await act(randomUUID(), { kind: 'guess', playerId: decoyId })).json().error.code).toBe(
      'DUPLICATE_GUESS',
    );
    expect(
      (await act(randomUUID(), { kind: 'guess', playerId: 'no-such-player' })).json().error.code,
    ).toBe('UNKNOWN_PLAYER');
    expect((await act(randomUUID(), { kind: 'finish' })).statusCode).toBe(400);

    const skip = await act(randomUUID(), { kind: 'skip' });
    expect(skip.json().view.revealed).toHaveLength(3);
    expect(skip.body).not.toContain(answerId);

    const right = await act(randomUUID(), { kind: 'guess', playerId: answerId });
    expect(right.json()).toMatchObject({
      attempt: { status: 'WON', score: 40 },
      event: { type: 'correct' },
      reveal: { answer: { id: answerId, name: 'Ronaldo' } },
    });
    expect(right.json().reveal.trajectory).toHaveLength(5);
    expect(right.json().share.text).toBe(
      `De Cabeça · Career Path #${dailyNumber} · 3/6\n⬛⬛🟩\ndecabeca.app/c/${dailyNumber}`,
    );

    const after = await act(randomUUID(), { kind: 'skip' });
    expect(after.statusCode).toBe(409);
    expect(after.json().error.code).toBe('GAME_ALREADY_COMPLETED');

    const games = (await g.req('GET', '/games')).json();
    expect(games.games[0].daily.attempt).toEqual({
      id: start.attempt.id,
      status: 'WON',
      score: 40,
    });

    const history = (await g.req('GET', '/me/history')).json();
    expect(history).toEqual({
      items: [
        {
          attemptId: start.attempt.id,
          mode: 'CAREER_PATH',
          kind: 'daily',
          publicNumber: dailyNumber,
          status: 'WON',
          score: 40,
          completedAt: expect.any(String),
        },
      ],
      nextCursor: null,
    });
    const stats = (await g.req('GET', '/me/stats')).json();
    expect(stats.CAREER_PATH).toEqual({
      played: 1,
      won: 1,
      distribution: { '1': 0, '2': 0, '3': 1, '4': 0, '5': 0, '6': 0 },
      currentStreak: 1,
      maxStreak: 1,
      practicePlayed: 0,
    });
  });

  it('another session cannot read or play the attempt (404)', async () => {
    const a = guest();
    const b = guest();
    const id = (await a.req('POST', '/attempts', { mode: 'CAREER_PATH', kind: 'daily' })).json()
      .attempt.id;
    await b.req('GET', '/games');
    expect((await b.req('GET', `/attempts/${id}`)).json().error.code).toBe('ATTEMPT_NOT_FOUND');
    const act = await b.req('POST', `/attempts/${id}/actions`, {
      idempotencyKey: randomUUID(),
      input: { kind: 'skip' },
    });
    expect(act.statusCode).toBe(404);
    expect((await a.req('GET', `/attempts/${id}`)).statusCode).toBe(200);
  });

  it('the daily follows the São Paulo civil date (23:59 vs 00:01)', async () => {
    const g = guest();
    clock = new Date('2026-11-06T02:59:00Z'); // 23:59 on the 5th in São Paulo
    const before = (await g.req('GET', '/games')).json();
    clock = new Date('2026-11-06T03:01:00Z'); // 00:01 on the 6th
    const after = (await g.req('GET', '/games')).json();
    expect(before.today).toBe('2026-11-05');
    expect(after.today).toBe('2026-11-06');
    expect(after.games[0].daily.challengeId).not.toBe(before.games[0].daily.challengeId);
    clock = new Date('2026-11-05T15:00:00Z');
  });
});

describe('player search', () => {
  const search = (q: string) => guest().req('GET', `/players/search?q=${encodeURIComponent(q)}`);

  it('matches accents and any token prefix, verified players only', async () => {
    expect((await search('romar')).json().players.map((p: { name: string }) => p.name)).toEqual([
      'Romário',
    ]);
    expect((await search('feno')).json().players.map((p: { name: string }) => p.name)).toEqual([
      'Ronaldo',
    ]);
    expect((await search('rog')).json().players).toEqual([]);
  });

  it('orders by notability and disambiguates homonyms', async () => {
    const players = (await search('ze rob')).json().players;
    expect(players).toEqual([
      { id: ids.ze, name: 'Zé Roberto', disambiguation: '1974 · Palmeiras' },
      { id: ids.ze2, name: 'Zé Roberto', disambiguation: '1980 · Vasco' },
    ]);
  });

  it('validates q length and limit', async () => {
    expect((await search('r')).statusCode).toBe(400);
    expect((await guest().req('GET', '/players/search?q=ro&limit=1')).json().players).toHaveLength(
      1,
    );
  });
});

describe('practice', () => {
  it('resumes the in-progress practice and allows replaying after finishing', async () => {
    await publish({ mode: 'CAREER_PATH', kind: 'practice', params: { playerId: decoyId } });
    const g = guest();
    const first = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', kind: 'practice' });
    expect(first.statusCode).toBe(201);
    const resumed = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', kind: 'practice' });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json().attempt.id).toBe(first.json().attempt.id);

    let res = first;
    for (let i = 0; i < 6; i++)
      res = await g.req('POST', `/attempts/${first.json().attempt.id}/actions`, {
        idempotencyKey: randomUUID(),
        input: { kind: 'skip' },
      });
    expect(res.json().attempt.status).toBe('LOST');
    expect(res.json().share.text).toBe(
      'De Cabeça · Career Path (treino) · X/6\n⬛⬛⬛⬛⬛⬛\ndecabeca.app',
    );

    const replay = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', kind: 'practice' });
    expect(replay.statusCode).toBe(201);
    expect(replay.json().attempt.challengeId).toBe(first.json().attempt.challengeId);
    expect(replay.json().attempt.id).not.toBe(first.json().attempt.id);
  });

  it('a mode without practice challenges returns PRACTICE_POOL_EXHAUSTED', async () => {
    const res = await guest().req('POST', '/attempts', { mode: 'FOOTBALL_GRID', kind: 'practice' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('PRACTICE_POOL_EXHAUSTED');
  });
});

describe('Football Grid', () => {
  let grid: { rows: object[]; cols: object[] };

  beforeAll(async () => {
    // rows: Flamengo, Santos, forwards; cols: Milan, Real Madrid, Argentines. 8 players per cell.
    const c = (n: string) => clubs[n]!.id;
    const rows = [{ club: 'Flamengo' }, { club: 'Santos' }, { position: 'FW' as const }];
    const cols = [{ club: 'Milan' }, { club: 'Real Madrid' }, { nationality: 'AR' }];
    let n = 0;
    for (const r of rows)
      for (const col of cols)
        for (let i = 0; i < 8; i++)
          await verifiedPlayer(prisma, {
            name: `Grid ${n++}`,
            clubIds: [r.club, col.club].filter(Boolean).map((x) => c(x!)),
            nationalityId: col.nationality ? countries.AR! : countries.BR!,
            position: r.position ?? 'DF',
            tier: i === 0 ? 'T1' : 'T3',
          });
    grid = {
      rows: [
        { type: 'club', clubId: c('Flamengo') },
        { type: 'club', clubId: c('Santos') },
        { type: 'position', positionGroup: 'FW' },
      ],
      cols: [
        { type: 'club', clubId: c('Milan') },
        { type: 'club', clubId: c('Real Madrid') },
        { type: 'nationality', countryId: countries.AR },
      ],
    };
  });

  it('eligibility reports per-cell counts and blocks forbidden combinations', async () => {
    const ok = (await adminPost('/eligibility/grid', grid)).json();
    expect(ok.eligible).toBe(true);
    expect(ok.counts.every((n: number) => n >= 8)).toBe(true);
    const bad = (
      await adminPost('/eligibility/grid', {
        ...grid,
        cols: [grid.cols[0], grid.cols[1], { type: 'position', positionGroup: 'MF' }],
      })
    ).json();
    expect(bad.reasons).toContain('POSITION_X_POSITION');
  });

  it('plays a grid: right, wrong, finish; pools never leave the server', async () => {
    const pub = await publish({
      mode: 'FOOTBALL_GRID',
      kind: 'daily',
      scheduledFor: '2026-11-05',
      params: grid,
    });
    const g = guest();
    const start = await g.req('POST', '/attempts', { mode: 'FOOTBALL_GRID', kind: 'daily' });
    expect(start.statusCode).toBe(201);
    const body = start.json();
    expect(body.view.rows.map((r: { label: string }) => r.label)).toEqual([
      'Flamengo',
      'Santos',
      'Atacante',
    ]);
    expect(start.body).not.toContain('eligiblePlayerIds');

    const snapshot = (await prisma.challenge.findUniqueOrThrow({ where: { id: pub.id } }))
      .snapshot as { cells: { eligiblePlayerIds: string[] }[] };
    for (const id of snapshot.cells[0]!.eligiblePlayerIds.slice(1))
      expect(start.body).not.toContain(id);

    const act = (input: object) =>
      g.req('POST', `/attempts/${body.attempt.id}/actions`, {
        idempotencyKey: randomUUID(),
        input,
      });
    const right = await act({
      kind: 'guess',
      cellIndex: 0,
      playerId: snapshot.cells[0]!.eligiblePlayerIds[0],
    });
    expect(right.json()).toMatchObject({
      event: { type: 'correct', cellIndex: 0 },
      view: { attemptsUsed: 1 },
    });
    expect(right.json().view.cells[0].player.name).toMatch(/^Grid /);
    const wrong = await act({
      kind: 'guess',
      cellIndex: 1,
      playerId: snapshot.cells[0]!.eligiblePlayerIds[0],
    });
    expect(wrong.json().error.code).toBe('PLAYER_ALREADY_USED');
    const miss = await act({ kind: 'guess', cellIndex: 4, playerId: ids.ze });
    expect(miss.json().event).toEqual({ type: 'wrong', cellIndex: 4 });
    expect((await act({ kind: 'guess', cellIndex: 0, playerId: ids.ze2 })).json().error.code).toBe(
      'CELL_ALREADY_FILLED',
    );
    const end = await act({ kind: 'finish' });
    expect(end.json()).toMatchObject({
      attempt: { status: 'COMPLETED', score: 1 },
      event: { type: 'completed' },
    });
    expect(end.json().reveal.cells).toHaveLength(9);
    expect(end.json().reveal.cells[4].validAnswers).toBeGreaterThanOrEqual(8);
    expect(end.json().share.text).toBe(
      `De Cabeça · Grid #${pub.publicNumber} · 1/9\n🟩⬛⬛\n⬛⬛⬛\n⬛⬛⬛\ndecabeca.app/g/${pub.publicNumber}`,
    );
  });

  it('a daily grid needs 8 answers per cell', async () => {
    const thin = {
      rows: grid.rows,
      cols: [grid.cols[0], grid.cols[1], { type: 'club', clubId: clubs.Ajax!.id }],
    };
    const res = await adminPost('/challenges', {
      mode: 'FOOTBALL_GRID',
      kind: 'daily',
      scheduledFor: '2026-12-01',
      params: thin,
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.details.reasons).toEqual(expect.arrayContaining(['CELL_2_TOO_SMALL']));
  });
});

describe('retire and replace', () => {
  it('retiring a daily keeps its attempts and frees the date for the replacement', async () => {
    const daily = await prisma.challenge.findFirstOrThrow({
      where: {
        gameMode: 'CAREER_PATH',
        kind: 'daily',
        scheduledFor: new Date('2026-11-05T00:00:00Z'),
        status: 'published',
      },
    });
    const attemptsBefore = await prisma.attempt.count({ where: { challengeId: daily.id } });
    const res = await adminPost(`/challenges/${daily.id}/retire`, {
      reason: 'Correção de trajetória',
      replacementParams: { playerId: ids.ze2 },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().retired.status).toBe('retired');
    expect(res.json().replacement).toMatchObject({
      status: 'draft',
      supersedesId: daily.id,
      scheduledFor: '2026-11-05T00:00:00.000Z',
    });
    expect(await prisma.attempt.count({ where: { challengeId: daily.id } })).toBe(attemptsBefore);
    expect((await adminPost(`/challenges/${daily.id}/publish`)).json().error.code).toBe(
      'INVALID_TRANSITION',
    );
  });
});
