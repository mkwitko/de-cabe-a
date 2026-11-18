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
  | { kind: 'bought' | 'sold' | 'loanIn' | 'loanOut'; player: string; club: string; fee: number }
  | { kind: 'loanBack'; player: string; club: string }
  | { kind: 'window'; open: boolean }
  | { kind: 'contractEnded' | 'contractKept'; player: string }
  | { kind: 'contractsEnding'; players: number }
  | { kind: 'crop'; players: number }
  | {
      kind: 'injury';
      player: string;
      injury: 'knock' | 'muscle' | 'sprain' | 'serious';
      days: number;
    }
  | { kind: 'bid' | 'clausePaid'; player: string; club: string; fee: number }
  | { kind: 'prize'; position: number; amount: number }
  | { kind: 'season'; season: number; champion: string; move: 'promotion' | 'relegation' | 'stay' }
);

/** Notes kept; older ones fall off. */
const KEPT = 40;

export function note(w: CareerWorld, n: Note): void {
  w.inbox = [...(w.inbox ?? []), n].slice(-KEPT);
}
