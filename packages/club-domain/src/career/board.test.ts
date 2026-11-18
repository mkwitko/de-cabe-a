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
import { boardAfterMatch, boardOf, goalFor, positionOf } from './board';
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

  it('losing brings an ultimatum; meeting it lifts the pressure', () => {
    const w = openCareer(pack, 71, clubId);
    for (let i = 0; i < 40 && !boardOf(w).ultimatum; i++) play(w, 0, 3);
    expect(boardOf(w).ultimatum).toEqual({ matches: 5, points: 6 });
    expect(boardOf(w).confidence).toBeLessThan(25);
    play(w, 2, 0);
    expect(boardOf(w).ultimatum).toEqual({ matches: 4, points: 3 });
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
