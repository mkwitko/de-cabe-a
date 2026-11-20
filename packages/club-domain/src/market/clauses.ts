/**
 * Contract clauses that outlive a sale (07 §6). Real practice: a selling club often keeps a
 * "percentual de revenda" (sell-on: a share of the fee of the player's next sale; the Lei Pelé
 * lets clubs share economic rights, FIFA bars outside investors from them, so it stays between
 * the two clubs) and sometimes a buy-back clause ("cláusula de recompra": a fixed price, valid
 * for some seasons, to take him back). Buyers pay less for both. Sources: Legale, "sell-on"
 * drafting (legale.com.br/?p=1699505); jus.com.br/artigos/31633. Every number is a PARÂMETRO.
 * Only the person's sales carry clauses; the AI clubs do not trade them among themselves.
 */
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { postEntry } from '../finance/ledger';
import type { PackPlayer } from '../pack/schema';
import { booksOf } from './books';
import { thousands } from './value';

export const SELLON_MAX = 30;
/** What a buyer takes off the fee per hundred points of sell-on share asked. */
const SELLON_VALUE = 40;
/** Buy-back price as a percentage of the fee: from par to double. */
export const BUYBACK_MIN = 100;
export const BUYBACK_MAX = 200;
export const BUYBACK_SEASONS = 3;

export interface Clauses {
  /** The club that gets `pct` of the next fee. */
  sellOn?: { holder: string; pct: number };
  /** The club that may take him back for `price` until the end of season `until`. */
  buyBack?: { holder: string; price: number; until: number };
}

/** What the person asks when selling: a sell-on share and/or a buy-back (price % of the fee). */
export interface SaleClauses {
  sellOn?: number;
  buyBack?: { price: number; seasons: number };
}

/** The share the buyer takes off for a buy-back: the cheaper the price, the bigger. */
const buyBackCut = (price: number) => Math.max(0, Math.floor((BUYBACK_MAX - price) / 10));

export function validSale(c?: SaleClauses): boolean {
  if (!c) return true;
  const { sellOn: s, buyBack: b } = c;
  if (s !== undefined && (!Number.isInteger(s) || s < 0 || s > SELLON_MAX)) return false;
  return (
    !b ||
    (Number.isInteger(b.price) &&
      b.price >= BUYBACK_MIN &&
      b.price <= BUYBACK_MAX &&
      Number.isInteger(b.seasons) &&
      b.seasons >= 1 &&
      b.seasons <= BUYBACK_SEASONS)
  );
}

/** The fee the buyer pays once it values the clauses it gives. */
export function clausedFee(fee: number, c?: SaleClauses): number {
  if (!c) return fee;
  const cut =
    Math.round(((c.sellOn ?? 0) * SELLON_VALUE) / 100) +
    (c.buyBack ? buyBackCut(c.buyBack.price) : 0);
  return thousands((fee * (100 - cut)) / 100);
}

/** Clauses still in force on a player (a buy-back past its seasons is gone). */
export function clausesOf(w: CareerWorld, id: string): Clauses | undefined {
  const c = w.clauses?.[id];
  if (!c) return undefined;
  const live: Clauses = {
    ...(c.sellOn && { sellOn: c.sellOn }),
    ...(c.buyBack && c.buyBack.until >= w.season.season && { buyBack: c.buyBack }),
  };
  return live.sellOn || live.buyBack ? live : undefined;
}

const setClauses = (w: CareerWorld, id: string, c: Clauses | undefined) => {
  const { [id]: _old, ...rest } = w.clauses ?? {};
  if (c) w.clauses = { ...rest, [id]: c };
  else if (Object.keys(rest).length) w.clauses = rest;
  else delete w.clauses;
};

/** The person's club just sold `p` for `net`: records what it kept. Call after the sale's books. */
export function grant(w: CareerWorld, p: PackPlayer, net: number, c?: SaleClauses): void {
  if (!c || (!c.sellOn && !c.buyBack)) return;
  setClauses(w, p.id, {
    ...(c.sellOn && { sellOn: { holder: w.clubId, pct: c.sellOn } }),
    ...(c.buyBack && {
      buyBack: {
        holder: w.clubId,
        price: thousands((net * c.buyBack.price) / 100),
        until: w.season.season + c.buyBack.seasons - 1,
      },
    }),
  });
}

/**
 * A fee changed hands for `p` (books.ts, abroad.ts): the holder of his sell-on gets its share,
 * once; a holder who buys him, or sells him again himself, ends the clauses.
 */
export function resale(w: CareerWorld, p: PackPlayer, from: string, to: string, fee: number): void {
  const c = w.clauses?.[p.id];
  if (!c) return;
  const holder = (c.sellOn ?? c.buyBack)!.holder;
  if (to === holder || from === holder) return setClauses(w, p.id, undefined);
  const { sellOn, ...left } = c;
  setClauses(w, p.id, left.buyBack ? left : undefined);
  if (!sellOn || fee <= 0) return;
  const share = thousands((fee * sellOn.pct) / 100);
  if (share <= 0) return;
  const books = (id: string, d: number) => {
    const b = booksOf(w, id);
    w.books = { ...w.books, [id]: { ...b, earned: b.earned + d } };
  };
  books(from, -share);
  if (holder === w.clubId) {
    postEntry(w.ledger, {
      key: `sellon:${p.id}:${w.ledger.today}`,
      kind: 'transfers',
      ref: `player:${p.id}`,
      amount: share,
      day: w.ledger.today,
      dueDay: w.ledger.today,
    });
    note(w, { day: w.day, kind: 'sellOn', player: p.knownAs ?? p.name, fee: share });
  } else books(holder, share);
}

/** Drops the clauses of seasons gone. */
export function pruneClauses(w: CareerWorld): void {
  for (const id of Object.keys(w.clauses ?? {}))
    if (!clausesOf(w, id)) setClauses(w, id, undefined);
}
