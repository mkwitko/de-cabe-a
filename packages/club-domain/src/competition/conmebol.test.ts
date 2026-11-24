import { describe, expect, it } from 'vitest';
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { generateDevPack } from '../generate/pack';
import { CompetitionSchema } from './schema';
import { isoOf } from './calendar';
import { associationOf, LIBERTADORES_ID, SUDAMERICANA_ID } from './conmebol';
import { FOREIGN_CLUBS, LIBERTADORES_FOREIGN, SUDAMERICANA_FOREIGN } from './conmebol-data';
import { checkSeason, runSeason, startSeason, type Outcome } from './season';

const scripted = (id: string): Outcome => {
  const r = fork(rngFrom(11), id);
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

describe('CONMEBOL cups 2026', () => {
  it('the data: 47 Libertadores and 44 Sudamericana clubs, every foreign id known', () => {
    const known = new Set(FOREIGN_CLUBS.map((c) => c.id));
    const lib = Object.values(LIBERTADORES_FOREIGN).flat();
    const sud = Object.values(SUDAMERICANA_FOREIGN).flat();
    for (const id of [...lib, ...sud]) expect(known.has(id), id).toBe(true);
    expect(lib.length + 8).toBe(47);
    expect(sud.length + 6).toBe(44);
    expect(new Set([...lib, ...sud]).size).toBe(lib.length + sud.length);
  });

  it('plays both cups to a champion inside their dates, with a clean calendar', async () => {
    const pack = generateDevPack();
    const s = startSeason(pack, { seed: 3, estaduais: true });
    const lib = s.competitions.find((c) => c.id === LIBERTADORES_ID)!;
    const sud = s.competitions.find((c) => c.id === SUDAMERICANA_ID)!;
    expect(() => CompetitionSchema.parse(lib)).not.toThrow();
    expect(() => CompetitionSchema.parse(sud)).not.toThrow();
    await runSeason(s, async (ids) => ids.map(scripted));
    expect(checkSeason(s)).toEqual([]);
    for (const id of [LIBERTADORES_ID, SUDAMERICANA_ID]) {
      expect(s.results[id]?.final?.tables[0]?.[0]?.clubId, id).toBeTruthy();
      const ms = [...s.calendar.matches.values()].filter((m) => m.competitionId === id);
      const days = ms.map((m) => isoOf(m.day)).sort();
      expect(days[0]! >= '2026-02-03').toBe(true);
      expect(days.at(-1)! <= '2026-12-06').toBe(true);
    }
    // 6 first + 16 second + 8 third + 96 group + 16 + 8 + 4 + 1 = 155 Libertadores matches.
    expect(
      [...s.calendar.matches.values()].filter((m) => m.competitionId === LIBERTADORES_ID),
    ).toHaveLength(155);
    // No group with two clubs of one association, in either cup.
    for (const id of [LIBERTADORES_ID, SUDAMERICANA_ID])
      for (const t of s.results[id]!.grupos!.tables) {
        const a = t.map((r) => associationOf(r.clubId));
        expect(new Set(a).size, `${id} ${a.join()}`).toBe(a.length);
      }
  });
});

describe('the foreign field from 2027', () => {
  it('keeps each country its places and stage sizes, and changes clubs from season to season', async () => {
    const { foreignEntrants, associationOf } = await import('./conmebol');
    const a = foreignEntrants(2026, 5);
    expect(a.libertadores.groups).toEqual([...LIBERTADORES_FOREIGN.groups]);
    const count = (e: typeof a) =>
      Object.values(e.libertadores)
        .concat(Object.values(e.sudamericana))
        .map((ids) => ids.map(associationOf).sort().join());
    const later = [2027, 2028, 2029].map((y) => foreignEntrants(y, 5));
    for (const e of later) expect(count(e)).toEqual(count(a));
    const moved = later.some((e) => e.libertadores.groups.join() !== a.libertadores.groups.join());
    expect(moved).toBe(true);
    const all = later.flatMap((e) =>
      [...Object.values(e.libertadores), ...Object.values(e.sudamericana)].flat(),
    );
    expect(new Set(all.slice(0, 77)).size).toBe(77);
  });
});
