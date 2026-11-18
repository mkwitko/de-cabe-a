/**
 * The board, first cut (06 §2.8, §5.3): one goal for the season, one confidence, and the job
 * that hangs on it. The confidence moves after each of the person's matches by the result
 * against what the two squads promised, and by the cash; a season's end adds the goal. Low
 * confidence brings an ultimatum (points in a number of matches); failing it ends the job.
 * Integers only; every number is a PARÂMETRO, not calibrated.
 */
import type { Outcome } from '../competition/season';
import { divisionTable, type CareerWorld } from './advance';

export type Odds = 'favourite' | 'even' | 'underdog';
/** One line of why the confidence moved, for the screen: a fact and its points. */
export type BoardReason =
  | { kind: 'result'; result: 'W' | 'D' | 'L'; odds: Odds; value: number }
  | { kind: 'cash' | 'goalMet' | 'goalMissed' | 'ultimatumMet' | 'fairplay'; value: number };

export interface Board {
  /** 0..100. */
  confidence: number;
  /** Finish the division (or the group) at this position or better. */
  goal: number;
  /** Set under pressure: points still needed in the matches left. */
  ultimatum?: { matches: number; points: number };
  fired?: true;
  /** Why the confidence last moved. */
  last?: BoardReason[];
}

const START = 60;
/** Below this the board sets an ultimatum. */
const PRESSURE = 25;
const ULTIMATUM = { matches: 5, points: 7 } as const;
/** Where the confidence is put back when an ultimatum is met. */
const RELIEF = 35;
/** Strength points that make one side the favourite. */
const CLEAR_GAP = 3;
const BY_ODDS: Record<Odds, Record<'W' | 'D' | 'L', number>> = {
  // Each row sums to about nothing over the results a side of that standing should get
  // (a favourite wins half and loses a quarter; an even side wins and loses alike; an underdog
  // the reverse), so a club that does what was expected of it holds its confidence.
  favourite: { W: 2, D: -1, L: -3 },
  even: { W: 3, D: 0, L: -3 },
  underdog: { W: 4, D: 1, L: -2 },
};
/** A match played with the cash below zero. Light: the pack's money is not the person's doing. */
const IN_THE_RED = -1;
const GOAL_MET = 15;
const GOAL_MISSED = -10;

const clamp = (x: number) => Math.max(0, Math.min(100, x));

/** The goal for the table the club is in: one place below its rank by squad strength. */
export function goalFor(w: CareerWorld): number {
  const rows = divisionTable(w).rows;
  const mine = w.strength.get(w.clubId) ?? 0;
  const stronger = rows.filter((r) => (w.strength.get(r.clubId) ?? 0) > mine).length;
  return Math.max(1, Math.min(rows.length, stronger + 2));
}

/** The club's position in its table today, 1 = top. */
export const positionOf = (w: CareerWorld): number =>
  divisionTable(w).rows.findIndex((r) => r.clubId === w.clubId) + 1;

/** The board as it stands; before the first match, a fresh one with this season's goal. */
export const boardOf = (w: CareerWorld): Board =>
  w.board ?? { confidence: START, goal: goalFor(w) };

/** After one of the person's matches: the result, the cash, and the ultimatum if one runs. */
export function boardAfterMatch(
  w: CareerWorld,
  match: { home: string; away: string },
  o: Outcome,
): Board {
  const b = boardOf(w);
  if (b.fired) return b;
  const atHome = match.home === w.clubId;
  const [mine, theirs] = atHome ? o.goals : [o.goals[1], o.goals[0]];
  const result = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
  const gap =
    (w.strength.get(w.clubId) ?? 0) - (w.strength.get(atHome ? match.away : match.home) ?? 0);
  const odds: Odds = gap > CLEAR_GAP ? 'favourite' : gap < -CLEAR_GAP ? 'underdog' : 'even';
  const last: BoardReason[] = [{ kind: 'result', result, odds, value: BY_ODDS[odds][result] }];
  if (w.ledger.cash < 0) last.push({ kind: 'cash', value: IN_THE_RED });
  let confidence = clamp(b.confidence + last.reduce((s, r) => s + r.value, 0));
  const next: Board = { confidence, goal: b.goal, last };

  if (b.ultimatum) {
    const left = {
      matches: b.ultimatum.matches - 1,
      points: b.ultimatum.points - (result === 'W' ? 3 : result === 'D' ? 1 : 0),
    };
    if (left.points <= 0) {
      const lift = Math.max(0, RELIEF - confidence);
      confidence += lift;
      next.confidence = confidence;
      last.push({ kind: 'ultimatumMet', value: lift });
    } else if (left.matches <= 0) next.fired = true;
    else next.ultimatum = left;
  } else if (confidence < PRESSURE) next.ultimatum = { ...ULTIMATUM };
  return next;
}

/** At the season's end, before the turn: the goal against the final position. */
export function boardAfterSeason(w: CareerWorld): Board {
  const b = boardOf(w);
  if (b.fired) return b;
  const met = positionOf(w) <= b.goal;
  const value = met ? GOAL_MET : GOAL_MISSED;
  return {
    ...b,
    confidence: clamp(b.confidence + value),
    last: [{ kind: met ? 'goalMet' : 'goalMissed', value }],
  };
}
