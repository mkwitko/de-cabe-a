/**
 * The person at the market's two tables (07 §2, §6). Buying: open a talk for a player, bid the
 * fee against the selling club's counter-offers, then offer the contract against the player's.
 * Selling: other clubs bid for the person's players in each round (rounds.ts) and the person
 * accepts, counters or refuses; a player put on the list draws bids sooner. A side that walks
 * away does not come back that season. Money goes through the ledger only when a deal closes.
 */
import type { CareerWorld } from '../career/advance';
import { movePlayer, settle, windowOpen } from '../career/market';
import { squadPlayers } from '../career/squad';
import type { PackPlayer } from '../pack/schema';
import { available, book, wageRoom } from './books';
import {
  answerFee,
  answerTerms,
  playerStance,
  sellerStance,
  type FeeAnswer,
  type PlayerNo,
  type SellerMood,
  type Terms,
  type TermsAnswer,
} from './deals';
import type { Why } from './rounds';
import { readingsOf, thousands } from './value';

const MIN_SQUAD = 20;
const MIN_KEEPERS = 2;
const MAX_SQUAD = 35;
/** A talk the person opened to buy a player. */
export interface Talk {
  player: string;
  seller: string;
  /** What he is to the selling club: why the price sits where it does. */
  mood: SellerMood;
  stage: 'fee' | 'terms';
  /** Offers the person made at this stage. */
  round: number;
  /** What the selling club asks now. */
  asking: number;
  /** The fee agreed, once at the contract. */
  fee?: number;
  /** What the player asks now. */
  wants?: Terms;
  day: number;
}

/** A bid from another club for one of the person's players. */
export interface Bid {
  id: string;
  player: string;
  from: string;
  fee: number;
  /** The most that club pays for him; never shown. */
  most: number;
  round: number;
  day: number;
  why: Why;
}

export type TalkNo = 'window' | 'squadFull' | 'theirSquad' | 'cold' | 'justMoved' | PlayerNo;

const playerOf = (w: CareerWorld, id: string) => w.pack.players.find((p) => p.id === id);
const clubOf = (w: CareerWorld, id: string) => w.pack.clubs.find((c) => c.id === id)!;
const keepers = (w: CareerWorld, clubId: string) =>
  squadPlayers({ pack: w.pack, clubId }).filter((p) => readingsOf(w.pack).get(p.id)!.keeper).length;
/** A club keeps at least twenty players and two keepers. */
export const canLose = (w: CareerWorld, p: PackPlayer) =>
  squadPlayers({ pack: w.pack, clubId: p.clubId! }).length > MIN_SQUAD &&
  (!readingsOf(w.pack).get(p.id)!.keeper || keepers(w, p.clubId!) > MIN_KEEPERS);

const cool = (w: CareerWorld, playerId: string) => {
  w.cold = { ...w.cold, [playerId]: w.season.season };
  const { [playerId]: _gone, ...rest } = w.talks ?? {};
  w.talks = rest;
};

/** Why the person cannot open a talk for this player now; null when they can. */
export function cannotTalk(w: CareerWorld, p: PackPlayer): TalkNo | null {
  if (!windowOpen(w.day)) return 'window';
  if (squadPlayers({ pack: w.pack, clubId: w.clubId }).length >= MAX_SQUAD) return 'squadFull';
  if (w.cold?.[p.id] === w.season.season) return 'cold';
  if (w.moves?.[p.id]?.season === w.season.season) return 'justMoved';
  if (!canLose(w, p)) return 'theirSquad';
  return playerStance(w.pack, p, clubOf(w, p.clubId!), clubOf(w, w.clubId), w.season.season).no;
}

/** Opens a talk: the selling club names its price. */
export function openTalk(w: CareerWorld, playerId: string): Talk {
  const p = playerOf(w, playerId);
  if (!p?.clubId || p.clubId === w.clubId) throw new Error('talk: not for sale');
  const no = cannotTalk(w, p);
  if (no) throw new Error(`talk: ${no}`);
  const stance = sellerStance({ pack: w.pack, clubId: p.clubId }, p, w.clubId, w.season.season);
  const talk: Talk = {
    player: p.id,
    seller: p.clubId,
    mood: stance.mood,
    stage: 'fee',
    round: 0,
    asking: stance.asking,
    day: w.day,
  };
  w.talks = { ...w.talks, [p.id]: talk };
  return talk;
}

export function dropTalk(w: CareerWorld, playerId: string): void {
  const { [playerId]: _gone, ...rest } = w.talks ?? {};
  w.talks = rest;
}

/** The person bids a fee. A refusal closes the door for the season. */
export function bidFee(w: CareerWorld, playerId: string, fee: number): FeeAnswer {
  const talk = w.talks?.[playerId];
  const p = playerOf(w, playerId);
  if (!talk || talk.stage !== 'fee' || !p?.clubId) throw new Error('talk: none open');
  if (!Number.isSafeInteger(fee) || fee < 0) throw new Error('talk: fee');
  // An offer the club could not pay is not made: nothing is agreed on money that is not there.
  if (fee > w.ledger.cash) throw new Error('talk: cash');
  const season = w.season.season;
  const stance = sellerStance({ pack: w.pack, clubId: p.clubId }, p, w.clubId, season);
  const round = talk.round + 1;
  const a = answerFee(stance, fee, round);
  if (a.kind === 'refuse') cool(w, playerId);
  else if (a.kind === 'counter')
    w.talks = { ...w.talks, [playerId]: { ...talk, round, asking: a.fee } };
  else {
    const wants = playerStance(w.pack, p, clubOf(w, p.clubId), clubOf(w, w.clubId), season);
    w.talks = {
      ...w.talks,
      [playerId]: {
        ...talk,
        stage: 'terms',
        round: 0,
        fee: a.fee,
        // He opens over what he would take, like the club did.
        wants: { wage: Math.round((wants.wage * 110) / 100), years: wants.years, role: wants.fair },
      },
    };
  }
  return a;
}

/** The person offers the contract. Agreement closes the deal: fee, wage and all. */
export function bidTerms(w: CareerWorld, playerId: string, terms: Terms): TermsAnswer {
  const talk = w.talks?.[playerId];
  const p = playerOf(w, playerId);
  if (!talk || talk.stage !== 'terms' || talk.fee === undefined || !p?.clubId)
    throw new Error('talk: no fee agreed');
  if (
    !Number.isSafeInteger(terms.wage) ||
    terms.wage < 0 ||
    !Number.isInteger(terms.years) ||
    terms.years < 1 ||
    terms.years > 5
  )
    throw new Error('talk: terms');
  if (talk.fee > w.ledger.cash) throw new Error('talk: cash');
  const season = w.season.season;
  const wants = playerStance(w.pack, p, clubOf(w, p.clubId), clubOf(w, w.clubId), season);
  const round = talk.round + 1;
  const a = answerTerms(wants, terms, round);
  if (a.kind === 'refuse') cool(w, playerId);
  else if (a.kind === 'counter')
    w.talks = { ...w.talks, [playerId]: { ...talk, round, wants: a.terms } };
  else {
    const seller = p.clubId;
    settle(w, p, seller, talk.fee, 'buy');
    movePlayer(w, p, w.clubId, { wage: a.terms.wage, until: `${season + a.terms.years}-12-31` });
    book(w, seller, w.clubId, talk.fee);
    dropTalk(w, playerId);
  }
  return a;
}

// ── Selling ──────────────────────────────────────────────────────────────────

/** Puts one of the person's players on the list, or takes him off: listed players draw bids. */
export function listPlayer(w: CareerWorld, playerId: string, on: boolean): void {
  if (playerOf(w, playerId)?.clubId !== w.clubId) throw new Error('list: not yours');
  const listed = new Set(w.listed ?? []);
  if (on) listed.add(playerId);
  else listed.delete(playerId);
  w.listed = [...listed].sort();
}

const closeBid = (w: CareerWorld, id: string) => {
  w.bids = (w.bids ?? []).filter((b) => b.id !== id);
};

export type BidAnswer =
  | { kind: 'sold'; fee: number }
  | { kind: 'raised'; fee: number }
  | { kind: 'withdrawn'; reason: 'tooDear' | 'squadThin' | 'budget' | PlayerNo };

/**
 * The person answers a bid: take it, refuse it, or name a price. The bidding club raises up to
 * the most it pays and withdraws past it; once the clubs agree, the player still has his say.
 */
export function answerBid(
  w: CareerWorld,
  id: string,
  answer: { kind: 'accept' } | { kind: 'refuse' } | { kind: 'counter'; fee: number },
): BidAnswer {
  const bid = (w.bids ?? []).find((b) => b.id === id);
  const p = bid && playerOf(w, bid.player);
  if (!bid || p?.clubId !== w.clubId) throw new Error('bid: gone');
  const leave = (reason: Extract<BidAnswer, { kind: 'withdrawn' }>['reason']): BidAnswer => {
    closeBid(w, id);
    w.cold = { ...w.cold, [`${bid.from}:${p.id}`]: w.season.season };
    return { kind: 'withdrawn', reason };
  };
  if (answer.kind === 'refuse') return leave('tooDear');
  let fee = bid.fee;
  if (answer.kind === 'counter') {
    if (!Number.isSafeInteger(answer.fee) || answer.fee < 0) throw new Error('bid: fee');
    if (answer.fee > bid.most) {
      // Not at that price: the club comes half-way once, then that is its last word.
      const raised = Math.min(bid.most, thousands((bid.fee + answer.fee) / 2));
      if (raised <= bid.fee || bid.round >= 3) return leave('tooDear');
      w.bids = (w.bids ?? []).map((b) =>
        b.id === id ? { ...b, fee: raised, round: b.round + 1 } : b,
      );
      return { kind: 'raised', fee: raised };
    }
    fee = answer.fee;
  }
  if (!canLose(w, p)) return leave('squadThin');
  if (fee > available(w, bid.from)) return leave('budget');
  const season = w.season.season;
  const wants = playerStance(w.pack, p, clubOf(w, w.clubId), clubOf(w, bid.from), season);
  if (wants.no) return leave(wants.no);
  const room = wageRoom(w, bid.from);
  if (wants.wage > room) return leave('budget');
  settle(w, p, bid.from, fee, 'sell');
  movePlayer(w, p, bid.from, { wage: wants.wage, until: `${season + wants.years}-12-31` });
  book(w, w.clubId, bid.from, fee);
  w.listed = (w.listed ?? []).filter((x) => x !== p.id);
  w.bids = (w.bids ?? []).filter((b) => b.player !== p.id);
  w.deals = [
    ...(w.deals ?? []),
    {
      day: w.day,
      player: p.id,
      name: p.knownAs ?? p.name,
      from: w.clubId,
      to: bid.from,
      fee,
      wage: wants.wage,
      years: wants.years,
      role: wants.fair,
      for: 'starter' as const,
      why: bid.why,
    },
  ].slice(-80);
  return { kind: 'sold', fee };
}
