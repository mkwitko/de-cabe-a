/**
 * The board, first cut (06 §2.8, §5.3): one goal for the season, one confidence, and the job
 * that hangs on it. The confidence moves after each of the person's matches by the result
 * against what the two squads promised, and by the cash; a season's end adds the goal. Low
 * confidence brings an ultimatum (points in a number of matches); failing it ends the job.
 * Integers only; every number is a PARÂMETRO, not calibrated.
 */
import { isEstadual } from '../competition/estaduais';
import { isDerby } from '../match/stadium';
import { moodOf } from '../match/stadium';
import type { Outcome } from '../competition/season';
import { divisionTable, type CareerWorld } from './advance';
import { identityOf } from './coach-pool';
import { clubsOf, electionYear, type Horizon } from './clubs';
import { nationalDivisions } from './start';
import type { SeasonState } from '../competition/season';

export type Odds = 'favourite' | 'even' | 'underdog';
/** One line of why the confidence moved, for the screen: a fact and its points. */
export type BoardReason =
  | { kind: 'result'; result: 'W' | 'D' | 'L'; odds: Odds; value: number }
  | {
      kind:
        | 'cash'
        | 'goalMet'
        | 'goalMissed'
        | 'ultimatumMet'
        | 'fairplay'
        | 'protest'
        | 'homegrown'
        | 'locals'
        | 'press'
        | 'derby'
        | 'exit'
        | 'identity';
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
  /** League and cup matches in a row without a win: the press counts them. */
  winless?: number;
}

const START = 60;
/** Where a new coach's board starts, the person's or another club's. */
export const BENCH_START = START;
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

/** In an election year the board looks at the vote only: short-sighted whatever its horizon. */
const horizonOf = (w: CareerWorld, clubId = w.clubId): Horizon =>
  electionYear(w, clubId) ? 'short' : (clubsOf(w)[clubId]?.directors.horizon ?? 'medium');

/** Each club's national division this season, its members; and the pressures, once a season. */
const seasonal = new WeakMap<
  SeasonState,
  {
    members: Map<string, readonly string[]>;
    tiers: Map<string, number>;
    pressure: Map<string, number>;
  }
>();
const seasonOf = (w: CareerWorld) => {
  let s = seasonal.get(w.season);
  if (!s) {
    const members = new Map<string, readonly string[]>();
    const tiers = new Map<string, number>();
    for (const d of nationalDivisions(w.pack)) {
      const ids = w.season.members[d.id] ?? d.clubIds;
      for (const id of ids) {
        members.set(id, ids);
        tiers.set(id, d.tier);
      }
    }
    s = { members, tiers, pressure: new Map() };
    seasonal.set(w.season, s);
  }
  return s;
};
/** The clubs of `clubId`'s national division this season; undefined outside them. */
export const divisionOf = (w: CareerWorld, clubId: string): readonly string[] | undefined =>
  seasonOf(w).members.get(clubId);

/** The tier (1 = Série A) of the club's national division this season. */
export const divisionTierOf = (w: CareerWorld, clubId: string): number | undefined =>
  seasonOf(w).tiers.get(clubId);

/** A board that starts over under a new president: first confidence, this season's goal. */
export const freshBoard = (w: CareerWorld): Board => ({ confidence: START, goal: goalFor(w) });

/**
 * The pressure on the job, 0..100 (06 §2.8). Not the club's size alone but its size against the
 * table it plays in now: the biggest club of the Série B is asked for promotion and feels it, the
 * same club back in the Série A, among the smallest there, is asked to stay up. On top, the press
 * its stature brings (a giant is on the sports pages every day), what its supporters ask (demand,
 * ambition) against how long they wait (patience), and owners who answer to investors. It pulls
 * the goal towards the club's place by stature, makes defeats cost more, and lets the press turn
 * a winless run into a crisis. PARÂMETROS: the biggest of a table near 80, the smallest near 20.
 */
export function pressureOf(w: CareerWorld, clubId = w.clubId): number {
  const memo = seasonOf(w).pressure;
  const known = memo.get(clubId);
  if (known !== undefined) return known;
  const club = w.pack.clubs.find((c) => c.id === clubId)!;
  const model = w.pack.governance.find((g) => g.clubId === clubId)?.model ?? 'association';
  const rows = divisionOf(w, clubId) ?? [clubId];
  const rep = (id: string) => w.pack.clubs.find((c) => c.id === id)?.reputation ?? 0;
  const bigger = rows.filter((id) => rep(id) > club.reputation).length;
  // +30 the biggest of the table, -30 the smallest.
  const standing = rows.length > 1 ? 30 - Math.round((60 * bigger) / (rows.length - 1)) : 0;
  const press = Math.round(Math.max(0, club.reputation - 50) / 5);
  const f = club.fans;
  const p = clamp(
    40 +
      standing +
      press +
      Math.round((f.demand + f.ambition - f.patience) / 6) +
      OWNER_HASTE[model],
  );
  memo.set(clubId, p);
  return p;
}

/**
 * What one result is worth to a club's board: against the odds the two squads set, a defeat
 * weighing more for an impatient board, and up to half again under the pressure on the club.
 */
export function resultValue(
  w: CareerWorld,
  clubId: string,
  rival: string,
  mine: number,
  theirs: number,
  /** A state championship match: half a league match's weight, a lost clássico on top. */
  estadual?: { derby: boolean },
): { result: 'W' | 'D' | 'L'; odds: Odds; value: number } {
  const result = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
  const gap = (w.strength.get(clubId) ?? 0) - (w.strength.get(rival) ?? 0);
  const odds: Odds = gap > CLEAR_GAP ? 'favourite' : gap < -CLEAR_GAP ? 'underdog' : 'even';
  const base = BY_ODDS[odds][result] + (result === 'L' ? LOSS_WEIGHT[horizonOf(w, clubId)] : 0);
  const p = pressureOf(w, clubId);
  const value = base < 0 ? Math.trunc((base * (200 + p)) / 200) : base;
  if (!estadual) return { result, odds, value };
  // Half a match, a defeat rounded against the club; the clássico lost costs more.
  const half = value < 0 ? -Math.floor((1 - value) / 2) : Math.floor(value / 2);
  return { result, odds, value: half + (estadual.derby && result === 'L' ? DERBY_LOST : 0) };
}

/** A clássico lost in the state championship, over the half weight of the defeat. PARÂMETRO. */
const DERBY_LOST = -1;
/** Leaving the state championship early (group stage or the quarter-finals). PARÂMETRO. */
export const EARLY_EXIT = -1;

/** The person's board after their club went out of the state championship early. */
export function boardAfterExit(w: CareerWorld): Board {
  const b = boardOf(w);
  if (b.fired) return b;
  // Only the confidence: an ultimatum, if one is due, is set at the next match's verdict.
  return {
    ...b,
    confidence: clamp(b.confidence + EARLY_EXIT),
    last: [{ kind: 'exit', value: EARLY_EXIT }],
  };
}

/**
 * The goal for the table the club is in: its rank by squad strength, pulled towards its rank by
 * stature (reputation) as hard as the pressure on it (a giant with a poor squad is still asked
 * for the top), then the directors' slack.
 */
export function goalFor(w: CareerWorld): number {
  const rows = divisionTable(w).rows;
  const mine = w.strength.get(w.clubId) ?? 0;
  const stronger = rows.filter((r) => (w.strength.get(r.clubId) ?? 0) > mine).length;
  const rep = (id: string) => w.pack.clubs.find((c) => c.id === id)?.reputation ?? 0;
  const bigger = rows.filter((r) => rep(r.clubId) > rep(w.clubId)).length;
  const p = pressureOf(w);
  const rank = Math.round((stronger * (100 - p) + bigger * p) / 100);
  return Math.max(1, Math.min(safeOf(w, rows.length), rank + GOAL_SLACK[horizonOf(w)]));
}

/**
 * The last place that stays in the division: no board sets going down as the season's goal,
 * however weak the squad. The first relegation place of the division's league phase, else the
 * table's last.
 */
function safeOf(w: CareerWorld, places: number): number {
  const div = nationalDivisions(w.pack).find((d) =>
    (w.season.members[d.id] ?? d.clubIds).includes(w.clubId),
  );
  const comp = div && w.season.competitions.find((c) => c.id === div.id);
  const down = comp?.phases[0]?.outcomes.find((o) => o.kind === 'relegation');
  return down ? Math.min(places, down.positions[0] - 1) : places;
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
  match: { home: string; away: string; competitionId?: string },
  o: Outcome,
  /** The match's day: the supporters' mood is read with this result in. */
  day?: number,
): Board {
  const b = boardOf(w);
  if (b.fired) return b;
  const atHome = match.home === w.clubId;
  const [mine, theirs] = atHome ? o.goals : [o.goals[1], o.goals[0]];
  const p = pressureOf(w);
  const { result, odds, value } = resultValue(
    w,
    w.clubId,
    atHome ? match.away : match.home,
    mine,
    theirs,
    match.competitionId !== undefined && isEstadual({ id: match.competitionId })
      ? { derby: false }
      : undefined,
  );
  const last: BoardReason[] = [{ kind: 'result', result, odds, value }];
  // A lost clássico of the state championship weighs on the board on top of the half result.
  if (
    result === 'L' &&
    match.competitionId !== undefined &&
    isEstadual({ id: match.competitionId }) &&
    isDerby(w.pack, match.home, match.away)
  )
    last.push({ kind: 'derby', value: DERBY_LOST });
  const winless = result === 'W' ? 0 : (b.winless ?? 0) + 1;
  // A winless run in the papers: a story at its third match, and again every three more.
  if (winless >= PRESS_RUN && winless % PRESS_RUN === 0 && p >= PRESS)
    last.push({ kind: 'press', value: p >= PRESS_LOUD ? -2 : -1 });
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
  const next: Board = { confidence, goal: b.goal, last, ...(winless && { winless }) };

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
  } else if (confidence < thresholdOf(w)) next.ultimatum = ultimatumOf(w);
  return next;
}

/**
 * How patient the board is, 0..100: the club's own profile, less when the owners answer to
 * investors (a SAF, more so a multi-club group). PARÂMETROS.
 */
const OWNER_HASTE = { association: 0, ownedSaf: 10, groupSaf: 15 } as const;
/** Winless matches in a row the press makes a story of, and the pressure it takes (loud above). */
const PRESS_RUN = 3;
const PRESS = 50;
const PRESS_LOUD = 75;
export function patienceOf(w: CareerWorld, clubId = w.clubId): number {
  const club = w.pack.clubs.find((c) => c.id === clubId)!;
  const model = w.pack.governance.find((g) => g.clubId === clubId)?.model ?? 'association';
  return Math.max(0, club.profile.patience - OWNER_HASTE[model]);
}
/**
 * Below this confidence the board acts: 15 for the most patient, 35 for the least. The person
 * gets an ultimatum first; another club's coach is sacked (coaches.ts).
 */
export const thresholdFor = (w: CareerWorld, clubId: string) =>
  15 + Math.round((100 - patienceOf(w, clubId)) / 5);
const thresholdOf = (w: CareerWorld) => thresholdFor(w, w.clubId);
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
  const locals = localsOf(w);
  if (locals > 0) last.push({ kind: 'locals', value: locals });
  const identity = identityOf(w);
  if (identity !== 0) last.push({ kind: 'identity', value: identity });
  return {
    ...b,
    confidence: clamp(b.confidence + value + homegrown + locals + identity),
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

/**
 * Confidence a season of local men in the eleven earns, born in the club's state (`birthCityId`,
 * Wikidata's place of birth) or, when that is unknown, formed at a club of it (`origin.clubId`,
 * FM's home_grown_club_uids): "prata da casa" of the region, up to LOCALS at a whole season of them before supporters who prize local
 * identity most (fans' localIdentity). The club's own boys count once, under homegrown. PARÂMETRO.
 */
const LOCALS = 5;
function localsOf(w: CareerWorld): number {
  const starts = Object.entries(w.starts ?? {});
  const total = starts.reduce((s, [, n]) => s + n, 0);
  if (!total) return 0;
  const cityState = new Map(w.pack.cities.map((c) => [c.id, c.state]));
  const stateOf = (clubId: string) =>
    cityState.get(w.pack.clubs.find((c) => c.id === clubId)?.cityId ?? '');
  const home = stateOf(w.clubId);
  if (!home) return 0;
  // Born in the state (Wikidata, when known), else formed at a club of it.
  const from = new Map(
    w.pack.players.map((p) => [
      p.id,
      p.origin?.clubId === w.clubId
        ? undefined
        : p.birthCityId
          ? cityState.get(p.birthCityId)
          : p.origin?.clubId && stateOf(p.origin.clubId),
    ]),
  );
  const local = starts.reduce((s, [id, n]) => s + (from.get(id) === home ? n : 0), 0);
  const identity = w.pack.clubs.find((c) => c.id === w.clubId)!.fans.localIdentity;
  return Math.floor((LOCALS * local * identity) / (total * 100));
}
