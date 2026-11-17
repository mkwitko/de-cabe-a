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
  suggestedLineup,
  planOf,
} from './squad';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('squad and line-up', () => {
  it('lists the squad and suggests a valid eleven for every formation', () => {
    const w = openCareer(pack, 41, clubId);
    const squad = squadOf(w);
    expect(squad.length).toBeGreaterThanOrEqual(18);
    expect(squad.every((p) => p.age >= 15 && p.age <= 45 && p.best.rating > 0)).toBe(true);
    for (const formation of Object.keys(FORMATIONS)) {
      const l = suggestedLineup(w, formation);
      expect(new Set(l.xi).size).toBe(11);
      expect(() => setLineup(w, l)).not.toThrow();
    }
  });

  it('refuses a repeated player, a stranger and a keeper out of goal', () => {
    const w = openCareer(pack, 41, clubId);
    const l = suggestedLineup(w, '4-3-3');
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
    const l = suggestedLineup(w, '4-4-2');
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

  it('a worse eleven lowers the club strength the quick result reads', () => {
    const w = openCareer(pack, 41, clubId);
    const best = suggestedLineup(w, '4-3-3');
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
