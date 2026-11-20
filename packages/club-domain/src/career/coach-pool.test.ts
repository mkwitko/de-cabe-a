import { describe, expect, it } from 'vitest';
import type { Outcome } from '../competition/season';
import { generateDevPack } from '../generate/pack';
import { openCareer } from './advance';
import {
  coachAt,
  coachesOf,
  dnaOf,
  driftDna,
  dismiss,
  hire,
  makeCoach,
  playedStyle,
  rivalPlan,
  styled,
  styleKind,
} from './coach-pool';
import { judgeCoaches } from './coaches';
import { loadCareer, saveCareer } from './save';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const fresh = () => openCareer(pack, 7, clubId);
const other = (w: ReturnType<typeof fresh>) => Object.keys(coachesOf(w).at)[0]!;
const lose: Outcome = {
  goals: [0, 3],
  shootout: null,
  cards: [
    [0, 0],
    [0, 0],
  ],
};

describe('coaches with an identity', () => {
  it('the pool is deterministic from the seed', () => {
    expect(makeCoach(7, 3)).toEqual(makeCoach(7, 3));
    expect(makeCoach(7, 3)).not.toEqual(makeCoach(8, 3));
    const a = coachesOf(fresh());
    expect(a).toEqual(coachesOf(fresh()));
    expect(Object.keys(a.at)).not.toContain(clubId);
  });

  it('a sacked coach joins the pool and is hired elsewhere, not back at the same club', () => {
    const w = fresh();
    const a = other(w);
    const sacked = coachAt(w, a)!;
    dismiss(w, a);
    expect(coachesOf(w).free).toContain(sacked.id);
    hire(w, a, 100);
    expect(coachAt(w, a)!.id).not.toBe(sacked.id);
    // Another club's board takes him when he fits it best.
    const b = Object.keys(coachesOf(w).at).find((c) => c !== a)!;
    const club = w.pack.clubs.find((c) => c.id === b)!;
    dismiss(w, b);
    sacked.style = { ...dnaOf(w, b) };
    sacked.reputation = club.reputation;
    sacked.young = 100 - club.profile.market.readyVsYoung;
    hire(w, b, 101);
    expect(coachAt(w, b)!.id).toBe(sacked.id);
    expect(sacked.career.map((s) => s.club)).toEqual([a, b]);
  });

  it('the coach’s philosophy changes how the rival plays', () => {
    const w = fresh();
    const a = other(w);
    const c = coachAt(w, a)!;
    c.style = { ...c.style, pressing: 100, tempo: 100, risk: 100, width: 100, block: 100 };
    const hot = rivalPlan(w, a)!.plan;
    c.style = { ...c.style, pressing: 0, tempo: 0, risk: 0, width: 0, block: 0 };
    const cold = rivalPlan(w, a)!.plan;
    expect(hot.tempo).toBeGreaterThan(cold.tempo);
    expect(hot.pressIntensity).toBeGreaterThan(cold.pressIntensity);
    expect(styleKind(c.style)).toBe('defensive');
    expect(playedStyle(w, a).tempo).toBeLessThan(dnaOf(w, a).tempo + 1);
  });

  it('a coach’s quality is a bounded edge', () => {
    for (let k = 0; k < 200; k++) expect(Math.abs(makeCoach(1, k).quality)).toBeLessThanOrEqual(15);
  });

  it('the DNA drifts slowly toward the style played, and the save keeps all of it', () => {
    const w = fresh();
    const before = dnaOf(w, clubId);
    for (let k = 0; k < 20; k++)
      styled(w, { block: 'high', pressIntensity: 5, tempo: 5, width: 5, risk: 5 });
    driftDna(w);
    const after = dnaOf(w, clubId);
    expect(after.pressing).toBeGreaterThanOrEqual(before.pressing);
    expect(Math.abs(after.pressing - before.pressing)).toBeLessThanOrEqual(15);
    expect(w.styled).toBeUndefined();
    const a = other(w);
    const back = loadCareer(pack, 7, clubId, saveCareer(w));
    expect(back.coaches).toEqual(w.coaches);
    expect(dnaOf(back, a)).toEqual(dnaOf(w, a));
  });

  it('a sacking frees the coach for the pool', () => {
    const w = fresh();
    const a = other(w);
    const old = coachAt(w, a)!.id;
    for (let k = 0; k < 40 && !w.vacancies?.[a]; k++)
      judgeCoaches(w, { home: a, away: clubId, competitionId: 'x' }, lose, 10 + k);
    expect(w.vacancies?.[a]).toBeDefined();
    expect(coachAt(w, a)).toBeUndefined();
    expect(coachesOf(w).free).toContain(old);
  });
});
