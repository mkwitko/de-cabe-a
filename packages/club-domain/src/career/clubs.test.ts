import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { budgetOf } from '../market/books';
import { openCareer } from './advance';
import { clubsOf, planSeason, settleSeason, withClubs, workCost } from './clubs';
import { goalFor } from './board';
import { nationalDivisions } from './start';

const pack = generateDevPack();
const divs = nationalDivisions(pack);
const mine = divs.at(-1)!.clubIds[0]!;
const rival = divs[0]!.clubIds[2]!;

describe('clubs as institutions (04 §4.7)', () => {
  it('a rival with money to spare builds by its horizon; the short-sighted back the squad', () => {
    const w = openCareer(structuredClone(pack), 5, mine);
    const s = clubsOf(w)[rival]!;
    const club = w.pack.clubs.find((c) => c.id === rival)!;
    s.cash = budgetOf(w, rival).income;
    s.directors = { competence: 95, horizon: 'long', since: w.season.season };
    planSeason(w, new Set());
    expect(s.works?.length).toBeGreaterThan(0);
    expect(s.works![0]!.front).not.toBe('stadium');
    const level = club.facilities.youth;
    // The work is in use at the next turn.
    planSeason(w, new Set());
    const built = withClubs(w.pack, w.clubs).clubs.find((c) => c.id === rival)!;
    expect(
      built.facilities.youth + built.facilities.training + built.departments.scouting,
    ).toBeGreaterThan(level + club.facilities.training + club.departments.scouting);

    const t = openCareer(structuredClone(pack), 5, mine);
    const u = clubsOf(t)[rival]!;
    u.cash = budgetOf(t, rival).income;
    u.directors = { competence: 95, horizon: 'short', since: t.season.season };
    planSeason(t, new Set());
    expect(u.kitty).toBeGreaterThan(0);
    expect(u.kitty!).toBeGreaterThan(s.kitty ?? 0);
  });

  it('the accounts move the cash; a club in the red loses budget for fees', () => {
    const w = openCareer(structuredClone(pack), 5, mine);
    const s = clubsOf(w)[rival]!;
    const before = s.cash;
    settleSeason(w, () => ({ position: 1, places: 20 }));
    expect(s.cash).not.toBe(before);
    const fees = budgetOf(w, rival).transfer;
    const t = openCareer(structuredClone(pack), 5, mine);
    clubsOf(t)[rival]!.cash = -fees * 4;
    expect(budgetOf(t, rival).transfer).toBeLessThan(fees);
  });

  it("the person's directors set the goal and the purse by their horizon", () => {
    const w = openCareer(structuredClone(pack), 5, mine);
    const d = clubsOf(w)[mine]!.directors;
    clubsOf(w)[mine]!.directors = { ...d, horizon: 'short' };
    const short = { goal: goalFor(w), fees: budgetOf(w, mine).transfer };
    const t = openCareer(structuredClone(pack), 5, mine);
    clubsOf(t)[mine]!.directors = { ...d, horizon: 'long' };
    expect(goalFor(t)).toBeGreaterThan(short.goal);
    expect(budgetOf(t, mine).transfer).toBeLessThan(short.fees);
  });

  it('a level 5 front cannot be built further', () => {
    const w = openCareer(structuredClone(pack), 5, mine);
    const club = w.pack.clubs.find((c) => c.id === rival)!;
    expect(workCost(w, { ...club, facilities: { ...club.facilities, youth: 5 } }, 'youth')).toBe(
      null,
    );
  });
});
