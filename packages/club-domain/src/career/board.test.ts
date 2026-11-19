import { describe, expect, it } from 'vitest';
import type { Outcome } from '../competition/season';
import { generateDevPack } from '../generate/pack';
import {
  nextDecision,
  openCareer,
  playDecision,
  startNextSeason,
  type CareerWorld,
} from './advance';
import {
  boardAfterMatch,
  boardAfterSeason,
  boardOf,
  goalFor,
  positionOf,
  pressureOf,
} from './board';
import { loadCareer, saveCareer } from './save';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const score = (mine: number, theirs: number, atHome: boolean): Outcome => ({
  goals: atHome ? [mine, theirs] : [theirs, mine],
  shootout: null,
  cards: [
    [0, 0],
    [0, 0],
  ],
});
/** Plays the next match with this score for the person's club. */
const play = (w: CareerWorld, mine: number, theirs: number) => {
  let d = nextDecision(w);
  if (d.kind === 'seasonOver') {
    startNextSeason(w);
    d = nextDecision(w);
  }
  if (d.kind !== 'match') throw new Error(d.kind);
  playDecision(w, d, score(mine, theirs, d.home === clubId));
};

describe('the board (06, corte 1)', () => {
  it('sets a goal inside the table and starts at a steady confidence', () => {
    const w = openCareer(pack, 71, clubId);
    const b = boardOf(w);
    expect(b.confidence).toBe(60);
    expect(b.goal).toBe(goalFor(w));
    expect(b.goal).toBeGreaterThanOrEqual(1);
    expect(positionOf(w)).toBeGreaterThanOrEqual(1);
  });

  it('a win as the underdog is worth more than one as the favourite; a loss the other way', () => {
    const w = openCareer(pack, 71, clubId);
    const rival = pack.clubs.find((c) => c.id !== clubId)!.id;
    const match = { home: clubId, away: rival };
    const win = score(1, 0, true);
    const loss = score(0, 1, true);
    w.strength.set(rival, w.strength.get(clubId)! + 10);
    const upset = boardAfterMatch(w, match, win).confidence;
    const expected = boardAfterMatch(w, match, loss).confidence;
    w.strength.set(rival, w.strength.get(clubId)! - 10);
    const routine = boardAfterMatch(w, match, win).confidence;
    const shock = boardAfterMatch(w, match, loss).confidence;
    expect(upset).toBeGreaterThan(routine);
    expect(routine).toBeGreaterThan(60);
    expect(shock).toBeLessThan(expected);
    expect(boardAfterMatch(w, match, loss).last![0]).toMatchObject({
      kind: 'result',
      result: 'L',
      odds: 'favourite',
    });
  });

  it('inherited debt does not count against the coach; unpaid wages do', () => {
    const w = openCareer(pack, 71, clubId);
    const match = { home: clubId, away: pack.clubs.find((c) => c.id !== clubId)!.id };
    const draw = score(0, 0, true);
    const clean = boardAfterMatch(w, match, draw).confidence;
    w.ledger.cash = -50_000_000;
    expect(boardAfterMatch(w, match, draw).confidence).toBe(clean);
    w.arrears = 1;
    expect(boardAfterMatch(w, match, draw).confidence).toBe(clean - 1);
  });

  it('a club under pressure asks more, and the press makes a story of a winless run', () => {
    const calm = openCareer(pack, 71, clubId);
    // The same club as the smallest of its table and as its biggest, with demanding supporters.
    const as = (reputation: number) =>
      openCareer(
        {
          ...pack,
          clubs: pack.clubs.map((c) =>
            c.id === clubId
              ? {
                  ...c,
                  reputation,
                  fans: { ...c.fans, demand: 100, ambition: 100, patience: 0 },
                }
              : c,
          ),
        },
        71,
        clubId,
      );
    const small = as(1);
    const loud = as(100);
    expect(pressureOf(loud)).toBeGreaterThan(pressureOf(calm));
    expect(pressureOf(loud)).toBeGreaterThanOrEqual(75);
    // Size counts against the table: the smallest of it is asked far less.
    expect(pressureOf(small)).toBeLessThan(pressureOf(loud) - 40);
    // The biggest is asked for the top whatever its squad.
    expect(goalFor(loud)).toBeLessThanOrEqual(goalFor(calm));
    expect(goalFor(loud)).toBeLessThanOrEqual(3);
    const match = { home: clubId, away: pack.clubs.find((c) => c.id !== clubId)!.id };
    const draw = score(1, 1, true);
    for (let k = 0; k < 2; k++) loud.board = boardAfterMatch(loud, match, draw);
    expect(loud.board!.last!.some((r) => r.kind === 'press')).toBe(false);
    loud.board = boardAfterMatch(loud, match, draw);
    expect(loud.board.winless).toBe(3);
    expect(loud.board.last).toContainEqual({ kind: 'press', value: -2 });
    loud.board = boardAfterMatch(loud, match, score(1, 0, true));
    expect(loud.board.winless).toBeUndefined();
  });

  it('losing brings an ultimatum; meeting it lifts the pressure', () => {
    const w = openCareer(pack, 71, clubId);
    for (let i = 0; i < 40 && !boardOf(w).ultimatum; i++) play(w, 0, 3);
    expect(boardOf(w).ultimatum).toEqual({ matches: 5, points: 7 });
    expect(boardOf(w).confidence).toBeLessThan(25);
    play(w, 2, 0);
    expect(boardOf(w).ultimatum).toEqual({ matches: 4, points: 4 });
    play(w, 2, 0);
    play(w, 2, 0);
    expect(boardOf(w).ultimatum).toBeUndefined();
    expect(boardOf(w).fired).toBeUndefined();
    expect(boardOf(w).confidence).toBeGreaterThanOrEqual(35);
  });

  it('failing the ultimatum ends the job, and the snapshot keeps it ended', () => {
    const w = openCareer(pack, 71, clubId);
    for (let i = 0; i < 60 && !boardOf(w).fired; i++) play(w, 0, 3);
    expect(boardOf(w).fired).toBe(true);
    expect(nextDecision(w)).toEqual({ kind: 'fired' });
    const again = loadCareer(pack, 71, clubId, saveCareer(w));
    expect(nextDecision(again)).toEqual({ kind: 'fired' });
  });

  it("the season's end judges the goal and sets the next one", () => {
    const w = openCareer(pack, 71, clubId);
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) {
      const b = boardOf(w);
      // Draws keep the job safe to the end, whatever the goal.
      playDecision(w, d, b.ultimatum ? score(1, 0, d.home === clubId) : undefined);
    }
    if (boardOf(w).fired) return;
    const before = boardOf(w);
    const met = positionOf(w) <= before.goal;
    startNextSeason(w);
    expect(w.board!.last).toEqual([
      { kind: met ? 'goalMet' : 'goalMissed', value: met ? 15 : -10 },
    ]);
    expect(w.board!.goal).toBe(goalFor(w));
  });
});

it('a season of the club’s own boys in the eleven lifts the board, more where fans prize them', () => {
  const at = (pride: number) => {
    const w = openCareer(structuredClone(pack), 3, clubId);
    const mine = w.pack.players.filter((p) => p.clubId === clubId).slice(0, 11);
    w.pack = {
      ...w.pack,
      clubs: w.pack.clubs.map((c) =>
        c.id === clubId ? { ...c, fans: { ...c.fans, youthPride: pride } } : c,
      ),
      players: w.pack.players.map((p) =>
        mine.some((m) => m.id === p.id) ? { ...p, origin: { ...p.origin, clubId } } : p,
      ),
    };
    w.starts = Object.fromEntries(mine.map((p) => [p.id, 10]));
    return boardAfterSeason(w).last!.find((r) => r.kind === 'homegrown')?.value ?? 0;
  };
  expect(at(100)).toBe(8);
  expect(at(50)).toBe(4);
  expect(at(0)).toBe(0);
});

it('local men formed at another club of the same state lift the board where fans prize it', () => {
  const at = (identity: number, sameState: boolean) => {
    const w = openCareer(structuredClone(pack), 3, clubId);
    const city = (id: string) => w.pack.clubs.find((c) => c.id === id)!.cityId;
    const state = (id: string) => w.pack.cities.find((c) => c.id === city(id))!.state;
    const other = w.pack.clubs.find(
      (c) => c.id !== clubId && (state(c.id) === state(clubId)) === sameState,
    );
    if (!other) return -1;
    const mine = w.pack.players.filter((p) => p.clubId === clubId).slice(0, 11);
    w.pack = {
      ...w.pack,
      clubs: w.pack.clubs.map((c) =>
        c.id === clubId ? { ...c, fans: { ...c.fans, localIdentity: identity } } : c,
      ),
      players: w.pack.players.map((p) =>
        mine.some((m) => m.id === p.id) ? { ...p, origin: { clubId: other.id } } : p,
      ),
    };
    w.starts = Object.fromEntries(mine.map((p) => [p.id, 10]));
    return boardAfterSeason(w).last!.find((r) => r.kind === 'locals')?.value ?? 0;
  };
  expect(at(100, false)).toBe(0);
  const local = at(100, true);
  if (local === -1) return;
  expect(local).toBe(5);
  expect(at(0, true)).toBe(0);
});

it('a birthplace in the state counts as local, wherever he was formed', () => {
  const w = openCareer(structuredClone(pack), 3, clubId);
  const home = w.pack.clubs.find((c) => c.id === clubId)!.cityId;
  const mine = w.pack.players.filter((p) => p.clubId === clubId).slice(0, 11);
  w.pack = {
    ...w.pack,
    clubs: w.pack.clubs.map((c) =>
      c.id === clubId ? { ...c, fans: { ...c.fans, localIdentity: 100 } } : c,
    ),
    players: w.pack.players.map((p) =>
      mine.some((m) => m.id === p.id) ? { ...p, origin: { cityId: home } } : p,
    ),
  };
  w.starts = Object.fromEntries(mine.map((p) => [p.id, 10]));
  expect(boardAfterSeason(w).last!.find((r) => r.kind === 'locals')?.value).toBe(5);
});
