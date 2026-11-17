/**
 * The career calendar (MC-084, 01 §4, ADR-020): the world moves day by day until the next day
 * the person has to decide something (for now, their club's match). Every other match is a
 * level 3 result from the season seed, so the same pack, seed and day always rebuild the same
 * world: the server keeps only the day, the browser replays up to it.
 */
import { standings, type Row } from '../competition/league';
import {
  finishSeason,
  isOver,
  matchesOn,
  nextDay,
  record,
  seedOf,
  startSeason,
  type SeasonState,
} from '../competition/season';
import { regulationsFor, type Move } from '../competition/outcomes';
import { advanceLedger, type Ledger } from '../finance/ledger';
import { postHomeMatch, postMonths } from './finance';
import { quickResult } from '../match/quick';
import { formationOf, matchInputFor } from '../match/fixture-input';
import { coachOf } from '@decabeca/match-engine';
import type { Outcome } from '../competition/season';
import type { Pack } from '../pack/schema';
import { nationalDivisions, startCareer } from './start';
import { windowOpen, type Moves } from './market';
import { note, type Note } from './inbox';
import { marketRound, roundsBetween, type Deal } from '../market/rounds';
import type { Books } from '../market/books';
import type { Bid, Talk } from '../market/talks';
import { endingSoon, expireContracts } from '../market/contracts';
import { setJudgementClock } from '../market/judgement';
import { carryCache } from '../lib/pack-cache';
import { isoOf } from '../competition/calendar';
import { postPrize } from './finance';
import { boardAfterMatch, boardAfterSeason, goalFor, positionOf, type Board } from './board';
import { bestLineup, lineupOf, teamWith, type Lineup } from './squad';
import {
  RIVAL_DRILL,
  clubLevels,
  drilled,
  myStrength,
  rivalFresh,
  rivalStrength,
  tire,
  trainingOn,
  type Training,
} from './training';

export interface CareerWorld {
  pack: Pack;
  seed: number;
  clubId: string;
  season: SeasonState;
  ledger: Ledger;
  /** Last day whose matches are all played (0 before the first). */
  day: number;
  /** Each club rested, on a normal week (training.ts `clubLevels`). */
  strength: Map<string, number>;
  /** The part of `strength` the eleven carries: what tiredness takes from. */
  eleven: Map<string, number>;
  /** The eleven the person picked; absent while the coach's choice stands (squad.ts). */
  lineup?: Lineup;
  /** Freshness and drill of the person's club; absent before the first day played. */
  training?: Training;
  /** Transfers so far; `pack` already carries them (market.ts). */
  moves?: Moves;
  /** The board's goal and confidence; absent before the person's first match (board.ts). */
  board?: Board;
  /** What happened, newest last (inbox.ts). */
  inbox?: Note[];
  /** Fees each club paid and received this season (market/books.ts). */
  books?: Record<string, Books>;
  /** The market's deals between clubs, newest last (market/rounds.ts). */
  deals?: Deal[];
  /** Talks the person opened to buy, by player (market/talks.ts). */
  talks?: Record<string, Talk>;
  /** Bids from other clubs for the person's players, waiting for an answer. */
  bids?: Bid[];
  /** The person's players put up for sale. */
  listed?: string[];
  /** Doors shut for a season: a player, or `club:player` for a bidder. */
  cold?: Record<string, number>;
  /** Clubs that found nobody worth buying in the window `span` and sit the rest of it out. */
  idle?: { span: string; clubs: string[] };
}

export type Decision =
  | {
      kind: 'match';
      day: number;
      matchId: string;
      competitionId: string;
      home: string;
      away: string;
    }
  | { kind: 'seasonOver' }
  /** The board ended the job: nothing else to decide in this career. */
  | { kind: 'fired' };

function playDay(
  w: CareerWorld,
  day: number,
  given?: { id: string; outcome: Outcome },
): Map<string, Outcome> {
  const out = new Map<string, Outcome>();
  // The person's club as it stands that day (rest and training since the last one applied).
  let training = trainingOn(w, day);
  const strength = (clubId: string) =>
    clubId === w.clubId ? myStrength(w, training) : rivalStrength(w, clubId, day);
  const cashBefore = w.ledger.cash;
  if (windowOpen(w.day) !== windowOpen(day)) {
    note(w, { day, kind: 'window', open: windowOpen(day) });
    // The last window of the year: a reminder of who is running out of contract.
    const ending = endingSoon(w).length;
    if (windowOpen(day) && isoOf(day).slice(5, 7) === '07' && ending > 0)
      note(w, { day, kind: 'contractsEnding', players: ending });
  }
  // The clubs trade among themselves before the day's matches: the rounds due since the last day.
  for (const round of roundsBetween(w.day, day)) marketRound(w, round);
  postMonths(w, w.day, day);
  for (const id of matchesOn(w.season, day)) {
    const m = w.season.meta.get(id)!;
    const o =
      given?.id === id
        ? given.outcome
        : quickResult(seedOf(w.seed, id), strength(m.home), strength(m.away));
    record(w.season, id, o);
    out.set(id, o);
    if (m.home === w.clubId || m.away === w.clubId) {
      postHomeMatch(w, id, day);
      training = tire(training, lineupOf(w).xi);
      const atHome = m.home === w.clubId;
      note(w, {
        day,
        kind: 'result',
        opponent: atHome ? m.away : m.home,
        goals: atHome ? [o.goals[0], o.goals[1]] : [o.goals[1], o.goals[0]],
      });
      const spent = Object.values(training.fresh).filter((f) => f < 0.5).length;
      if (spent >= 3) note(w, { day, kind: 'tired', players: spent });
      const before = w.board;
      w.board = boardAfterMatch(w, m, o);
      if (w.board.ultimatum && !before?.ultimatum)
        note(w, { day, kind: 'ultimatum', ...w.board.ultimatum });
      if (w.board.last?.some((r) => r.kind === 'ultimatumMet'))
        note(w, { day, kind: 'ultimatumMet' });
    }
  }
  w.training = training;
  w.day = day;
  advanceLedger(w.ledger, day);
  if (cashBefore >= 0 && w.ledger.cash < 0) note(w, { day, kind: 'cashRed' });
  return out;
}

const clubPlays = (w: CareerWorld, day: number) =>
  matchesOn(w.season, day).find((id) => {
    const m = w.season.meta.get(id)!;
    return m.home === w.clubId || m.away === w.clubId;
  });

/** The world as it stands after `day`: the start, then every match day up to it. */
export function openCareer(base: Pack, seed: number, clubId: string, day = 0): CareerWorld {
  // The career's own pack object: what is read and kept beside it (the clubs' opinions, their
  // plans) belongs to this career alone, while the readings already made of `base` carry over.
  const pack = { ...base };
  carryCache(base, pack, []);
  const start = startCareer(pack, seed, clubId);
  const w: CareerWorld = { pack, seed, ...start, day: 0, ...clubLevels(pack) };
  note(w, { day: 0, kind: 'welcome' });
  setJudgementClock(pack, seed, w.season.season);
  for (let d = nextDay(w.season); d !== null && d <= day; d = nextDay(w.season)) playDay(w, d);
  w.day = day;
  return w;
}

/**
 * Plays every day before the next decision and stops there, without playing that day.
 * Returns the decision; `w.day` is the last day played.
 */
export function nextDecision(w: CareerWorld): Decision {
  if (w.board?.fired) return { kind: 'fired' };
  for (let d = nextDay(w.season); d !== null; d = nextDay(w.season)) {
    const id = clubPlays(w, d);
    if (id) {
      const m = w.season.meta.get(id)!;
      return {
        kind: 'match',
        day: d,
        matchId: id,
        competitionId: m.competitionId,
        home: m.home,
        away: m.away,
      };
    }
    playDay(w, d);
  }
  return { kind: 'seasonOver' };
}

/**
 * Plays the day of the person's next match (their match and everyone else's). Their match takes
 * `watched` when they watched it with the match engine; otherwise a level 3 result.
 */
export function playDecision(
  w: CareerWorld,
  d: Extract<Decision, { kind: 'match' }>,
  watched?: Outcome,
): Outcome {
  if (nextDay(w.season) !== d.day) throw new Error('career: that match is not next');
  return playDay(w, d.day, watched && { id: d.matchId, outcome: watched }).get(d.matchId)!;
}

/**
 * The person's match for the match engine (level 1). Both clubs field an eleven by position
 * (squad.ts): the other club its coach's best, the person's club the one they picked, with their
 * instructions. The person's coach keeps the plan, since they command it live (02 §10). `mine`
 * is the person's side in the input.
 */
export function careerMatch(w: CareerWorld, d: Extract<Decision, { kind: 'match' }>) {
  const input = matchInputFor(w.pack, w.season, d.matchId);
  const mine: 0 | 1 = d.home === w.clubId ? 0 : 1;
  const training = trainingOn(w, d.day);
  input.teams = [d.home, d.away].map((clubId) => {
    const c = { pack: w.pack, clubId };
    return clubId === w.clubId
      ? teamWith(c, lineupOf(w), {
          fresh: (id) => training.fresh[id] ?? 1,
          familiarity: drilled(training.drill),
        })
      : teamWith(c, bestLineup(c, formationOf(clubId)), {
          fresh: () => rivalFresh(w, clubId, d.day),
          familiarity: drilled(RIVAL_DRILL),
        });
  }) as typeof input.teams;
  input.teams[mine] = { ...input.teams[mine], coach: coachOf(60, { flexibility: 1 }) };
  return { input, mine };
}

/** The person's division table as it stands; in a group phase, their group. */
export function divisionTable(w: CareerWorld): { name: string; rows: Row[] } {
  const div = nationalDivisions(w.pack).find((x) => w.season.members[x.id]?.includes(w.clubId));
  const comp = div && w.season.competitions.find((c) => c.id === div.id);
  if (!div || !comp) return { name: '', rows: [] };
  const first = comp.phases[0]!;
  const done = w.season.results[comp.id]?.[first.id];
  const finished = done?.tables.find((t) => t.some((r) => r.clubId === w.clubId));
  if (finished) return { name: div.name, rows: finished };
  const run = w.season.running.get(`${comp.id}/${first.id}`);
  const group =
    (run?.kind === 'table' ? run.groups.find((g) => g.includes(w.clubId)) : undefined) ??
    w.season.members[div.id]!;
  const inGroup = new Set(group);
  // Display order only; phase outcomes use the competition's own tie-breakers.
  const rows = standings(
    group,
    (w.season.played.get(div.id) ?? []).filter((g) => inGroup.has(g.home) && inGroup.has(g.away)),
    { points: { win: 3, draw: 1, loss: 0 }, tieBreakers: ['goalDifference', 'goalsFor'], seed: 0 },
  );
  return { name: div.name, rows };
}

export interface SeasonTurn {
  season: number;
  titles: { competitionId: string; clubId: string }[];
  /** The person's club moved up or down, if it did. */
  move: Move | null;
}

/**
 * From a finished season to the next (05 §3, MC-172): titles, promotion and relegation by the
 * regulations, then the new season drawn from the career seed. The ledger carries on.
 */
export function startNextSeason(w: CareerWorld): SeasonTurn {
  if (!isOver(w.season)) throw new Error('career: the season is not over');
  const judged = boardAfterSeason(w);
  // Contracts that ran out: renewed, or the player walks (market/contracts.ts).
  expireContracts(w);
  const position = positionOf(w);
  if (!judged.fired)
    note(w, {
      day: w.day,
      kind: 'goal',
      met: position <= judged.goal,
      position,
      goal: judged.goal,
    });
  const prize = postPrize(w, position, divisionTable(w).rows.length);
  if (prize > 0) note(w, { day: w.day, kind: 'prize', position, amount: prize });
  const played = w.season.season;
  const divisionId = w.season.competitions.find((c) => c.name === divisionTable(w).name)?.id;
  const year = w.season.season + 1;
  const t = finishSeason(w.season, regulationsFor(w.pack.competitions, year));
  w.season = startSeason(w.pack, {
    season: year,
    seed: seedOf(w.seed, `season:${year}`),
    members: t.members,
    slots: t.slots,
    previous: w.season.results,
    ranking: w.season.ranking,
  });
  note(w, {
    day: w.day,
    kind: 'season',
    season: played,
    champion: t.titles.find((x) => x.competitionId === divisionId)?.clubId ?? '',
    move: t.moves.find((m) => m.clubId === w.clubId)?.kind ?? 'stay',
  });
  // The goal is set again for the table the club is now in.
  w.board = { ...judged, goal: goalFor(w) };
  // Each office has had another season with its players.
  setJudgementClock(w.pack, w.seed, year);
  // Every club's market season starts again; open talks and bids do not cross the year.
  delete w.books;
  delete w.talks;
  delete w.bids;
  delete w.cold;
  // A new season starts with everyone rested; the drill carries over.
  if (w.training) w.training = { ...w.training, fresh: {}, day: w.day };
  return {
    season: year,
    titles: t.titles,
    move: t.moves.find((m) => m.clubId === w.clubId) ?? null,
  };
}
