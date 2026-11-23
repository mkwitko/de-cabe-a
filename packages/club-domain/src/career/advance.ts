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
import { crowdShare, isDerby, moodOf } from '../match/stadium';
import { whistleOf } from '../match/referee';
import { coachOf } from '@decabeca/match-engine';
import type { Outcome } from '../competition/season';
import type { Pack } from '../pack/schema';
import { nationalDivisions, startCareer } from './start';
import { fielded, hurtIn, rivalOutIds, type Injury } from './health';
import { monthTurned, moraleOf, strengthOwed } from './arrears';
import { coachEdge, rivalPlan, styled, type Coaches, type Style } from './coach-pool';
import { fillVacancies, judgeCoaches, newSeasonCoaches, type Bench } from './coaches';
import {
  afterMatch,
  bookingsOf,
  rivalPitch,
  suspendedIn,
  newSeasonDiscipline,
  sitCourt,
  type Booking,
  type Discipline,
  type Sentence,
} from './discipline';
import { windowOpen, type Moves } from './market';
import { calledOf, fifaWindowOn } from './callups';
import { note, type Note } from './inbox';
import { entryOf, seasonReview, type HistoryEntry } from './history';
import { credit, leagueIds, sideGoals, type Scored } from './scoring';
import type { Goal } from '../match/scorers';
import { marketRound, roundsBetween, type Deal } from '../market/rounds';
import { facedClub, scoutingDay, type Scouting } from '../market/scouting';
import { agentOffers, type AgentLedger } from '../market/agents';
import { awayLoss, distanceKm, postAwayTrip, travelTire } from './travel';
import { foreignRound, homecoming } from '../market/abroad';
import type { Books } from '../market/books';
import type { Bid, Talk } from '../market/talks';
import { endingSoon, expireContracts, trimSquads } from '../market/contracts';
import { settleImageClaims, type ImageDeal } from '../market/image';
import { returnLoans, type Loan, type LoanOption } from '../market/loans';
import { pruneClauses, type Clauses } from '../market/clauses';
import { unrestTurn, type Unrest } from '../market/unrest';
import { judgeFairPlay, noteFairPlay } from '../market/fairplay';
import { codeOf, withImports, youthOf, type SeasonLog } from './development';
import { arrivalsOf, yearOn } from './years';
import { setJudgementClock } from '../market/judgement';
import { WHOLE, carryCache, recache } from '../lib/pack-cache';
import { bringUp, withAcademy } from './academy';
import { isBase } from './bases';
import { goingWages } from '../market/value';
import { dayOf, isoOf } from '../competition/calendar';
import { postOwners } from './finance';
import { postCups, postSeasonEnd } from './revenue';
import { cupNotes, cupStages } from './cup';
import { isEstadual } from '../competition/estaduais';
import { estadualExits, settleEstadual } from './estadual';
import { matchReport, type ReportFact } from './report';
import { nextPrices, pricesOf } from './prices';
import { planSeason, settleSeason, updateFame, withClubs, type ClubState } from './clubs';
import { tierOfClub } from '../market/books';
import {
  boardAfterMatch,
  boardAfterSeason,
  freshBoard,
  goalFor,
  positionOf,
  type Board,
} from './board';
import { bestLineup, foreignLimit, planOf, teamWith, type Lineup } from './squad';
import {
  RIVAL_DRILL,
  clubLevels,
  drilled,
  myStrength,
  prepPoints,
  rivalFresh,
  rivalStrength,
  reweigh,
  tire,
  trainingOn,
  type Training,
} from './training';

export interface CareerWorld {
  /** The players and clubs as they stand now: the opening pack, the years and the moves. */
  pack: Pack;
  /** The pack the career opened with; never changed. */
  origin: Pack;
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
  /** Season the person took the job (the outgoing directors' man, when since then; clubs.ts). */
  hired?: number;
  /** The day of the person's first decision: older notes happened before they arrived. */
  hiredDay?: number;
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
  /** The boys of the person's academy, by id: under contract, out of the first team. */
  academy?: string[];
  /** The club whose youth teams joined the world on day one (academy.ts); kept to rebuild it. */
  boysOf?: string;
  /** The other clubs' youth teams joined the world too (bases.ts); kept to rebuild it. */
  bases?: true;
  /** Months of wages the person's club owes its squad (arrears.ts); absent when paid up. */
  arrears?: number;
  /** The other clubs' coaches as their boards see them (coaches.ts). */
  benches?: Record<string, Bench>;
  /** Clubs without a coach, and the day the last one was sacked. */
  vacancies?: Record<string, number>;
  /** The clubs that sacked their coach this season, in order (one entry a sacking). */
  sacked?: string[];
  /** The named coaches of the other clubs and the free pool (coach-pool.ts). */
  coaches?: Coaches;
  /** Clubs' DNA after the seasons, by club; the pack's playing style where absent. */
  dna?: Record<string, Style>;
  /** The person's style this season: matches and the sum of each axis (coach-pool.ts). */
  styled?: { n: number; sum: number[] };
  /** The person's injured players: what, since when and until when (health.ts). */
  injuries?: Record<string, Injury>;
  /** Each club's cards and bans, by club (discipline.ts); absent before the first card. */
  cards?: Record<string, Discipline>;
  /** Each finished season: its moves and what the person did that the next year grew from. */
  log?: SeasonLog[];
  /** Matches each of the person's players started this season, and how many the club played. */
  starts?: Record<string, number>;
  played?: number;
  /** League goals and assists this season, `[goals, assists]` by player (scoring.ts). */
  scored?: Scored;
  /** One entry per season played, whichever club the person coached (history.ts). */
  history?: HistoryEntry[];
  /** Players on loan this season, by id: who owns each and the contract he returns to. */
  loans?: Record<string, Loan>;
  /** The person's players offered on loan. */
  forLoan?: string[];
  /** What the person asks of the club that borrows each player offered on loan. */
  optionFor?: Record<string, LoanOption['kind']>;
  /** Sell-on and buy-back clauses on players the person sold (market/clauses.ts). */
  clauses?: Record<string, Clauses>;
  /** Players of the person's club who are unhappy, by id (market/unrest.ts). */
  unhappy?: Record<string, Unrest>;
  /** Seasons in a row each club ended over the fair play limit; absent when none (fairplay.ts). */
  fairplay?: Record<string, number>;
  /** Every club's cash, directors and structure; absent before the first season's turn. */
  clubs?: Record<string, ClubState>;
  /** Clubs that found nobody worth buying in the window `span` and sit the rest of it out. */
  idle?: { span: string; clubs: string[] };
  /** The person's scouts away and the players in the club's files (market/scouting.ts). */
  scouting?: Scouting;
  /** The person's club's standing with agents (market/agents.ts). */
  agents?: AgentLedger;
  /** Image-rights contracts the person signed, by player (market/image.ts). */
  image?: Record<string, ImageDeal>;
  /**
   * The last day the person was stopped at outside a match: a window deadline, or a pre-season
   * day (nextDecision with deadlines or preseason).
   */
  deadline?: number;
  /** Why the person's last match went as it did (report.ts); not saved, read right after it. */
  report?: ReportFact[];
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
  /** The last day of a transfer window, before it is played: the person's last chance. */
  | { kind: 'deadline'; day: number }
  /**
   * A pre-season day, before it is played: the squad back from holiday (2 January), the window
   * open, and `debut` the day of the club's first match of the season.
   */
  | { kind: 'preseason'; day: number; debut: number }
  /** The board ended the job: nothing else to decide in this career. */
  | { kind: 'fired' };

function playDay(
  w: CareerWorld,
  day: number,
  given?: {
    id: string;
    outcome: Outcome;
    bookings?: readonly Booking[] | undefined;
    /** Who scored on screen, by side (home, away). */
    goals?: readonly [readonly Goal[], readonly Goal[]] | undefined;
  },
): Map<string, Outcome> {
  const out = new Map<string, Outcome>();
  // The person's club as it stands that day (rest and training since the last one applied).
  let training = trainingOn(w, day);
  const strength = (clubId: string) =>
    clubId === w.clubId
      ? strengthOwed(w, myStrength(w, training, fielded(w, day)) + prepPoints(training, day))
      : rivalStrength(w, clubId, day) + coachEdge(w, clubId);
  const cashBefore = w.ledger.cash;
  if (windowOpen(w.day) !== windowOpen(day)) {
    note(w, { day, kind: 'window', open: windowOpen(day) });
    // The last window of the year: a reminder of who is running out of contract.
    const ending = endingSoon(w).length;
    if (windowOpen(day) && isoOf(day).slice(5, 7) === '07' && ending > 0)
      note(w, { day, kind: 'contractsEnding', players: ending });
  }
  // A FIFA window opens: the national teams take the person's players for it (callups.ts).
  const fifa = fifaWindowOn(day);
  if (fifa !== null && fifa !== fifaWindowOn(w.day)) {
    const n = new Map(w.pack.players.map((p) => [p.id, p.knownAs ?? p.name]));
    for (const id of calledOf(w, w.clubId, day))
      note(w, { day, kind: 'calledUp', player: n.get(id) ?? '' });
  }
  // The clubs trade among themselves before the day's matches: the rounds due since the last day.
  for (const round of roundsBetween(w.day, day)) {
    marketRound(w, round);
    // Then the foreign buyers, once the clubs here had their turn; and those coming home, free
    // for the next round.
    foreignRound(w, round);
    homecoming(w, round);
    // Agents who work with the person's club offer players of theirs.
    agentOffers(w, round);
  }
  scoutingDay(w, day);
  fillVacancies(w, day);
  postMonths(w, w.day, day);
  postCups(w, w.day, day);
  const names = () => new Map(w.pack.players.map((p) => [p.id, p.knownAs ?? p.name]));
  const banned = (sentences: Sentence[]) => {
    if (!sentences.length) return;
    const n = names();
    for (const x of sentences)
      note(w, {
        day,
        kind: 'suspension',
        player: n.get(x.playerId) ?? '',
        matches: x.matches,
        why: x.why,
      });
  };
  // The sports court sits before the day's matches: what it adds is served from today.
  banned(sitCourt(w, day));
  const leagues = leagueIds(w);
  // The Copa's draws are made as its phases end: what the person's club was in before the day.
  const cupBefore = cupStages(w.season, w.clubId);
  const decided = w.season.decisions.length;
  for (const id of matchesOn(w.season, day)) {
    const m = w.season.meta.get(id)!;
    const o =
      given?.id === id
        ? given.outcome
        : // The away side loses a little on a long trip (travel.ts).
          quickResult(
            seedOf(w.seed, id),
            strength(m.home),
            (strength(m.away) * (1000 - awayLoss(distanceKm(w.pack, m.home, m.away)))) / 1000,
            // The crowd carries the home side; behind closed doors it is gone (match/stadium.ts).
            crowdShare(w.pack, w.season, id),
            whistleOf(w.season, id, isDerby(w.pack, m.home, m.away)),
          );
    const decided = w.season.decisions.length;
    record(w.season, id, o);
    out.set(id, o);
    if (isEstadual({ id: m.competitionId })) {
      estadualExits(w, m, decided, day);
      if (m.phaseId === 'final') settleEstadual(w, m.competitionId, day);
    }
    judgeCoaches(w, m, o, day);
    // The other clubs' cards and goals fall on their best men; the person's are dealt below.
    const league = leagues.has(m.competitionId);
    for (const [side, clubId] of [m.home, m.away].entries()) {
      if (clubId === w.clubId) continue;
      const pitch = rivalPitch(w, clubId, m.competitionId);
      afterMatch(
        w,
        m.competitionId,
        day,
        bookingsOf(w, pitch, o.cards[side]!, day, clubId),
        clubId,
      );
      if (league)
        credit(
          w,
          sideGoals(
            w,
            seedOf(w.seed, `${id}:${side}`),
            clubId,
            o.goals[side]!,
            pitch,
            given?.id === id ? given.goals?.[side] : undefined,
          ),
        );
    }
    if (m.home === w.clubId || m.away === w.clubId) {
      facedClub(w, m.home === w.clubId ? m.away : m.home, day);
      styled(w, planOf(w));
      postHomeMatch(w, id, day);
      const km = postAwayTrip(w, id, day);
      w.report = matchReport(w, id, day, training);
      const eleven = fielded(w, day).xi;
      // Who was hurt, read with the legs each had at kick-off.
      const hurt = hurtIn(w, eleven, day, training);
      // Tired, and the plan's week ahead weighed again with its matches out.
      training = reweigh(w, tire(training, eleven, travelTire(km)));
      const mine = m.home === w.clubId ? 0 : 1;
      // The cards: who got them on screen, or drawn among the eleven for a match not watched.
      const squad = new Set(w.pack.players.filter((p) => p.clubId === w.clubId).map((p) => p.id));
      const bookings =
        given?.id === id && given.bookings
          ? given.bookings.filter((b) => squad.has(b.playerId))
          : bookingsOf(w, eleven, o.cards[mine], day);
      banned(afterMatch(w, m.competitionId, day, bookings));
      if (league)
        credit(
          w,
          sideGoals(
            w,
            seedOf(w.seed, `${id}:${mine}`),
            w.clubId,
            o.goals[mine]!,
            eleven,
            given?.id === id ? given.goals?.[mine] : undefined,
          ),
        );
      const n = names();
      for (const [pid, i] of Object.entries(hurt))
        note(w, {
          day,
          kind: 'injury',
          player: n.get(pid) ?? '',
          injury: i.kind,
          days: i.until - day,
        });
      // Those back by today leave the list.
      const still = Object.entries({ ...w.injuries, ...hurt }).filter(([, i]) => i.until > day);
      if (still.length || w.injuries) w.injuries = Object.fromEntries(still);
      const starts = { ...w.starts };
      for (const p of eleven) starts[p] = (starts[p] ?? 0) + 1;
      w.starts = starts;
      w.played = (w.played ?? 0) + 1;
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
      w.board = boardAfterMatch(w, m, o, day);
      if (w.board.last?.some((r) => r.kind === 'protest')) note(w, { day, kind: 'protest' });
      // The press story: at a run's third winless match, and again each three more.
      if (w.board.last?.some((r) => r.kind === 'press'))
        note(w, { day, kind: 'press', matches: w.board.winless! });
      if (w.board.ultimatum && !before?.ultimatum)
        note(w, { day, kind: 'ultimatum', ...w.board.ultimatum });
      if (w.board.last?.some((r) => r.kind === 'ultimatumMet'))
        note(w, { day, kind: 'ultimatumMet' });
    }
  }
  cupNotes(w, day, cupBefore, decided);
  // A month turned on the way: were the wages paid?
  let turned = false;
  for (let d = Math.max(w.day + 1, dayOf(`${w.season.season}-01-01`)); d <= day; d++)
    if (isoOf(d).endsWith('-01')) turned = true;
  w.training = training;
  w.day = day;
  advanceLedger(w.ledger, day);
  if (turned) {
    monthTurned(w, day);
    unrestTurn(w, day);
  }
  if (cashBefore >= 0 && w.ledger.cash < 0) note(w, { day, kind: 'cashRed' });
  return out;
}

const clubPlays = (w: CareerWorld, day: number) =>
  matchesOn(w.season, day).find((id) => {
    const m = w.season.meta.get(id)!;
    return m.home === w.clubId || m.away === w.clubId;
  });

/** The day of the person's club's first match of the season, or null with none scheduled. */
function debutOf(w: CareerWorld): number | null {
  let first: number | null = null;
  for (const m of w.season.calendar.byClub.get(w.clubId) ?? [])
    if (first === null || m.day < first) first = m.day;
  return first;
}

/** The world as it stands after `day`: the start, then every match day up to it. */
export function openCareer(given: Pack, seed: number, clubId: string, day = 0): CareerWorld {
  // The club's boys join the world on day one, in its academy, and every other club's in its
  // own (academy.ts, bases.ts).
  const { pack: base, academy } = withAcademy(given, seed, clubId, true);
  // The career's own pack object: what is read and kept beside it (the clubs' opinions, their
  // plans) belongs to this career alone, while the readings already made of `base` carry over.
  const opening = { ...base };
  carryCache(base, opening, []);
  const start = startCareer(opening, seed, clubId);
  // The foreign market is open from the first season (04 §4.7); a new pack object, read afresh.
  const pack = withImports(base, seed, start.season.season);
  recache(pack, 'goingWages', WHOLE, goingWages(base));
  const w: CareerWorld = {
    pack,
    origin: base,
    seed,
    ...start,
    day: 0,
    hired: start.season.season,
    ...clubLevels(pack, start.season.season),
    ...(academy.length > 0 && { academy }),
    ...(base !== given && { boysOf: clubId, bases: true as const }),
  };
  note(w, { day: 0, kind: 'welcome' });
  cupNotes(w, 0, new Set(), 0);
  setJudgementClock(pack, seed, w.season.season);
  for (let d = nextDay(w.season); d !== null && d <= day; d = nextDay(w.season)) playDay(w, d);
  w.day = day;
  return w;
}

/**
 * Plays every day before the next decision and stops there, without playing that day.
 * Returns the decision; `w.day` is the last day played. With `deadlines`, the last day of each
 * transfer window is a decision too (the screen's deadline day).
 */
export function nextDecision(
  w: CareerWorld,
  opts: { deadlines?: boolean; preseason?: boolean } = {},
): Decision {
  if (w.board?.fired) return { kind: 'fired' };
  for (let d = nextDay(w.season); d !== null; d = nextDay(w.season)) {
    // Pre-season: from the squad's return (2 January) to the eve of the club's first match of the
    // season, every day is the person's to train, sign and sell before it is played.
    if (opts.preseason) {
      const debut = debutOf(w);
      const back = dayOf(`${w.season.season}-01-02`);
      const x = Math.max(w.day, w.deadline ?? 0, back - 1) + 1;
      if (debut !== null && x < debut && x <= d) {
        w.deadline = x;
        if (x - 1 > w.day) playDay(w, x - 1);
        return { kind: 'preseason', day: x, debut };
      }
    }
    // The screen stops once before a window closes on the way to the next match day (deadline
    // day): the window's last day, which may fall between match days.
    if (opts.deadlines) {
      const from = Math.max(w.day, w.deadline ?? 0, dayOf(`${w.season.season}-01-01`) - 1);
      for (let x = from + 1; x <= d; x++)
        if (windowOpen(x) && !windowOpen(x + 1)) {
          w.deadline = x;
          // The world runs to the eve of the deadline (no matches before `d`): the other
          // clubs' rounds, bids and scouts all happen before the person decides.
          if (x - 1 > w.day) playDay(w, x - 1);
          return { kind: 'deadline', day: x };
        }
    }
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
  /** Who was booked on screen; the person's players only count. */
  bookings?: readonly Booking[],
  /** Who scored on screen, by side (home, away); own goals left out. */
  goals?: readonly [readonly Goal[], readonly Goal[]],
): Outcome {
  if (nextDay(w.season) !== d.day) throw new Error('career: that match is not next');
  return playDay(w, d.day, watched && { id: d.matchId, outcome: watched, bookings, goals }).get(
    d.matchId,
  )!;
}

/** Another club's eleven for the day: its best, without the starters it is short of or banned. */
function rivalEleven(
  w: CareerWorld,
  c: { pack: Pack; clubId: string },
  day: number,
  competitionId: string,
): Lineup {
  // His coach's formation and instructions over the club's DNA (coach-pool.ts).
  const style = rivalPlan(w, c.clubId);
  const formation = style?.formation ?? formationOf(c.clubId);
  // The banned do not travel; of those who do, some starters are short (health.ts); past the
  // season's limit of foreigners, Brazilians start (squad.ts).
  const banned = suspendedIn(w, competitionId, c.clubId);
  const limit = foreignLimit(w.season.season);
  let best: Lineup;
  try {
    best = bestLineup(c, formation, banned, limit);
  } catch {
    best = bestLineup(c, formation, undefined, limit);
  }
  const out = rivalOutIds(w, c.clubId, best.xi, day);
  const withPlan = (l: Lineup): Lineup => (style ? { ...l, plan: style.plan } : l);
  if (out.size === 0) return withPlan(best);
  try {
    return withPlan(bestLineup(c, formation, new Set([...out, ...banned]), limit));
  } catch {
    // No one left for a slot without them: they play.
    return withPlan(best);
  }
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
      ? teamWith(c, fielded(w, d.day), {
          fresh: (id) => training.fresh[id] ?? 1,
          familiarity: drilled(training.drill),
          morale: moraleOf(w),
        })
      : teamWith(c, rivalEleven(w, c, d.day, d.competitionId), {
          fresh: () => rivalFresh(w, clubId, d.day),
          familiarity: drilled(RIVAL_DRILL),
        });
  }) as typeof input.teams;
  input.teams[mine] = { ...input.teams[mine], coach: coachOf(60, { flexibility: 1 }) };
  return { input, mine };
}

/** The person's division table as it stands; in a group phase, their group. */
export const divisionTable = (w: CareerWorld) => divisionTableOf(w, w.clubId);

/** The table of a club's national division as it stands, or as it ended. */
export function divisionTableOf(w: CareerWorld, clubId: string): { name: string; rows: Row[] } {
  const div = nationalDivisions(w.pack).find((x) => w.season.members[x.id]?.includes(clubId));
  const comp = div && w.season.competitions.find((c) => c.id === div.id);
  if (!div || !comp) return { name: '', rows: [] };
  const first = comp.phases[0]!;
  const done = w.season.results[comp.id]?.[first.id];
  const finished = done?.tables.find((t) => t.some((r) => r.clubId === clubId));
  if (finished) return { name: div.name, rows: finished };
  const run = w.season.running.get(`${comp.id}/${first.id}`);
  const group =
    (run?.kind === 'table' ? run.groups.find((g) => g.includes(clubId)) : undefined) ??
    w.season.members[div.id]!;
  const inGroup = new Set(group);
  // Display order only; phase outcomes use the competition's own tie-breakers.
  const rows = standings(
    group,
    (w.season.played.get(div.id) ?? []).filter((g) => inGroup.has(g.home) && inGroup.has(g.away)),
    {
      points: { win: 3, draw: 1, loss: 0 },
      tieBreakers: ['goalDifference', 'goalsFor'],
      seed: 0,
      ...(w.season.deduct && { deduct: w.season.deduct }),
    },
  );
  return { name: div.name, rows };
}

export interface SeasonTurn {
  season: number;
  titles: { competitionId: string; clubId: string }[];
  /** The person's club moved up or down, if it did. */
  move: Move | null;
}

/** The age at which a boy leaves the academy for the first team whatever the person did. */
const FIRST_TEAM_AGE = 19;

/**
 * From a finished season to the next (05 §3, MC-172): titles, promotion and relegation by the
 * regulations, then the new season drawn from the career seed. The ledger carries on.
 */
export function startNextSeason(w: CareerWorld): SeasonTurn {
  if (!isOver(w.season)) throw new Error('career: the season is not over');
  // The season's story, read before anything turns.
  const entry = entryOf(seasonReview(w)!);
  let judged = boardAfterSeason(w);
  // The season's accounts are judged as the squads stood while it was played.
  const verdict = judgeFairPlay(w);
  if (verdict.board !== 0 && !judged.fired)
    judged = {
      ...judged,
      confidence: Math.max(0, judged.confidence + verdict.board),
      last: [...(judged.last ?? []), { kind: 'fairplay', value: verdict.board }],
    };
  // Every other club's accounts for the season, with the squads it was played with.
  const placed = new Map<string, { position: number; places: number }>();
  const placeOf = (id: string) => {
    let at = placed.get(id);
    if (!at) {
      const rows = divisionTableOf(w, id).rows;
      placed.set(
        id,
        (at = { position: rows.findIndex((r) => r.clubId === id) + 1, places: rows.length }),
      );
    }
    return at;
  };
  settleSeason(w, placeOf);
  // Loans end with the season: everyone goes back before the contracts are looked at.
  returnLoans(w);
  // Contracts that ran out: renewed, or the player walks (market/contracts.ts).
  expireContracts(w);
  // Labour claims over image-rights shares above the safe line (market/image.ts).
  settleImageClaims(w);
  const position = positionOf(w);
  if (!judged.fired)
    note(w, {
      day: w.day,
      kind: 'goal',
      met: position <= judged.goal,
      position,
      goal: judged.goal,
    });
  postSeasonEnd(w, position, divisionTable(w).rows.length);
  const owners = postOwners(w);
  if (owners > 0) note(w, { day: w.day, kind: 'owners', amount: owners });
  w.history = [...(w.history ?? []), entry];
  const played = w.season.season;
  const divisionId = w.season.competitions.find((c) => c.name === divisionTable(w).name)?.id;
  const year = w.season.season + 1;
  const t = finishSeason(w.season, regulationsFor(w.pack.competitions, year));
  // How far each name carries after the season: titles, Libertadores places, promotions and
  // relegations, players sold to Europe (clubs.ts).
  updateFame(
    w,
    (id) => ({ ...placeOf(id), tier: tierOfClub(w, id) }),
    new Map(t.moves.map((m) => [m.clubId, m.kind])),
  );
  w.season = startSeason(w.pack, {
    season: year,
    seed: seedOf(w.seed, `season:${year}`),
    members: t.members,
    slots: t.slots,
    previous: w.season.results,
    ranking: w.season.ranking,
    deduct: verdict.deduct,
    estaduais: true,
  });
  noteFairPlay(w, verdict);
  cupNotes(w, w.day, new Set(), w.season.decisions.length);
  note(w, {
    day: w.day,
    kind: 'season',
    season: played,
    champion: t.titles.find((x) => x.competitionId === divisionId)?.clubId ?? '',
    move: t.moves.find((m) => m.clubId === w.clubId)?.kind ?? 'stay',
  });
  // A year passes for every player: growth by where and how much each played, age, retirement
  // and the academies' crop (development.ts). The season's moves go into the log with it.
  const squad = w.pack.players.filter((p) => p.clubId === w.clubId);
  const share = (id: string) => ((w.starts?.[id] ?? 0) * 100) / Math.max(1, w.played ?? 0);
  const released = new Set(
    Object.entries(w.moves ?? {})
      .filter(([, m]) => m.clubId === null && m.season === played)
      .map(([id]) => id),
  );
  const log: SeasonLog = {
    season: played,
    ...nextPrices(w.seed, year, pricesOf(w)),
    youth: youthOf(w.origin, w.pack),
    // The season's work leaned to a group of attributes for the club's players.
    ...(w.training?.focus && {
      focus: { group: w.training.focus, ids: squad.map((p) => p.id) },
    }),
    growth: codeOf(
      w.pack,
      {
        clubId: w.clubId,
        intensity: w.training?.intensity ?? 'normal',
        played: Object.fromEntries(
          // A boy in the academy plays with his own age: neither held back nor pushed on.
          squad.map((p) => [
            p.id,
            w.academy?.includes(p.id) || share(p.id) >= 25 ? (share(p.id) >= 60 ? 2 : 1) : 0,
          ]),
        ),
      },
      released,
    ),
  };
  w.log = [...(w.log ?? []), log];
  w.pack = yearOn(w.pack, w.origin, w.seed, log);
  // Works finished, directors elected, the money to spare split (clubs.ts); the pack then
  // carries the structure as it now stands.
  const vote = planSeason(
    w,
    new Set(t.moves.filter((m) => m.kind === 'relegation').map((m) => m.clubId)),
    {
      placed: (id) => placed.get(id),
      board: judged,
      mood: (id) => moodOf(w.pack, w.season, id, w.day + 1),
    },
  );
  w.pack = withClubs(w.pack, w.clubs, w.origin);
  // The moves in force stay (each player's club and contract); those of players gone do not.
  const alive = new Set(w.pack.players.map((p) => p.id));
  w.moves = Object.fromEntries(Object.entries(w.moves ?? {}).filter(([id]) => alive.has(id)));
  // The year's boys go to the academy. Those already there stay until nineteen, when the club
  // brings them up by itself; a boy sold or let go is no longer the academy's.
  const kept = new Set(w.academy ?? []);
  const ageNow = (p: { birthDate: string }) => year - Number(p.birthDate.slice(0, 4));
  let boys = 0;
  let up = 0;
  const academy: string[] = [];
  for (const p of w.pack.players) {
    if (p.clubId !== w.clubId) continue;
    const fresh = p.id.startsWith(`y${year}-`);
    if (fresh) boys++;
    if (fresh || (kept.has(p.id) && ageNow(p) < FIRST_TEAM_AGE)) academy.push(p.id);
    else if (kept.has(p.id)) up++;
  }
  if (academy.length) w.academy = academy;
  else delete w.academy;
  // The other clubs bring their boys up at the same age (bases.ts).
  bringUp(
    w,
    w.pack.players.filter((p) => isBase(p.clubId) && ageNow(p) >= FIRST_TEAM_AGE),
  );
  if (boys > 0) note(w, { day: w.day, kind: 'crop', players: boys });
  if (up > 0) note(w, { day: w.day, kind: 'cameUp', players: up });
  delete w.starts;
  delete w.scored;
  // Minutes start over: unrest and promises with them; buy-backs of seasons gone expire.
  delete w.unhappy;
  pruneClauses(w);
  delete w.played;
  newSeasonDiscipline(w);
  newSeasonCoaches(w);
  // Each office has had another season with its players.
  setJudgementClock(w.pack, w.seed, year, arrivalsOf(w.moves));
  // Rival squads cleared for the new season, read with the new clock: spares go, and
  // sanctioned clubs cut (contracts.ts).
  trimSquads(w);
  const levels = clubLevels(w.pack, w.season.season);
  w.strength = levels.strength;
  w.eleven = levels.eleven;
  // A picked eleven with someone who retired goes back to the coach.
  const here = new Set(w.pack.players.filter((p) => p.clubId === w.clubId).map((p) => p.id));
  if (w.lineup?.xi.some((id) => !here.has(id))) delete w.lineup;
  // The goal is set again for the table the club is now in.
  w.board = { ...judged, goal: goalFor(w) };
  // A new president: the board's confidence starts over, or he brings his own coach.
  if (vote === 'fresh') w.board = freshBoard(w);
  if (vote === 'fired') w.board = { ...freshBoard(w), fired: true };
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
