import { describe, expect, it } from 'vitest';
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { generateDevPack } from '../generate/pack';
import type { Pack } from '../pack/schema';
import { CompetitionSchema } from './schema';
import { isoOf, weekday } from './calendar';
import { COPA_ID, copaDoBrasil, copaField } from './copa';
import { regionalCompetitions, regionalStart, supercopa, supercopaPair } from './regionais';
import {
  CENTRO_OESTE_BERTHS,
  CENTRO_OESTE_ID,
  NORDESTE_BERTHS,
  NORDESTE_ID,
  NORTE_BERTHS,
  NORTE_ID,
  SUL_SUDESTE_BERTHS,
  SUL_SUDESTE_ID,
  SUPERCOPA_ID,
  VERDE_ID,
} from './regionais-data';
import type { Results } from './outcomes';
import { checkSeason, runSeason, startSeason, type Outcome } from './season';

const scripted = (id: string): Outcome => {
  const r = fork(rngFrom(7), id);
  const g = () => Math.floor(next(r) * next(r) * 5);
  return {
    goals: [g(), g()],
    shootout: null,
    cards: [
      [1, 0],
      [0, 0],
    ],
  };
};

const UFS = [
  ...Object.keys(NORDESTE_BERTHS),
  ...Object.keys(NORTE_BERTHS),
  ...Object.keys(CENTRO_OESTE_BERTHS),
];
/** A pack of `n` clubs in every state of the cups; reputation falls with the index. */
const packOf = (n: number) =>
  ({
    season: 2027,
    competitions: [],
    cities: UFS.map((uf) => ({ id: `city-${uf}`, state: uf })),
    clubs: UFS.flatMap((uf) =>
      Array.from({ length: n }, (_, i) => ({
        id: `${uf}-${i}`,
        cityId: `city-${uf}`,
        reputation: 100 - i,
      })),
    ),
  }) as unknown as Pack;

const table = (...ids: string[]) => ({
  tables: [ids.map((clubId) => ({ clubId }))],
  rules: {},
});

describe('regional cups: formats and entry', () => {
  it('builds valid competitions with the 2026 sizes: 20 (4 groups of 5), 12 and 12, then the final', () => {
    const { competitions, members } = regionalCompetitions(packOf(5), 2027, {});
    expect(competitions.map((c) => c.id)).toEqual([
      NORDESTE_ID,
      NORTE_ID,
      CENTRO_OESTE_ID,
      VERDE_ID,
    ]);
    for (const c of competitions) expect(() => CompetitionSchema.parse(c)).not.toThrow();
    expect(members[NORDESTE_ID]).toHaveLength(20);
    expect(members[NORTE_ID]).toHaveLength(12);
    expect(members[CENTRO_OESTE_ID]).toHaveLength(12);
    const ne = competitions[0]!;
    expect(ne.phases.map((p) => [p.id, p.kind === 'grupos' ? p.groups : p.legs])).toEqual([
      ['grupos', 4],
      ['quartas', 1],
      ['semi', 2],
      ['final', 2],
    ]);
    // A v B and C v D, once: five games each.
    expect(ne.phases[0]).toMatchObject({ opponents: 'other', legs: 1 });
    expect(competitions[3]!.phases[0]!.entrants).toHaveLength(2);
  });

  it('gives each state its berths; last season champion and runner-up come first, the rest by reputation', () => {
    const previous: Results = {
      'est-BA': { final: table('BA-4', 'BA-3') } as never,
      'est-PA': { final: table('PA-2') } as never,
    };
    const { members } = regionalCompetitions(packOf(6), 2027, previous);
    const ne = members[NORDESTE_ID]!;
    const of = (uf: string) => ne.filter((id) => id.startsWith(`${uf}-`));
    expect(of('BA')).toHaveLength(3);
    expect(of('CE')).toHaveLength(3);
    expect(of('PE')).toHaveLength(2);
    expect(of('BA').sort()).toEqual(['BA-0', 'BA-3', 'BA-4']);
    expect(of('PE').sort()).toEqual(['PE-0', 'PE-1']);
    const pa = members[NORTE_ID]!.filter((id) => id.startsWith('PA-'));
    expect(pa.sort()).toEqual(['PA-0', 'PA-2', 'PA-1'].sort());
    expect(members[NORTE_ID]!.some((id) => id.startsWith('GO-'))).toBe(false);
    expect(members[CENTRO_OESTE_ID]!.filter((id) => id.startsWith('GO-'))).toHaveLength(3);
  });

  it('fills short states from the region and leaves out a pack too small', () => {
    // 18 clubs for 20 Nordeste places: a multiple of four, 16
    expect(regionalCompetitions(packOf(2), 2027, {}).members[NORDESTE_ID]).toHaveLength(16);
    expect(regionalCompetitions(packOf(0), 2027, {}).competitions).toEqual([]);
  });
});

describe('regional cups: calendar and play', () => {
  it('starts on the first Wednesday on or after 24 March (25 Mar 2026, 24 Mar 2027)', () => {
    expect(isoOf(regionalStart(2026))).toBe('2026-03-25');
    expect(isoOf(regionalStart(2027))).toBe('2027-03-24');
  });

  it('plays the cups to their champions inside the window with a clean calendar', async () => {
    const state = startSeason(packOf(6), { seed: 4, estaduais: true });
    await runSeason(state, async (ids) => ids.map(scripted));
    expect(checkSeason(state)).toEqual([]);
    for (const id of [NORDESTE_ID, NORTE_ID, CENTRO_OESTE_ID, VERDE_ID])
      expect(state.results[id]?.final?.tables[0]?.[0]?.clubId, id).toBeTruthy();
    const champions = [NORTE_ID, CENTRO_OESTE_ID].map(
      (id) => state.results[id]!.final!.tables[0]![0]!.clubId,
    );
    expect(state.results[VERDE_ID]!.final!.tables[0]!.map((r) => r.clubId).sort()).toEqual(
      champions.sort(),
    );
    const matches = (id: string) =>
      [...state.calendar.matches.values()].filter((m) => m.competitionId === id);
    // 4 groups of 5, five games each: 50, quarters 4, semi-finals 4, final 2 (CBF: 60 matches)
    expect(matches(NORDESTE_ID)).toHaveLength(60);
    // two halves of 30 + 2 + 2, and the final of the two: 70 in all (CBF)
    expect(
      matches(NORTE_ID).length + matches(CENTRO_OESTE_ID).length + matches(VERDE_ID).length,
    ).toBe(70);
    // the whole thing ends in the first week of June (7 June 2026 in the CBF table)
    const end = Math.max(...[NORDESTE_ID, VERDE_ID].flatMap((id) => matches(id).map((m) => m.day)));
    expect(isoOf(end) <= '2027-06-13').toBe(true);
    expect(weekday(regionalStart(2027))).toBe(3);
  });
});

describe('Supercopa', () => {
  it('is one match on the first Sunday of February: 1 Feb 2026, 7 Feb 2027', () => {
    for (const [year, day] of [
      [2026, '2026-02-01'],
      [2027, '2027-02-07'],
    ] as const) {
      const c = supercopa(year, ['a', 'b']);
      expect(c.phases[0]!.dates.start).toBe(day);
      expect(c.phases[0]).toMatchObject({ legs: 1, tieBreakers: ['penalties'] });
      expect(() => CompetitionSchema.parse(c)).not.toThrow();
    }
  });

  it('pairs the national champion with the Copa champion, the runner-up when one club won both', () => {
    const serie = { id: 'div-1', phases: [{ id: 'liga' }] } as never;
    const prev = (a: string, b: string, copa: string): Results =>
      ({ 'div-1': { liga: table(a, b) }, [COPA_ID]: { final: table(copa, 'x') } }) as never;
    expect(supercopaPair(serie, [], [], prev('f', 'p', 'c'))).toEqual(['f', 'c']);
    expect(supercopaPair(serie, [], [], prev('f', 'p', 'f'))).toEqual(['f', 'p']);
    // first season: the two best of the division by ranking
    expect(supercopaPair(serie, ['a', 'b', 'c'], ['z', 'c', 'a', 'b'], {})).toEqual(['c', 'a']);
  });

  it('plays in the season of a full pack with the prizes set and a clean calendar', async () => {
    const pack = generateDevPack();
    const state = startSeason(pack, { seed: 3, estaduais: true });
    const comp = state.competitions.find((c) => c.id === SUPERCOPA_ID)!;
    expect(comp.money.prizes.map((p) => p.amount)).toEqual([6_350_000, 5_230_000]);
    await runSeason(state, async (ids) => ids.map(scripted));
    expect(checkSeason(state)).toEqual([]);
    const m = [...state.calendar.matches.values()].find((x) => x.competitionId === SUPERCOPA_ID)!;
    expect(weekday(m.day)).toBe(0);
    expect(isoOf(m.day) >= `${pack.season}-02-01`).toBe(true);
    expect(state.results[SUPERCOPA_ID]?.final?.tables[0]).toHaveLength(2);
    for (const id of [NORDESTE_ID, VERDE_ID])
      expect(state.results[id]?.final?.tables[0]?.[0]?.clubId, id).toBeTruthy();
  });
});

describe('Copa do Brasil entry (3rd phase)', () => {
  const tiers = [
    { tier: 1, clubIds: Array.from({ length: 20 }, (_, i) => `a${i}`) },
    { tier: 2, clubIds: Array.from({ length: 20 }, (_, i) => `b${i}`) },
    { tier: 3, clubIds: Array.from({ length: 20 }, (_, i) => `c${i}`) },
    { tier: 4, clubIds: Array.from({ length: 66 }, (_, i) => `d${i}`) },
  ];
  const ranking = tiers.flatMap((t) => t.clubIds);

  it('takes last season Copa do Nordeste and Copa Verde champions', () => {
    const f = copaField(tiers, ranking, { nordeste: ['b7', 'b8'], verde: ['d9'] })!;
    expect(f.group2).toEqual(['c0', 'b7', 'd0', 'd9']);
    expect(f.group3).not.toContain('b7');
  });

  it('hands the place to the runner-up when the champion is already in (Série A)', () => {
    const f = copaField(tiers, ranking, { nordeste: ['a3', 'b8'], verde: [] })!;
    expect(f.group2).toEqual(['c0', 'b8', 'd0', 'd1']);
    expect(f.serieA).toContain('a3');
  });

  it('keeps the old stand-ins when there is no regional result', () => {
    expect(copaField(tiers, ranking)!.group2).toEqual(['c0', 'c1', 'd0', 'd1']);
  });

  it('the season reads last season champions from the results', () => {
    const pack = generateDevPack();
    const div2 = pack.competitions.find((c) => c.tier === 2)!.clubIds;
    const previous = { [NORDESTE_ID]: { final: table(div2[5]!, 'x') } } as never as Results;
    const state = startSeason(pack, { seed: 1, previous });
    const copa = state.competitions.find((c) => c.id === COPA_ID)!;
    const third = copa.phases.find((p) => p.id === 'fase-3')!;
    const list = third.entrants.find((e) => e.from === 'list')!;
    expect(list.from === 'list' && list.clubIds).toContain(div2[5]);
  });
});

describe('the next season reads this one', () => {
  it('state finalists enter the cups, regional champions the Copa 3rd phase, champions the Supercopa', async () => {
    const pack = generateDevPack();
    const one = startSeason(pack, { seed: 8, estaduais: true });
    await runSeason(one, async (ids) => ids.map(scripted));
    const two = startSeason(pack, {
      seed: 8,
      estaduais: true,
      previous: one.results,
    });
    const cityState = new Map(pack.cities.map((c) => [c.id, c.state]));
    const stateOf = new Map(pack.clubs.map((c) => [c.id, cityState.get(c.cityId)!]));
    // each Nordeste state keeps its champion and runner-up of the state championship, unless
    // in a Conmebol cup (the 12 best of the Série A and the Copa champion stand in)
    const ne = new Set(two.members[NORDESTE_ID]);
    const serieOne = pack.competitions.find((c) => c.tier === 1)!;
    const continental = new Set([
      ...one.results[serieOne.id]![serieOne.phases.at(-1)!.id]!.tables[0]!.slice(0, 12).map(
        (r) => r.clubId,
      ),
      one.results[COPA_ID]!.final!.tables[0]![0]!.clubId,
    ]);
    for (const uf of Object.keys(NORDESTE_BERTHS)) {
      const top = one.results[`est-${uf}`]!.final!.tables[0]!.map((r) => r.clubId);
      for (const id of top) expect(ne.has(id), `${uf} ${id}`).toBe(!continental.has(id));
      for (const id of continental) expect(ne.has(id)).toBe(false);
      expect([...ne].filter((id) => stateOf.get(id) === uf)).toHaveLength(NORDESTE_BERTHS[uf]!);
    }
    // Copa do Brasil 3rd phase: the Copa do Nordeste and Copa Verde champions (or their runners-up
    // when already in through Série A)
    const copa = two.competitions.find((c) => c.id === COPA_ID)!;
    const list = copa.phases
      .find((p) => p.id === 'fase-3')!
      .entrants.find((e) => e.from === 'list')!;
    const group2 = list.from === 'list' ? list.clubIds : [];
    const serieA = new Set(two.members[pack.competitions.find((c) => c.tier === 1)!.id]);
    const entered = (id: string) => {
      const t = one.results[id]!.final!.tables[0]!.map((r) => r.clubId);
      return t.find((c) => !serieA.has(c));
    };
    expect(group2).toContain(entered(NORDESTE_ID));
    expect(group2).toContain(entered(VERDE_ID));
    // Supercopa: last season's national champion and Copa champion
    const serie = pack.competitions.find((c) => c.tier === 1)!;
    const champ = one.results[serie.id]![serie.phases.at(-1)!.id]!.tables[0]![0]!.clubId;
    expect(two.members[SUPERCOPA_ID]).toContain(champ);
    expect(two.members[SUPERCOPA_ID]).toHaveLength(2);
  });
});

describe('Copa Sul-Sudeste (REC 2026)', () => {
  const SS = Object.keys(SUL_SUDESTE_BERTHS);
  const pack = {
    season: 2027,
    competitions: [],
    cities: SS.map((uf) => ({ id: `city-${uf}`, state: uf })),
    clubs: SS.flatMap((uf) =>
      Array.from({ length: 4 }, (_, i) => ({
        id: `${uf}-${i}`,
        cityId: `city-${uf}`,
        reputation: 100 - i,
      })),
    ),
  } as unknown as Pack;

  it('takes two clubs a state, none in a Conmebol cup, in two groups of six', () => {
    const { competitions, members } = regionalCompetitions(pack, 2027, {}, new Set(['SP-0']));
    const ss = competitions.find((c) => c.id === SUL_SUDESTE_ID)!;
    expect(() => CompetitionSchema.parse(ss)).not.toThrow();
    const ids = members[SUL_SUDESTE_ID]!;
    expect(ids).toHaveLength(12);
    for (const uf of SS) expect(ids.filter((id) => id.startsWith(`${uf}-`))).toHaveLength(2);
    expect(ids).not.toContain('SP-0');
    expect(ids).toContain('SP-2');
    expect(ss.phases.map((p) => [p.id, p.kind === 'grupos' ? p.groups : p.legs])).toEqual([
      ['grupos', 2],
      ['semi', 2],
      ['final', 2],
    ]);
  });

  it('plays 42 matches from 25 March to 7 June; the semi-finals inside each group', async () => {
    const state = startSeason(pack, { seed: 5, estaduais: true, season: 2026 });
    await runSeason(state, async (ids) => ids.map(scripted));
    expect(checkSeason(state)).toEqual([]);
    const ms = [...state.calendar.matches.values()].filter(
      (m) => m.competitionId === SUL_SUDESTE_ID,
    );
    expect(ms).toHaveLength(42);
    const days = ms.map((m) => isoOf(m.day)).sort();
    expect(days[0]).toBe('2026-03-25');
    expect(days.at(-1)! <= '2026-06-07').toBe(true);
    // Each club meets the six of the other group once, three at home.
    const r = state.results[SUL_SUDESTE_ID]!;
    const [a, b] = r.grupos!.tables.map((t) => t.map((x) => x.clubId));
    for (const id of a!) {
      const own = ms.filter(
        (m) => m.id.startsWith(`${SUL_SUDESTE_ID}/grupos/`) && (m.home === id || m.away === id),
      );
      expect(own).toHaveLength(6);
      expect(own.filter((m) => m.home === id)).toHaveLength(3);
      expect(own.every((m) => b!.includes(m.home === id ? m.away : m.home))).toBe(true);
    }
    const semi = ms.filter((m) => m.id.startsWith(`${SUL_SUDESTE_ID}/semi/`));
    for (const m of semi) {
      const same = [a, b].some((g) => g!.includes(m.home) && g!.includes(m.away));
      expect(same).toBe(true);
    }
    expect(r.final?.tables[0]?.[0]?.clubId).toBeTruthy();
  });

  it('from 2027 its champion and every regional champion go straight to the 3rd phase: 126 clubs', () => {
    const tiers = [
      { tier: 1, clubIds: Array.from({ length: 20 }, (_, i) => `a${i}`) },
      { tier: 2, clubIds: Array.from({ length: 20 }, (_, i) => `b${i}`) },
      { tier: 3, clubIds: Array.from({ length: 20 }, (_, i) => `c${i}`) },
      { tier: 4, clubIds: Array.from({ length: 66 }, (_, i) => `d${i}`) },
      { tier: 5, clubIds: ['x0', 'x1', 'x2'] },
    ];
    const ranking = tiers.flatMap((t) => t.clubIds);
    const regional = {
      nordeste: ['b5'],
      verde: ['x0'],
      norte: ['x0'],
      centroOeste: ['x1'],
      sulSudeste: ['x2'],
    };
    expect(copaField(tiers, ranking, regional, 2026)!.group2).toEqual(['c0', 'b5', 'd0', 'x0']);
    const f = copaField(tiers, ranking, regional, 2027)!;
    expect(f.group2).toEqual(['c0', 'b5', 'd0', 'x0', 'x1', 'x2']);
    expect(f.group3).toHaveLength(100);
    const cup = copaDoBrasil(2027, f);
    expect(cup.size).toBe(126);
    expect(() => CompetitionSchema.parse(cup)).not.toThrow();
  });
});
