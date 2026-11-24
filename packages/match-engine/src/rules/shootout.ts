/**
 * The penalty shoot-out after a level knockout (IFAB Law 10): five kicks each, alternating, then
 * one each until a kick decides; every player on the pitch kicks before anyone kicks twice.
 *
 * Rates (sources in FONTES.md):
 *  - Shoot-out kicks are scored about 75% of the time, a few points under in-game penalties
 *    (arXiv 2310.04797, 2023: 15 of 20 against 16 of 20); in World Cups, Euros and Copas América
 *    78.9% (Jordet et al. 2007).
 *  - Skill matters less than nerve: Jordet et al. 2007 find the importance of the kick and
 *    fatigue weigh more than the taker's skill. A kick that must be scored to stay alive is
 *    taken worse (PARÂMETRO: 5 points).
 *  - Kicking first gives little or nothing (55:45 over 1,623 shoot-outs, 48.8% in recent European
 *    men's competitions): the first team is drawn and no edge is given.
 * The weights of skill, keeper and nerve below are PARÂMETRO.
 */
import type { Attributes } from '../contract';
import { next, type Rng } from '../random';

export interface Taker {
  id: string;
  attrs: Attributes;
  /** Hidden `bigMatches`, 1..20: nerve on the big occasion. */
  nerve: number;
  keeper: boolean;
}

export interface Kick {
  team: 0 | 1;
  playerId: string;
  scored: boolean;
  /** 1..5 the regular kicks, then sudden death. */
  round: number;
}

const BASE = 0.75;
/** Per point of the taker's kick rating over 65, and of the keeper's under it. */
const TAKER_WEIGHT = 0.003;
const KEEPER_WEIGHT = 0.002;
/** Per point of nerve over 10. */
const NERVE_WEIGHT = 0.006;
/** A kick missed means the shoot-out is lost. */
const MUST_SCORE = 0.05;
const MIN = 0.5;
const MAX = 0.92;

const kickRating = (a: Attributes) =>
  (2 * a.finishing + 2 * a.composure + a.technique + a.setPieces) / 6;
const keeperRating = (a: Attributes) => (2 * a.reflexes + a.oneOnOne + a.gkPositioning) / 4;

/** Chance this taker scores against this keeper; `mustScore` when a miss ends it. */
export function kickChance(t: Taker, keeper: Attributes, mustScore: boolean): number {
  const p =
    BASE +
    TAKER_WEIGHT * (kickRating(t.attrs) - 65) -
    KEEPER_WEIGHT * (keeperRating(keeper) - 65) +
    NERVE_WEIGHT * (t.nerve - 10) -
    (mustScore ? MUST_SCORE : 0);
  return Math.min(MAX, Math.max(MIN, p));
}

/** The order a coach sends them: best kickers first, the keeper last. */
const order = (team: Taker[]) =>
  [...team].sort(
    (a, b) =>
      Number(a.keeper) - Number(b.keeper) ||
      kickRating(b.attrs) - kickRating(a.attrs) ||
      (a.id < b.id ? -1 : 1),
  );

/**
 * Plays the shoot-out between the players on the pitch of each side. ponytail: a side with
 * fewer players does not make the other drop its extra ones (Law 10); add when red cards in
 * extra time matter.
 */
export function shootout(
  sides: [Taker[], Taker[]],
  keepers: [Attributes, Attributes],
  rng: Rng,
): { score: [number, number]; kicks: Kick[] } {
  const queue = [order(sides[0]), order(sides[1])];
  const first: 0 | 1 = next(rng) < 0.5 ? 0 : 1;
  const score: [number, number] = [0, 0];
  const taken: [number, number] = [0, 0];
  const kicks: Kick[] = [];
  for (let k = 0; ; k++) {
    const team = (k % 2 === 0 ? first : 1 - first) as 0 | 1;
    const other = (1 - team) as 0 | 1;
    const round = Math.floor(k / 2) + 1;
    const left = (side: 0 | 1) => Math.max(0, 5 - taken[side]);
    // Must score: the other side would win if this kick misses.
    const mustScore =
      round <= 5
        ? score[team] + left(team) - 1 < score[other]
        : team !== first && score[other] > score[team];
    const taker = queue[team]![taken[team] % queue[team]!.length]!;
    const scored = next(rng) < kickChance(taker, keepers[other], mustScore);
    if (scored) score[team]++;
    taken[team]++;
    kicks.push({ team, playerId: taker.id, scored, round });
    if (round <= 5) {
      if (score[0] + left(0) < score[1] || score[1] + left(1) < score[0]) break;
    } else if (taken[0] === taken[1] && score[0] !== score[1]) break;
  }
  return { score, kicks };
}
