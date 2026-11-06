import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedReference } from '../../seed-reference';
import { ADMIN_TOKEN, testApp } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';
import { countryIds, verifiedClubs, verifiedPlayer } from '../../test/factory';
import { sessionHash } from '../session/session';

let clock = new Date('2026-11-05T15:00:00Z'); // Thursday, 12:00 in São Paulo
const prisma = testPrisma();
const { app } = testApp({ prisma, now: () => clock });
const admin = { 'x-admin-token': ADMIN_TOKEN, 'x-editor': 'tester' };

let clubs: Awaited<ReturnType<typeof verifiedClubs>>;
let countries: Record<string, string>;
let answerId = '';
let decoyId = '';
const ids: Record<string, string> = {};
let gridParams: { rows: object[]; cols: object[] };

const adminPost = (url: string, payload: object = {}) =>
  app.inject({ method: 'POST', url: `/v1/admin${url}`, headers: admin, payload });

/** Creates, validates and publishes a challenge: it becomes the next level of its track. */
async function publish(payload: object) {
  const created = await adminPost('/challenges', payload);
  expect(created.statusCode, created.body).toBe(201);
  const id = created.json().id as string;
  expect((await adminPost(`/challenges/${id}/validate`)).statusCode).toBe(200);
  const pub = await adminPost(`/challenges/${id}/publish`);
  expect(pub.statusCode, pub.body).toBe(200);
  return pub.json() as { id: string; publicNumber: number };
}

/** A device keeping its own cookie. */
function guest() {
  let cookie = '';
  return {
    async req(method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) {
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
    act(attemptId: string, input: object, key = randomUUID()) {
      return this.req('POST', `/attempts/${attemptId}/actions`, { idempotencyKey: key, input });
    },
  };
}

/** Plays Career Path level `level` to the end with `skips` skips and then the answer (or only skips). */
async function playCareer(
  g: ReturnType<typeof guest>,
  level: number,
  answer: string | null,
  skips: number,
) {
  const start = (await g.req('POST', '/attempts', { mode: 'CAREER_PATH', level })).json();
  let res;
  for (let i = 0; i < skips; i++) res = await g.act(start.attempt.id, { kind: 'skip' });
  if (answer) res = await g.act(start.attempt.id, { kind: 'guess', playerId: answer });
  return res!.json();
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

  // Grid pool: rows Flamengo, Santos, forwards; cols Milan, Real Madrid, Argentines. 8 per cell.
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
  gridParams = {
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

  await publish({ mode: 'CAREER_PATH', params: { playerId: answerId } }); // level 1
  await publish({ mode: 'CAREER_PATH', params: { playerId: decoyId } }); // level 2
  await publish({ mode: 'CAREER_PATH', params: { playerId: ids.ze! } }); // level 3
  await publish({ mode: 'FOOTBALL_GRID', params: gridParams }); // grid level 1
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
    expect((await g.req('GET', '/games')).headers['set-cookie']).toBeUndefined();
  });
});

describe('levels (ADR-007)', () => {
  it('publishing numbers levels per game; an answer cannot be reused in another level', async () => {
    const levels = await prisma.challenge.findMany({
      where: { gameMode: 'CAREER_PATH' },
      orderBy: { publicNumber: 'asc' },
    });
    expect(levels.map((l) => l.publicNumber)).toEqual([1, 2, 3]);
    const dup = await adminPost('/challenges', {
      mode: 'CAREER_PATH',
      params: { playerId: answerId },
    });
    expect(dup.json().error).toMatchObject({
      code: 'CHALLENGE_NOT_ELIGIBLE',
      details: { reasons: ['ALREADY_A_LEVEL'] },
    });
    const tooShort = await verifiedPlayer(prisma, {
      name: 'Um Clube',
      clubIds: [clubs.Santos!.id],
      nationalityId: countries.BR!,
    });
    const bad = await adminPost('/challenges', {
      mode: 'CAREER_PATH',
      params: { playerId: tooShort.id },
    });
    expect(bad.json().error.details.reasons).toEqual(['TRAJECTORY_TOO_SHORT']);
  });

  it('a new player sees level 1 open and the rest locked', async () => {
    const g = guest();
    expect(
      (await g.req('GET', '/tracks/CAREER_PATH'))
        .json()
        .levels.map((l: { state: string }) => l.state),
    ).toEqual(['open', 'locked', 'locked']);
    expect((await g.req('GET', '/games')).json().games[0]).toEqual({
      mode: 'CAREER_PATH',
      name: 'Career Path',
      levels: 3,
      completed: 0,
      stars: 0,
      nextLevel: 1,
    });
    const locked = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 2 });
    expect(locked.statusCode).toBe(403);
    expect(locked.json().error.code).toBe('LEVEL_LOCKED');
    expect(
      (await g.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 9 })).json().error.code,
    ).toBe('LEVEL_NOT_FOUND');
  });

  it('starting a level twice returns the same attempt (201 then 200), first club only', async () => {
    const g = guest();
    const first = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 1 });
    expect(first.statusCode).toBe(201);
    const second = await g.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 1 });
    expect(second.statusCode).toBe(200);
    expect(second.json().attempt.id).toBe(first.json().attempt.id);
    expect(first.json().view.revealed).toEqual([
      {
        clubName: 'Cruzeiro',
        countryCode: 'BR',
        fromYear: 2000,
        toYear: 2002,
        isLoan: false,
        appearances: null,
        goals: null,
        loanFromName: null,
      },
    ]);
    // career-path@2: the position is a clue from the first attempt
    expect(first.json().view.position).toBe('FW');
    expect(first.body).not.toContain(answerId);
  });

  it('plays wrong, skip, right: 2 stars, idempotent replay, answer hidden until the end, next level opens', async () => {
    const g = guest();
    const start = (await g.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 1 })).json();
    const k1 = randomUUID();
    const wrong = await g.act(start.attempt.id, { kind: 'guess', playerId: decoyId }, k1);
    expect(wrong.json()).toMatchObject({
      event: { type: 'wrong', revealed: 'club' },
      view: { attemptsUsed: 1 },
    });
    expect(wrong.json().view.history).toEqual([
      { kind: 'guess', playerId: decoyId, name: 'Romário', correct: false },
    ]);
    expect(wrong.body).not.toContain(answerId);
    expect(
      (await g.act(start.attempt.id, { kind: 'guess', playerId: decoyId }, k1)).json(),
    ).toEqual(wrong.json());
    expect(await prisma.attemptAction.count({ where: { attemptId: start.attempt.id } })).toBe(1);

    expect(
      (await g.act(start.attempt.id, { kind: 'guess', playerId: decoyId })).json().error.code,
    ).toBe('DUPLICATE_GUESS');
    expect(
      (await g.act(start.attempt.id, { kind: 'guess', playerId: 'no-such-player' })).json().error
        .code,
    ).toBe('UNKNOWN_PLAYER');
    expect((await g.act(start.attempt.id, { kind: 'finish' })).statusCode).toBe(400);

    const skip = await g.act(start.attempt.id, { kind: 'skip' });
    expect(skip.json().view.revealed).toHaveLength(3);
    expect(skip.body).not.toContain(answerId);

    const right = await g.act(start.attempt.id, { kind: 'guess', playerId: answerId });
    expect(right.json()).toMatchObject({
      attempt: { status: 'WON', score: 40, stars: 2, level: 1 },
      event: { type: 'correct' },
      reveal: { answer: { id: answerId, name: 'Ronaldo' } },
    });
    expect(right.json().share.text).toBe(
      'De Cabeça · Career Path · Fase 1 · 3/6\n⬛⬛🟩 ★★☆\ndecabeca.app',
    );
    expect((await g.act(start.attempt.id, { kind: 'skip' })).json().error.code).toBe(
      'GAME_ALREADY_COMPLETED',
    );

    expect(
      (await g.req('GET', '/tracks/CAREER_PATH'))
        .json()
        .levels.map((l: { state: string; stars: number }) => [l.state, l.stars]),
    ).toEqual([
      ['done', 2],
      ['open', 0],
      ['locked', 0],
    ]);
    const history = (await g.req('GET', '/me/history')).json();
    expect(history.items).toEqual([
      {
        attemptId: start.attempt.id,
        mode: 'CAREER_PATH',
        level: 1,
        status: 'WON',
        score: 40,
        stars: 2,
        completedAt: expect.any(String),
      },
    ]);
    const stats = (await g.req('GET', '/me/stats')).json();
    expect(stats).toMatchObject({
      totalStars: 2,
      title: { name: 'Reserva', next: { name: 'Titular', missing: 13 } },
      CAREER_PATH: { completed: 1, won: 1, stars: 2, threeStars: 0, distribution: { '3': 1 } },
    });
  });

  it('a lost level gives 0 stars and still opens the next one', async () => {
    const g = guest();
    const lost = await playCareer(g, 1, null, 6);
    expect(lost.attempt).toMatchObject({ status: 'LOST', stars: 0 });
    expect(lost.share.text).toBe(
      'De Cabeça · Career Path · Fase 1 · X/6\n⬛⬛⬛⬛⬛⬛ ☆☆☆\ndecabeca.app',
    );
    expect((await g.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 2 })).statusCode).toBe(
      201,
    );
  });

  it('another player cannot read or play the attempt (404)', async () => {
    const a = guest();
    const b = guest();
    const id = (await a.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 1 })).json().attempt
      .id;
    await b.req('GET', '/games');
    expect((await b.req('GET', `/attempts/${id}`)).json().error.code).toBe('ATTEMPT_NOT_FOUND');
    expect((await b.act(id, { kind: 'skip' })).statusCode).toBe(404);
  });
});

describe('player search', () => {
  const search = (q: string) => guest().req('GET', `/players/search?q=${encodeURIComponent(q)}`);
  it('matches accents and any token prefix; imported players too, never rejected ones', async () => {
    expect((await search('romar')).json().players.map((p: { name: string }) => p.name)).toEqual([
      'Romário',
    ]);
    expect((await search('feno')).json().players.map((p: { name: string }) => p.name)).toEqual([
      'Ronaldo',
    ]);
    expect((await search('rog')).json().players.map((p: { name: string }) => p.name)).toEqual([
      'Rogério Importado',
    ]);
    await prisma.player.updateMany({
      where: { canonicalName: 'Rogério Importado' },
      data: { verificationStatus: 'rejected' },
    });
    expect((await search('rog')).json().players).toEqual([]);
    await prisma.player.updateMany({
      where: { canonicalName: 'Rogério Importado' },
      data: { verificationStatus: 'imported' },
    });
  });
  it('orders by notability and disambiguates homonyms', async () => {
    expect((await search('ze rob')).json().players).toEqual([
      { id: ids.ze, name: 'Zé Roberto', disambiguation: '1974 · Palmeiras' },
      { id: ids.ze2, name: 'Zé Roberto', disambiguation: '1980 · Vasco' },
    ]);
  });
  it('finds a player by the name fans use when the canonical one is the full name (Dida)', async () => {
    const romario = await prisma.player.findFirstOrThrow({ where: { canonicalName: 'Romário' } });
    await prisma.playerAlias.create({
      data: { playerId: romario.id, alias: 'Baixinho', normalized: 'baixinho', kind: 'variant' },
    });
    expect((await search('baixinho')).json().players).toEqual([
      { id: romario.id, name: 'Baixinho', disambiguation: 'Romário' },
    ]);
    await prisma.playerAlias.deleteMany({ where: { normalized: 'baixinho' } });
  });
  it('validates q length and limit', async () => {
    expect((await search('r')).statusCode).toBe(400);
    expect((await guest().req('GET', '/players/search?q=ro&limit=1')).json().players).toHaveLength(
      1,
    );
  });
});

describe('Football Grid', () => {
  it('eligibility reports per-cell counts and blocks forbidden combinations', async () => {
    const ok = (await adminPost('/eligibility/grid', gridParams)).json();
    expect(ok.eligible).toBe(true);
    const bad = (
      await adminPost('/eligibility/grid', {
        ...gridParams,
        cols: [gridParams.cols[0], gridParams.cols[1], { type: 'position', positionGroup: 'MF' }],
      })
    ).json();
    expect(bad.reasons).toContain('POSITION_X_POSITION');
  });

  it('plays a grid: right, wrong, finish; pools never leave the server', async () => {
    const g = guest();
    const start = await g.req('POST', '/attempts', { mode: 'FOOTBALL_GRID', level: 1 });
    expect(start.statusCode).toBe(201);
    const body = start.json();
    expect(start.body).not.toContain('eligiblePlayerIds');
    const challenge = await prisma.challenge.findUniqueOrThrow({
      where: { id: body.attempt.challengeId },
    });
    const snapshot = challenge.snapshot as { cells: { eligiblePlayerIds: string[] }[] };
    for (const id of snapshot.cells[0]!.eligiblePlayerIds) expect(start.body).not.toContain(id);

    const right = await g.act(body.attempt.id, {
      kind: 'guess',
      cellIndex: 0,
      playerId: snapshot.cells[0]!.eligiblePlayerIds[0],
    });
    expect(right.json().event).toEqual({ type: 'correct', cellIndex: 0 });
    expect(
      (
        await g.act(body.attempt.id, {
          kind: 'guess',
          cellIndex: 1,
          playerId: snapshot.cells[0]!.eligiblePlayerIds[0],
        })
      ).json().error.code,
    ).toBe('PLAYER_ALREADY_USED');
    expect(
      (await g.act(body.attempt.id, { kind: 'guess', cellIndex: 4, playerId: ids.ze })).json()
        .event,
    ).toEqual({ type: 'wrong', cellIndex: 4 });
    expect(
      (await g.act(body.attempt.id, { kind: 'guess', cellIndex: 0, playerId: ids.ze2 })).json()
        .error.code,
    ).toBe('CELL_ALREADY_FILLED');
    const end = await g.act(body.attempt.id, { kind: 'finish' });
    expect(end.json()).toMatchObject({
      attempt: { status: 'COMPLETED', score: 1, stars: 0, level: 1 },
      event: { type: 'completed' },
    });
    expect(end.json().reveal.cells[4].validAnswers).toBeGreaterThanOrEqual(8);
    expect(end.json().share.text).toBe(
      'De Cabeça · Grid · Fase 1 · 1/9\n🟩⬛⬛\n⬛⬛⬛\n⬛⬛⬛ ☆☆☆\ndecabeca.app',
    );
  });

  it('accepts any player in the base who meets both criteria, even one imported after publishing', async () => {
    // Imported (Wikidata only) player at Flamengo and Milan, unknown when the level was published.
    const late = await prisma.player.create({
      data: {
        canonicalName: 'Tardio da Silva',
        nationalityCountryId: countries.BR!,
        primaryPositionGroup: 'MF',
        aliases: {
          create: [
            {
              alias: 'Tardio da Silva',
              normalized: 'tardio da silva',
              kind: 'canonical',
              isPrimary: true,
            },
          ],
        },
        spells: {
          create: ['Flamengo', 'Milan'].map((n, i) => ({
            clubId: clubs[n]!.id,
            spellType: 'professional' as const,
            startDate: new Date(Date.UTC(2010 + i, 0, 1)),
          })),
        },
      },
    });
    const g = guest();
    const start = (await g.req('POST', '/attempts', { mode: 'FOOTBALL_GRID', level: 1 })).json();
    // Cell 0 = Flamengo x Milan; cell 1 = Flamengo x Real Madrid.
    expect(
      (await g.act(start.attempt.id, { kind: 'guess', cellIndex: 1, playerId: late.id })).json()
        .event,
    ).toEqual({ type: 'wrong', cellIndex: 1 });
    expect(
      (await g.act(start.attempt.id, { kind: 'guess', cellIndex: 0, playerId: late.id })).json()
        .event,
    ).toEqual({ type: 'correct', cellIndex: 0 });
    // Out of the base again for the tests that follow.
    await prisma.player.update({
      where: { id: late.id },
      data: { verificationStatus: 'rejected' },
    });
  });

  it('hints: pattern and pool size, 3 per grid, a perfect grid with a hint is worth 2 stars', async () => {
    const g = guest();
    const start = (await g.req('POST', '/attempts', { mode: 'FOOTBALL_GRID', level: 1 })).json();
    const snapshot = (
      await prisma.challenge.findUniqueOrThrow({ where: { id: start.attempt.challengeId } })
    ).snapshot as {
      cells: { eligiblePlayerIds: string[]; hint: { initial: string; pattern: number[] } }[];
    };
    expect(start.view.hintsLeft).toBe(3);
    const hint = await g.act(start.attempt.id, { kind: 'hint', cellIndex: 4 });
    expect(hint.json().event).toEqual({ type: 'hint', cellIndex: 4 });
    expect(hint.json().view).toMatchObject({
      attemptsUsed: 0,
      hintsLeft: 2,
      hints: [
        {
          cellIndex: 4,
          initial: 'G',
          pattern: [4, expect.any(Number)],
          validAnswers: snapshot.cells[4]!.eligiblePlayerIds.length,
        },
      ],
    });
    expect((await g.act(start.attempt.id, { kind: 'hint', cellIndex: 4 })).json().error.code).toBe(
      'HINT_ALREADY_USED',
    );
    await g.act(start.attempt.id, { kind: 'hint', cellIndex: 5 });
    await g.act(start.attempt.id, { kind: 'hint', cellIndex: 6 });
    expect((await g.act(start.attempt.id, { kind: 'hint', cellIndex: 7 })).json().error.code).toBe(
      'NO_HINTS_LEFT',
    );
    let last;
    for (let i = 0; i < 9; i++)
      last = await g.act(start.attempt.id, {
        kind: 'guess',
        cellIndex: i,
        playerId: snapshot.cells[i]!.eligiblePlayerIds[0],
      });
    expect(last!.json().attempt).toMatchObject({ status: 'COMPLETED', score: 9, stars: 2 });
    expect(last!.json().share.text).toContain('9/9 · 3 dicas');
  });

  it('a grid level needs 8 answers per cell', async () => {
    const thin = {
      rows: gridParams.rows,
      cols: [gridParams.cols[0], gridParams.cols[1], { type: 'club', clubId: clubs.Ajax!.id }],
    };
    const res = await adminPost('/challenges', { mode: 'FOOTBALL_GRID', params: thin });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.details.reasons).toEqual(expect.arrayContaining(['CELL_2_TOO_SMALL']));
  });
});

describe('ranking, nickname and accounts', () => {
  const ace = guest();
  const mid = guest();

  beforeAll(async () => {
    await playCareer(ace, 1, answerId, 0); // 3 stars, 60 points
    await playCareer(ace, 2, decoyId, 0); // 3 stars, 60 points
    await playCareer(mid, 1, answerId, 3); // 4th attempt: 2 stars, 30 points
  });

  it('only players with a nickname are listed; nicknames are unique', async () => {
    expect((await ace.req('GET', '/ranking')).json().me).toEqual({
      position: null,
      stars: 6,
      nickname: null,
    });
    expect((await ace.req('PATCH', '/me', { nickname: 'Fenômeno' })).json()).toMatchObject({
      nickname: 'Fenômeno',
      totalStars: 6,
      account: null,
    });
    expect((await mid.req('PATCH', '/me', { nickname: 'fenomeno' })).json().error.code).toBe(
      'NICKNAME_TAKEN',
    );
    expect((await mid.req('PATCH', '/me', { nickname: 'x' })).statusCode).toBe(400);
    await mid.req('PATCH', '/me', { nickname: 'Meio Campo' });
    const all = (await mid.req('GET', '/ranking')).json();
    expect(all.entries.slice(0, 2)).toEqual([
      { position: 1, nickname: 'Fenômeno', stars: 6, score: 120, title: 'Reserva', isMe: false },
      { position: 2, nickname: 'Meio Campo', stars: 2, score: 30, title: 'Reserva', isMe: true },
    ]);
    expect(all.me.position).toBe(2);
    expect((await mid.req('GET', '/me/stats')).json().rank).toEqual({ all: 2, week: 2 });
  });

  it('the weekly ranking only counts levels finished since Monday', async () => {
    clock = new Date('2026-11-10T15:00:00Z'); // next Tuesday
    expect((await ace.req('GET', '/ranking?scope=week')).json().entries).toEqual([]);
    await playCareer(mid, 2, decoyId, 0);
    expect((await ace.req('GET', '/ranking?scope=week')).json().entries).toEqual([
      expect.objectContaining({ position: 1, nickname: 'Meio Campo', stars: 3 }),
    ]);
    clock = new Date('2026-11-05T15:00:00Z');
  });

  it('level ranking lists the best results of one level', async () => {
    const top = (await mid.req('GET', '/ranking/levels/CAREER_PATH/1')).json().entries;
    expect(
      top.map((e: { nickname: string; score: number; isMe: boolean }) => [
        e.nickname,
        e.score,
        e.isMe,
      ]),
    ).toEqual([
      ['Fenômeno', 60, false],
      ['Meio Campo', 30, true],
    ]);
  });

  it('register keeps guest progress; login on another device sees it; wrong password is 401', async () => {
    const reg = await ace.req('POST', '/auth/register', {
      email: 'Ace@Example.com',
      password: 'segredo-123',
      nickname: 'Fenômeno',
    });
    expect(reg.statusCode, reg.body).toBe(201);
    expect(reg.json()).toMatchObject({
      nickname: 'Fenômeno',
      account: { email: 'ace@example.com' },
      totalStars: 6,
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ace@example.com' } });
    expect(user.passwordHash).toMatch(/^scrypt\$16384\$/);

    const phone = guest();
    expect(
      (await phone.req('POST', '/auth/login', { email: 'ace@example.com', password: 'errada-999' }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await phone.req('POST', '/auth/login', { email: 'nobody@example.com', password: 'x' })
      ).json().error.code,
    ).toBe('INVALID_CREDENTIALS');
    const login = await phone.req('POST', '/auth/login', {
      email: 'ACE@example.com',
      password: 'segredo-123',
    });
    expect(login.json()).toMatchObject({ nickname: 'Fenômeno', totalStars: 6 });
    expect(
      (await phone.req('GET', '/tracks/CAREER_PATH'))
        .json()
        .levels.map((l: { state: string }) => l.state),
    ).toEqual(['done', 'done', 'open']);
    // the same level from another device is the same attempt (no replay)
    expect(
      (await phone.req('POST', '/attempts', { mode: 'CAREER_PATH', level: 1 })).statusCode,
    ).toBe(200);
    expect(
      (
        await phone.req('POST', '/auth/register', {
          email: 'ace@example.com',
          password: 'segredo-123',
          nickname: 'Outro',
        })
      ).json().error.code,
    ).toBe('EMAIL_TAKEN');

    const out = await phone.req('POST', '/auth/logout');
    expect(out.json()).toMatchObject({ nickname: null, account: null, totalStars: 0 });
  });
});

describe('editorial reports and analytics', () => {
  it('records searches without results and wrong grid guesses', async () => {
    await guest().req('GET', '/players/search?q=Zezinho%20Inexistente');
    await guest().req('GET', '/players/search?q=zezinho inexistente');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/reports/rejections',
      headers: admin,
    });
    expect(res.json().searchMisses).toContainEqual({
      text: 'zezinho inexistente',
      count: 2,
      lastAt: expect.any(String),
    });
    expect(res.json().gridWrongGuesses).toContainEqual(
      expect.objectContaining({ cellIndex: 4, playerId: ids.ze, n: 1 }),
    );
  });

  it('a finished game produces game_started -> answer_submitted -> game_completed', async () => {
    const g = guest();
    const done = await playCareer(g, 1, answerId, 0);
    const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: done.attempt.id } });
    const names = (
      await prisma.event.findMany({
        where: { sessionHash: sessionHash(attempt.sessionId) },
        orderBy: { createdAt: 'asc' },
      })
    ).map((e) => e.name);
    expect(names).toEqual(['game_started', 'answer_submitted', 'game_completed']);
    const completed = await prisma.event.findFirstOrThrow({
      where: { name: 'game_completed', sessionHash: sessionHash(attempt.sessionId) },
    });
    expect(completed.props).toMatchObject({
      mode: 'CAREER_PATH',
      level: 1,
      status: 'WON',
      score: 60,
      stars: 3,
    });
  });

  it('accepts client events, drops unknown props and rejects unknown names', async () => {
    const g = guest();
    const ok = await g.req('POST', '/events', {
      events: [
        {
          name: 'result_shared',
          ts: new Date().toISOString(),
          props: { mode: 'CAREER_PATH', level: 1, method: 'clipboard', email: 'x@y.z' },
        },
      ],
    });
    expect(ok.statusCode).toBe(202);
    expect(
      (await prisma.event.findFirstOrThrow({ where: { name: 'result_shared' } })).props,
    ).toEqual({ mode: 'CAREER_PATH', level: 1, method: 'clipboard' });
    expect(
      (
        await g.req('POST', '/events', {
          events: [{ name: 'hacked', ts: new Date().toISOString() }],
        })
      ).statusCode,
    ).toBe(400);
  });
});

describe('retire', () => {
  it('retiring a level keeps its attempts; the replacement is a draft for a new level', async () => {
    const level1 = await prisma.challenge.findFirstOrThrow({
      where: { gameMode: 'CAREER_PATH', publicNumber: 1 },
    });
    const before = await prisma.attempt.count({ where: { challengeId: level1.id } });
    const res = await adminPost(`/challenges/${level1.id}/retire`, {
      reason: 'Correção de trajetória',
      replacementParams: { playerId: ids.ze2 },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().replacement).toMatchObject({ status: 'draft', supersedesId: level1.id });
    expect(await prisma.attempt.count({ where: { challengeId: level1.id } })).toBe(before);
    expect((await adminPost(`/challenges/${level1.id}/publish`)).json().error.code).toBe(
      'INVALID_TRANSITION',
    );
  });
});

describe('rate limits', () => {
  it('limits searches per session and new sessions per IP with 429 RATE_LIMITED', async () => {
    const limited = testApp({
      prisma,
      limits: { sessionsPerIp: 2, perSession: 1000, search: 3, actions: 1000 },
    }).app;
    const first = await limited.inject({
      method: 'GET',
      url: '/v1/players/search?q=ro',
      remoteAddress: '10.0.0.1',
    });
    const cookie = String(first.headers['set-cookie']).split(';')[0]!;
    const codes = [];
    for (let i = 0; i < 3; i++)
      codes.push(
        (
          await limited.inject({
            method: 'GET',
            url: '/v1/players/search?q=ro',
            headers: { cookie },
            remoteAddress: '10.0.0.1',
          })
        ).statusCode,
      );
    expect(codes).toEqual([200, 200, 429]);
    await limited.inject({ method: 'GET', url: '/v1/games', remoteAddress: '10.0.0.2' });
    await limited.inject({ method: 'GET', url: '/v1/games', remoteAddress: '10.0.0.2' });
    const third = await limited.inject({
      method: 'GET',
      url: '/v1/games',
      remoteAddress: '10.0.0.2',
    });
    expect(third.json().error.code).toBe('RATE_LIMITED');
    await limited.close();
  });
});
