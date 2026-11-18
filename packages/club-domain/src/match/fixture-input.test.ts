import { MatchInputSchema, type MatchResult } from '@decabeca/match-engine';
import { describe, expect, it } from 'vitest';
import { matchesOn, nextDay, runSeason, startSeason, type Outcome } from '../competition/season';
import { generateMiniPack } from '../generate/pack';
import { matchInputFor, outcomeOf } from './fixture-input';

describe('MC-179 fixture to engine input', () => {
  const pack = generateMiniPack();
  const s = startSeason(pack, { seed: 1 });
  const id = matchesOn(s, nextDay(s)!)[0]!;

  it('builds a valid input; home crowd, home city; the same input every time', () => {
    const input = matchInputFor(pack, s, id);
    expect(MatchInputSchema.safeParse(input).success).toBe(true);
    expect(input).toEqual(matchInputFor(pack, s, id));
    const m = s.calendar.matches.get(id)!;
    expect(input.teams[0].players.every((p) => p.id.startsWith(m.home))).toBe(true);
    expect(input.conditions.crowd).toBeGreaterThan(0);
    // Never tells the engine whose team is the user's (ADR-013 item 7): nothing but the contract.
    expect(Object.keys(input).sort()).toEqual([
      'conditions',
      'engineVersion',
      'rules',
      'seed',
      'teams',
    ]);
  });

  it('a single knockout game asks for extra time and penalties; a league game does not', async () => {
    expect(matchInputFor(pack, s, id).rules).toMatchObject({ extraTime: false, penalties: false });
    const done = startSeason(pack, { seed: 1 });
    const draw = {
      goals: [1, 1] as [number, number],
      shootout: null,
      cards: [
        [0, 0],
        [0, 0],
      ] as Outcome['cards'],
    };
    await runSeason(done, async (ids) => ids.map(() => draw));
    const semi = matchInputFor(pack, done, 'dev-league/semi/r0/t0/l0');
    expect(semi.rules).toMatchObject({ extraTime: true, penalties: true, substitutions: 5 });
  });

  it('outcome takes goals, shoot-out and cards from the result', () => {
    const stats = (goals: number, y: number, r: number) =>
      ({ goals, yellowCards: y, redCards: r }) as MatchResult['stats'][0];
    const result = {
      score: [2, 1],
      shootout: null,
      stats: [stats(2, 3, 0), stats(1, 1, 1)],
    } as unknown as MatchResult;
    expect(outcomeOf(result)).toEqual({
      goals: [2, 1],
      shootout: null,
      cards: [
        [3, 0],
        [1, 1],
      ],
    });
  });
});
