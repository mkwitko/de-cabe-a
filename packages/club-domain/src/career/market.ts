/**
 * Transfers in the career's world (07): the windows, and what a move does to the world. A move
 * never edits the pack the career was opened with: the world gets a new pack object with that
 * player's club and contract changed, and the move is kept in `w.moves` so the snapshot can
 * rebuild it. Who buys whom and for how much is decided in `market/` (the clubs' rounds and the
 * person's two tables); money goes through the ledger and nowhere else.
 */
import { isoOf } from '../competition/calendar';
import { postEntry } from '../finance/ledger';
import { carryCache } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import type { CareerWorld } from './advance';
import { note } from './inbox';
import { clubLevel } from './training';

/** A player's club and contract after a move, by player id. */
export type Moves = Record<
  string,
  { clubId: string; wage: number; until: string; /** Season of the move. */ season?: number }
>;

/** The windows: from the turn of the year to the end of April, and all of July. */
export function windowOpen(day: number): boolean {
  const md = isoOf(day).slice(5);
  return md <= '04-30' || md.startsWith('07');
}

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

/**
 * Moves a player to another club on a new contract: the world gets a new pack object, the two
 * clubs' readings and strengths are rebuilt, and a picked eleven that lost him goes back to the
 * coach. No money here: the callers post it.
 */
export function movePlayer(
  w: CareerWorld,
  p: PackPlayer,
  to: string,
  contract: { wage: number; until: string },
): void {
  const from = p.clubId!;
  const moved = { clubId: to, ...contract, season: w.season.season };
  w.moves = { ...w.moves, [p.id]: moved };
  const before = w.pack;
  w.pack = withMoves(before, { [p.id]: moved });
  carryCache(before, w.pack, [from, to]);
  for (const clubId of [from, to]) {
    const level = clubLevel(w.pack, clubId);
    w.strength.set(clubId, level.strength);
    w.eleven.set(clubId, level.eleven);
  }
  if (w.lineup?.xi.includes(p.id)) delete w.lineup;
}

/** The person's side of a deal: the fee through the ledger and the note in the inbox. */
export function settle(
  w: CareerWorld,
  p: PackPlayer,
  other: string,
  fee: number,
  kind: 'buy' | 'sell',
): void {
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
    club: other,
    fee,
  });
}
