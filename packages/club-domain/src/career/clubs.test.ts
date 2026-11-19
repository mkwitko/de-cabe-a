import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { budgetOf } from '../market/books';
import { openCareer } from './advance';
import {
  clubsOf,
  fameOf,
  frontLevel,
  updateFame,
  planSeason,
  proposeWork,
  renewSponsors,
  settleSeason,
  withClubs,
  workAnswer,
  workCost,
} from './clubs';
import { postEntry } from '../finance/ledger';
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

  it('the person proposes a work: the board signs what it can pay and wants, and says why not', () => {
    const w = openCareer(structuredClone(pack), 5, rival);
    const s = clubsOf(w)[rival]!;
    s.directors = { competence: 80, horizon: 'long', since: w.season.season };
    postEntry(w.ledger, {
      key: 'test:cash',
      kind: 'transfers',
      ref: 'test',
      amount: budgetOf(w, rival).income * 2,
      day: w.ledger.today,
      dueDay: w.ledger.today,
    });
    const club = w.pack.clubs.find((c) => c.id === rival)!;
    const front = (['youth', 'training', 'medical', 'scouting', 'football'] as const).find(
      (f) => workCost(w, club, f) !== null,
    )!;
    const cash = w.ledger.cash;
    expect(proposeWork(w, front)).toBe(null);
    expect(w.ledger.cash).toBe(cash - workCost(w, club, front)!);
    expect(proposeWork(w, front)).toBe('busy');
    // In use at the next turn.
    planSeason(w, new Set());
    const built = withClubs(w.pack, w.clubs).clubs.find((c) => c.id === rival)!;
    expect(frontLevel(built, front)).toBe(frontLevel(club, front) + 1);
    // A short-sighted board will not sink a season's money in bricks.
    s.directors = { ...s.directors, horizon: 'short' };
    const dear = (['youth', 'training', 'medical', 'scouting', 'football'] as const).find(
      (f) => (workCost(w, built, f) ?? 0) * 100 > budgetOf(w, rival).income * 15,
    );
    if (dear) expect(workAnswer(w, dear)).toBe('horizon');
  });

  it('an election at a club of the division is news in the inbox', () => {
    const w = openCareer(structuredClone(pack), 5, mine);
    const div = nationalDivisions(w.pack).find((d) => w.season.members[d.id]?.includes(mine))!;
    const voter = w.season.members[div.id]!.find(
      (id) =>
        id !== mine && w.pack.governance.find((g) => g.clubId === id)?.model === 'association',
    )!;
    const every = w.pack.governance.find((g) => g.clubId === voter)!.electionEverySeasons ?? 3;
    clubsOf(w)[voter]!.directors.since = w.season.season - every;
    // A last place at the table: the opposition wins whatever the draw.
    planSeason(w, new Set(), {
      placed: (id) => (id === voter ? { position: 20, places: 20 } : undefined),
    });
    expect(w.inbox?.some((n) => n.kind === 'election' && n.club === voter)).toBe(true);
    expect(clubsOf(w)[voter]!.directors.since).toBe(w.season.season);
  });

  it('a title makes a name; years without one fade it back to its roots', () => {
    const w = openCareer(structuredClone(pack), 5, mine);
    const club = w.pack.clubs.find((c) => c.id === rival)!;
    const roots = fameOf(w, rival);
    const champion = (id: string) => ({ position: id === rival ? 1 : 10, places: 20, tier: 1 });
    updateFame(w, champion, new Map());
    const won = fameOf(w, rival);
    expect(won.national).toBeGreaterThan(roots.national);
    expect(won.continental).toBeGreaterThan(roots.continental);
    // The players see it: the club's reputation follows its name in the country.
    expect(withClubs(w.pack, w.clubs).clubs.find((c) => c.id === rival)!.reputation).toBe(
      won.national,
    );
    // A fuller house follows the title, from the club's opening figures.
    w.pack = withClubs(w.pack, w.clubs, w.origin);
    const after = w.pack.clubs.find((c) => c.id === rival)!;
    const lift = won.national - club.reputation;
    expect(after.fans.demand).toBe(Math.min(100, club.fans.demand + Math.trunc(lift / 2)));
    // Seasons go by as in a career: the pack carries today's fame, the roots stay the pack's.
    const quiet = () => ({ position: 10, places: 20, tier: 1 });
    for (let k = 0; k < 15; k++) {
      updateFame(w, quiet, new Map());
      w.pack = withClubs(w.pack, w.clubs, w.origin);
    }
    expect(fameOf(w, rival).national).toBeLessThan(won.national);
    const faded = w.pack.clubs.find((c) => c.id === rival)!;
    expect(Math.abs(faded.fans.demand - club.fans.demand)).toBeLessThanOrEqual(1);
    expect(Math.abs(fameOf(w, rival).national - club.reputation)).toBeLessThanOrEqual(2);
  });

  it('a deal that ended is signed again, dearer after a title, and runs to its own end', () => {
    const w = openCareer(structuredClone(pack), 5, mine);
    const club = w.origin.clubs.find((c) => c.sponsors.length && c.id !== mine)!;
    const s = clubsOf(w)[club.id]!;
    s.fame = { ...fameOf(w, club.id), national: club.reputation + 10 };
    const ended = club.sponsors.map((x) => ({ ...x, until: `${w.season.season - 1}-12-31` }));
    s.sponsors = ended;
    renewSponsors(w, club.id, s);
    const now = s.sponsors!;
    now.forEach((x, i) => {
      expect(x.until > `${w.season.season}-01-01`).toBe(true);
      // +10 of fame is 15 % more, in the same division.
      expect(x.annual).toBe(Math.round((club.sponsors[i]!.annual * 115) / 100));
    });
    // In force, nothing moves.
    const kept = structuredClone(now);
    renewSponsors(w, club.id, s);
    expect(s.sponsors).toEqual(kept);
    expect(
      withClubs(w.pack, w.clubs, w.origin).clubs.find((c) => c.id === club.id)!.sponsors,
    ).toEqual(kept);
  });

  it('a level 5 front cannot be built further', () => {
    const w = openCareer(structuredClone(pack), 5, mine);
    const club = w.pack.clubs.find((c) => c.id === rival)!;
    expect(workCost(w, { ...club, facilities: { ...club.facilities, youth: 5 } }, 'youth')).toBe(
      null,
    );
  });
});
