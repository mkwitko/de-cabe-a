/**
 * What a club can spend in a season (04 §4, §8.1): a transfer budget and a ceiling for the
 * monthly wage bill, both read from its income (TV by division, sponsors, gate) and from how
 * much risk its owners take. The other clubs have no ledger yet, so this is their whole
 * finance: what they have spent and earned in the market this season is kept in the career
 * (`w.books`) and counted against the budget. Integers; every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { seasonIncome } from '../career/finance';
import { pricesOf } from '../career/prices';
import type { Horizon } from '../career/clubs';
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

/** Each club's national tier this season, read once per season (members do not change in it). */
const tiers = new WeakMap<object, Map<string, number>>();

export function tierOfClub(w: CareerWorld, clubId: string): number {
  let by = tiers.get(w.season);
  if (!by) {
    by = new Map();
    for (const d of nationalDivisions(w.pack))
      for (const id of w.season.members[d.id] ?? []) by.set(id, d.tier);
    tiers.set(w.season, by);
  }
  return by.get(clubId) ?? 4;
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

/** A club's income for the season in the division it plays, at the season's prices. */
export const incomeOf = (w: CareerWorld, clubId: string) =>
  seasonIncome(
    w.pack.clubs.find((c) => c.id === clubId)!,
    tierOfClub(w, clubId),
    pricesOf(w).prices,
  );

/** Points of income added to the person's fees by their directors' horizon. */
const PURSE: Record<Horizon, number> = { short: 4, medium: 0, long: -3 };
/** Share of the directors' squad money a short-sighted board lets go to wages. */
const KITTY_WAGES: Record<Horizon, number> = { short: 40, medium: 20, long: 10 };

function readBudget(w: CareerWorld, clubId: string): Budget {
  const club = w.pack.clubs.find((c) => c.id === clubId)!;
  const income = incomeOf(w, clubId);
  const risk = club.profile.financialRisk;
  const s = clubId === w.clubId ? undefined : w.clubs?.[clubId];
  const kitty = s?.kitty ?? 0;
  const toWages = s ? Math.round((kitty * KITTY_WAGES[s.directors.horizon]) / 100) : 0;
  // The person's directors: the short-sighted open the purse, the far-sighted hold it for later.
  const purse = clubId === w.clubId ? PURSE[w.clubs?.[clubId]?.directors.horizon ?? 'medium'] : 0;
  // In the red, the fees wait for the debt: half of what is owed comes off them.
  const owed = s && s.cash < 0 ? Math.round(-s.cash / 2) : 0;
  return {
    income,
    // 6% to 16% of the income goes to fees; 55% to 75% may go to wages; plus what the
    // directors put in from the cash.
    transfer: Math.max(
      0,
      thousands((income * (6 + purse + risk / 10)) / 100) + kitty - toWages - owed,
    ),
    wageCap: Math.round(((income * (55 + risk / 5)) / 100 + toWages) / 12),
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
  // Careful owners keep the squad inside the fair play limit, or a prudent share where the rule
  // sets none; the bold ones find out later.
  if (club.profile.financialRisk < PRUDENT && clubId !== w.clubId)
    return Math.min(
      room,
      Math.round((budgetOf(w, clubId).income * (costLimitOf(w, clubId) ?? PRUDENT_COST)) / 1200) -
        bill,
    );
  return room;
}

/** Squad cost careful owners keep to where the rule sets no limit, % of income. */
const PRUDENT_COST = 75;

/**
 * The CBF's financial sustainability rule (04 §4.5, art. 60 and 93): the most a squad may cost,
 * % of the season's income, by division and exercise. Série A 90% in 2026, 80% in 2027, 70%
 * after; Série B 90% in 2026, 80% after; no limit in Série C, and Série D is outside the rule.
 */
export function costLimitOf(
  w: CareerWorld,
  clubId: string,
  season = w.season.season,
): number | null {
  const tier = tierOfClub(w, clubId);
  if (tier === 1) return season <= 2026 ? 90 : season === 2027 ? 80 : 70;
  if (tier === 2) return season <= 2026 ? 90 : 80;
  return null;
}

/** True when a club's squad costs more than its division's limit allows. */
export const overLimit = (w: CareerWorld, clubId: string): boolean => {
  const limit = costLimitOf(w, clubId);
  return limit !== null && squadCost(w, clubId) > limit;
};
/** Owners with less appetite for risk than this never plan past the limit. */
export const PRUDENT = 50;

/** The squad's wages for a season as a percentage of the club's income. */
export const squadCost = (w: CareerWorld, clubId: string): number =>
  Math.round((wageBill(w, clubId) * 1200) / Math.max(1, budgetOf(w, clubId).income));

/** Seasons in a row the club ended over the limit (market/fairplay.ts). */
export const strikesOf = (w: CareerWorld, clubId: string): number => w.fairplay?.[clubId] ?? 0;

/** From the third season in a row over the limit, the club registers nobody (fairplay.ts). */
export const embargoed = (w: CareerWorld, clubId: string): boolean => strikesOf(w, clubId) >= 3;

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
