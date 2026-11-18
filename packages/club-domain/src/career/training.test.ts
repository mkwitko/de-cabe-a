import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { careerMatch, nextDecision, openCareer, playDecision, type CareerWorld } from './advance';
import { loadCareer, saveCareer } from './save';
import { lineupOf } from './squad';
import { jobOffers } from './start';
import {
  DRILL_TARGET,
  MATCH_COST,
  RECOVERY,
  drilled,
  myStrength,
  rivalFresh,
  rivalStrength,
  setIntensity,
  trainingOn,
} from './training';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const play = (w: CareerWorld) => {
  const d = nextDecision(w);
  if (d.kind !== 'match') throw new Error('no match');
  playDecision(w, d);
  return d.day;
};

describe('training and freshness (08, corte 1)', () => {
  it('a starter leaves freshness in the match and gets it back by the day, by intensity', () => {
    const w = openCareer(pack, 51, clubId);
    const xi = lineupOf(w).xi;
    const day = play(w);
    expect(w.training!.day).toBe(day);
    expect(w.training!.fresh[xi[0]!]).toBe(1 - MATCH_COST);
    const bench = pack.players.find((p) => p.clubId === clubId && !xi.includes(p.id))!.id;
    expect(w.training!.fresh[bench]).toBeUndefined();
    // Three days on: back by three days of a normal week; a light week gives more.
    expect(trainingOn(w, day + 3).fresh[xi[0]!]).toBe(1 - MATCH_COST + RECOVERY.normal * 3);
    setIntensity(w, 'light');
    expect(trainingOn(w, day + 3).fresh[xi[0]!]).toBe(1 - MATCH_COST + RECOVERY.light * 3);
    // Fully rested players drop out of the record.
    expect(trainingOn(w, day + 30).fresh).toEqual({});
  });

  it('the drill moves toward the intensity target and never past it', () => {
    const w = openCareer(pack, 51, clubId);
    const day = play(w);
    expect(w.training!.drill).toBe(DRILL_TARGET.normal);
    setIntensity(w, 'hard');
    const week = trainingOn(w, day + 7).drill;
    const month = trainingOn(w, day + 30).drill;
    expect(week).toBeGreaterThan(DRILL_TARGET.normal);
    expect(month).toBeGreaterThan(week);
    expect(month).toBeLessThan(DRILL_TARGET.hard);
    setIntensity(w, 'light');
    expect(trainingOn(w, day + 30).drill).toBeLessThan(DRILL_TARGET.normal);
    expect(() => setIntensity(w, 'brutal' as never)).toThrow();
  });

  it('tired legs and a slack week both lower the strength; the engine gets both numbers', () => {
    const w = openCareer(pack, 51, clubId);
    const rested = myStrength(w, trainingOn(w, w.day));
    const day = play(w);
    expect(myStrength(w, trainingOn(w, day))).toBeLessThan(rested);
    expect(myStrength(w, trainingOn(w, day + 30))).toBe(rested);
    setIntensity(w, 'light');
    expect(myStrength(w, trainingOn(w, day + 30))).toBeLessThan(rested);
    setIntensity(w, 'hard');
    expect(myStrength(w, trainingOn(w, day + 30))).toBeGreaterThan(rested);

    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    const t = trainingOn(w, d.day);
    const m = careerMatch(w, d);
    const mine = m.input.teams[m.mine].players;
    expect(mine[0]!.condition).toBe(t.fresh[mine[0]!.id] ?? 1);
    expect(Math.max(...mine.slice(0, 11).map((p) => p.familiarity))).toBe(drilled(t.drill));
    // The other club tires by the same rule, from the days since its last match.
    const rival = d.home === clubId ? d.away : d.home;
    const theirs = m.input.teams[m.mine === 0 ? 1 : 0].players;
    expect(theirs[0]!.condition).toBe(rivalFresh(w, rival, d.day));
    let lastDay = -1;
    for (const x of w.season.calendar.byClub.get(rival)!)
      if (x.played && x.day < d.day) lastDay = Math.max(lastDay, x.day);
    expect(lastDay).toBeGreaterThan(0);
    expect(rivalFresh(w, rival, lastDay + 2)).toBe(1 - MATCH_COST + RECOVERY.normal * 2);
    expect(rivalStrength(w, rival, lastDay + 2)).toBeLessThan(w.strength.get(rival)!);
    expect(rivalStrength(w, rival, lastDay + 30)).toBe(w.strength.get(rival));
    // The state rides in the snapshot and the world goes on the same.
    const again = loadCareer(pack, 51, clubId, saveCareer(w));
    expect(again.training).toEqual(w.training);
    expect(playDecision(again, nextDecision(again) as typeof d)).toEqual(playDecision(w, d));
  });
});
