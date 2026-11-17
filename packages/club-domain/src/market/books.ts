/**
 * What a club can spend in a season (04 §4, §8.1): a transfer budget and a ceiling for the
 * monthly wage bill, both read from its income (TV by division, sponsors, gate) and from how
 * much risk its owners take. The other clubs have no ledger yet, so this is their whole
 * finance: what they have spent and earned in the market this season is kept in the career
 * (`w.books`) and counted against the budget. Integers; every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { BY_TIER } from '../career/finance';
import { nationalDivisions } from '../career/start';
import { squadPlayers } from '../career/squad';
import { thousands } from './value';

/** Home matches counted for a season's gate. */
const HOME_MATCHES = 15;
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

export function budgetOf(w: CareerWorld, clubId: string): Budget {
  const club = w.pack.clubs.find((c) => c.id === clubId)!;
  const tier = BY_TIER[tierOfClub(w, clubId)]!;
  const gate =
    Math.min(
      club.stadium.capacity,
      Math.round((club.fans.size * (300 + 2 * club.fans.demand)) / 10_000),
    ) *
    tier.ticket *
    HOME_MATCHES;
  const sponsors = club.sponsors.reduce((s, x) => s + x.annual, 0);
  const income = tier.tv + sponsors + gate;
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
  return Math.max(budgetOf(w, clubId).wageCap, lived) - wageBill(w, clubId);
}

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
