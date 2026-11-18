/**
 * Financial fair play (04 §8.2). A club may run its money badly: owners with an appetite for
 * risk sign past what the club earns. What it may not do is go on like that for free. At each
 * season's end every squad's cost is read against the club's income, and each season in a row
 * over the limit costs more:
 *
 *   1st  a warning;
 *   2nd  an embargo: nobody is registered next season (no signing, no loan in, no raise);
 *   3rd+ the embargo, and points off in the national division: 3, then 6, then 9.
 *
 * A season ended inside the limit clears the record. The same rule for the person's club and
 * for every other. Integers; every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { nationalDivisions } from '../career/start';
import { SQUAD_COST_LIMIT, squadCost } from './books';

const POINTS_STEP = 3;
const POINTS_MOST = 9;
/** What each stage costs the person with their board. */
const BOARD = [0, -4, -10, -15] as const;

/** Points a club starts the next season without, by its seasons in a row over the limit. */
export const deductionFor = (strikes: number): number =>
  strikes < 3 ? 0 : Math.min(POINTS_MOST, (strikes - 2) * POINTS_STEP);

export interface Verdict {
  /** Points off, by club, for the season about to start. */
  deduct: Record<string, number>;
  /** The person's club: its squad cost and where it now stands. */
  mine: { cost: number; strikes: number };
  /** What the verdict moves the board's confidence by. */
  board: number;
}

/** Judges the season just played and writes each club's record. Called once, at the turn. */
export function judgeFairPlay(w: CareerWorld): Verdict {
  const record: Record<string, number> = {};
  const deduct: Record<string, number> = {};
  for (const c of w.pack.clubs) {
    if (squadCost(w, c.id) <= SQUAD_COST_LIMIT) continue;
    const strikes = (w.fairplay?.[c.id] ?? 0) + 1;
    record[c.id] = strikes;
    if (deductionFor(strikes) > 0) deduct[c.id] = deductionFor(strikes);
  }
  if (Object.keys(record).length > 0) w.fairplay = record;
  else delete w.fairplay;
  const strikes = record[w.clubId] ?? 0;
  return {
    deduct,
    mine: { cost: squadCost(w, w.clubId), strikes },
    board: BOARD[Math.min(strikes, BOARD.length - 1)]!,
  };
}

/** Tells the person: their own verdict, and the rivals of their new division docked points. */
export function noteFairPlay(w: CareerWorld, v: Verdict): void {
  if (v.mine.strikes > 0)
    note(w, {
      day: w.day,
      kind: 'fairplay',
      strikes: v.mine.strikes,
      cost: v.mine.cost,
      points: v.deduct[w.clubId] ?? 0,
    });
  const div = nationalDivisions(w.pack).find((d) => w.season.members[d.id]?.includes(w.clubId));
  for (const club of w.season.members[div?.id ?? ''] ?? [])
    if (club !== w.clubId && v.deduct[club])
      note(w, { day: w.day, kind: 'fairplayRival', club, points: v.deduct[club] });
}
