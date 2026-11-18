/**
 * The person at the market's two tables (07 §2, §6). Buying: open a talk for a player, bid the
 * fee against the selling club's counter-offers, then offer the contract against the player's.
 * Selling: other clubs bid for the person's players in each round (rounds.ts) and the person
 * accepts, counters or refuses; a player put on the list draws bids sooner. A side that walks
 * away does not come back that season. Money goes through the ledger only when a deal closes.
 */
import {
  ABROAD,
  FOREIGN_TIERS,
  importFee,
  sellAbroad,
  signable,
  stanceFor,
  wantsToGo,
} from './abroad';
import type { CareerWorld } from '../career/advance';
import { movePlayer, settle, windowOpen } from '../career/market';
import { squadPlayers } from '../career/squad';
import type { PackPlayer } from '../pack/schema';
import { available, book, booksOf, embargoed, wageRoom } from './books';
import {
  CLAUSE_TIMES,
  MAX_ROUNDS,
  answerFee,
  answerTerms,
  playerStance,
  sellerStance,
  type FeeAnswer,
  type PlayerNo,
  type PlayerStance,
  type SellerMood,
  type Terms,
  type TermsAnswer,
} from './deals';
import { comeBack, type Why } from './rounds';
import { renew, renewalTerms } from './contracts';
import { seenLevel } from './judgement';
import { marketValue, readingsOf, thousands } from './value';

const MIN_SQUAD = 20;
const MIN_KEEPERS = 2;
const MAX_SQUAD = 42;
/** A talk the person opened to buy a player. */
export interface Talk {
  player: string;
  /** The club he is at: another club, none (a free agent), or the person's own (a renewal). */
  seller: string | null;
  /** What he is to the selling club: why the price sits where it does. */
  mood: SellerMood;
  stage: 'fee' | 'terms';
  /** Offers the person made at this stage. */
  round: number;
  /** What the selling club asks now. */
  asking: number;
  /** His release clause, when he has one: paying it closes the fee whatever the club says. */
  release?: number;
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
  /** The day it was made; a bid coming back after a refusal waits until then. */
  day: number;
  why: Why;
  /** A bid back after the person's refusal, not yet announced in the inbox. */
  again?: boolean;
}

export type TalkNo =
  'window' | 'squadFull' | 'theirSquad' | 'cold' | 'justMoved' | 'abroad' | 'embargo' | PlayerNo;

/** Monthly wage the person's club can still add (books.ts): the board's ceiling. */
export const myWageRoom = (w: CareerWorld) => wageRoom(w, w.clubId);

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
  const season = w.season.season;
  // Abroad, only the foreign market and veterans coming home; not one sold out this season.
  if (p.clubId === ABROAD && (!signable(p, season) || w.moves?.[p.id]?.season === season))
    return 'abroad';
  if (embargoed(w, w.clubId)) return 'embargo';
  if (squadPlayers({ pack: w.pack, clubId: w.clubId }).length >= MAX_SQUAD) return 'squadFull';
  if (w.cold?.[p.id] === season) return 'cold';
  // A free agent signs in or out of a window, and asks no club's leave.
  if (p.clubId === null) return playerStance(w.pack, p, null, clubOf(w, w.clubId), season).no;
  if (!windowOpen(w.day)) return 'window';
  if (w.moves?.[p.id]?.season === season) return 'justMoved';
  // From abroad: no club here to ask, only the price and the player.
  if (p.clubId === ABROAD) return stanceFor(w, p, w.clubId).no;
  if (!canLose(w, p)) return 'theirSquad';
  return playerStance(w.pack, p, clubOf(w, p.clubId), clubOf(w, w.clubId), season).no;
}

/** The monthly wage he would open with if the person sat at his table now. */
export function openingWage(w: CareerWorld, p: PackPlayer): number {
  return Math.round((stanceFor(w, p, w.clubId).wage * 110) / 100);
}

/** The contract a player opens with: ten percent over what he would take. */
const opening = (t: { wage: number; years: number }, role: Terms['role']): Terms => ({
  wage: Math.round((t.wage * 110) / 100),
  years: t.years,
  role,
});

/**
 * Opens a talk. For a player of another club, that club names its price; a free agent goes
 * straight to his contract.
 */
export function openTalk(w: CareerWorld, playerId: string): Talk {
  const p = playerOf(w, playerId);
  if (!p || p.clubId === w.clubId) throw new Error('talk: not for sale');
  const no = cannotTalk(w, p);
  if (no) throw new Error(`talk: ${no}`);
  const season = w.season.season;
  let talk: Talk;
  if (p.clubId === null) {
    const wants = playerStance(w.pack, p, null, clubOf(w, w.clubId), season);
    talk = {
      player: p.id,
      seller: null,
      mood: 'surplus',
      stage: 'terms',
      round: 0,
      asking: 0,
      fee: 0,
      wants: opening(wants, wants.fair),
      day: w.day,
    };
  } else if (p.clubId === ABROAD) {
    // The foreign market names one price and keeps to it.
    talk = {
      player: p.id,
      seller: ABROAD,
      mood: 'surplus',
      stage: 'fee',
      round: 0,
      asking: importFee(w, p),
      day: w.day,
    };
  } else {
    const stance = sellerStance({ pack: w.pack, clubId: p.clubId }, p, w.clubId, season);
    talk = {
      player: p.id,
      seller: p.clubId,
      mood: stance.mood,
      stage: 'fee',
      round: 0,
      asking: stance.asking,
      ...(stance.release !== null && { release: stance.release }),
      day: w.day,
    };
  }
  w.talks = { ...w.talks, [p.id]: talk };
  return talk;
}

/** Opens a renewal with one of the person's players: he names what he wants to stay. */
export function openRenewal(w: CareerWorld, playerId: string): Talk {
  const p = playerOf(w, playerId);
  if (p?.clubId !== w.clubId) throw new Error('talk: not yours');
  if (w.loans?.[p.id]) throw new Error('talk: onLoan');
  if (w.cold?.[p.id] === w.season.season) throw new Error('talk: cold');
  const wants = renewalTerms(w, p);
  const talk: Talk = {
    player: p.id,
    seller: w.clubId,
    mood: 'starter',
    stage: 'terms',
    round: 0,
    asking: 0,
    fee: 0,
    wants: opening(wants, wants.role),
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
  const round = talk.round + 1;
  const abroad = p.clubId === ABROAD;
  const a: FeeAnswer = abroad
    ? fee >= talk.asking
      ? { kind: 'accept', fee: talk.asking }
      : round >= MAX_ROUNDS
        ? { kind: 'refuse', reason: 'final' }
        : { kind: 'counter', fee: talk.asking }
    : answerFee(sellerStance({ pack: w.pack, clubId: p.clubId }, p, w.clubId, season), fee, round);
  if (a.kind === 'refuse') cool(w, playerId);
  else if (a.kind === 'counter')
    w.talks = { ...w.talks, [playerId]: { ...talk, round, asking: a.fee } };
  else {
    const wants = stanceFor(w, p, w.clubId);
    w.talks = {
      ...w.talks,
      [playerId]: {
        ...talk,
        stage: 'terms',
        round: 0,
        fee: a.fee,
        // He opens over what he would take, like the club did.
        wants: opening(wants, wants.fair),
      },
    };
  }
  return a;
}

/**
 * The person offers the contract. Agreement closes the deal: the fee is paid, he moves (or, in
 * a renewal, stays) and the new wage starts. The board refuses a wage the bill cannot take.
 */
export function bidTerms(w: CareerWorld, playerId: string, terms: Terms): TermsAnswer {
  const talk = w.talks?.[playerId];
  const p = playerOf(w, playerId);
  if (!talk || talk.stage !== 'terms' || talk.fee === undefined || !p)
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
  const renewal = talk.seller === w.clubId;
  const added = terms.wage - (renewal ? (p.contract?.wage ?? 0) : 0);
  if (added > myWageRoom(w)) throw new Error('talk: wageCap');
  const season = w.season.season;
  let wants: PlayerStance;
  if (renewal) {
    // To stay he asks for his terms and nothing less in role than the plan gives him.
    const asks = renewalTerms(w, p);
    wants = {
      fair: asks.role,
      wants: 'backup',
      wage: asks.wage,
      years: asks.years,
      no: null,
      why: { ambition: 0, step: 0, raise: 0 },
      value: marketValue(w.pack, p, season),
    };
  } else wants = stanceFor(w, p, w.clubId);
  const round = talk.round + 1;
  const a = answerTerms(wants, terms, round);
  if (a.kind === 'refuse') cool(w, playerId);
  else if (a.kind === 'counter')
    w.talks = { ...w.talks, [playerId]: { ...talk, round, wants: a.terms } };
  else {
    if (renewal) renew(w, p, { ...a.terms, release: a.terms.release ?? null });
    else {
      if (talk.seller === ABROAD) {
        // The fee leaves the league: only the person's books see it.
        settle(w, p, ABROAD, talk.fee, 'buy');
        const b = booksOf(w, w.clubId);
        w.books = { ...w.books, [w.clubId]: { ...b, spent: b.spent + talk.fee } };
      } else if (talk.seller !== null) {
        settle(w, p, talk.seller, talk.fee, 'buy');
        book(w, talk.seller, w.clubId, talk.fee);
      }
      movePlayer(w, p, w.clubId, {
        wage: a.terms.wage,
        until: `${season + a.terms.years}-12-31`,
        release: a.terms.release ?? null,
      });
    }
    dropTalk(w, playerId);
  }
  return a;
}

// ── Selling ──────────────────────────────────────────────────────────────────

/** Puts one of the person's players on the list, or takes him off: listed players draw bids. */
export function listPlayer(w: CareerWorld, playerId: string, on: boolean): void {
  if (playerOf(w, playerId)?.clubId !== w.clubId) throw new Error('list: not yours');
  if (w.loans?.[playerId]) throw new Error('list: on loan');
  const listed = new Set(w.listed ?? []);
  // A player newly on the list is news: the clubs sitting the window out look again.
  if (on && !listed.has(playerId)) delete w.idle;
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
  /** Refused: whether the club comes back with more, the person learns only if it does. */
  | { kind: 'refused' }
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
  // A bid coming back is not on the table before the club announces it.
  if (!bid || p?.clubId !== w.clubId || bid.again) throw new Error('bid: gone');
  const leave = (reason: Extract<BidAnswer, { kind: 'withdrawn' }>['reason']): BidAnswer => {
    closeBid(w, id);
    w.cold = { ...w.cold, [`${bid.from}:${p.id}`]: w.season.season };
    return { kind: 'withdrawn', reason };
  };
  if (answer.kind === 'refuse') {
    // Refused once, the club thinks again (rounds.ts comeBack): another target, or back later
    // with more. Refused twice, it leaves.
    const back = bid.round > 1 || bid.again !== undefined ? null : comeBack(w, bid);
    if (!back) {
      leave('tooDear');
      return { kind: 'refused' };
    }
    w.bids = (w.bids ?? []).map((b) =>
      b.id === id ? { ...b, fee: back.fee, round: 2, day: back.day, again: true } : b,
    );
    return { kind: 'refused' };
  }
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
  const foreign = FOREIGN_TIERS.find((t) => t.id === bid.from);
  if (foreign) {
    // A foreign club: no budget or wage ceiling of this league; only the player's will.
    if (!wantsToGo(p)) return leave('loyal');
    settle(w, p, bid.from, fee, 'sell');
    sellAbroad(w, p, fee);
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
        wage: 0,
        years: 4,
        role: 'starter' as const,
        for: 'starter' as const,
        seen: readingsOf(w.pack).get(p.id)!.level,
        why: bid.why,
      },
    ].slice(-80);
    return { kind: 'sold', fee };
  }
  if (fee > available(w, bid.from)) return leave('budget');
  const season = w.season.season;
  const wants = playerStance(w.pack, p, clubOf(w, w.clubId), clubOf(w, bid.from), season);
  if (wants.no) return leave(wants.no);
  const room = wageRoom(w, bid.from);
  if (wants.wage > room) return leave('budget');
  settle(w, p, bid.from, fee, 'sell');
  movePlayer(w, p, bid.from, {
    wage: wants.wage,
    until: `${season + wants.years}-12-31`,
    release: marketValue(w.pack, p, season) * CLAUSE_TIMES,
  });
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
      seen: seenLevel(w.pack, bid.from, p),
      why: bid.why,
    },
  ].slice(-80);
  return { kind: 'sold', fee };
}
