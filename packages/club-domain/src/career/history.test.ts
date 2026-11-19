import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import {
  nextDecision,
  openCareer,
  playDecision,
  startNextSeason,
  type CareerWorld,
} from './advance';
import { jobsAfter, takeJob } from './jobs';
import { seasonReview } from './history';
import { loadCareer, saveCareer } from './save';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[1]!.clubId;
const playSeason = (w: CareerWorld) => {
  for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
};

describe('season review and club history', () => {
  it('reviews the season at its end, records it at the turn, and survives save/load and a new job', () => {
    const w = openCareer(pack, 61, clubId);
    expect(seasonReview(w)).toBeNull();
    playSeason(w);
    const r = seasonReview(w)!;
    const season = w.season.season;
    expect(r.record.won + r.record.drawn + r.record.lost).toBeGreaterThan(0);
    expect(r.position).toBeGreaterThan(0);
    expect(r.met).toBe(r.position <= r.goal);
    startNextSeason(w);
    expect(w.history).toHaveLength(1);
    expect(w.history![0]).toMatchObject({
      season,
      clubId,
      position: r.position,
      goal: r.goal,
      met: r.met,
      move: r.move,
    });
    const loaded = loadCareer(pack, 61, clubId, saveCareer(w));
    expect(loaded.history).toEqual(w.history);
    // The person is dismissed and takes another club: the history stays the person's.
    w.board = { ...w.board!, fired: true };
    const next = jobsAfter(w)[0]!;
    takeJob(w, next);
    expect(w.clubId).toBe(next);
    expect(w.history).toHaveLength(1);
    playSeason(w);
    startNextSeason(w);
    expect(w.history!.map((h) => h.clubId)).toEqual([clubId, next]);
  });
});
