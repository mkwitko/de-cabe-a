import { describe, expect, it } from 'vitest';
import { fork, next, rngFrom } from '@decabeca/match-engine';
import type { Pack } from '../pack/schema';
import { CompetitionSchema } from './schema';
import { isoOf } from './calendar';
import { cotaOf, estadualCompetitions, estadualSlots, formatFor, prizesOf } from './estaduais';
import { DOCUMENTED, GENERIC } from './estaduais-data';
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

/** A pack of `n` clubs in every state; the first of each is in a national division. */
const packOf = (n: number) => {
  const ufs = [...DOCUMENTED.map((f) => f.uf), ...Object.keys(GENERIC)];
  const cities = ufs.map((uf) => ({ id: `city-${uf}`, state: uf }));
  const clubs = ufs.flatMap((uf) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${uf}-${i}`,
      cityId: `city-${uf}`,
      reputation: 100 - i,
    })),
  );
  return { season: 2027, competitions: [], cities, clubs } as unknown as Pack;
};

describe('state championship windows', () => {
  it('follows the CBF windows: 11 Jan to 8 Mar 2026, 10 Jan to 7 Mar 2027', () => {
    for (const [year, from, to] of [
      [2026, '2026-01-11', '2026-03-08'],
      [2027, '2027-01-10', '2027-03-07'],
    ] as const) {
      const slots = estadualSlots(year);
      expect(isoOf(slots[0]!)).toBe(from);
      expect(isoOf(slots.at(-1)!)).toBe(to);
    }
  });
});

describe('state championship formats', () => {
  it('has the ten researched states, each with sources, and a note per generic state', () => {
    expect(DOCUMENTED.map((f) => f.uf).sort()).toEqual(
      ['BA', 'CE', 'GO', 'MG', 'PE', 'PR', 'RJ', 'RS', 'SC', 'SP'].sort(),
    );
    for (const f of DOCUMENTED) {
      expect(f.sources.length).toBeGreaterThan(0);
      expect(f.note.length).toBeGreaterThan(20);
    }
    expect(Object.keys(GENERIC)).toHaveLength(17);
  });

  it('builds a valid competition for every state at every size, and the field sizes fit', () => {
    for (let n = 3; n <= 20; n++) {
      const { competitions, members } = estadualCompetitions(packOf(n), 2027, () => undefined);
      expect(competitions.length).toBe(n < 4 ? 0 : 27);
      for (const c of competitions) {
        expect(() => CompetitionSchema.parse(c)).not.toThrow();
        expect(members[c.id]!.length).toBe(c.size);
        expect(c.size).toBeLessThanOrEqual(formatFor(c.id.slice(4), n)!.size);
      }
    }
  });

  it('fits the first phase in the window for every size (and the knockout after it)', async () => {
    for (let n = 4; n <= 20; n++) {
      const state = startSeason(packOf(n), { seed: n, estaduais: true });
      await runSeason(state, async (ids) => ids.map(scripted));
      expect(checkSeason(state), `n=${n}`).toEqual([]);
    }
  });

  it('puts the national divisions clubs first and the others by reputation', () => {
    const pack = packOf(20);
    const { members } = estadualCompetitions(pack, 2027, (id) =>
      id === 'SP-19' ? 4 : id === 'SP-18' ? 1 : undefined,
    );
    const sp = members['est-SP']!;
    expect(sp).toHaveLength(16);
    expect(sp).toContain('SP-19');
    expect(sp).toContain('SP-18');
    // by reputation among them: the two national clubs are the weakest of the field
    expect(sp.slice(-2).sort()).toEqual(['SP-18', 'SP-19']);
    expect(sp[0]).toBe('SP-0');
  });
});

describe('state championship season', () => {
  it('plays every state to a champion inside the window, with a clean calendar', async () => {
    const state = startSeason(packOf(16), { seed: 3, estaduais: true });
    await runSeason(state, async (ids) => ids.map(scripted));
    expect(checkSeason(state)).toEqual([]);
    const end = estadualSlots(2027).at(-1)!;
    for (const c of state.competitions) {
      const final = state.results[c.id]?.final;
      expect(final?.tables[0]?.[0]?.clubId, c.id).toBeTruthy();
    }
    for (const m of state.calendar.matches.values())
      if (m.competitionId.startsWith('est-')) expect(m.day).toBeLessThanOrEqual(end);
  });
});

describe('state championship money', () => {
  it('uses the public figures where there are some', () => {
    // Paulista: the four large clubs R$ 35 mi, champion R$ 5 mi (March 2026 press).
    expect(cotaOf('SP', 0, 1)).toBe(35_000_000);
    expect(cotaOf('SP', 3, 4)).toBe(35_000_000);
    expect(prizesOf('SP').champion).toBe(5_000_000);
    expect(cotaOf('RJ', 0, 1)).toBe(10_000_000);
    expect(prizesOf('RJ').champion).toBe(10_000_000);
  });

  it('scales the estimates by state and division, and never pays more down the table', () => {
    expect(cotaOf('AC', 0, 1)).toBeGreaterThan(cotaOf('AC', 0, 4));
    expect(cotaOf('AC', 0, 4)).toBeLessThan(cotaOf('SC', 0, 4));
    for (const uf of Object.keys(GENERIC))
      for (let r = 1; r < 8; r++)
        expect(cotaOf(uf, r, 3)).toBeLessThanOrEqual(cotaOf(uf, r - 1, 3));
  });
});
