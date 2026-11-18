import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { careerMatch, nextDecision, openCareer, playDecision } from './advance';
import { fielded, hurtIn, injuredOn, rivalOut, rivalOutIds } from './health';
import { formationOf } from '../match/fixture-input';
import { loadCareer, saveCareer } from './save';
import { bestLineup, lineupOf, setLineup } from './squad';
import { jobOffers } from './start';
import { rivalStrength, trainingOn } from './training';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('injuries (08, corte 1)', () => {
  it('tired legs, a fragile body and a hard week all raise the risk; the kinds keep their days', () => {
    const w = openCareer(pack, 111, clubId);
    const xi = lineupOf(w).xi;
    const count = (fresh: number, intensity: 'light' | 'normal' | 'hard') => {
      let n = 0;
      for (let day = 1; day <= 400; day++)
        n += Object.keys(
          hurtIn(w, xi, day, {
            intensity,
            drill: 0.75,
            fresh: Object.fromEntries(xi.map((id) => [id, fresh])),
            day,
          }),
        ).length;
      return n;
    };
    const rested = count(1, 'normal');
    // About one injury every four matches for a rested eleven.
    expect(rested).toBeGreaterThan(50);
    expect(rested).toBeLessThan(200);
    expect(count(0.4, 'normal')).toBeGreaterThan(rested * 1.6);
    expect(count(1, 'hard')).toBeGreaterThan(count(1, 'light'));
    const all = [];
    for (let day = 1; day <= 400; day++)
      all.push(
        ...Object.values(hurtIn(w, xi, day, { intensity: 'normal', drill: 0.75, fresh: {}, day })),
      );
    for (const i of all) {
      const days = i.until - i.from;
      expect(days).toBeGreaterThanOrEqual(3);
      expect(days).toBeLessThanOrEqual(200);
      if (i.kind === 'serious') expect(days).toBeGreaterThanOrEqual(90);
      if (i.kind === 'knock') expect(days).toBeLessThanOrEqual(9);
    }
    expect(all.filter((i) => i.kind === 'muscle').length).toBeGreaterThan(
      all.filter((i) => i.kind === 'serious').length,
    );
    // The same match, the same injuries.
    expect(hurtIn(w, xi, 77, trainingOn(w, 77))).toEqual(hurtIn(w, xi, 77, trainingOn(w, 77)));
  });

  it('an injured starter is replaced for the day by the best fit; the picked eleven stays', () => {
    const w = openCareer(pack, 111, clubId);
    setLineup(w, lineupOf(w));
    const picked = [...w.lineup!.xi];
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    const keeper = picked[0]!;
    const striker = picked[9]!;
    w.injuries = {
      [keeper]: { kind: 'muscle', from: d.day - 1, until: d.day + 10 },
      [striker]: { kind: 'knock', from: d.day - 1, until: d.day + 2 },
    };
    expect(injuredOn(w, d.day)).toEqual(new Set([keeper, striker]));
    const out = fielded(w, d.day);
    expect(out.xi).not.toContain(keeper);
    expect(out.xi).not.toContain(striker);
    expect(new Set(out.xi).size).toBe(11);
    expect(w.lineup!.xi).toEqual(picked);
    // The man in goal is a keeper, and the engine gets that eleven.
    const stand = w.pack.players.find((p) => p.id === out.xi[0])!;
    expect(stand.positions.some((x) => x.position === 'GK')).toBe(true);
    const m = careerMatch(w, d);
    expect(m.input.teams[m.mine].players.slice(0, 11).map((p) => p.id)).toEqual(out.xi);
    // When they are back the picked eleven plays again.
    expect(fielded(w, d.day + 10).xi).toEqual(picked);
    expect(fielded(w, d.day + 2).xi).toContain(striker);
  });

  it('a season brings injuries, tells them, clears the healed and rides in the snapshot', () => {
    const w = openCareer(pack, 111, clubId);
    let hurt = 0;
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) {
      playDecision(w, d);
      hurt = w.inbox!.filter((n) => n.kind === 'injury').length || hurt;
      for (const i of Object.values(w.injuries ?? {})) expect(i.until).toBeGreaterThan(w.day);
    }
    const told = w.inbox!.filter((n) => n.kind === 'injury');
    expect(Math.max(hurt, told.length)).toBeGreaterThan(0);
    const again = loadCareer(pack, 111, clubId, saveCareer(w));
    expect(again.injuries).toEqual(w.injuries);
  });

  it('another club is short of a starter in some matches, and weaker for it', () => {
    const w = openCareer(pack, 111, clubId);
    const rival = pack.clubs.find((c) => c.id !== clubId)!.id;
    const outs = Array.from({ length: 300 }, (_, k) => rivalOut(w, rival, 20500 + k));
    expect(outs.filter((x) => x === 0).length).toBeGreaterThan(120);
    expect(outs.some((x) => x === 2)).toBe(true);
    const full = outs.indexOf(0);
    const short = outs.indexOf(2);
    expect(rivalStrength(w, rival, 20500 + short)).toBeLessThan(
      rivalStrength(w, rival, 20500 + full),
    );
    // In the engine match the men who replace them play.
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    const other = d.home === clubId ? d.away : d.home;
    const best = bestLineup({ pack: w.pack, clubId: other }, formationOf(other)).xi;
    const gone = rivalOutIds(w, other, best, d.day);
    expect(gone.size).toBe(rivalOut(w, other, d.day));
    const m = careerMatch(w, d);
    const theirs = m.input.teams[m.mine === 0 ? 1 : 0].players.slice(0, 11).map((p) => p.id);
    for (const id of gone) expect(theirs).not.toContain(id);
    expect(new Set(theirs).size).toBe(11);
  });
});
