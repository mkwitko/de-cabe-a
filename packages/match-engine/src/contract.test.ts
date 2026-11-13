import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import * as root from './index';
import {
  ATTRIBUTES,
  MatchInputSchema,
  MatchResultSchema,
  MessageSchema,
  type MatchInput,
  type PlayerInput,
} from './contract';

const shape = Array.from({ length: 11 }, (_, i) => ({ x: 10 + i * 5, y: 34 }));

function player(id: string): PlayerInput {
  return {
    id,
    attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, 60])) as PlayerInput['attributes'],
    hidden: { consistency: 10, bigMatches: 10, injuryProneness: 10 },
    traits: [],
    positions: { CM: 3 },
    preferredFoot: 'right',
    heightCm: 180,
    condition: 1,
    morale: 0.5,
    familiarity: 1,
  };
}

function team(prefix: string) {
  return {
    players: Array.from({ length: 16 }, (_, i) => player(`${prefix}${i}`)),
    plan: {
      shapes: { inPossession: shape, outOfPossession: shape },
      team: {
        buildUp: 'mixed' as const,
        tempo: 3,
        width: 3,
        risk: 3,
        progression: 'vertical' as const,
        finalThird: { crosses: 3, throughBalls: 3, boxPresence: 3, shootFromDistance: 3 },
        onLoss: 'counterPress' as const,
        onWin: 'counter' as const,
        block: 'mid' as const,
        lineHeight: 3,
        compactness: 3,
        pressIntensity: 3,
        pressTriggers: ['backPass' as const],
        forceDirection: null,
        offsideTrap: false,
        timeWasting: 0,
        restDefence: 3,
      },
      roles: Array(11).fill('boxToBox'),
      individual: Array.from({ length: 11 }, () => ({})),
      marking: [],
      setPieces: {},
    },
    coach: { gameReading: 50, flexibility: 50 },
  };
}

const input: MatchInput = {
  engineVersion: 0,
  seed: 42,
  teams: [team('h'), team('a')],
  conditions: { crowd: 1, altitudeM: 0, pitch: 'good', weather: 'clear', refereeStrictness: 0.5 },
  rules: {
    substitutions: 5,
    substitutionWindows: 3,
    extraTime: false,
    penalties: false,
    videoReferee: true,
  },
};

describe('MC-145 contract', () => {
  it('accepts a full match input', () => {
    expect(MatchInputSchema.parse(input)).toEqual(input);
  });

  it('has 28 outfield and 6 goalkeeper attributes', () => {
    expect(ATTRIBUTES).toHaveLength(34);
  });

  it('never learns which team is the user (ADR-013 item 7)', () => {
    expect(MatchInputSchema.safeParse({ ...input, userTeam: 0 }).success).toBe(false);
    const t = { ...input.teams[0], isUser: true };
    expect(MatchInputSchema.safeParse({ ...input, teams: [t, input.teams[1]] }).success).toBe(
      false,
    );
  });

  it('rejects a player in both teams and an attribute out of range', () => {
    const dup = team('h');
    expect(MatchInputSchema.safeParse({ ...input, teams: [team('h'), dup] }).success).toBe(false);
    const bad = team('x');
    bad.players[0]!.attributes.pace = 100;
    expect(MatchInputSchema.safeParse({ ...input, teams: [bad, team('a')] }).success).toBe(false);
  });

  it('messages are keys, never sentences (ADR-017)', () => {
    expect(
      MessageSchema.safeParse({ key: 'match.cause.keeper', params: { saves: 7 } }).success,
    ).toBe(true);
    expect(MessageSchema.safeParse({ key: 'O goleiro defendeu 7', params: {} }).success).toBe(
      false,
    );
  });

  it('result schema is strict', () => {
    const stats = {
      goals: 0,
      shots: 0,
      shotsOnTarget: 0,
      xg: 0,
      possession: 0.5,
      passes: 0,
      passesCompleted: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      corners: 0,
      offsides: 0,
    };
    const result = {
      engineVersion: 0,
      score: [0, 0],
      shootout: null,
      stats: [stats, stats],
      players: [],
      events: [],
      explanation: { creation: 0, conversion: 0, factors: [], unexplained: 0 },
    };
    expect(MatchResultSchema.safeParse(result).success).toBe(true);
    expect(MatchResultSchema.safeParse({ ...result, text: 'oi' }).success).toBe(false);
  });

  it('root exports only the contract, the generator and simulate*', () => {
    const internals = ['anchor', 'step', 'createSandbox', 'moveTowards', 'SHAPES', 'frame'];
    for (const name of internals) expect(root).not.toHaveProperty(name);
    expect(root).toHaveProperty('simulateSandbox');
    expect(root).toHaveProperty('MatchInputSchema');
  });
});

describe('MC-145 lint: deep imports of the engine fail outside the package', () => {
  const cwd = fileURLToPath(new URL('../../..', import.meta.url));
  const eslint = new ESLint({ cwd });
  const lint = async (filePath: string, code: string) =>
    (await eslint.lintText(code, { filePath }))[0]!.messages.filter(
      (m) => m.ruleId === 'no-restricted-imports',
    );

  it.each(['apps/api/src/x.ts', 'apps/web/src/x.ts', 'packages/contracts/src/x.ts'])(
    '%s',
    async (file) => {
      expect(
        await lint(file, "import { x } from '@decabeca/match-engine/src/shape';\n"),
      ).toHaveLength(1);
      expect(
        await lint(file, "import { x } from '../../packages/match-engine/src/shape';\n"),
      ).toHaveLength(1);
      expect(
        await lint(file, "import { MatchInputSchema } from '@decabeca/match-engine';\n"),
      ).toHaveLength(0);
    },
  );
});
