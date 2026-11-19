/**
 * Transfers in the career's world (07): the windows, and what a move does to the world. A move
 * never edits the pack the career was opened with: the world gets a new pack object with that
 * player's club and contract changed, and the move is kept in `w.moves` so the snapshot can
 * rebuild it. Who buys whom and for how much is decided in `market/` (the clubs' rounds and the
 * person's two tables); money goes through the ledger and nowhere else.
 */
import { ruleOn } from '../rules/registry';
import { isoOf } from '../competition/calendar';
import { postEntry } from '../finance/ledger';
import { carryCache } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import type { CareerWorld } from './advance';
import { note } from './inbox';
import { clubLevel } from './training';
import { markArrival } from '../market/judgement';
import { ABROAD } from '../market/abroad';

/** A player's club and contract after a move, by player id. */
export type Moves = Record<
  string,
  {
    /** His club after the move; null when he was released and has none. */
    clubId: string | null;
    wage: number;
    until: string;
    /** Season of the move. */
    season?: number;
    /** Season he joined the club he is at; a renewal keeps it. */
    joined?: number;
    /** Release clause of the new contract; absent or null when it has none. */
    release?: number | null;
  }
>;

/**
 * The CBF's transfer windows in force that year (rules/registry.ts): a first, a domestic one for
 * clubs here only after the state championships, and a second.
 */
export type TransferWindow = 'first' | 'domestic' | 'second';
export function windowOf(day: number): TransferWindow | null {
  const iso = isoOf(day);
  const md = iso.slice(5);
  const w = ruleOn('windows', iso);
  const inside = (span: readonly [string, string] | null) =>
    span !== null && md >= span[0] && md <= span[1];
  if (inside(w.first)) return 'first';
  if (inside(w.domestic)) return 'domestic';
  if (inside(w.second)) return 'second';
  return null;
}
export const windowOpen = (day: number): boolean => windowOf(day) !== null;

/** The pack with these moves applied: a new object, the players untouched otherwise. */
/** One player after his move. */
function moved(p: PackPlayer, m: Moves[string]): PackPlayer {
  if (m.clubId === null) {
    // Released: no club and no contract.
    const { contract: _ended, ...free } = p;
    return { ...free, clubId: null };
  }
  return {
    ...p,
    clubId: m.clubId,
    contract: { wage: m.wage, until: m.until, releaseFee: m.release ?? null },
  };
}

export function withMoves(pack: Pack, moves: Moves): Pack {
  if (Object.keys(moves).length === 0) return pack;
  return {
    ...pack,
    players: pack.players.map((p) => {
      const m = moves[p.id];
      return m ? moved(p, m) : p;
    }),
  };
}

/**
 * Where each player sits in the pack's list. A move keeps the order, so the pack it makes
 * shares the index of the one it came from: a single transfer costs one copy of the list and
 * one replaced entry, not a pass over every player.
 */
const places = new WeakMap<Pack, Map<string, number>>();
function placeOf(pack: Pack): Map<string, number> {
  let by = places.get(pack);
  if (!by) places.set(pack, (by = new Map(pack.players.map((p, i) => [p.id, i]))));
  return by;
}

/**
 * Applies several moves at once: the world gets one new pack object, the clubs that gained or
 * lost a player have their readings and strengths rebuilt once, and a picked eleven that lost
 * someone goes back to the coach. No money here: the callers post it.
 */
export function applyMoves(w: CareerWorld, changes: Moves): void {
  const ids = Object.keys(changes);
  if (ids.length === 0) return;
  const season = w.season.season;
  const touched = new Set<string>();
  const left = new Set<string>();
  const stamped: Moves = {};
  const before = w.pack;
  const at = placeOf(before);
  const players = before.players.slice();
  for (const id of ids) {
    const i = at.get(id);
    if (i === undefined) continue;
    const from = players[i]!.clubId;
    const to = changes[id]!.clubId;
    // A renewal keeps the season he joined; a new club starts it again.
    const joined = from === to ? (w.moves?.[id]?.joined ?? w.moves?.[id]?.season) : season;
    stamped[id] = { ...changes[id]!, season, ...(joined !== undefined && { joined }) };
    players[i] = moved(players[i]!, stamped[id]!);
    // A renewal changes neither squad.
    if (from === to) continue;
    if (from && from !== ABROAD) touched.add(from);
    if (to && to !== ABROAD) touched.add(to);
    left.add(id);
  }
  w.moves = { ...w.moves, ...stamped };
  w.pack = { ...before, players };
  places.set(w.pack, at);
  carryCache(before, w.pack, [...touched]);
  for (const id of left)
    // A new club starts to know him now.
    if (stamped[id]!.clubId) markArrival(w.pack, id, season);
  for (const clubId of touched) {
    const level = clubLevel(w.pack, clubId, w.season.season);
    w.strength.set(clubId, level.strength);
    w.eleven.set(clubId, level.eleven);
  }
  if (w.lineup?.xi.some((id) => left.has(id))) delete w.lineup;
}

/** Moves a player to another club (or renews him where he is) on a new contract. */
export function movePlayer(
  w: CareerWorld,
  p: PackPlayer,
  to: string,
  contract: { wage: number; until: string; release?: number | null },
): void {
  applyMoves(w, { [p.id]: { clubId: to, ...contract } });
}

/** Lets a player go at the end of his contract: he has no club until one signs him. */
export function releasePlayer(w: CareerWorld, p: PackPlayer): void {
  applyMoves(w, { [p.id]: RELEASED });
}
/** The move of a player who is let go. */
export const RELEASED = { clubId: null, wage: 0, until: '' } as const;

/**
 * The person's side of a deal: the fee through the ledger and the note in the inbox. `what`
 * says whether the player was bought or sold for good, or only for the season.
 */
export function settle(
  w: CareerWorld,
  p: PackPlayer,
  other: string,
  fee: number,
  kind: 'buy' | 'sell',
  what: 'transfer' | 'loan' = 'transfer',
): void {
  if (fee !== 0)
    postEntry(w.ledger, {
      key: `${what}:${p.id}:${w.ledger.today}:${kind}`,
      kind: 'transfers',
      ref: `player:${p.id}`,
      amount: kind === 'buy' ? -fee : fee,
      day: w.ledger.today,
      dueDay: w.ledger.today,
    });
  note(w, {
    day: w.day,
    kind:
      what === 'loan'
        ? kind === 'buy'
          ? 'loanIn'
          : 'loanOut'
        : kind === 'buy'
          ? 'bought'
          : 'sold',
    player: p.knownAs ?? p.name,
    club: other,
    fee,
  });
}
