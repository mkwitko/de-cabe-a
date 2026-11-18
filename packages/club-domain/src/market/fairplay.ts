/**
 * Financial fair play, as the CBF's sustainability rule writes it (04 §4.5, art. 106). A club
 * may run its money badly: owners with an appetite for risk sign past what the club earns.
 * What it may not do is go on like that for free. At each season's end every squad's cost is
 * read against the club's income and its division's limit (books.ts `costLimitOf`: Série A and
 * B only), and each season in a row over it costs more:
 *
 *   1st  a public warning;
 *   2nd  a fine of a quarter of the year's excess;
 *   3rd  a fine of half of it, and nobody is registered next season (no signing, no loan in);
 *   4th+ the whole excess as a fine, the ban, and 3 points off in the national division.
 *
 * Exercises up to 2026 are the rule's transition: a warning and nothing more. A season ended
 * inside the limit clears the record. The same rule for the person's club and for every other;
 * the person's fine is a ledger entry, the others' comes off their cash. Integers; every
 * number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { clubsOf } from '../career/clubs';
import { note } from '../career/inbox';
import { nationalDivisions } from '../career/start';
import { postEntry } from '../finance/ledger';
import { budgetOf, costLimitOf, squadCost, wageBill } from './books';

/** Last exercise of the transition, when the rule only warns. */
export const TRANSITION_UNTIL = 2026;
const POINTS = 3;
/** Share of the year's excess fined, by seasons in a row over the limit. */
const FINE = [0, 0, 25, 50, 100] as const;
/** What each stage costs the person with their board. */
const BOARD = [0, -4, -8, -12, -15] as const;

/** Points a club starts the next season without, by its seasons in a row over the limit. */
export const deductionFor = (strikes: number): number => (strikes >= 4 ? POINTS : 0);

export interface Verdict {
  /** Points off, by club, for the season about to start. */
  deduct: Record<string, number>;
  /** The person's club: its squad cost, where it now stands and the fine it pays. */
  mine: { cost: number; strikes: number; fine: number };
  /** What the verdict moves the board's confidence by. */
  board: number;
}

/** Judges the season just played and writes each club's record. Called once, at the turn. */
export function judgeFairPlay(w: CareerWorld): Verdict {
  const season = w.season.season;
  const transition = season <= TRANSITION_UNTIL;
  const record: Record<string, number> = {};
  const deduct: Record<string, number> = {};
  let mine = 0;
  for (const c of w.pack.clubs) {
    const limit = costLimitOf(w, c.id, season);
    if (limit === null || squadCost(w, c.id) <= limit) continue;
    const strikes = transition ? 1 : (w.fairplay?.[c.id] ?? 0) + 1;
    record[c.id] = strikes;
    if (deductionFor(strikes) > 0) deduct[c.id] = deductionFor(strikes);
    const share = FINE[Math.min(strikes, FINE.length - 1)]!;
    if (share === 0) continue;
    const excess = wageBill(w, c.id) * 12 - Math.round((budgetOf(w, c.id).income * limit) / 100);
    const fine = Math.max(0, Math.round((excess * share) / 100 / 1000) * 1000);
    if (c.id === w.clubId) mine = fine;
    else clubsOf(w)[c.id]!.cash -= fine;
  }
  if (mine > 0)
    postEntry(w.ledger, {
      key: `fine:${season}`,
      kind: 'fine',
      ref: `season:${season}`,
      amount: -mine,
      day: w.ledger.today,
      dueDay: w.ledger.today,
    });
  if (Object.keys(record).length > 0) w.fairplay = record;
  else delete w.fairplay;
  const strikes = record[w.clubId] ?? 0;
  return {
    deduct,
    mine: { cost: squadCost(w, w.clubId), strikes, fine: mine },
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
      ...(v.mine.fine > 0 && { fine: v.mine.fine }),
    });
  const div = nationalDivisions(w.pack).find((d) => w.season.members[d.id]?.includes(w.clubId));
  for (const club of w.season.members[div?.id ?? ''] ?? [])
    if (club !== w.clubId && v.deduct[club])
      note(w, { day: w.day, kind: 'fairplayRival', club, points: v.deduct[club] });
}
