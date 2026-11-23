/**
 * The coaches of the other clubs (06 §5.3): every club of the national divisions has a board
 * that judges its coach after each match as the person's does (board.ts: the result against the
 * odds, weighed by the pressure on the club), and sacks him when its confidence falls under the
 * club's line. The Brazilian "dança das cadeiras": 20 to 30 Série A coaches a season (Band, 2025:
 * 0.79 changes a round, the record of 2010), a coach lasting eight months and a half (CIES).
 *
 * A sacked coach leaves a vacancy for a few days. The person hears of the ones in their division;
 * a vacancy at a bigger club, while the person's own board is pleased, is an approach they can
 * take; a dismissed person is offered the vacancies first (jobs.ts).
 */
import { isMinorCup } from '../competition/regionais';
import { isDerby } from '../match/stadium';
import type { Outcome } from '../competition/season';
import type { CareerWorld } from './advance';
import {
  BENCH_START,
  divisionOf,
  pressureOf,
  EARLY_EXIT,
  resultValue,
  thresholdFor,
  divisionTierOf,
} from './board';
import { driftDna, dismiss, hire } from './coach-pool';
import { note } from './inbox';

export interface Bench {
  /** 0..100, the club's board's confidence in its coach. */
  confidence: number;
  /** Day the coach took the job. */
  since: number;
  /** Matches he has had in charge. */
  matches?: number;
  /** Matches in a row without a win. */
  winless?: number;
}

/**
 * PARÂMETROS. A new coach gets a few matches before he can be sacked (`GRACE`); a vacancy stays
 * open this many days before the club hires someone else (`VACANCY_DAYS`); the person is
 * approached by a club at most this much stronger than theirs (`STEP_UP`), only while their own
 * board's confidence is at `PLEASED` or more.
 */
const GRACE = 4;
/**
 * Per tier (index 0 = Série A): matches a new coach gets, and points added to the board's edge.
 * Série A is the original calibration; below it, boards sack less often but more clubs are hit
 * (Série B: 16 of 20 clubs changed coach in 2026), so a fresh coach is kept longer (fewer repeat
 * sackings) while the edge is higher. PARÂMETROS, set against bench/reality.ts.
 */
const GRACE_TIER = [GRACE, 8, 8, 8];
const EDGE_TIER = [0, 6, 6, 6];
/**
 * Another club's board sacks without the ultimatum the person gets first: it acts this many
 * points above the person's line. A winless run costs it `RUN_COST` every `RUN` matches, the
 * story in the papers (more under pressure). PARÂMETROS, set against the 20 to 30 a season.
 */
const EDGE = 20;
const RUN = 3;
const RUN_COST = 3;
const VACANCY_DAYS = 10;
const STEP_UP = 8;
const PLEASED = 65;

/** The other clubs' coaches, opened on first use. */
const benchOf = (w: CareerWorld, clubId: string): Bench =>
  ((w.benches ??= {})[clubId] ??= { confidence: BENCH_START, since: 0 });

/**
 * After one match of the day, for the clubs other than the person's: the board's confidence in
 * its coach, and the sack when it falls under the club's line.
 */
export function judgeCoaches(
  w: CareerWorld,
  match: { home: string; away: string; competitionId: string },
  o: Outcome,
  day: number,
): void {
  const estadual = isMinorCup({ id: match.competitionId });
  for (const [side, clubId] of [match.home, match.away].entries()) {
    if (clubId === w.clubId || !divisionOf(w, clubId)) continue;
    const t = (divisionTierOf(w, clubId) ?? 1) - 1;
    const rival = side === 0 ? match.away : match.home;
    const [mine, theirs] = side === 0 ? o.goals : [o.goals[1], o.goals[0]];
    if (w.vacancies?.[clubId] !== undefined) continue;
    const b = benchOf(w, clubId);
    const { result, value } = resultValue(
      w,
      clubId,
      rival,
      mine,
      theirs,
      estadual ? { derby: isDerby(w.pack, clubId, rival) } : undefined,
    );
    b.winless = result === 'W' ? 0 : (b.winless ?? 0) + 1;
    const run =
      b.winless > 0 && b.winless % RUN === 0 ? RUN_COST + (pressureOf(w, clubId) >= 75 ? 1 : 0) : 0;
    b.confidence = Math.max(0, Math.min(100, b.confidence + value - run));
    b.matches = (b.matches ?? 0) + 1;
    if (
      b.matches >= (GRACE_TIER[t] ?? GRACE) &&
      b.confidence < thresholdFor(w, clubId) + EDGE + (EDGE_TIER[t] ?? 0)
    )
      sack(w, clubId, day);
  }
}

/** A club out of its state championship early: its board's patience takes the blow. */
export function judgeExit(w: CareerWorld, clubId: string, day: number): void {
  if (clubId === w.clubId || !divisionOf(w, clubId) || w.vacancies?.[clubId] !== undefined) return;
  const t = (divisionTierOf(w, clubId) ?? 1) - 1;
  const b = benchOf(w, clubId);
  b.confidence = Math.max(0, Math.min(100, b.confidence + EARLY_EXIT));
  if (
    (b.matches ?? 0) >= (GRACE_TIER[t] ?? GRACE) &&
    b.confidence < thresholdFor(w, clubId) + EDGE + (EDGE_TIER[t] ?? 0)
  )
    sack(w, clubId, day);
}

function sack(w: CareerWorld, clubId: string, day: number): void {
  (w.vacancies ??= {})[clubId] = day;
  w.sacked = [...(w.sacked ?? []), clubId];
  delete w.benches![clubId];
  dismiss(w, clubId);
  const near = divisionOf(w, clubId) === divisionOf(w, w.clubId);
  if (near) note(w, { day, kind: 'coachSacked', club: clubId });
  // A bigger club calls the person while their own board is pleased with them.
  const mine = w.strength.get(w.clubId) ?? 0;
  const theirs = w.strength.get(clubId) ?? 0;
  if (
    !w.board?.fired &&
    (w.board?.confidence ?? BENCH_START) >= PLEASED &&
    theirs > mine &&
    theirs - mine <= STEP_UP
  )
    note(w, { day, kind: 'approach', club: clubId });
}

/** The vacancies still open on `day`; the older ones were filled by someone else. */
export function fillVacancies(w: CareerWorld, day: number): void {
  for (const [clubId, opened] of Object.entries(w.vacancies ?? {}))
    if (day - opened > VACANCY_DAYS) {
      delete w.vacancies![clubId];
      w.benches![clubId] = { confidence: BENCH_START, since: day };
      hire(w, clubId, day);
    }
  if (w.vacancies && !Object.keys(w.vacancies).length) delete w.vacancies;
}

/** Clubs with an open vacancy that called the person while employed (`approach` notes). */
export function approaches(w: CareerWorld): string[] {
  if (w.board?.fired) return [];
  const open = new Set(Object.keys(w.vacancies ?? {}));
  const seen = new Set<string>();
  for (const n of w.inbox ?? [])
    if (n.kind === 'approach' && open.has(n.club) && n.club !== w.clubId) seen.add(n.club);
  return [...seen];
}

/** The season's turn: a fresh count of sackings; benches carry over. */
export function newSeasonCoaches(w: CareerWorld): void {
  delete w.sacked;
  driftDna(w);
}
