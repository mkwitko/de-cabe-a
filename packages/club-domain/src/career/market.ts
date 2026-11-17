/**
 * The transfer market, first cut (07 §9, corte 1): the person buys a player at the selling
 * club's asking price and sells one to the club that needs him most, inside a window. One round,
 * no agents, no loans, no bargaining yet. The other clubs do not trade among themselves.
 *
 * A move never edits the pack the career was opened with: the world gets a new pack object with
 * that player's club and contract changed, and the move is kept in `w.moves` so the snapshot can
 * rebuild it. Money goes through the ledger and nowhere else. Exact arithmetic (ADR-020); every
 * number is a PARÂMETRO, not calibrated.
 */
import { isoOf } from '../competition/calendar';
import { seedOf } from '../competition/season';
import { postEntry } from '../finance/ledger';
import type { Pack, PackPlayer } from '../pack/schema';
import { bestRoles } from '../player/ratings';
import type { CareerWorld } from './advance';
import { clubLevel } from './training';
import { note } from './inbox';

/** A player's club and contract after a move, by player id. */
export type Moves = Record<string, { clubId: string; wage: number; until: string }>;

/** Smallest squad a club may be left with, and keepers in it: the engine needs 18 and a spare. */
const MIN_SQUAD = 20;
const MIN_KEEPERS = 2;
const MAX_SQUAD = 35;
/** Years of contract a signing gets. */
const SIGNING_YEARS = 3;

/** The windows: from the turn of the year to the end of April, and all of July. */
export function windowOpen(day: number): boolean {
  const md = isoOf(day).slice(5);
  return md <= '04-30' || md.startsWith('07');
}

const isKeeper = (p: PackPlayer) => p.positions.some((x) => x.position === 'GK');
const ageOf = (p: PackPlayer, season: number) => season - Number(p.birthDate.slice(0, 4));
const thousands = (x: number) => Math.round(x / 1000) * 1000;

/**
 * What a player is worth on the market: a year of his wage, times what his age still promises.
 * The pack's wages already follow each club's level, so the value does too.
 */
export function marketValue(p: PackPlayer, season: number): number {
  const age = ageOf(p, season);
  const years = age <= 23 ? 4 : age <= 28 ? 3 : age <= 31 ? 2 : 1;
  return thousands((p.contract?.wage ?? 0) * 12 * years);
}
/** What his club asks to let him go: over the value. */
export const askingPrice = (p: PackPlayer, season: number) =>
  thousands((marketValue(p, season) * 115) / 100);
/** What a buying club pays the person for him: under the value. */
export const sellingPrice = (p: PackPlayer, season: number) =>
  thousands((marketValue(p, season) * 90) / 100);
/** The wage he signs for at his new club. */
const signingWage = (p: PackPlayer) => Math.round(((p.contract?.wage ?? 0) * 110) / 100);

const squadOf = (pack: Pack, clubId: string) => pack.players.filter((p) => p.clubId === clubId);
const canLose = (pack: Pack, p: PackPlayer) => {
  const squad = squadOf(pack, p.clubId!);
  return squad.length > MIN_SQUAD && (!isKeeper(p) || squad.filter(isKeeper).length > MIN_KEEPERS);
};

/** The pack with these moves applied: a new object, the players untouched otherwise. */
export function withMoves(pack: Pack, moves: Moves): Pack {
  if (Object.keys(moves).length === 0) return pack;
  return {
    ...pack,
    players: pack.players.map((p) => {
      const m = moves[p.id];
      return m
        ? {
            ...p,
            clubId: m.clubId,
            contract: { wage: m.wage, until: m.until, releaseFee: null },
          }
        : p;
    }),
  };
}

function move(w: CareerWorld, p: PackPlayer, to: string, fee: number, kind: 'buy' | 'sell') {
  const from = p.clubId!;
  const moved = {
    clubId: to,
    wage: signingWage(p),
    until: `${w.season.season + SIGNING_YEARS}-12-31`,
  };
  w.moves = { ...w.moves, [p.id]: moved };
  w.pack = withMoves(w.pack, { [p.id]: moved });
  postEntry(w.ledger, {
    key: `transfer:${p.id}:${w.ledger.today}:${kind}`,
    kind: 'transfers',
    ref: `player:${p.id}`,
    amount: kind === 'buy' ? -fee : fee,
    day: w.ledger.today,
    dueDay: w.ledger.today,
  });
  note(w, {
    day: w.day,
    kind: kind === 'buy' ? 'bought' : 'sold',
    player: p.knownAs ?? p.name,
    club: kind === 'buy' ? from : to,
    fee,
  });
  for (const clubId of [from, to]) {
    const level = clubLevel(w.pack, clubId);
    w.strength.set(clubId, level.strength);
    w.eleven.set(clubId, level.eleven);
  }
  // A picked eleven that lost a player goes back to the coach; the plan stays.
  if (w.lineup?.xi.includes(p.id)) delete w.lineup;
}

export type Refusal = 'window' | 'cash' | 'squadFull' | 'squadThin' | 'theirSquad' | 'noBuyer';

/** Why the person cannot buy this player now; null when the deal can go through. */
export function cannotBuy(w: CareerWorld, p: PackPlayer): Refusal | null {
  if (!windowOpen(w.day)) return 'window';
  if (squadOf(w.pack, w.clubId).length >= MAX_SQUAD) return 'squadFull';
  if (!canLose(w.pack, p)) return 'theirSquad';
  if (askingPrice(p, w.season.season) > w.ledger.cash) return 'cash';
  return null;
}

/** Buys a player of another club at the asking price. */
export function buy(w: CareerWorld, playerId: string): void {
  const p = w.pack.players.find((x) => x.id === playerId);
  if (!p?.clubId || p.clubId === w.clubId) throw new Error('market: not for sale');
  const no = cannotBuy(w, p);
  if (no) throw new Error(`market: ${no}`);
  move(w, p, w.clubId, askingPrice(p, w.season.season), 'buy');
}

/**
 * The club that takes a player the person sells: of those with room, the one whose level is
 * nearest to his own, ties by the world's seed. Null when nobody has room.
 */
export function buyerFor(w: CareerWorld, p: PackPlayer): string | null {
  const rating = bestRoles(p.attributes, 1)[0]!.rating;
  const sizes = new Map<string, number>();
  for (const x of w.pack.players) if (x.clubId) sizes.set(x.clubId, (sizes.get(x.clubId) ?? 0) + 1);
  let best: string | null = null;
  let gap = Infinity;
  let tie = 0;
  for (const c of w.pack.clubs) {
    if (c.id === w.clubId || (sizes.get(c.id) ?? 0) >= MAX_SQUAD) continue;
    const g = Math.abs((w.strength.get(c.id) ?? 50) - rating);
    const t = seedOf(w.seed, `buyer:${p.id}:${c.id}`);
    if (g < gap || (g === gap && t < tie)) [best, gap, tie] = [c.id, g, t];
  }
  return best;
}

/** Why the person cannot sell this player now; null when a club takes him. */
export function cannotSell(w: CareerWorld, p: PackPlayer): Refusal | null {
  if (!windowOpen(w.day)) return 'window';
  if (!canLose(w.pack, p)) return 'squadThin';
  return buyerFor(w, p) ? null : 'noBuyer';
}

/** Sells one of the person's players; returns who took him and for how much. */
export function sell(w: CareerWorld, playerId: string): { buyer: string; fee: number } {
  const p = w.pack.players.find((x) => x.id === playerId);
  if (p?.clubId !== w.clubId) throw new Error('market: not yours');
  const no = cannotSell(w, p);
  if (no) throw new Error(`market: ${no}`);
  const buyer = buyerFor(w, p)!;
  const fee = sellingPrice(p, w.season.season);
  move(w, p, buyer, fee, 'sell');
  return { buyer, fee };
}
