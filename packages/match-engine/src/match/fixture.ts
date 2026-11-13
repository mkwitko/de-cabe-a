/**
 * Synthetic teams for tests, the bench and calibration runs (not a data pack:
 * real players come from club-domain packs). Deterministic by seed.
 */
import {
  ATTRIBUTES,
  GOALKEEPING,
  type MatchInput,
  type PlayerInput,
  type TacticalPlan,
  type TeamInput,
} from '../contract';
import { coachOf, defaultPlan } from '../presets';
import { between, fork, rngFrom } from '../random';

const POS: PlayerInput['positions'][] = [
  { GK: 3 },
  { RB: 3 },
  { CB: 3 },
  { CB: 3 },
  { LB: 3 },
  { DM: 3, CM: 2 },
  { CM: 3 },
  { CM: 3, AM: 2 },
  { RW: 3, RM: 2 },
  { ST: 3 },
  { LW: 3, LM: 2 },
];
const BENCH_POS: PlayerInput['positions'][] = [
  { GK: 3 },
  { CB: 3 },
  { RB: 3, LB: 2 },
  { CM: 3 },
  { AM: 3 },
  { RW: 3, LW: 3 },
  { ST: 3 },
];

export function teamInput(
  seed: number,
  strength = 65,
  plan: TacticalPlan = defaultPlan(),
  prefix = `t${seed}`,
): TeamInput {
  const r = rngFrom(seed);
  const players = [...POS, ...BENCH_POS].map((positions, i): PlayerInput => {
    const pr = fork(r, `p${i}`);
    const keeper = 'GK' in positions;
    const attributes = Object.fromEntries(
      ATTRIBUTES.map((a) => {
        const gk = (GOALKEEPING as readonly string[]).includes(a);
        const base = keeper === gk ? strength : 25;
        return [a, Math.round(Math.min(99, Math.max(1, base + between(pr, -10, 10))))];
      }),
    ) as PlayerInput['attributes'];
    return {
      id: `${prefix}-${i}`,
      attributes,
      hidden: { consistency: 10, bigMatches: 10, injuryProneness: 10 },
      traits: [],
      positions,
      preferredFoot: 'right',
      heightCm: Math.round(between(pr, 170, 192)),
      condition: 1,
      morale: 0.7,
      familiarity: 1,
    };
  });
  return { players, plan, coach: coachOf() };
}

export function matchInput(
  seed: number,
  home = teamInput(seed * 2 + 1),
  away = teamInput(seed * 2 + 2),
): MatchInput {
  return {
    engineVersion: 0,
    seed,
    teams: [home, away],
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
  };
}
