/**
 * The board, first cut (06 §2.8, §5.3): one goal for the season, one confidence, and the job
 * that hangs on it. The confidence moves after each of the person's matches by the result
 * against what the two squads promised, and by the cash; a season's end adds the goal. Low
 * confidence brings an ultimatum (points in a number of matches); failing it ends the job.
 * Integers only; every number is a PARÂMETRO, not calibrated.
 */
import { moodOf } from '../match/stadium';
import type { Outcome } from '../competition/season';
import { divisionTable, type CareerWorld } from './advance';
import { clubsOf, type Horizon } from './clubs';

export type Odds = 'favourite' | 'even' | 'underdog';
/** One line of why the confidence moved, for the screen: a fact and its points. */
export type BoardReason =
  | { kind: 'result'; result: 'W' | 'D' | 'L'; odds: Odds; value: number }
  | {
      kind:
        'cash' | 'goalMet' | 'goalMissed' | 'ultimatumMet' | 'fairplay' | 'protest' | 'homegrown';
      value: number;
    };

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
/**
 * A match played with the wages in arrears (arrears.ts: past the credit line). Not merely below
 * zero: most clubs outside the Série A start in debt, and a board does not blame the coach for
 * what he inherited; it does when the players go unpaid on his watch.
 */
const IN_ARREARS = -1;
/** Supporters' mood (stadium.ts `moodOf`) at or under which a defeat brings a protest. */
export const PROTEST = -60;
const GOAL_MET = 15;
const GOAL_MISSED = -10;

const clamp = (x: number) => Math.max(0, Math.min(100, x));

/**
 * Places below its rank by squad strength the goal sits, by the directors' horizon: the
 * short-sighted want it now, the far-sighted give time (04 §4.7).
 */
const GOAL_SLACK: Record<Horizon, number> = { short: 1, medium: 2, long: 3 };
/** Extra points a defeat costs with the board, by horizon: patience. */
const LOSS_WEIGHT: Record<Horizon, number> = { short: -1, medium: 0, long: 1 };

const horizonOf = (w: CareerWorld): Horizon => clubsOf(w)[w.clubId]?.directors.horizon ?? 'medium';

/** The goal for the table the club is in, from its rank by squad strength and the directors. */
export function goalFor(w: CareerWorld): number {
  const rows = divisionTable(w).rows;
  const mine = w.strength.get(w.clubId) ?? 0;
  const stronger = rows.filter((r) => (w.strength.get(r.clubId) ?? 0) > mine).length;
  return Math.max(1, Math.min(rows.length, stronger + GOAL_SLACK[horizonOf(w)]));
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
  /** The match's day: the supporters' mood is read with this result in. */
  day?: number,
): Board {
  const b = boardOf(w);
  if (b.fired) return b;
  const atHome = match.home === w.clubId;
  const [mine, theirs] = atHome ? o.goals : [o.goals[1], o.goals[0]];
  const result = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
  const gap =
    (w.strength.get(w.clubId) ?? 0) - (w.strength.get(atHome ? match.away : match.home) ?? 0);
  const odds: Odds = gap > CLEAR_GAP ? 'favourite' : gap < -CLEAR_GAP ? 'underdog' : 'even';
  const value = BY_ODDS[odds][result] + (result === 'L' ? LOSS_WEIGHT[horizonOf(w)] : 0);
  const last: BoardReason[] = [{ kind: 'result', result, odds, value }];
  if (w.arrears) last.push({ kind: 'cash', value: IN_ARREARS });
  // A defeat that tips the supporters over: they protest once a crisis, and the board hears them
  // (more when the supporters are impatient), not again at every defeat of the same run.
  const club = w.pack.clubs.find((c) => c.id === w.clubId)!;
  if (
    result === 'L' &&
    day !== undefined &&
    moodOf(w.pack, w.season, w.clubId, day + 1) <= PROTEST &&
    moodOf(w.pack, w.season, w.clubId, day) > PROTEST
  )
    last.push({ kind: 'protest', value: club.fans.patience < 50 ? -2 : -1 });
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
  } else if (confidence < pressureOf(w)) next.ultimatum = ultimatumOf(w);
  return next;
}

/**
 * How patient the board is, 0..100: the club's own profile, less when the owners answer to
 * investors (a SAF, more so a multi-club group). PARÂMETROS.
 */
const OWNER_HASTE = { association: 0, ownedSaf: 10, groupSaf: 15 } as const;
export function patienceOf(w: CareerWorld): number {
  const club = w.pack.clubs.find((c) => c.id === w.clubId)!;
  const model = w.pack.governance.find((g) => g.clubId === w.clubId)?.model ?? 'association';
  return Math.max(0, club.profile.patience - OWNER_HASTE[model]);
}
/** Below this confidence the board sets an ultimatum: 15 for the most patient, 35 for the least. */
const pressureOf = (w: CareerWorld) => 15 + Math.round((100 - patienceOf(w)) / 5);
/** The ultimatum: more matches for a patient board, at the same points a match. */
function ultimatumOf(w: CareerWorld): { matches: number; points: number } {
  const matches = 3 + Math.round(patienceOf(w) / 30);
  return { matches, points: Math.round((matches * ULTIMATUM.points) / ULTIMATUM.matches) };
}

/** At the season's end, before the turn: the goal against the final position. */
export function boardAfterSeason(w: CareerWorld): Board {
  const b = boardOf(w);
  if (b.fired) return b;
  const met = positionOf(w) <= b.goal;
  const value = met ? GOAL_MET : GOAL_MISSED;
  const last: BoardReason[] = [{ kind: met ? 'goalMet' : 'goalMissed', value }];
  const homegrown = homegrownOf(w);
  if (homegrown > 0) last.push({ kind: 'homegrown', value: homegrown });
  return {
    ...b,
    confidence: clamp(b.confidence + value + homegrown),
    last,
  };
}

/**
 * Confidence a season of the club's own boys in the eleven earns, up to HOMEGROWN at a whole
 * season of them before supporters who prize their academy most (fans' youthPride, 0..100):
 * "crias da casa" sell shirts and patience. Formed at the club means its academy's mark on him
 * (`origin.clubId`). PARÂMETRO.
 */
const HOMEGROWN = 8;
function homegrownOf(w: CareerWorld): number {
  const starts = Object.entries(w.starts ?? {});
  const total = starts.reduce((s, [, n]) => s + n, 0);
  if (!total) return 0;
  const ours = new Set(
    w.pack.players.filter((p) => p.origin?.clubId === w.clubId).map((p) => p.id),
  );
  const own = starts.reduce((s, [id, n]) => s + (ours.has(id) ? n : 0), 0);
  const pride = w.pack.clubs.find((c) => c.id === w.clubId)!.fans.youthPride;
  return Math.floor((HOMEGROWN * own * pride) / (total * 100));
}
