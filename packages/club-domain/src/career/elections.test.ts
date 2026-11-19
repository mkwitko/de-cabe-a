import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from './advance';
import { clubsOf, electionYear, planSeason } from './clubs';
import { saveCareer, loadCareer } from './save';
import { nationalDivisions } from './start';

const pack = generateDevPack();
const mine = nationalDivisions(pack).at(-1)!.clubIds[0]!;

/** A world where the person's club votes at the next turn, on a three-season term. */
function voting(seed: number, hired: number) {
  const w = openCareer(structuredClone(pack), seed, mine);
  w.pack.governance.find((g) => g.clubId === mine)!.electionEverySeasons = 3;
  const s = clubsOf(w)[mine]!;
  s.directors = { ...s.directors, since: w.season.season - 3 };
  w.hired = w.season.season + hired;
  return w;
}
const ctx = (position: number, goal: number) => ({
  placed: (id: string) => (id === mine ? { position, places: 20 } : undefined),
  board: { goal },
});

describe('club elections', () => {
  it('the season before the vote is an election year', () => {
    const w = voting(5, 0);
    // since = season - 3: the turn into the next season is a vote only when 3 divides season+1-since.
    expect(electionYear(w, mine)).toBe(false);
    clubsOf(w)[mine]!.directors.since = w.season.season - 2;
    expect(electionYear(w, mine)).toBe(true);
  });

  it('a poor season loses the vote, a title keeps it; the same seed gives the same result', () => {
    let lost = 0;
    let won = 0;
    for (let seed = 1; seed <= 60; seed++) {
      if (planSeason(voting(seed, -3), new Set(), ctx(20, 10)) !== 'reelected') lost++;
      if (planSeason(voting(seed, -3), new Set(), ctx(1, 10)) === 'reelected') won++;
    }
    expect(lost).toBeGreaterThan(40);
    expect(won).toBeGreaterThan(40);
    const a = voting(7, -3);
    const b = voting(7, -3);
    expect(planSeason(a, new Set(), ctx(20, 10))).toBe(planSeason(b, new Set(), ctx(20, 10)));
    expect(a.inbox).toEqual(b.inbox);
  });

  it("the outgoing board's man is sacked more often than an inherited coach", () => {
    const sacked = (hired: number) => {
      let n = 0;
      for (let seed = 1; seed <= 150; seed++)
        if (planSeason(voting(seed, hired), new Set(), ctx(18, 8)) === 'fired') n++;
      return n;
    };
    expect(sacked(-3)).toBeGreaterThan(sacked(-4));
  });

  it('writes the result to the inbox and keeps the hiring season through a save', () => {
    const w = voting(3, -3);
    planSeason(w, new Set(), ctx(20, 10));
    expect(w.inbox?.some((n) => n.kind === 'election')).toBe(true);
    expect(loadCareer(pack, 3, mine, saveCareer(w)).hired).toBe(w.hired);
  });
});
