import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '@decabeca/match-engine';
import { generateDevPack } from '../generate/pack';
import { careerMatch, nextDecision, openCareer, playDecision } from './advance';
import { loadCareer, saveCareer } from './save';
import {
  lineupOf,
  lineupStrength,
  setLineup,
  slotRatings,
  squadOf,
  bestLineup,
  planOf,
  slotFamiliarity,
  slotLevels,
  slotPositions,
  isForeign,
} from './squad';
import { jobOffers } from './start';
import { RIVAL_DRILL, drilled, myStrength, trainingOn } from './training';
import { roleRating } from '../player/ratings';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('squad and line-up', () => {
  it('lists the squad and suggests a valid eleven for every formation', () => {
    const w = openCareer(pack, 41, clubId);
    const squad = squadOf(w);
    expect(squad.length).toBeGreaterThanOrEqual(18);
    expect(squad.every((p) => p.age >= 15 && p.age <= 45 && p.best.rating > 0)).toBe(true);
    for (const formation of Object.keys(FORMATIONS)) {
      const l = bestLineup(w, formation);
      expect(new Set(l.xi).size).toBe(11);
      expect(() => setLineup(w, l)).not.toThrow();
    }
  });

  it('fields a short squad: a second keeper plays out of goal', () => {
    const mine = pack.players.filter((p) => p.clubId === clubId);
    const gk = (p: (typeof mine)[number]) => p.positions.some((x) => x.position === 'GK');
    const kept = [...mine.filter(gk).slice(0, 2), ...mine.filter((p) => !gk(p)).slice(0, 9)];
    const others = pack.players.filter((p) => p.clubId !== clubId);
    const l = bestLineup({ pack: { ...pack, players: [...others, ...kept] }, clubId }, '4-3-3');
    expect(new Set(l.xi).size).toBe(11);
  });

  it('refuses a repeated player, a stranger and a keeper out of goal', () => {
    const w = openCareer(pack, 41, clubId);
    const l = bestLineup(w, '4-3-3');
    const stranger = pack.players.find((p) => p.clubId && p.clubId !== clubId)!.id;
    expect(() => setLineup(w, { ...l, xi: [...l.xi.slice(0, 10), l.xi[1]!] })).toThrow();
    expect(() => setLineup(w, { ...l, xi: [...l.xi.slice(0, 10), stranger] })).toThrow();
    expect(() => setLineup(w, { ...l, xi: [l.xi[1]!, l.xi[0]!, ...l.xi.slice(2)] })).toThrow();
    expect(() => setLineup(w, { formation: '9-0-1', xi: l.xi })).toThrow();
    expect(w.lineup).toBeUndefined();
  });

  it('the picked eleven starts the engine match, in order, and survives the save', () => {
    const w = openCareer(pack, 41, clubId);
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    const coach = careerMatch(w, d);
    expect(coach.input.teams[coach.mine].players.slice(0, 11).map((p) => p.id)).toEqual(
      lineupOf(w).xi,
    );
    // Swap two outfield starters: the engine gets them in the swapped roles.
    const l = bestLineup(w, '4-4-2');
    const xi = [...l.xi];
    [xi[2], xi[9]] = [xi[9]!, xi[2]!];
    setLineup(w, { formation: '4-4-2', xi });
    const mine = careerMatch(w, d);
    const team = mine.input.teams[mine.mine];
    expect(team.players.slice(0, 11).map((p) => p.id)).toEqual(xi);
    expect(team.plan.roles).toEqual(FORMATIONS['4-4-2']!.roles);
    expect(team.players.length).toBe(18);
    const again = loadCareer(pack, 41, clubId, saveCareer(w));
    expect(again.lineup).toEqual({ formation: '4-4-2', xi });
    // The team instructions ride with the eleven into the engine's plan.
    expect(planOf(w)).toMatchObject({ block: 'mid', tempo: 3 });
    const plan = { block: 'high', pressIntensity: 5, tempo: 4, width: 2, risk: 1 } as const;
    setLineup(w, { formation: '4-4-2', xi, plan });
    expect(careerMatch(w, d).input.teams[mine.mine].plan.team).toMatchObject(plan);
    expect(planOf(loadCareer(pack, 41, clubId, saveCareer(w)))).toEqual(plan);
    expect(() => setLineup(w, { formation: '4-4-2', xi, plan: { ...plan, tempo: 9 } })).toThrow();
  });

  it('a player out of his position is worth less, in the rating and in the engine', () => {
    const w = openCareer(pack, 41, clubId);
    const l = bestLineup(w, '4-3-3');
    expect(() => setLineup(w, l)).not.toThrow();
    const levels = slotLevels(w, '4-3-3');
    // The coach's eleven by position: most starters play where they know.
    expect(l.xi.filter((id, i) => levels.get(id)![i]! >= 2).length).toBeGreaterThanOrEqual(8);
    // A centre-forward at centre-back: same attributes, lower rating than a role-only reading.
    const striker = pack.players.find(
      (p) =>
        p.clubId === clubId &&
        p.positions.some((x) => x.position === 'ST') &&
        !p.positions.some((x) => x.position === 'CB'),
    )!;
    expect(slotPositions('4-3-3')[2]).toEqual(['CB']);
    expect(levels.get(striker.id)![2]).toBe(0);
    expect(slotRatings(w, '4-3-3').get(striker.id)![2]).toBe(
      Math.round(roleRating(striker.attributes, 'centreBack') * 0.75),
    );
    const xi = l.xi.filter((id) => id !== striker.id);
    const improvised = {
      formation: '4-3-3',
      xi: [...xi.slice(0, 2), striker.id, ...xi.slice(3, 11)],
    };
    if (new Set(improvised.xi).size !== 11) improvised.xi[10] = l.xi[2]!;
    setLineup(w, improvised);
    expect(slotFamiliarity(w, improvised)[2]).toBe(0.6);
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    const m = careerMatch(w, d);
    // In the engine: his position's share of the team's drill (training.ts).
    expect(m.input.teams[m.mine].players[2]).toMatchObject({
      id: striker.id,
      familiarity: 0.6 * drilled(0.75),
    });
    expect(m.input.teams[m.mine].players[11]!.familiarity).toBe(1);
  });

  it('a worse eleven lowers the club strength the quick result reads', () => {
    const w = openCareer(pack, 41, clubId);
    const best = bestLineup(w, '4-3-3');
    const fit = slotRatings(w, '4-3-3');
    // The weakest outfield players in the outfield slots, same keeper.
    const outfield = squadOf(w)
      .filter((p) => !p.positions.includes('GK'))
      .sort((a, b) => a.best.rating - b.best.rating || (a.id < b.id ? -1 : 1))
      .slice(0, 10)
      .map((p) => p.id);
    const worst = { formation: '4-3-3', xi: [best.xi[0]!, ...outfield] };
    expect(lineupStrength(w, worst)).toBeLessThan(lineupStrength(w, best));
    expect(fit.get(best.xi[0]!)!.length).toBe(11);
    // One measure for every club: the best eleven by position, rested, on a normal week.
    // So the person's club starts level with what the coach would field, and a pick can raise
    // or lower it.
    expect(myStrength(w, trainingOn(w, w.day))).toBe(w.strength.get(clubId));
    expect(w.strength.get(clubId)).toBe(lineupStrength(w, lineupOf(w)));
    const d0 = nextDecision(w);
    if (d0.kind !== 'match') throw new Error('no match');
    const m = careerMatch(w, d0);
    const theirs = m.input.teams[m.mine === 0 ? 1 : 0].players;
    expect(theirs.slice(0, 11).every((p) => p.familiarity <= drilled(RIVAL_DRILL))).toBe(true);
    // Without a pick, results are the ones the coach's eleven always gave.
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    const plain = playDecision(openAt(w.day), d);
    expect(playDecision(w, d)).toEqual(plain);
  });
});

function openAt(day: number) {
  const w = openCareer(pack, 41, clubId, day);
  nextDecision(w);
  return w;
}

it('a foreigner with a Brazilian passport is not a foreigner in the squad', () => {
  expect(isForeign({ nationality: 'AR' })).toBe(true);
  expect(isForeign({ nationality: 'IT', secondNationality: 'BR' })).toBe(false);
  expect(isForeign({ nationality: 'BR', secondNationality: 'IT' })).toBe(false);
});
