/**
 * The market between the clubs (07 §6, 04 §8): in each round of a window every club looks at
 * its plan, picks the player who helps it most for what he costs, and sits at the two tables
 * (deals.ts) with the selling club and with the player. Nothing is random: the order of the
 * clubs comes from the world's seed and every choice from the numbers, and each deal keeps the
 * terms of the choice so the game can answer "why did they buy him?" (04 §8.2).
 *
 * `U = N + F + D + R − C − W`: need of the position, fit, growth expected, resale expected,
 * cost against the budget, weight on the wage bill. Every number is a PARÂMETRO.
 */
import { next, rngFrom } from '@decabeca/match-engine';
import type { CareerWorld } from '../career/advance';
import { movePlayer, windowOpen } from '../career/market';
import { squadPlayers } from '../career/squad';
import { isoOf } from '../competition/calendar';
import { seedOf } from '../competition/season';
import { note } from '../career/inbox';
import { WHOLE, cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { available, book, booksOf, budgetOf, wageRoom } from './books';
import { isImport } from '../career/development';
import {
  CLAUSE_TIMES,
  MAX_ROUNDS,
  answerFee,
  answerTerms,
  playerStance,
  sellerStance,
  type Role,
  type Terms,
} from './deals';
import { fitFor, squadPlanOf, type Need } from './plan';
import { MAX_LEVEL_ERROR, bargaining, levelError, seenRise, seenValue } from './judgement';
import { lendListed } from './loans';
import { ABROAD } from './abroad';
import { clubKnows } from './scouting';
import { answerBid } from './talks';
import { boardOverpay } from '../career/clubs';
import { ageOf, marketValue, readingsOf, thousands } from './value';

/** The terms of a buying club's choice, in points. */
export interface Why {
  need: number;
  fit: number;
  growth: number;
  resale: number;
  cost: number;
  wages: number;
}

export interface Deal {
  day: number;
  player: string;
  name: string;
  /** The club he left; null when he was a free agent. */
  from: string | null;
  to: string;
  fee: number;
  wage: number;
  years: number;
  role: Role;
  /** `starter` or `cover`: the need he was bought for. */
  for: Need['kind'];
  /** The level the buying club believed he had (judgement.ts). */
  seen: number;
  why: Why;
}

/** Days between rounds inside a window. */
export const ROUND_DAYS = 14;
/** Signings a club makes in a season, at most. */
const SIGNINGS = 6;
/** Free agents a club may sign past that: no fee, a short wait for the paperwork. */
const FREE_EXTRA = 2;
/**
 * A club with this share of its season's transfer budget still unspent also looks to improve its
 * weakest starter, not only to fill holes (plan.ts `upgrade`).
 */
const SPARE = 50;
/** Rounds a club that found nobody sits out before it reads the market again. */
const IDLE_ROUNDS = 3;
/** A choice must be worth this many points to go to the table. */
const WORTH_IT = 36;
/** And the need itself must carry at least this much of it: no buying on promise alone. */
const REAL_NEED = 14;
/** Bids for the person's players that may wait for an answer at once. */
const OPEN_BIDS = 3;
/** Candidates a club reads in full for one need, after the cheap sieve. */
const SHORTLIST = 30;
/** Points a listed player gains in a buyer's eyes. */
const LISTED = 15;
/** Days a bid for one of the person's players waits for an answer. */
export const BID_DAYS = 14;
/** Deals kept for the market's news. */
const KEPT = 80;
const MIN_SQUAD = 20;
const MIN_KEEPERS = 2;
const MAX_SQUAD = 42;

const total = (y: Why) => y.need + y.fit + y.growth + y.resale - y.cost - y.wages;

/** How much this player helps this club for this need, at this price and wage. */
export function utility(
  w: CareerWorld,
  buyerId: string,
  p: PackPlayer,
  need: Need,
  price: number,
  wage: number,
  /** What the club can still pay in fees and add in wages (books.ts), read once by the caller. */
  means: { money: number; room: number } = {
    money: available(w, buyerId),
    room: wageRoom(w, buyerId),
  },
): Why {
  const buyer = { pack: w.pack, clubId: buyerId };
  const club = w.pack.clubs.find((c) => c.id === buyerId)!;
  const season = w.season.season;
  const age = ageOf(p, season);
  // Everything the club weighs is what it sees of him, right or wrong (judgement.ts).
  const off = levelError(w.pack, buyerId, p);
  const over = Math.max(0, Math.min(12, fitFor(buyer, p, need) + off - need.wanted + 4));
  const rise = seenRise(w.pack, buyerId, p, season, 2);
  const natural = p.positions.some((x) => need.positions.includes(x.position) && x.level === 3);
  return {
    need: Math.round((need.urgency * over) / 12),
    fit: natural ? 10 : 0,
    // A club that buys ready players (readyVsYoung high) discounts what he may become.
    growth: Math.round((Math.max(0, rise) * 4 * (100 - club.profile.market.readyVsYoung)) / 100),
    resale: age <= 25 ? Math.max(0, rise) * 2 : age > 29 ? -(age - 29) * 3 : 0,
    cost: Math.round((price * 60) / Math.max(1, means.money)),
    wages: Math.round((wage * 40) / Math.max(1, means.room)),
  };
}

const canLose = (w: CareerWorld, p: PackPlayer) => {
  const squad = squadPlayers({ pack: w.pack, clubId: p.clubId! });
  const keeper = readingsOf(w.pack).get(p.id)!.keeper;
  return (
    squad.length > MIN_SQUAD &&
    (!keeper || squad.filter((x) => readingsOf(w.pack).get(x.id)!.keeper).length > MIN_KEEPERS)
  );
};

/**
 * Who can play where, best first: for each position, the players who know it (natural or
 * competent) with their level. Built once per pack and carried across transfers, since a move
 * changes neither. A club looking for a centre-back reads a few dozen names, not the whole pack.
 */
const byPosition = (pack: Pack) =>
  cached(pack, 'byPosition', WHOLE, () => {
    const read = readingsOf(pack);
    // `at`: the player's place in the pack's list. Carried only across transfers (carryCache),
    // which keep the order, so the place stays right in the packs that follow.
    const by = new Map<string, { id: string; at: number; level: number }[]>();
    for (const [at, p] of pack.players.entries())
      for (const x of p.positions)
        if (x.level >= 2)
          (by.get(x.position) ?? by.set(x.position, []).get(x.position)!).push({
            id: p.id,
            at,
            level: read.get(p.id)!.level,
          });
    for (const list of by.values())
      list.sort((a, b) => b.level - a.level || (a.id < b.id ? -1 : 1));
    return by;
  });

interface Choice {
  p: PackPlayer;
  need: Need;
  why: Why;
}

/** Over his value a club pays to bring a player from abroad. PARÂMETRO. */
const IMPORT_PREMIUM = 20;
/** Over the wage he would ask at home a player wants to come from abroad. PARÂMETRO. */
const IMPORT_WAGE = 25;
/** Age from which a player sold abroad will come home. */
const HOMECOMING = 30;

/** A player abroad a club of the league can sign: the year's foreign market, or a veteran. */
const signable = (p: PackPlayer, season: number) =>
  isImport(p.id) || ageOf(p, season) >= HOMECOMING;

/** The fee to bring him from abroad: it leaves the league. */
const importFee = (w: CareerWorld, p: PackPlayer) =>
  thousands((marketValue(w.pack, p, w.season.season) * (100 + IMPORT_PREMIUM)) / 100);

/** What he wants to sign, coming from his club, from nowhere or from abroad. */
function stanceFor(w: CareerWorld, p: PackPlayer, buyerId: string) {
  const club = (id: string) => w.pack.clubs.find((x) => x.id === id)!;
  const from = p.clubId === null || p.clubId === ABROAD ? null : club(p.clubId);
  const s = playerStance(w.pack, p, from, club(buyerId), w.season.season);
  return p.clubId === ABROAD ? { ...s, wage: Math.round((s.wage * (100 + IMPORT_WAGE)) / 100) } : s;
}

/** The best signing for one need, or null: the whole market read through the club's filter. */
function choose(
  w: CareerWorld,
  buyerId: string,
  need: Need,
  skip: ReadonlySet<string>,
  /** Past the season's signings only free agents are looked at. */
  freeOnly = false,
): Choice | null {
  const season = w.season.season;
  const read = readingsOf(w.pack);
  const money = available(w, buyerId);
  const room = wageRoom(w, buyerId);
  const bidOn = new Set((w.bids ?? []).map((b) => b.player));
  const listed = new Set(w.listed ?? []);
  let best: Choice | null = null;
  let score = (need.worth ?? WORTH_IT) - 1;
  // Only those who know one of the positions and sit in the level the need asks for.
  const index = byPosition(w.pack);
  const seen = new Set<string>();
  const pool: { p: PackPlayer; level: number }[] = [];
  // Wider than the need by the most a club can be off (seven points).
  const top = need.wanted + 19;
  for (const position of need.positions) {
    const list = index.get(position) ?? [];
    // Best first: a binary search finds the first one in range instead of walking past the stars.
    let lo = 0;
    for (let hi = list.length; lo < hi;) {
      const mid = (lo + hi) >> 1;
      if (list[mid]!.level > top) lo = mid + 1;
      else hi = mid;
    }
    for (let k = lo; k < list.length; k++) {
      const x = list[k]!;
      if (x.level < need.wanted - 10) break;
      if (!seen.has(x.id)) {
        seen.add(x.id);
        pool.push({ p: w.pack.players[x.at]!, level: x.level });
      }
    }
  }
  // First a cheap sieve over everyone in range; then only the best few sit through the costly
  // reading (the selling club's plan, the player's mind, the points).
  const short: { p: PackPlayer; sees: number; theirs: boolean; free: boolean }[] = [];
  // Best level first, so the sieve can stop once nobody left can reach the shortlist: the
  // SHORTLIST-th best level seen so far (`cut`) against what the rest could at most be seen at.
  // The person's listed players go first whatever their level, so they are always looked at.
  pool.sort((a, b) => b.level - a.level);
  const bestSeen: number[] = [];
  let closed = false;
  for (const { p, level } of pool) {
    if (
      !closed &&
      bestSeen.length === SHORTLIST &&
      level + MAX_LEVEL_ERROR < bestSeen[SHORTLIST - 1]!
    )
      closed = true;
    if (closed && !(p.clubId === w.clubId && listed.has(p.id))) continue;
    if (p.clubId === buyerId || skip.has(p.id)) continue;
    const abroad = p.clubId === ABROAD;
    if (abroad && !signable(p, season)) continue;
    const theirs = p.clubId === w.clubId;
    // Without a club he costs no fee and asks nobody's leave.
    const free = p.clubId === null;
    if (freeOnly && !free) continue;
    // One bid at a time for a player of the person's, and none from a club already turned away.
    if (
      theirs &&
      (bidOn.size >= OPEN_BIDS || bidOn.has(p.id) || w.cold?.[`${buyerId}:${p.id}`] === season)
    )
      continue;
    const r = read.get(p.id)!;
    if (r.keeper !== need.keeper) continue;
    // Only players its scouts know; the person's listed players are offered to everyone.
    if (!(theirs && listed.has(p.id)) && !clubKnows(w, buyerId, p)) continue;
    // The buyer's own reading (a hash per player) last: the cheap tests weed out most first.
    // Just arrived somewhere: not for sale again this season.
    if (!free && w.moves?.[p.id]?.season === season) continue;
    // Out of reach whatever the club's mood: a spare still costs 80% of his value.
    if (!free && marketValue(w.pack, p, season) * 6 > money * 10) continue;
    if (!free && !abroad && !canLose(w, p)) continue;
    // The level the club sees must sit in what the need asks for.
    const sees = r.level + levelError(w.pack, buyerId, p);
    if (sees < need.wanted - 3 || sees > need.wanted + 12) continue;
    short.push({ p, sees, theirs, free });
    if (!(theirs && listed.has(p.id))) {
      let i = bestSeen.length;
      while (i > 0 && bestSeen[i - 1]! < sees) i--;
      if (i < SHORTLIST) {
        bestSeen.splice(i, 0, sees);
        if (bestSeen.length > SHORTLIST) bestSeen.pop();
      }
    }
  }
  // The best the club sees, and whoever of the person's is on the list; ties by id.
  short.sort(
    (a, b) =>
      Number(b.theirs && listed.has(b.p.id)) - Number(a.theirs && listed.has(a.p.id)) ||
      b.sees - a.sees ||
      (a.p.id < b.p.id ? -1 : 1),
  );
  for (const { p, theirs, free } of short.slice(0, SHORTLIST)) {
    const price = free
      ? 0
      : p.clubId === ABROAD
        ? importFee(w, p)
        : sellerStance({ pack: w.pack, clubId: p.clubId! }, p, buyerId, season).floor;
    if (price > money) continue;
    const wants = stanceFor(w, p, buyerId);
    if (wants.no || wants.wage > room) continue;
    const why = utility(w, buyerId, p, need, price, wants.wage, { money, room });
    if (why.need < REAL_NEED) continue;
    // A player on the list is easier to get: clubs come for him sooner.
    const u = total(why) + (theirs && listed.has(p.id) ? LISTED : 0);
    if (u > score || (u === score && best && p.id < best.p.id))
      [best, score] = [{ p, need, why }, u];
  }
  return best;
}

/** Sits at both tables for a choice; the deal, or null when a side walks away. */
function negotiate(w: CareerWorld, buyerId: string, c: Choice): Deal | null {
  const season = w.season.season;
  const { p, need } = c;
  const from = p.clubId;
  let fee = from === null ? 0 : -1;
  // Abroad, the price is the price: paid or not.
  if (from === ABROAD) fee = importFee(w, p) <= available(w, buyerId) ? importFee(w, p) : -1;
  else if (from !== null) {
    const stance = sellerStance({ pack: w.pack, clubId: from }, p, buyerId, season);
    // The most the club pays: over what it thinks he is worth by how much it needs him and by
    // how loose its office is at the table, never over its budget.
    const hand = bargaining(w.pack, buyerId);
    const worth = seenValue(w.pack, buyerId, p, season);
    const most = Math.min(
      available(w, buyerId),
      thousands(
        (worth * (100 + Math.round(need.urgency / 2) + hand.pays + boardOverpay(w, buyerId))) / 100,
      ),
    );
    let offer = Math.min(most, thousands((worth * hand.opens) / 100));
    for (let round = 1; round <= MAX_ROUNDS && fee < 0; round++) {
      const a = answerFee(stance, offer, round);
      if (a.kind === 'accept') fee = a.fee;
      else if (a.kind === 'refuse') return null;
      // A sharp office answers a counter with one of its own; the others take a price they can pay.
      else if (a.fee <= most && round > hand.haggles) offer = a.fee;
      else if (offer >= most) return null;
      else offer = Math.min(most, thousands((offer + a.fee) / 2));
    }
  }
  if (fee < 0) return null;

  const wants = stanceFor(w, p, buyerId);
  const room = wageRoom(w, buyerId);
  let terms: Terms = {
    wage: Math.min(room, Math.round((wants.wage * 95) / 100)),
    years: wants.years,
    role: wants.fair,
  };
  let signed: Terms | null = null;
  for (let round = 1; round <= MAX_ROUNDS && !signed; round++) {
    const a = answerTerms(wants, terms, round);
    if (a.kind === 'accept') signed = a.terms;
    else if (a.kind === 'refuse' || a.terms.wage > room) return null;
    else terms = a.terms;
  }
  if (!signed) return null;
  return {
    day: w.day,
    player: p.id,
    name: p.knownAs ?? p.name,
    from,
    to: buyerId,
    fee,
    wage: signed.wage,
    years: signed.years,
    role: signed.role,
    for: need.kind,
    seen: readingsOf(w.pack).get(p.id)!.level + levelError(w.pack, buyerId, p),
    why: c.why,
  };
}

/** The window a day falls in, as a label: the year and its half. */
const windowOf = (day: number) => {
  const iso = isoOf(day);
  return `${iso.slice(0, 4)}-${iso.slice(5, 7) <= '06' ? 1 : 2}`;
};

/** One round of the market: each club, in the seed's order, tries one signing. */
export function marketRound(w: CareerWorld, day: number): Deal[] {
  const season = w.season.season;
  if (w.bids?.length) w.bids = w.bids.filter((b) => day - b.day <= BID_DAYS);
  // The players the person offered on loan go to the clubs that will play them.
  lendListed(w);
  const done: Deal[] = [];
  const signed = new Map<string, number>();
  for (const d of w.deals ?? [])
    if (d.day >= day - 366 && w.moves?.[d.player]?.season === season)
      signed.set(d.to, (signed.get(d.to) ?? 0) + 1);
  // One draw per round sets the order of the clubs: a number each, in the pack's order.
  const draw = rngFrom(seedOf(w.seed, `round:${day}`));
  const order = w.pack.clubs
    .map((c) => ({ id: c.id, at: next(draw) }))
    // Only clubs with fixtures this season shop: a club of the pack that plays nothing here (a
    // foreign club holding a few of its players) still sells, but never looks for anyone.
    // ponytail: the exodus abroad (foreign clubs buying the league's best) is a later, cheap
    // model of its own, not a full market reading for hundreds of idle clubs.
    .filter((c) => c.id !== w.clubId && w.season.calendar.byClub.has(c.id))
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  // A club that found nobody worth the table sits out a few rounds: the market it read does not
  // change enough in a fortnight to look again.
  const span = `${windowOf(day)}:${Math.floor(day / (ROUND_DAYS * IDLE_ROUNDS))}`;
  const idle = new Set(w.idle?.span === span ? w.idle.clubs : []);
  for (const { id } of order) {
    const count = signed.get(id) ?? 0;
    if (idle.has(id) || count >= SIGNINGS + FREE_EXTRA) continue;
    const freeOnly = count >= SIGNINGS;
    if (squadPlayers({ pack: w.pack, clubId: id }).length >= MAX_SQUAD) continue;
    const tried = new Set<string>();
    let found = false;
    const plan = squadPlanOf({ pack: w.pack, clubId: id });
    const needs = plan.needs.slice(0, 2);
    if (plan.upgrade && available(w, id) * 100 >= budgetOf(w, id).transfer * SPARE)
      needs.push(plan.upgrade);
    for (const need of needs) {
      const choice = choose(w, id, need, tried, freeOnly);
      if (!choice) continue;
      found = true;
      tried.add(choice.p.id);
      if (choice.p.clubId === w.clubId) {
        // The person's player: the club bids and waits for the answer.
        const hand = bargaining(w.pack, id);
        const worth = seenValue(w.pack, id, choice.p, season);
        const most = Math.min(
          available(w, id),
          thousands(
            (worth * (100 + Math.round(need.urgency / 2) + hand.pays + boardOverpay(w, id))) / 100,
          ),
        );
        const clause = choice.p.contract?.releaseFee ?? null;
        const pays = clause !== null && clause <= most;
        const fee = pays ? clause : Math.min(most, thousands((worth * hand.opens) / 100));
        w.bids = [
          ...(w.bids ?? []),
          {
            id: `${day}:${id}:${choice.p.id}`,
            player: choice.p.id,
            from: id,
            fee,
            most,
            round: 1,
            day,
            why: choice.why,
          },
        ];
        if (pays) {
          // The clause is met: the person has no say, only the player has.
          const a = answerBid(w, `${day}:${id}:${choice.p.id}`, { kind: 'accept' });
          if (a.kind === 'sold')
            note(w, {
              day,
              kind: 'clausePaid',
              player: choice.p.knownAs ?? choice.p.name,
              club: id,
              fee,
            });
          break;
        }
        note(w, { day, kind: 'bid', player: choice.p.knownAs ?? choice.p.name, club: id, fee });
        break;
      }
      const deal = negotiate(w, id, choice);
      if (!deal) continue;
      movePlayer(w, choice.p, id, {
        wage: deal.wage,
        until: `${season + deal.years}-12-31`,
        release: marketValue(w.pack, choice.p, season) * CLAUSE_TIMES,
      });
      if (deal.from === ABROAD) {
        // The fee leaves the league: only the buyer's books see it.
        const b = booksOf(w, id);
        w.books = { ...w.books, [id]: { ...b, spent: b.spent + deal.fee } };
      } else if (deal.from !== null) book(w, deal.from, id, deal.fee);
      done.push({ ...deal, day });
      signed.set(id, (signed.get(id) ?? 0) + 1);
      break;
    }
    if (!found) idle.add(id);
  }
  w.idle = { span, clubs: [...idle].sort() };
  if (done.length) w.deals = [...(w.deals ?? []), ...done].slice(-KEPT);
  return done;
}

/** The rounds due between two days: one every `ROUND_DAYS` while a window is open. */
export function roundsBetween(from: number, to: number): number[] {
  const days: number[] = [];
  // A long gap (the turn of the year) plays its last four rounds only.
  const start = Math.max(from, to - 4 * ROUND_DAYS);
  for (let k = Math.floor(start / ROUND_DAYS) + 1; k * ROUND_DAYS <= to; k++)
    if (windowOpen(k * ROUND_DAYS)) days.push(k * ROUND_DAYS);
  return days;
}
