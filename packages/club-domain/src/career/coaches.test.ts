import { describe, expect, it } from 'vitest';
import type { Outcome } from '../competition/season';
import { generateDevPack } from '../generate/pack';
import { openCareer } from './advance';
import { approaches, judgeCoaches } from './coaches';
import { jobsAfter, takeJob } from './jobs';
import { loadCareer, saveCareer } from './save';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const lose = (home: boolean): Outcome => ({
  goals: home ? [0, 3] : [3, 0],
  shootout: null,
  cards: [
    [0, 0],
    [0, 0],
  ],
});

/** A club of the person's division other than theirs, the strongest a step above if any. */
function above(w: ReturnType<typeof openCareer>): string {
  const mine = w.strength.get(clubId)!;
  const ids = [...w.strength.keys()].filter((id) => id !== clubId);
  return (
    ids.find((id) => w.strength.get(id)! > mine && w.strength.get(id)! - mine <= 8) ??
    ids.sort((a, b) => w.strength.get(b)! - w.strength.get(a)!)[0]!
  );
}

/** That club loses until its board sacks the coach; returns the day it happened. */
function sackAt(w: ReturnType<typeof openCareer>, club: string, rival: string): number {
  for (let k = 0; k < 40 && !w.vacancies?.[club]; k++)
    judgeCoaches(w, { home: club, away: rival, competitionId: 'x' }, lose(true), 10 + k);
  return w.vacancies![club]!;
}

describe('the other clubs’ coaches (06 §5.3)', () => {
  it('a run of defeats costs a coach his job, and the save keeps the vacancy', () => {
    const w = openCareer(pack, 7, clubId);
    const club = above(w);
    expect(sackAt(w, club, clubId)).toBeGreaterThan(0);
    expect(w.sacked).toContain(club);
    expect(w.benches?.[club]).toBeUndefined();
    const back = loadCareer(pack, 7, clubId, saveCareer(w));
    expect(back.vacancies).toEqual(w.vacancies);
    expect(back.sacked).toEqual(w.sacked);
  });

  it('a pleased person is approached by a bigger club and can take the job', () => {
    const w = openCareer(pack, 7, clubId);
    w.board = { confidence: 90, goal: 1 };
    const club = above(w);
    if (w.strength.get(club)! <= w.strength.get(clubId)!) return;
    sackAt(w, club, clubId);
    expect(approaches(w)).toContain(club);
    takeJob(w, club);
    expect(w.clubId).toBe(club);
    // The club left behind looks for a coach.
    expect(w.vacancies?.[clubId]).toBeDefined();
    expect(w.vacancies?.[club]).toBeUndefined();
  });

  it('a dismissed person is offered the vacancies first', () => {
    const w = openCareer(pack, 7, clubId);
    const mine = w.strength.get(clubId)!;
    const weaker = [...w.strength.keys()].filter(
      (id) => id !== clubId && w.strength.get(id)! < mine,
    );
    w.vacancies = { [weaker[0]!]: 5 };
    w.board = { confidence: 0, goal: 1, fired: true };
    expect(jobsAfter(w)).toContain(weaker[0]);
    expect(jobsAfter(w)).toHaveLength(3);
  });
});
