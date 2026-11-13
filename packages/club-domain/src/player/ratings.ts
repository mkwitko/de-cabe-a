/**
 * Rating per role and six summaries (MC-012; 03-JOGADORES-E-BASE.md §2.2).
 * There is no single overall rating: a player is always "good for which role".
 * PARAMETER: the role weights below are design values, to be checked in the
 * preset tournament (MC-045) and by the owner's review of generated squads.
 */
import {
  GOALKEEPING,
  MENTAL,
  PHYSICAL,
  ROLES,
  TECHNICAL,
  type AttributeId,
  type Attributes,
  type RoleId,
} from '@decabeca/match-engine';

type Weights = Partial<Record<AttributeId, number>>;

/** Relative weights; normalised to sum 1 below. Unlisted attributes weigh zero. */
const RAW: Record<RoleId, Weights> = {
  goalkeeper: {
    reflexes: 5,
    handling: 4,
    oneOnOne: 3,
    commandOfArea: 3,
    gkPositioning: 4,
    distribution: 1,
    concentration: 1,
    jumping: 1,
  },
  sweeperKeeper: {
    reflexes: 4,
    handling: 3,
    oneOnOne: 4,
    commandOfArea: 2,
    gkPositioning: 3,
    distribution: 3,
    passing: 2,
    firstTouch: 1,
    decisions: 1,
    acceleration: 1,
  },
  centreBack: {
    marking: 4,
    tackling: 4,
    heading: 3,
    positioning: 4,
    strength: 2,
    jumping: 2,
    anticipation: 2,
    concentration: 2,
    pace: 1,
    composure: 1,
  },
  libero: {
    marking: 3,
    tackling: 3,
    positioning: 3,
    passing: 3,
    firstTouch: 2,
    composure: 2,
    decisions: 2,
    vision: 1,
    anticipation: 2,
    pace: 1,
  },
  supportFullBack: {
    tackling: 3,
    marking: 2,
    crossing: 3,
    pace: 3,
    acceleration: 2,
    stamina: 3,
    workRate: 2,
    positioning: 2,
    passing: 1,
    offTheBall: 1,
  },
  invertedFullBack: {
    tackling: 3,
    marking: 2,
    passing: 3,
    firstTouch: 2,
    decisions: 2,
    composure: 2,
    positioning: 2,
    teamwork: 2,
    stamina: 1,
    vision: 1,
  },
  wingBack: {
    crossing: 3,
    dribbling: 2,
    pace: 3,
    acceleration: 2,
    stamina: 4,
    workRate: 2,
    offTheBall: 2,
    tackling: 2,
    firstTouch: 1,
  },
  anchor: {
    tackling: 4,
    marking: 3,
    positioning: 4,
    anticipation: 3,
    concentration: 2,
    teamwork: 2,
    strength: 2,
    passing: 1,
    decisions: 1,
  },
  deepPlaymaker: {
    passing: 5,
    vision: 4,
    firstTouch: 3,
    technique: 2,
    composure: 3,
    decisions: 3,
    teamwork: 1,
    positioning: 1,
  },
  boxToBox: {
    stamina: 4,
    workRate: 3,
    passing: 2,
    tackling: 2,
    offTheBall: 2,
    finishing: 1,
    firstTouch: 1,
    decisions: 2,
    teamwork: 2,
    strength: 1,
    pace: 1,
  },
  playmaker: {
    passing: 4,
    vision: 5,
    technique: 3,
    firstTouch: 3,
    decisions: 3,
    composure: 2,
    dribbling: 2,
    offTheBall: 1,
  },
  wideWinger: {
    crossing: 4,
    dribbling: 4,
    pace: 4,
    acceleration: 3,
    agility: 2,
    technique: 2,
    offTheBall: 2,
    stamina: 1,
  },
  insideForward: {
    dribbling: 4,
    finishing: 4,
    acceleration: 3,
    pace: 2,
    technique: 2,
    offTheBall: 3,
    composure: 2,
    agility: 2,
    firstTouch: 1,
  },
  targetMan: {
    heading: 4,
    strength: 4,
    jumping: 3,
    finishing: 3,
    balance: 2,
    firstTouch: 2,
    teamwork: 1,
    aggression: 1,
    composure: 1,
  },
  falseNine: {
    passing: 3,
    vision: 3,
    firstTouch: 3,
    technique: 3,
    dribbling: 2,
    finishing: 2,
    decisions: 2,
    offTheBall: 2,
    composure: 1,
  },
  advancedForward: {
    finishing: 5,
    offTheBall: 4,
    acceleration: 3,
    pace: 3,
    composure: 3,
    firstTouch: 2,
    dribbling: 1,
    anticipation: 1,
  },
};

const normalise = (w: Weights): [AttributeId, number][] => {
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  return Object.entries(w).map(([k, v]) => [k as AttributeId, v / total]);
};
export const ROLE_WEIGHTS: Record<RoleId, [AttributeId, number][]> = Object.fromEntries(
  ROLES.map((r) => [r, normalise(RAW[r])]),
) as Record<RoleId, [AttributeId, number][]>;

/** How well these attributes do what the role asks, 1..99. */
export function roleRating(a: Attributes, role: RoleId): number {
  let s = 0;
  for (const [k, w] of ROLE_WEIGHTS[role]) s += a[k] * w;
  return Math.round(s);
}

/** The roles this player is best at, best first. */
export const bestRoles = (a: Attributes, n = 3): { role: RoleId; rating: number }[] =>
  ROLES.map((role) => ({ role, rating: roleRating(a, role) }))
    .sort((x, y) => y.rating - x.rating)
    .slice(0, n);

const mean = (a: Attributes, keys: readonly AttributeId[]) =>
  Math.round(keys.reduce((s, k) => s + a[k], 0) / keys.length);

const ATTACK: AttributeId[] = [
  'finishing',
  'dribbling',
  'offTheBall',
  'crossing',
  'firstTouch',
  'composure',
  'acceleration',
];
const DEFENCE: AttributeId[] = [
  'tackling',
  'marking',
  'positioning',
  'anticipation',
  'heading',
  'strength',
  'concentration',
];

/** The six summaries the screen shows (03 §2.2). */
export const summaries = (a: Attributes) => ({
  technical: mean(a, TECHNICAL),
  mental: mean(a, MENTAL),
  physical: mean(a, PHYSICAL),
  attack: mean(a, ATTACK),
  defence: mean(a, DEFENCE),
  goalkeeping: mean(a, GOALKEEPING),
});
