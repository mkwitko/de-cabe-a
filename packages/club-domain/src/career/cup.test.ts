import { beforeAll, describe, expect, it } from 'vitest';
import { toJson } from '../bench/world';
import { dayOf, isoOf } from '../competition/calendar';
import { COPA_ID, COPA_PHASES, copaDoBrasil, copaField } from '../competition/copa';
import { decideTie } from '../competition/knockout';
import { checkSeason, matchCount } from '../competition/season';
import { generateDevPack } from '../generate/pack';
import {
  nextDecision,
  openCareer,
  playDecision,
  startNextSeason,
  type CareerWorld,
} from './advance';
import { cupReached, cupStages } from './cup';
import { COPA_B, COPA_CHAMPION, COPA_LOW, COPA_RUNNER_UP, copaCredits } from './revenue';
import { loadCareer, saveCareer } from './save';
import { nationalDivisions } from './start';

const pack = generateDevPack();
const divs = nationalDivisions(pack);
const tierOf = (id: string) => divs.find((d) => d.clubIds.includes(id))!.tier;

const finish = (w: CareerWorld) => {
  for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
};

let w: CareerWorld;
beforeAll(() => {
  w = openCareer(pack, 7, divs[3]!.clubIds[0]!);
  finish(w);
}, 60_000);

const cupMatches = () => [...w.season.meta.values()].filter((m) => m.competitionId === COPA_ID);

describe('Copa do Brasil 2026 as a played competition', () => {
  it('has the real format: 126 clubs, nine phases, 155 matches, single then two legs', () => {
    const cup = w.season.competitions.find((c) => c.id === COPA_ID)!;
    expect(cup.size).toBe(126);
    expect(cup.phases.map((p) => p.id)).toEqual([...COPA_PHASES]);
    expect(cup.phases.map((p) => p.legs)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 1]);
    expect(cup.phases.every((p) => p.tieBreakers.join() === 'penalties')).toBe(true);
    expect(matchCount(cup)).toBe(155);
    expect(cupMatches()).toHaveLength(155);
    expect(w.season.members[COPA_ID]).toHaveLength(126);
    expect(checkSeason(w.season)).toEqual([]);
  });

  it('enters by group: Série A at the 5th phase, four at the 3rd, the 28 lowest at the 1st', () => {
    const first = (id: string) =>
      Math.min(...[...cupStages(w.season, id)].filter((x) => x >= 0).concat(99));
    for (const id of divs[0]!.clubIds) expect(first(id)).toBe(4);
    const entered = (stage: number) =>
      w.season.members[COPA_ID]!.filter((id) => first(id) === stage);
    expect(entered(0)).toHaveLength(28);
    expect(entered(1)).toHaveLength(74);
    expect(entered(2)).toHaveLength(4);
    expect(entered(3)).toHaveLength(0);
    expect(entered(4)).toHaveLength(20);
    // Played mid-week (Wednesday base dates) and on Sundays for the semi-finals and the final.
    const days = new Set(cupMatches().map((m) => isoOf(w.season.calendar.matches.get(m.id)!.day)));
    expect([...days].sort()[0]).toBe('2026-02-18');
    expect([...days].sort().at(-1)).toBe('2026-12-06');
  });

  it('a two-leg tie level on aggregate goes to penalties, never on away goals', () => {
    const t = { a: 'x', b: 'y' };
    const legs = [
      { home: 'y', away: 'x', goals: [0, 1] as [number, number], shootout: null },
      { home: 'x', away: 'y', goals: [1, 2] as [number, number], shootout: null },
    ];
    // 2-2 on aggregate; y scored more away goals (2 v 1) but they do not count.
    const d = decideTie(t, legs, ['penalties'], 5);
    expect(d.by).toBe('penaltyDraw');
    const shot = decideTie(t, [legs[0]!, { ...legs[1]!, shootout: [3, 4] }], ['penalties'], 5);
    expect(shot).toEqual({ winner: 'y', by: 'penalties' });
  });

  it('pays from real progress: the phases a club played, the final once it is decided', () => {
    const final = w.season.results[COPA_ID]!.final!.tables[0]!.map((r) => r.clubId);
    for (const id of w.season.members[COPA_ID]!) {
      const list = copaCredits(w, id);
      const table = tierOf(id) === 2 ? COPA_B : COPA_LOW;
      expect(list.map((c) => c.phase)).toEqual(
        [...cupStages(w.season, id)].sort().map((s) => s + 1),
      );
      for (const c of list) {
        if (c.phase < 9) expect(c.amount).toBe(table[c.phase - 1]);
        else expect(c.amount).toBe(id === final[0] ? COPA_CHAMPION : COPA_RUNNER_UP);
      }
    }
    expect(copaCredits(w, final[0]!).at(-1)!.amount).toBe(COPA_CHAMPION);
    expect(copaCredits(w, final[1]!).at(-1)!.amount).toBe(COPA_RUNNER_UP);
    // A club out of the cup gets nothing past the phase it lost in.
    const out = w.season.members[COPA_ID]!.find((id) => cupReached(w.season, id) === 1)!;
    expect(copaCredits(w, out).map((c) => c.phase)).toEqual([1]);
  });

  it('records the champion and the runner-up places for the seasons that play them', () => {
    const final = w.season.results[COPA_ID]!.final!.tables[0]!.map((r) => r.clubId);
    startNextSeason(w);
    expect(w.season.slots).toEqual({
      libertadores: { grupos: [final[0]], preliminar: [final[1]] },
      'supercopa-do-brasil': { final: [final[0]] },
    });
    expect(w.season.season).toBe(2027);
    expect(w.season.members[COPA_ID]).toHaveLength(126);
  }, 60_000);

  it('is the same draw for the same seed, another for another seed', () => {
    const at = dayOf('2026-04-01');
    const draw = (seed: number) => {
      const x = openCareer(pack, seed, divs[3]!.clubIds[0]!, at);
      return [...x.season.meta.values()]
        .filter((m) => m.competitionId === COPA_ID)
        .map((m) => `${m.id}:${m.home}-${m.away}`)
        .join();
    };
    expect(draw(7)).toBe(draw(7));
    expect(draw(7)).not.toBe(draw(8));
  }, 60_000);

  it('saves and loads mid-cup and goes on exactly alike', () => {
    const live = openCareer(pack, 41, divs[3]!.clubIds[2]!);
    for (let i = 0; i < 12; i++) {
      const d = nextDecision(live);
      if (d.kind === 'match') playDecision(live, d);
    }
    expect(cupStages(live.season, live.clubId).size).toBeGreaterThan(0);
    const loaded = loadCareer(pack, 41, live.clubId, saveCareer(live));
    for (const x of [live, loaded])
      for (let i = 0; i < 60; i++) {
        const d = nextDecision(x);
        if (d.kind === 'match') playDecision(x, d);
      }
    expect(toJson(loaded.season)).toBe(toJson(live.season));
    expect(loaded.inbox).toEqual(live.inbox);
  }, 60_000);

  it('tells the person about the draws and the exit in the inbox', () => {
    // The notes kept are the latest 40: read them while the 1st phase is fresh.
    const x = openCareer(pack, 7, divs[1]!.clubIds[0]!, dayOf('2026-02-20'));
    const kinds = (x.inbox ?? []).map((n) => n.kind);
    expect(kinds).toContain('copaDraw');
  }, 60_000);

  it('plans no cup for a pack too small for the real field', () => {
    expect(copaField([{ tier: 1, clubIds: ['a'] }], ['a'])).toBeNull();
    const field = copaField(
      divs.map((d) => ({ tier: d.tier, clubIds: d.clubIds })),
      pack.clubs.map((c) => c.id),
    )!;
    // Season-versioned: a later year moves every window by the years in between.
    const next = copaDoBrasil(2027, field);
    expect(next.phases[0]!.dates.start).toBe('2027-02-18');
    expect(copaDoBrasil(2026, field).phases[8]!.dates.start).toBe('2026-12-06');
  });
});
