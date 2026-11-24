import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision, startNextSeason } from './advance';
import { boardOf } from './board';
import { clubsOf } from './clubs';
import { jobsAfter, takeJob } from './jobs';
import { loadCareer, saveCareer } from './save';
import { squadOf } from './squad';
import { nationalDivisions } from './start';

const pack = generateDevPack();

describe('after the board ends the job (06 §5.3)', () => {
  it('weaker clubs offer the job; taking one carries the career on there', () => {
    const old = nationalDivisions(pack)[1]!.clubIds[3]!;
    const w = openCareer(pack, 17, old);
    for (let i = 0; i < 4; i++) {
      const d = nextDecision(w);
      if (d.kind === 'match') playDecision(w, d);
    }
    expect(jobsAfter(w)).toEqual([]);
    w.board = { ...boardOf(w), fired: true };
    expect(nextDecision(w).kind).toBe('fired');

    const offers = jobsAfter(w);
    expect(offers).toHaveLength(3);
    expect(new Set(offers).size).toBe(3);
    expect(jobsAfter(w)).toEqual(offers);
    for (const id of offers) expect(w.strength.get(id)!).toBeLessThan(w.strength.get(old)!);
    expect(() => takeJob(w, old)).toThrow('job');

    const day = w.day;
    // The new club brings the cash it has; the old one keeps the person's.
    clubsOf(w)[offers[0]!]!.cash = 1_234_567;
    const left = w.ledger.cash;
    takeJob(w, offers[0]!);
    expect(clubsOf(w)[old]!.cash).toBe(left);
    expect(w.clubId).toBe(offers[0]);
    expect(w.day).toBe(day);
    expect(boardOf(w).fired).toBeUndefined();
    expect(w.ledger.cash).toBe(1_234_567);
    expect(squadOf(w).length).toBeGreaterThan(17);
    expect(w.inbox!.at(-1)).toMatchObject({ kind: 'hired', club: offers[0] });
    expect(() => takeJob(w, offers[1]!)).toThrow('job');

    // The season goes on with the new club, and the save knows whose career it is now.
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    expect([d.home, d.away]).toContain(offers[0]);
    const again = loadCareer(pack, 17, old, saveCareer(w));
    expect(again.clubId).toBe(offers[0]);
    expect(playDecision(again, nextDecision(again) as typeof d)).toEqual(playDecision(w, d));
    for (let x = nextDecision(w); x.kind !== 'seasonOver'; x = nextDecision(w)) {
      if (x.kind === 'fired') w.board = { confidence: 60, goal: w.board!.goal };
      else if (x.kind === 'match') playDecision(w, x);
    }
    expect(startNextSeason(w).season).toBe(pack.season + 1);
  }, 120_000);
});
