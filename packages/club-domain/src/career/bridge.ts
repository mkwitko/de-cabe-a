/**
 * The bridge between seasons ("O que vem aí"): what happened, what carries over and what the
 * next season asks of the person. Everything is read from the world's state (history, inbox,
 * ledger, board, squad), never invented: a fact with nothing behind it is left out.
 */
import type { CareerWorld } from './advance';
import { boardOf } from './board';
import { electionYear } from './clubs';
import { endingSoon } from '../market/contracts';
import { ageOf } from '../market/value';

/** What the world looked like just before the turn. */
export interface BridgeBefore {
  cash: number;
  confidence: number;
  squad: string[];
  /** The notes (inbox) that tell the season's story: a sale, a crisis. */
  notes: NonNullable<CareerWorld['inbox']>;
}

export type BridgeFact =
  | { k: 'season'; move: 'promotion' | 'relegation' | 'stay'; champion: boolean; fired: boolean }
  | { k: 'sale'; player: string; fee: number }
  | { k: 'idol'; name: string; starts: number }
  | { k: 'crisis'; what: 'ultimatum' | 'cashRed' | 'arrears' }
  | { k: 'cash'; from: number; to: number }
  | { k: 'squad'; lost: number; won: number }
  | { k: 'confidence'; from: number; to: number }
  | { k: 'election' }
  | { k: 'contracts'; players: number }
  | { k: 'ageing'; players: number }
  | { k: 'goal'; position: number };

export interface Bridge {
  happened: BridgeFact[];
  carried: BridgeFact[];
  ahead: BridgeFact[];
}

const AGEING = 32;
const mine = (w: CareerWorld) => w.pack.players.filter((p) => p.clubId === w.clubId);

/** Read before `startNextSeason`. */
export function bridgeBefore(w: CareerWorld): BridgeBefore {
  return {
    cash: w.ledger.cash,
    confidence: boardOf(w).confidence,
    squad: mine(w).map((p) => p.id),
    notes: w.inbox ?? [],
  };
}

/** Read after the turn (the finished season is the history's last entry). */
export function bridgeAfter(w: CareerWorld, before: BridgeBefore): Bridge {
  const h = (w.history ?? []).at(-1);
  const sales = before.notes.flatMap((n) => (n.kind === 'sold' ? [n] : []));
  const sale = sales.sort((a, b) => b.fee - a.fee)[0];
  const crisis = before.notes.find(
    (n) => n.kind === 'ultimatum' || n.kind === 'cashRed' || n.kind === 'arrears',
  );
  const happened: BridgeFact[] = [];
  if (h) happened.push({ k: 'season', move: h.move, champion: h.champion, fired: !!h.fired });
  if (crisis)
    happened.push({ k: 'crisis', what: crisis.kind as 'ultimatum' | 'cashRed' | 'arrears' });
  if (sale) happened.push({ k: 'sale', player: sale.player, fee: sale.fee });
  if (h?.top) happened.push({ k: 'idol', name: h.top.name, starts: h.top.starts });

  const now = new Set(mine(w).map((p) => p.id));
  const was = new Set(before.squad);
  const board = boardOf(w);
  const carried: BridgeFact[] = [
    { k: 'cash', from: before.cash, to: w.ledger.cash },
    {
      k: 'squad',
      lost: before.squad.filter((id) => !now.has(id)).length,
      won: [...now].filter((id) => !was.has(id)).length,
    },
  ];
  if (!board.fired)
    carried.push({ k: 'confidence', from: before.confidence, to: board.confidence });
  if (electionYear(w, w.clubId)) carried.push({ k: 'election' });

  const ending = endingSoon(w).length;
  const ageing = mine(w).filter((p) => ageOf(p, w.season.season) >= AGEING).length;
  const ahead: BridgeFact[] = [];
  if (!board.fired) ahead.push({ k: 'goal', position: board.goal });
  if (ending > 0) ahead.push({ k: 'contracts', players: ending });
  if (ageing > 0) ahead.push({ k: 'ageing', players: ageing });
  return {
    happened: happened.slice(0, 3),
    carried: carried.slice(0, 3),
    ahead: ahead.slice(0, 3),
  };
}
