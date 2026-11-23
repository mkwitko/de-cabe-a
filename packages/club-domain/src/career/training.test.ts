import { describe, expect, it } from 'vitest';
import { distanceKm, travelTire } from './travel';
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
    // An away match costs the trip's legs too (travel.ts).
    const m = [...w.season.calendar.matches.values()].find(
      (x) => x.day === day && (x.home === clubId || x.away === clubId),
    )!;
    const trip = m.away === clubId ? travelTire(distanceKm(w.pack, m.home, m.away)) : 0;
    expect(w.training!.fresh[xi[0]!]).toBe(1 - MATCH_COST - trip);
    const bench = pack.players.find((p) => p.clubId === clubId && !xi.includes(p.id))!.id;
    expect(w.training!.fresh[bench]).toBeUndefined();
    // Three days on: back by three days of a normal week; a light week gives more.
    expect(trainingOn(w, day + 3).fresh[xi[0]!]).toBe(1 - MATCH_COST - trip + RECOVERY.normal * 3);
    setIntensity(w, 'light');
    expect(trainingOn(w, day + 3).fresh[xi[0]!]).toBe(1 - MATCH_COST - trip + RECOVERY.light * 3);
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

describe('the week planned session by session', () => {
  it('the ready plans weigh what their intensity says', async () => {
    const { PLANS, intensityOf } = await import('./training');
    for (const i of ['light', 'normal', 'hard'] as const) expect(intensityOf(PLANS[i])).toBe(i);
  });

  it('a plan sets the intensity, more tactics drill the team further, recovery rests it', async () => {
    const { PLANS, drillTargetOf, setPlan } = await import('./training');
    const w = openCareer(pack, 5, clubId);
    const tactical = PLANS.normal.map((d) => d.map((x) => (x === 'physical' ? 'tactical' : x)));
    expect(drillTargetOf(tactical)).toBeGreaterThan(drillTargetOf(PLANS.normal));
    setPlan(w, tactical);
    expect(w.training!.intensity).toBe('normal');
    expect(trainingOn(w, w.day + 200).drill).toBeCloseTo(drillTargetOf(tactical), 2);
    // Recovery sessions bring a tired player back faster.
    const restful = PLANS.normal.map(() => ['recovery', 'recovery'] as const).map((d) => [...d]);
    const a = openCareer(pack, 5, clubId);
    const b = openCareer(pack, 5, clubId);
    const id = lineupOf(a).xi[0]!;
    a.training = { ...trainingOn(a, a.day), fresh: { [id]: 0.5 } };
    b.training = { ...trainingOn(b, b.day), fresh: { [id]: 0.5 } };
    setPlan(b, restful);
    setIntensity(a, 'light');
    expect(trainingOn(b, b.day + 3).fresh[id] ?? 1).toBeGreaterThan(
      trainingOn(a, a.day + 3).fresh[id] ?? 1,
    );
    expect(() => setPlan(w, [['rest']])).toThrow();
    // The plan survives a save.
    expect(loadCareer(pack, 5, clubId, saveCareer(w)).training!.plan).toEqual(tactical);
  });

  it('a match preparation the day before is worth points in the match', async () => {
    const { PLANS, PREP_POINTS, prepPoints, weekdayOf } = await import('./training');
    const t = { ...trainingOn(openCareer(pack, 5, clubId), 0), plan: PLANS.normal };
    // The ready normal week prepares on Saturday: a Sunday match gets the points.
    const sunday = [0, 1, 2, 3, 4, 5, 6].map((k) => 100 + k).find((d) => weekdayOf(d) === 6)!;
    expect(prepPoints(t, sunday)).toBe(PREP_POINTS);
    expect(prepPoints(t, sunday - 2)).toBe(0);
    expect(weekdayOf(0)).toBe(3);
  });

  it('the sessions of a match day weigh nothing: the squad plays instead', async () => {
    const { PLANS, planLoad, intensityOf } = await import('./training');
    const all = PLANS.hard;
    // Midweek and Sunday matches: Wednesday and Sunday's sessions are not trained.
    const days = new Set([2, 6]);
    const off = all[2]!.reduce((s, x) => s + (x === 'rest' || x === 'recovery' ? 0 : 1), 0);
    expect(off).toBeGreaterThan(0);
    expect(planLoad(all, days)).toBeLessThan(planLoad(all));
    expect(planLoad(all, new Set([0, 1, 2, 3, 4, 5, 6]))).toBe(0);
    expect(intensityOf(all, new Set([0, 1, 2, 3, 4, 5, 6]))).toBe('light');
  });

  it('a focus leans the season’s growth to its group and survives a save', async () => {
    const { setFocus } = await import('./training');
    const { develop } = await import('./development');
    const w = openCareer(pack, 5, clubId);
    setFocus(w, 'physical');
    expect(w.training!.focus).toBe('physical');
    expect(loadCareer(pack, 5, clubId, saveCareer(w)).training!.focus).toBe('physical');
    setFocus(w, null);
    expect(w.training!.focus).toBeUndefined();
    expect(() => setFocus(w, 'x' as never)).toThrow();
    // A young player grows more in the group his club leans to, less in the rest.
    const young = w.pack.players
      .filter((p) => w.pack.season - Number(p.birthDate.slice(0, 4)) <= 20)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    const sum = (focus: 'technical' | 'physical' | undefined, keys: string[]) =>
      young.reduce((s, p) => {
        const a = develop(p, 5, w.pack.season + 1, 100, focus).attributes as Record<string, number>;
        return s + keys.reduce((t, k) => t + a[k]!, 0);
      }, 0);
    const legs = ['pace', 'acceleration', 'stamina', 'strength'];
    expect(sum('physical', legs)).toBeGreaterThan(sum(undefined, legs));
    expect(sum('technical', legs)).toBeLessThan(sum(undefined, legs));
  });
});
