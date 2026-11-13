/**
 * Seeded generators for players, squads and staff (MC-013; 03-JOGADORES-E-BASE.md
 * §2, §3, §7.3; 06-COMISSAO-E-GOVERNANCA.md §2). Same seed, same output.
 * PARAMETERS: spreads, age shape and squad template are design values.
 */
import {
  ATTRIBUTES,
  GOALKEEPING,
  MENTAL,
  PHYSICAL,
  TECHNICAL,
  TACTICAL,
  between,
  fork,
  next,
  pick,
  type AttributeId,
  type Attributes,
  type Rng,
  type RoleId,
} from '@decabeca/match-engine';
import { ROLE_WEIGHTS } from '../player/ratings';
import type { PackPlayer } from '../pack/schema';
import { FIRST_NAMES, LAST_NAMES, NICKNAMES } from './names';

type Position = PackPlayer['positions'][number]['position'];

const clamp99 = (v: number) => Math.max(1, Math.min(99, Math.round(v)));
/** Sum of three uniforms: a cheap bell curve in [-1, 1] (only + − × ÷). */
const bell = (r: Rng) => (next(r) + next(r) + next(r)) / 1.5 - 1;

/** Main role used to shape the attributes of each position. */
const POSITION_ROLE: Record<Position, RoleId> = {
  GK: 'goalkeeper',
  CB: 'centreBack',
  RB: 'supportFullBack',
  LB: 'supportFullBack',
  DM: 'anchor',
  CM: 'boxToBox',
  RM: 'wideWinger',
  LM: 'wideWinger',
  AM: 'playmaker',
  RW: 'wideWinger',
  LW: 'insideForward',
  SS: 'falseNine',
  ST: 'advancedForward',
};

/** Peak age by position (03 §3: forwards near 25, centre-backs near 27, keepers +3). */
const PEAK: Record<Position, number> = {
  GK: 30,
  CB: 27,
  RB: 26,
  LB: 26,
  DM: 27,
  CM: 26,
  RM: 25,
  LM: 25,
  AM: 26,
  RW: 25,
  LW: 25,
  SS: 25,
  ST: 25,
};

const GK_SET = new Set<AttributeId>(GOALKEEPING);
const PHYS_SET = new Set<AttributeId>(PHYSICAL);
const MENTAL_SET = new Set<AttributeId>([...MENTAL, ...TACTICAL]); // perception and tactics grow like the mind (ADR-019)
const TECH_SET = new Set<AttributeId>(TECHNICAL);

/**
 * Attributes for a player of `quality` (the mean of the role's key attributes,
 * roughly 30..85) at `position` and `age`.
 */
export function generateAttributes(
  r: Rng,
  position: Position,
  quality: number,
  age: number,
): Attributes {
  const weights = new Map(ROLE_WEIGHTS[POSITION_ROLE[position]]);
  const keeper = position === 'GK';
  // Youth and veterans: physical follows age, mental grows with it (03 §3 table).
  const fromPeak = age - PEAK[position];
  const physicalShift = fromPeak <= 0 ? -0.6 * Math.max(0, -fromPeak - 4) : -1.6 * fromPeak;
  const mentalShift = fromPeak < 0 ? 0.9 * fromPeak : 0.5 * Math.min(fromPeak, 4);
  const out = {} as Attributes;
  for (const a of ATTRIBUTES) {
    const w = weights.get(a) ?? 0;
    let v = quality - 12 + w * 60 + bell(r) * 9;
    if (!keeper && GK_SET.has(a)) v = 8 + bell(r) * 5;
    else if (keeper && TECH_SET.has(a) && w === 0) v = 22 + bell(r) * 8;
    else if (PHYS_SET.has(a)) v += physicalShift;
    else if (MENTAL_SET.has(a)) v += mentalShift;
    out[a] = clamp99(v);
  }
  return out;
}

const SECOND_POSITIONS: Partial<Record<Position, Position[]>> = {
  RW: ['RM'],
  LW: ['LM'],
  AM: ['SS', 'CM'],
  CM: ['DM'],
  DM: ['CB'],
  RB: ['RM'],
  LB: ['LM'],
  ST: ['SS'],
};

export function generatePlayer(
  seed: Rng,
  opts: { id: string; position: Position; quality: number; clubId: string | null; season: number },
): PackPlayer {
  const r = fork(seed, opts.id);
  const age = Math.round(between(r, 17, 35) * 0.5 + between(r, 20, 31) * 0.5);
  const attributes = generateAttributes(r, opts.position, opts.quality, age);
  const month = 1 + pick(r, 12);
  const day = 1 + pick(r, 28);
  const second = SECOND_POSITIONS[opts.position];
  const score = () => 4 + pick(r, 15);
  const first = FIRST_NAMES[pick(r, FIRST_NAMES.length)]!;
  const last = LAST_NAMES[pick(r, LAST_NAMES.length)]!;
  const nick = next(r) < 0.25 ? NICKNAMES[pick(r, NICKNAMES.length)] : undefined;
  const ceilingBonus = Math.max(0, 26 - age) * 1.6;
  const ceil = (v: number) => clamp99(v + ceilingBonus + between(r, 0, 6));
  const gen = { origin: 'generated' as const, confidence: 'high' as const };
  return {
    id: opts.id,
    name: `${first} ${last}`,
    ...(nick ? { knownAs: nick } : {}),
    birthDate: `${opts.season - age}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    nationality: 'BR',
    heightCm: Math.round(
      (opts.position === 'GK' || opts.position === 'CB' ? 186 : 177) + bell(r) * 8,
    ),
    foot: next(r) < 0.72 ? 'right' : next(r) < 0.9 ? 'left' : 'both',
    positions: [
      { position: opts.position, level: 3 },
      ...(second ?? []).map((p) => ({ position: p, level: 2 })),
    ],
    attributes,
    potential: {
      ceiling: {
        technical: ceil(opts.quality + 4),
        mental: ceil(opts.quality + 6),
        physical: ceil(opts.quality + 2),
      },
      learning: 4 + pick(r, 15),
      physicalCurve: next(r) < 0.2 ? 'early' : next(r) < 0.8 ? 'normal' : 'late',
      peakAge: PEAK[opts.position] + pick(r, 3) - 1,
    },
    personality: {
      professionalism: score(),
      ambition: score(),
      loyalty: score(),
      temperament: score(),
      resilience: score(),
      sociability: score(),
    },
    hidden: {
      consistency: score(),
      bigMatches: score(),
      injuryProneness: score(),
      adaptability: score(),
      versatility: score(),
    },
    traits: [],
    clubId: opts.clubId,
    contract: opts.clubId
      ? {
          wage: Math.round(opts.quality * opts.quality * 9) * 10,
          until: `${opts.season + 1 + pick(r, 3)}-12-31`,
          releaseFee: null,
        }
      : undefined,
    field: { identity: gen, attributes: gen, personality: gen, hidden: gen },
  };
}

/** Squad template: 25 players, every one of the 13 positions covered at level ≥ 2 (03 §1.3). */
export const SQUAD: Position[] = [
  'GK',
  'GK',
  'GK',
  'CB',
  'CB',
  'CB',
  'CB',
  'RB',
  'RB',
  'LB',
  'LB',
  'DM',
  'DM',
  'CM',
  'CM',
  'CM',
  'AM',
  'AM',
  'RW',
  'RW',
  'LW',
  'LW',
  'ST',
  'ST',
  'ST',
];

/** A squad around `strength`; starters (first of each position pair) are a bit better. */
export function generateSquad(
  seed: Rng,
  opts: { clubId: string; strength: number; season: number },
): PackPlayer[] {
  const r = fork(seed, `squad:${opts.clubId}`);
  const seen = new Map<Position, number>();
  return SQUAD.map((position, i) => {
    const n = seen.get(position) ?? 0;
    seen.set(position, n + 1);
    const quality = opts.strength + (n === 0 ? 4 : n === 1 ? 0 : -5) + bell(r) * 4;
    return generatePlayer(r, {
      id: `${opts.clubId}-p${String(i + 1).padStart(2, '0')}`,
      position,
      quality,
      clubId: opts.clubId,
      season: opts.season,
    });
  });
}
