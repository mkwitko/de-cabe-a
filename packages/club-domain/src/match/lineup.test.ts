import {
  TeamInputSchema,
  advanceMatch,
  defaultPlan,
  simulateMatch,
  MatchInputSchema,
} from '@decabeca/match-engine';
import { describe, expect, it } from 'vitest';
import { generateMiniPack } from '../generate/pack';
import { teamForMatch } from './lineup';

const pack = generateMiniPack();

describe('teamForMatch', () => {
  it('picks a valid eleven and bench for every club and formation', () => {
    for (const club of pack.clubs)
      for (const f of ['4-3-3', '4-4-2', '4-2-3-1']) {
        const t = teamForMatch(pack, club.id, defaultPlan(f));
        expect(TeamInputSchema.safeParse(t).success).toBe(true);
        expect(t.players[0]!.positions.GK).toBeDefined();
        expect(t.players.slice(1, 11).every((p) => p.positions.GK === undefined)).toBe(true);
      }
  });

  it('plays a friendly between two pack clubs, and chunks agree with the full run', () => {
    const [a, b] = pack.clubs;
    const input = MatchInputSchema.parse({
      engineVersion: 0,
      seed: 42,
      teams: [
        teamForMatch(pack, a!.id, defaultPlan('4-3-3')),
        teamForMatch(pack, b!.id, defaultPlan('4-4-2')),
      ],
      conditions: {
        crowd: 0.7,
        altitudeM: 0,
        pitch: 'good',
        weather: 'clear',
        refereeStrictness: 0.5,
      },
      rules: {
        substitutions: 5,
        substitutionWindows: 3,
        extraTime: false,
        penalties: false,
        videoReferee: true,
      },
    });
    const full = simulateMatch(input);
    const c = advanceMatch(input, [], 4000, 50);
    expect(c.frames).toHaveLength(50);
    expect(c.frames[0]![0]).toBe(4000);
    const end = advanceMatch(input, [], 100_000, 10);
    expect(end.finished).toBe(true);
    expect(end.result!.score).toEqual(full.score);
  });
});
