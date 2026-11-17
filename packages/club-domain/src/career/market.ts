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
import { markArrival } from '../market/judgement';

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
    /** Release clause of the new contract; absent or null when it has none. */
    release?: number | null;
  }
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
      if (!m) return p;
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
  contract: { wage: number; until: string; release?: number | null },
): void {
  // A free agent comes from no club; a renewal stays where he is.
  const from = p.clubId;
  const touched = [...new Set([from, to])].filter((x): x is string => x !== null);
  const moved = { clubId: to, ...contract, season: w.season.season };
  w.moves = { ...w.moves, [p.id]: moved };
  const before = w.pack;
  w.pack = withMoves(before, { [p.id]: moved });
  carryCache(before, w.pack, touched);
  // A new club starts to know him now; a renewal changes nothing of what his own knows.
  if (from !== to) markArrival(w.pack, p.id, w.season.season);
  for (const clubId of touched) {
    const level = clubLevel(w.pack, clubId);
    w.strength.set(clubId, level.strength);
    w.eleven.set(clubId, level.eleven);
  }
  if (w.lineup?.xi.includes(p.id)) delete w.lineup;
}

/** Lets a player go at the end of his contract: he has no club until one signs him. */
export function releasePlayer(w: CareerWorld, p: PackPlayer): void {
  const from = p.clubId!;
  const gone = { clubId: null, wage: 0, until: '', season: w.season.season };
  w.moves = { ...w.moves, [p.id]: gone };
  const before = w.pack;
  w.pack = withMoves(before, { [p.id]: gone });
  carryCache(before, w.pack, [from]);
  const level = clubLevel(w.pack, from);
  w.strength.set(from, level.strength);
  w.eleven.set(from, level.eleven);
  if (w.lineup?.xi.includes(p.id)) delete w.lineup;
}

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
