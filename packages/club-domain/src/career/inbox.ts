/**
 * The club's inbox: what happened, kept in the career so it is still there tomorrow (04 §9).
 * A note is a fact with its numbers and ids, never a sentence: the screen writes the text in the
 * person's language. Newest last; only the most recent are kept.
 */
import type { CareerWorld } from './advance';

export type Note = { day: number } & (
  | { kind: 'welcome' }
  | { kind: 'hired'; club: string }
  | { kind: 'result'; opponent: string; goals: [number, number] }
  | { kind: 'ultimatum'; matches: number; points: number }
  | { kind: 'ultimatumMet' }
  | { kind: 'goal'; met: boolean; position: number; goal: number }
  | { kind: 'cashRed' }
  | { kind: 'closedDoors' }
  | { kind: 'sponsor'; name: string; annual: number; years: number }
  | { kind: 'protest' }
  /** A club of the person's division sacked its coach (coaches.ts). */
  | { kind: 'coachSacked'; club: string }
  /** A bigger club with a vacancy calls the person (coaches.ts `approaches`). */
  | { kind: 'approach'; club: string }
  /** A club of the person's division hired a coach (coach-pool.ts); `style` is its word. */
  | { kind: 'coachHired'; club: string; coach: string; style: string }
  /** The press makes a story of a winless run (board.ts `pressureOf`). */
  | { kind: 'press'; matches: number }
  | { kind: 'courtBan'; matches: number }
  | { kind: 'tired'; players: number }
  | { kind: 'bought' | 'sold' | 'loanIn' | 'loanOut'; player: string; club: string; fee: number }
  | { kind: 'loanBack'; player: string; club: string }
  | { kind: 'window'; open: boolean }
  | { kind: 'contractEnded' | 'contractKept'; player: string }
  | { kind: 'contractsEnding'; players: number }
  | { kind: 'crop'; players: number }
  /** A scout back from an area (a state or `tier:N`) with this many new players. */
  | { kind: 'scouted'; area: string; players: number }
  /** An agent offers one of his players (agents.ts); `club` is where he plays, '' for none. */
  | { kind: 'agentOffer'; player: string; agent: string; club: string }
  /** A player abroad who wants to come home, offered by his agent; a talk is open. */
  | { kind: 'homecoming'; player: string; agent: string; wage: number }
  /** A boy the club formed was sold elsewhere: its solidarity share. */
  | { kind: 'solidarity'; player: string; fee: number }
  /** The person's club got its share of a player's resale (market/clauses.ts). */
  | { kind: 'sellOn'; player: string; fee: number }
  /** A loan option or obligation turned into a purchase or a sale. */
  | { kind: 'optionBought' | 'optionSold'; player: string; club: string; fee: number }
  /** Unhappy players (market/unrest.ts). */
  | { kind: 'unhappy' | 'leaveRequest' | 'promiseKept' | 'promiseBroken'; player: string }
  | { kind: 'cameUp'; players: number }
  | { kind: 'calledUp'; player: string }
  | {
      kind: 'injury';
      player: string;
      injury: 'knock' | 'muscle' | 'sprain' | 'serious';
      days: number;
    }
  /** A ban: three yellows, a sending-off, or what the sports court added. */
  | { kind: 'suspension'; player: string; matches: number; why: 'yellows' | 'red' | 'court' }
  | { kind: 'bid' | 'clausePaid'; player: string; club: string; fee: number }
  /** The real moved hard against a currency this month: the rate (×10 000), change in ‰. */
  | { kind: 'fx'; currency: 'USD' | 'EUR'; rate: number; change: number }
  /** Money credited: a quota, a phase reached, a final's prize or TV rights (revenue.ts). */
  | {
      kind: 'quota';
      line: 'quota' | 'advance' | 'prize' | 'tv';
      source: 'copa' | 'serieC' | 'serieD' | 'tv';
      phase: number;
      amount: number;
    }
  /** Wages unpaid for `months`; paid up again; a player who ended his contract over them. */
  | { kind: 'arrears'; months: number }
  | { kind: 'arrearsPaid' }
  /** A labour claim over an image-rights share: back charges and fine paid. */
  | { kind: 'imageClaim'; player: string; amount: number }
  | { kind: 'walkout'; player: string }
  /** The owners covered part of the season's loss. */
  | { kind: 'owners'; amount: number }
  /** The person's club ended a season over the fair play limit: the cost and what follows. */
  | { kind: 'fairplay'; strikes: number; cost: number; points: number; fine?: number }
  /** A club of the person's division starts the season with points taken off. */
  | { kind: 'fairplayRival'; club: string; points: number }
  /** New directors at the person's club or one of their division (clubs.ts). */
  | {
      kind: 'directors';
      club: string;
      why: 'election' | 'sale';
      horizon: 'short' | 'medium' | 'long';
    }
  /** The vote at an association club's turn: the incumbents stay or the opposition wins. */
  | {
      kind: 'election';
      club: string;
      result: 'reelected' | 'opposition';
      horizon: 'short' | 'medium' | 'long';
      /** The new president sacked the person (their club only). */
      coachOut?: true;
    }
  /** The season being played ends in a vote of the person's club's board. */
  | { kind: 'electionYear' }
  | { kind: 'season'; season: number; champion: string; move: 'promotion' | 'relegation' | 'stay' }
);

/** Notes kept; older ones fall off. */
const KEPT = 40;

export function note(w: CareerWorld, n: Note): void {
  w.inbox = [...(w.inbox ?? []), n].slice(-KEPT);
}
