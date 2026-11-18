/**
 * What a club can spend in a season (04 §4, §8.1): a transfer budget and a ceiling for the
 * monthly wage bill, both read from its income (TV by division, sponsors, gate) and from how
 * much risk its owners take. The other clubs have no ledger yet, so this is their whole
 * finance: what they have spent and earned in the market this season is kept in the career
 * (`w.books`) and counted against the budget. Integers; every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { seasonIncome } from '../career/finance';
import { nationalDivisions } from '../career/start';
import { squadPlayers } from '../career/squad';
import { thousands } from './value';

/** Share of a sale a club puts back into signings. */
const REINVEST = 80;

export interface Budget {
  /** A season's income. */
  income: number;
  /** For fees, over the season. */
  transfer: number;
  /** Ceiling of the monthly wage bill. */
  wageCap: number;
}

export function tierOfClub(w: CareerWorld, clubId: string): number {
  const div = nationalDivisions(w.pack).find((d) => w.season.members[d.id]?.includes(clubId));
  return div?.tier ?? 4;
}

/** A season's budgets, read once per club: the division and the income do not change in it. */
const budgets = new WeakMap<object, Map<string, Budget>>();

export function budgetOf(w: CareerWorld, clubId: string): Budget {
  let by = budgets.get(w.season);
  if (!by) budgets.set(w.season, (by = new Map()));
  let b = by.get(clubId);
  if (!b) by.set(clubId, (b = readBudget(w, clubId)));
  return b;
}

function readBudget(w: CareerWorld, clubId: string): Budget {
  const club = w.pack.clubs.find((c) => c.id === clubId)!;
  const income = seasonIncome(club, tierOfClub(w, clubId));
  const risk = club.profile.financialRisk;
  return {
    income,
    // 6% to 16% of the income goes to fees; 55% to 75% may go to wages.
    transfer: thousands((income * (6 + risk / 10)) / 100),
    wageCap: Math.round((income * (55 + risk / 5)) / 100 / 12),
  };
}

export const wageBill = (w: CareerWorld, clubId: string) =>
  squadPlayers({ pack: w.pack, clubId }).reduce((s, p) => s + (p.contract?.wage ?? 0), 0);

export interface Books {
  spent: number;
  earned: number;
  /** The wage bill when the season's market opened: what the club already lives with. */
  bill: number;
}

/** The club's market season so far; opened on first use with the wage bill of that day. */
export function booksOf(w: CareerWorld, clubId: string): Books {
  const b = w.books?.[clubId];
  if (b) return b;
  const opened = { spent: 0, earned: 0, bill: wageBill(w, clubId) };
  w.books = { ...w.books, [clubId]: opened };
  return opened;
}

/** What the club can still pay in fees this season. */
export function available(w: CareerWorld, clubId: string): number {
  const b = booksOf(w, clubId);
  return budgetOf(w, clubId).transfer - b.spent + Math.round((b.earned * REINVEST) / 100);
}

/**
 * Monthly wage the club can still add. The pack's clubs already pay more than a prudent share
 * of their income, so the ceiling is the higher of that share and the bill the season opened
 * with plus a margin by the owners' appetite for risk (5% to 15%).
 */
export function wageRoom(w: CareerWorld, clubId: string): number {
  const club = w.pack.clubs.find((c) => c.id === clubId)!;
  const lived = Math.round(
    (booksOf(w, clubId).bill * (105 + club.profile.financialRisk / 10)) / 100,
  );
  const bill = wageBill(w, clubId);
  const room = Math.max(budgetOf(w, clubId).wageCap, lived) - bill;
  // Under an embargo nobody is registered: no wage can be added.
  if (embargoed(w, clubId)) return Math.min(0, room);
  // Careful owners keep the squad inside the fair play limit; the bold ones find out later.
  if (club.profile.financialRisk < PRUDENT && clubId !== w.clubId)
    return Math.min(
      room,
      Math.round((budgetOf(w, clubId).income * SQUAD_COST_LIMIT) / 1200) - bill,
    );
  return room;
}

/**
 * Financial fair play (04 §8.2): a squad may cost up to this share of the season's income.
 * PARÂMETRO, the figure of UEFA's squad cost rule.
 */
export const SQUAD_COST_LIMIT = 70;
/** Owners with less appetite for risk than this never plan past the limit. */
const PRUDENT = 50;

/** The squad's wages for a season as a percentage of the club's income. */
export const squadCost = (w: CareerWorld, clubId: string): number =>
  Math.round((wageBill(w, clubId) * 1200) / Math.max(1, budgetOf(w, clubId).income));

/** Seasons in a row the club ended over the limit (market/fairplay.ts). */
export const strikesOf = (w: CareerWorld, clubId: string): number => w.fairplay?.[clubId] ?? 0;

/** From the second season in a row over the limit, the club registers nobody. */
export const embargoed = (w: CareerWorld, clubId: string): boolean => strikesOf(w, clubId) >= 2;

/** Counts a fee paid and a fee received in the two clubs' season. */
export function book(w: CareerWorld, from: string, to: string, fee: number): void {
  const paid = booksOf(w, to);
  const got = booksOf(w, from);
  w.books = {
    ...w.books,
    [to]: { ...paid, spent: paid.spent + fee },
    [from]: { ...got, earned: got.earned + fee },
  };
}
