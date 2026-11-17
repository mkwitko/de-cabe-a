/**
 * The club's inbox: what happened, kept in the career so it is still there tomorrow (04 §9).
 * A note is a fact with its numbers and ids, never a sentence: the screen writes the text in the
 * person's language. Newest last; only the most recent are kept.
 */
import type { CareerWorld } from './advance';

export type Note = { day: number } & (
  | { kind: 'welcome' }
  | { kind: 'result'; opponent: string; goals: [number, number] }
  | { kind: 'ultimatum'; matches: number; points: number }
  | { kind: 'ultimatumMet' }
  | { kind: 'goal'; met: boolean; position: number; goal: number }
  | { kind: 'cashRed' }
  | { kind: 'tired'; players: number }
  | { kind: 'bought' | 'sold'; player: string; club: string; fee: number }
  | { kind: 'window'; open: boolean }
  | { kind: 'bid'; player: string; club: string; fee: number }
  | { kind: 'prize'; position: number; amount: number }
  | { kind: 'season'; season: number; champion: string; move: 'promotion' | 'relegation' | 'stay' }
);

/** Notes kept; older ones fall off. */
const KEPT = 40;

export function note(w: CareerWorld, n: Note): void {
  w.inbox = [...(w.inbox ?? []), n].slice(-KEPT);
}
