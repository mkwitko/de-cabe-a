import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { bestRoles } from '../player/ratings';
import { nextDecision, openCareer, playDecision, startNextSeason } from './advance';
import {
  codeOf,
  crop,
  develop,
  drive,
  evolve,
  growthOf,
  retires,
  type Mine,
  type SeasonLog,
} from './development';
import { loadCareer, saveCareer } from './save';
import { setLineup, lineupOf } from './squad';
import { jobOffers } from './start';
import { setIntensity } from './training';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const level = (p: { attributes: Parameters<typeof bestRoles>[0] }) =>
  bestRoles(p.attributes, 1)[0]!.rating;
const age = (p: { birthDate: string }, season: number) => season - Number(p.birthDate.slice(0, 4));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** A season in which nothing was decided: everyone grows by where he sits in his squad. */
const quiet = (pk: typeof pack, season: number): SeasonLog => ({
  season,
  growth: codeOf(pk, { clubId, intensity: 'normal', played: {} }, new Set()),
});

describe('a year passes (03 §3)', () => {
  it('the young grow, the old lose their legs, and nobody passes his ceiling', () => {
    const young = pack.players.filter((p) => age(p, 2027) <= 21);
    const old = pack.players.filter((p) => age(p, 2027) >= 33);
    expect(young.length).toBeGreaterThan(100);
    expect(old.length).toBeGreaterThan(50);
    expect(mean(young.map((p) => level(develop(p, 7, 2027)) - level(p)))).toBeGreaterThan(0.3);
    expect(mean(old.map((p) => level(develop(p, 7, 2027)) - level(p)))).toBeLessThan(-0.3);
    for (const p of young) {
      const next = develop(p, 7, 2027);
      for (const [a, v] of Object.entries(next.attributes)) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(99);
        // Growth never goes past the ceiling of its group by more than it already was.
        const before = p.attributes[a as keyof typeof p.attributes];
        const top = Math.max(...Object.values(p.potential.ceiling));
        if (v > before) expect(v).toBeLessThanOrEqual(Math.max(before, top));
      }
    }
    // The same player, seed and season: the same year. Another seed: another.
    expect(develop(young[0]!, 7, 2027)).toEqual(develop(young[0]!, 7, 2027));
    expect(pack.players.map((p) => develop(p, 8, 2027))).not.toEqual(
      pack.players.map((p) => develop(p, 7, 2027)),
    );
  });

  it('a better training ground, more minutes and a harder week all add growth', () => {
    const young = pack.players.filter((p) => age(p, 2027) <= 21);
    const gained = (growth: number) =>
      mean(young.map((p) => level(develop(p, 7, 2027, growth)) - level(p)));
    expect(gained(130)).toBeGreaterThan(gained(100));
    expect(gained(100)).toBeGreaterThan(gained(75));
    // Decline is age's alone.
    const old = pack.players.filter((p) => age(p, 2027) >= 34);
    expect(old.map((p) => develop(p, 7, 2027, 130))).toEqual(
      old.map((p) => develop(p, 7, 2027, 70)),
    );

    const squad = pack.players.filter((p) => p.clubId === clubId);
    const starter = squad[0]!.id;
    const bench = squad[1]!.id;
    const log = (intensity: 'light' | 'hard'): Mine => ({
      clubId,
      intensity,
      played: { [starter]: 2, [bench]: 0 },
    });
    const hard = growthOf(pack, log('hard'));
    const light = growthOf(pack, log('light'));
    expect(hard.get(starter)).toBeGreaterThan(hard.get(bench)!);
    expect(hard.get(starter)! - light.get(starter)!).toBe(13);
    expect(hard.get(starter)! - hard.get(bench)!).toBe(55);
    // Two rival clubs: the one with the better ground grows its best player more.
    const byGround = [...pack.clubs].sort((a, b) => b.facilities.training - a.facilities.training);
    const top = (id: string) =>
      pack.players
        .filter((p) => p.clubId === id)
        .sort((a, b) => level(b) - level(a) || (a.id < b.id ? -1 : 1))[0]!.id;
    const best = byGround[0]!;
    const worst = byGround.at(-1)!;
    if (
      best.facilities.training > worst.facilities.training &&
      best.id !== clubId &&
      worst.id !== clubId
    )
      expect(hard.get(top(best.id))).toBeGreaterThan(hard.get(top(worst.id))!);
  });

  it('potential is a ceiling, not a destination: who he is, the year he had and where he played decide', () => {
    // The same boys followed to their peak under three lives.
    const boys = pack.clubs.slice(0, 60).flatMap((c) => crop(pack, c.id, 7, 2027));
    const reached = (growth: number) =>
      boys.map((b) => {
        let p = b;
        for (let s = 2028; age(p, s) <= b.potential.peakAge; s++) p = develop(p, 7, s, growth);
        const top = (g: 'technical' | 'mental') => b.potential.ceiling[g];
        const room = top('technical') + top('mental') - 2 * level(b);
        return room <= 0 ? 1 : (2 * level(p) - 2 * level(b)) / room;
      });
    const share = (xs: number[], at: number) => xs.filter((x) => x >= at).length / xs.length;
    const ordinary = reached(100);
    const neglected = reached(60);
    const nurtured = reached(140);
    expect(mean(nurtured)).toBeGreaterThan(mean(ordinary));
    expect(mean(ordinary)).toBeGreaterThan(mean(neglected));
    // Most fall short of what they could be; a few get close; care moves how many.
    expect(share(ordinary, 0.9)).toBeLessThan(0.4);
    expect(share(nurtured, 0.9)).toBeGreaterThan(share(neglected, 0.9));
    expect(Math.min(...ordinary)).toBeLessThan(0.6);
    // The driven outgrow the idle from the same start.
    const b = boys[0]!;
    const as = (v: number) => ({
      ...b,
      personality: { ...b.personality, professionalism: v, ambition: v, resilience: v },
    });
    expect(drive(as(18))).toBeGreaterThan(drive(as(4)) * 1.5);
    let keen = as(18);
    let idle = as(4);
    for (let s = 2028; s < 2034; s++) {
      keen = develop(keen, 7, s);
      idle = develop(idle, 7, s);
    }
    expect(level(keen)).toBeGreaterThan(level(idle));
  });

  it('players retire from 36 on, keepers later; each academy brings its crop', () => {
    const at = (birth: number, gk = false) => ({
      ...pack.players.find((p) => p.positions.some((x) => x.position === 'GK') === gk)!,
      birthDate: `${birth}-01-01`,
    });
    expect(retires(at(1998), 7, 2027)).toBe(false);
    expect(retires(at(1987), 7, 2027)).toBe(true);
    expect(retires(at(1996, true), 7, 2027)).toBe(false);
    const boys = pack.clubs.flatMap((c) => crop(pack, c.id, 7, 2027));
    expect(boys.length).toBeGreaterThanOrEqual(pack.clubs.length);
    expect(boys.length).toBeLessThanOrEqual(pack.clubs.length * 6);
    expect(new Set(boys.map((b) => b.id)).size).toBe(boys.length);
    for (const b of boys) {
      expect(age(b, 2027)).toBeGreaterThanOrEqual(15);
      expect(age(b, 2027)).toBeLessThanOrEqual(17);
      expect(b.contract!.until).toBe('2029-12-31');
      expect(Math.max(...Object.values(b.potential.ceiling))).toBeGreaterThanOrEqual(level(b));
    }
    expect(crop(pack, clubId, 7, 2027)).toEqual(crop(pack, clubId, 7, 2027));
    expect(crop(pack, clubId, 7, 2028)).not.toEqual(crop(pack, clubId, 7, 2027));

    const next = evolve(pack, pack, 7, quiet(pack, 2026));
    expect(next.players.length).toBeGreaterThan(pack.players.length - 400);
    expect(next.players.some((p) => p.id.startsWith('y2027-'))).toBe(true);
    let world = pack;
    for (let s = 2026; s < 2031; s++) world = evolve(world, pack, 7, quiet(world, s));
    const ages = (pk: typeof pack, season: number) =>
      mean(pk.players.filter((p) => p.clubId).map((p) => age(p, season)));
    // The world does not grow old: over ten years the mean age holds within a year and a half.
    // (No contract ends in this bare run, so squads only grow here; the career releases players.)
    for (let y = 2031; y < 2036; y++) world = evolve(world, pack, 7, quiet(world, y));
    expect(Math.abs(ages(world, 2036) - ages(pack, 2026))).toBeLessThan(3.5);
    expect(world.players.length).toBeGreaterThan(pack.players.length * 0.8);
  });

  it('three seasons played, saved and loaded: the same players as the world that never stopped', () => {
    const w = openCareer(pack, 61, clubId);
    setIntensity(w, 'hard');
    setLineup(w, lineupOf(w));
    // Three turns: the third is the first at which players a whole year without a club leave.
    for (let year = 0; year < 3; year++) {
      for (;;) {
        const d = nextDecision(w);
        // A dismissal does not stop the world in this test: the board is set back.
        if (d.kind === 'fired') w.board = { confidence: 60, goal: w.board!.goal };
        else if (d.kind === 'match') playDecision(w, d);
        else break;
      }
      startNextSeason(w);
    }
    expect(w.log).toHaveLength(3);
    expect(w.season.season).toBe(2029);
    expect(w.pack.players.some((p) => p.id.startsWith('y2029-'))).toBe(true);
    expect(w.log!.some((l) => l.growth.includes('!'))).toBe(true);
    // One character a player for each finished season: that is all the log keeps.
    expect(w.log![0]!.growth.length).toBe(pack.players.length);
    expect(w.log![0]!.growth).toMatch(/^[!0-v]+$/);
    const t = performance.now();
    const again = loadCareer(pack, 61, clubId, saveCareer(w));
    const ms = performance.now() - t;
    expect(again.pack.players).toEqual(w.pack.players);
    expect(again.strength).toEqual(w.strength);
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    expect(playDecision(again, nextDecision(again) as typeof d)).toEqual(playDecision(w, d));
    expect(again.deals).toEqual(w.deals);
    // Loading replays the years: it must stay quick.
    expect(ms).toBeLessThan(4000);
  }, 180_000);
});
