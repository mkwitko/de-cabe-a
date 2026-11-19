/**
 * Shot outcome and execution edges shared by both engine levels (02 §7, §12):
 * xG is the chance; finishing, composure, the keeper, fatigue and the home crowd
 * shift conversion; a third of shots on average reach the target. PARAMETERS.
 */
import type { Attributes } from '../contract';
import { weighted } from './duel';

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Home advantage (02 §11: about 47.6% home wins; without a crowd it shrinks by a
 * sixth to a third, never to zero): the home side executes a little better.
 * PARAMETERS: base and crowd share.
 */
export const homeEdge = (crowd: number, team: 0 | 1) => (team === 0 ? 0.08 + 0.14 * crowd : 0);

/** Finishing and composure shift conversion by −25%..+25% between 40 and 90 (02 §7). PARAMETER. */
export const finisherFactor = (a: Attributes, header: boolean, far = false) =>
  1 +
  (header
    ? weighted(a, { heading: 0.6, jumping: 0.2, composure: 0.2 })
    : far
      ? weighted(a, { longShots: 0.6, technique: 0.25, composure: 0.15 })
      : weighted(a, { finishing: 0.6, composure: 0.25, technique: 0.15 })) -
  0.65;

export const keeperFactor = (k: Attributes | undefined) =>
  k
    ? 1 -
      0.8 *
        (weighted(k, { reflexes: 0.4, handling: 0.2, oneOnOne: 0.2, gkPositioning: 0.2 }) - 0.65)
    : 1.6;

export interface ShotRoll {
  /** xG of the chance and the share of the goal mouth not covered by bodies (1 = clear). */
  chance: number;
  through: number;
  header: boolean;
  /** From outside 18 m of the goal line (long-shot attributes). */
  far: boolean;
  penalty: boolean;
  shooter: Attributes;
  keeper: Attributes | undefined;
  stamina: number;
  /** Weaker-foot factor of this strike (1 = strong foot). */
  foot: number;
  pressure: number;
  /** homeEdge of the shooting side and of the other side. */
  edge: number;
  edgeAgainst: number;
}

/** Chance of a goal and of the shot reaching the target. */
export function shotOdds(r: ShotRoll): { pGoal: number; pOn: number } {
  const pGoal = clamp(
    (r.chance / r.through) *
      finisherFactor(r.shooter, r.header, r.far) *
      (r.header ? 1 : 1 / r.foot) *
      keeperFactor(r.keeper) *
      // A tired finisher strikes it less cleanly (PARAMETER: −15% at zero stamina).
      (1 - 0.15 * (1 - r.stamina)) *
      (1 + r.edge - r.edgeAgainst),
    0.002,
    0.97,
  );
  const skill = r.header
    ? weighted(r.shooter, { heading: 0.7, jumping: 0.3 })
    : weighted(r.shooter, { finishing: 0.6, technique: 0.4 });
  // On target (PARAMETERS): a third of shots on average (02 §11).
  const pOn = r.penalty
    ? 0.92
    : clamp(
        Math.max(
          pGoal + 0.04,
          0.28 + 0.3 * (skill - 0.6) - 0.08 * r.pressure - 0.04 * (1 - r.stamina) + 0.6 * r.chance,
        ),
        0,
        0.98,
      );
  return { pGoal, pOn };
}

/** Passing skill: the keeper's passing is his distribution (ADR-019). */
export const passSkill = (a: Attributes, keeper: boolean) =>
  keeper
    ? weighted(a, { distribution: 0.6, passing: 0.25, composure: 0.15 })
    : weighted(a, { passing: 0.6, technique: 0.25, composure: 0.15 });

/** Chance a save is held rather than parried (PARAMETERS). */
export const holdChance = (k: Attributes) =>
  0.35 + 0.45 * weighted(k, { handling: 0.7, reflexes: 0.3 });

/** Error growth of a kick with the weaker foot (ADR-019); two-footed players have none. PARAMETER. */
export const weakFootError = (a: Attributes) => 1 + 0.8 * (1 - a.weakFoot / 99);

/**
 * Angular error spread of a pass in radians (PARAMETERS): passing skill (passSkill), pressure
 * against press resistance (duel.ts pressResistance), distance, fatigue and the home edge.
 * `firstTime` multiplies it.
 */
export function passSigma(
  skill: number,
  resistance: number,
  pressure: number,
  d: number,
  stamina: number,
  edge: number,
  firstTime = 1,
): number {
  return (
    (0.012 +
      0.05 * (1 - skill) +
      0.04 * pressure * (1.3 - resistance) +
      0.0006 * d +
      0.03 * (1 - stamina)) *
    (1 - edge) *
    firstTime
  );
}
