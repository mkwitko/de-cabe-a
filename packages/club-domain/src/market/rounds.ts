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
import type { CareerWorld } from '../career/advance';
import { movePlayer, windowOpen } from '../career/market';
import { squadPlayers } from '../career/squad';
import { seedOf } from '../competition/season';
import type { PackPlayer } from '../pack/schema';
import { available, book, wageRoom } from './books';
import {
  MAX_ROUNDS,
  answerFee,
  answerTerms,
  playerStance,
  sellerStance,
  type Role,
  type Terms,
} from './deals';
import { fitFor, squadPlanOf, type Need } from './plan';
import { ageOf, levelIn, readingsOf, thousands } from './value';

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
  from: string;
  to: string;
  fee: number;
  wage: number;
  years: number;
  role: Role;
  /** `starter` or `cover`: the need he was bought for. */
  for: Need['kind'];
  why: Why;
}

/** Days between rounds inside a window. */
export const ROUND_DAYS = 7;
/** Signings a club makes in a season, at most. */
const SIGNINGS = 4;
/** A choice must be worth this many points to go to the table. */
const WORTH_IT = 36;
/** And the need itself must carry at least this much of it: no buying on promise alone. */
const REAL_NEED = 14;
/** Deals kept for the market's news. */
const KEPT = 80;
const MIN_SQUAD = 20;
const MIN_KEEPERS = 2;
const MAX_SQUAD = 35;

const total = (y: Why) => y.need + y.fit + y.growth + y.resale - y.cost - y.wages;

/** How much this player helps this club for this need, at this price and wage. */
export function utility(
  w: CareerWorld,
  buyerId: string,
  p: PackPlayer,
  need: Need,
  price: number,
  wage: number,
): Why {
  const buyer = { pack: w.pack, clubId: buyerId };
  const club = w.pack.clubs.find((c) => c.id === buyerId)!;
  const season = w.season.season;
  const level = readingsOf(w.pack).get(p.id)!.level;
  const age = ageOf(p, season);
  const over = Math.max(0, Math.min(12, fitFor(buyer, p, need) - need.wanted + 4));
  const rise = levelIn(w.pack, p, season, 2) - level;
  const natural = p.positions.some((x) => need.positions.includes(x.position) && x.level === 3);
  return {
    need: Math.round((need.urgency * over) / 12),
    fit: natural ? 10 : 0,
    // A club that buys ready players (readyVsYoung high) discounts what he may become.
    growth: Math.round((Math.max(0, rise) * 4 * (100 - club.profile.market.readyVsYoung)) / 100),
    resale: age <= 25 ? Math.max(0, rise) * 2 : age > 29 ? -(age - 29) * 3 : 0,
    cost: Math.round((price * 60) / Math.max(1, available(w, buyerId))),
    wages: Math.round((wage * 40) / Math.max(1, wageRoom(w, buyerId))),
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

interface Choice {
  p: PackPlayer;
  need: Need;
  why: Why;
}

/** The best signing for one need, or null: the whole market read through the club's filter. */
function choose(
  w: CareerWorld,
  buyerId: string,
  need: Need,
  skip: ReadonlySet<string>,
): Choice | null {
  const season = w.season.season;
  const read = readingsOf(w.pack);
  const clubs = new Map(w.pack.clubs.map((c) => [c.id, c]));
  const money = available(w, buyerId);
  const room = wageRoom(w, buyerId);
  let best: Choice | null = null;
  let score = WORTH_IT - 1;
  for (const p of w.pack.players) {
    if (!p.clubId || p.clubId === buyerId || p.clubId === w.clubId || skip.has(p.id)) continue;
    const r = read.get(p.id)!;
    if (r.keeper !== need.keeper) continue;
    if (r.level < need.wanted - 3 || r.level > need.wanted + 12) continue;
    if (!p.positions.some((x) => need.positions.includes(x.position) && x.level >= 2)) continue;
    // Just arrived somewhere: not for sale again this season.
    if (w.moves?.[p.id]?.season === season) continue;
    if (!canLose(w, p)) continue;
    const stance = sellerStance({ pack: w.pack, clubId: p.clubId }, p, buyerId, season);
    if (stance.floor > money) continue;
    const wants = playerStance(w.pack, p, clubs.get(p.clubId)!, clubs.get(buyerId)!, season);
    if (wants.no || wants.wage > room) continue;
    const why = utility(w, buyerId, p, need, stance.floor, wants.wage);
    if (why.need < REAL_NEED) continue;
    const u = total(why);
    if (u > score || (u === score && best && p.id < best.p.id))
      [best, score] = [{ p, need, why }, u];
  }
  return best;
}

/** Sits at both tables for a choice; the deal, or null when a side walks away. */
function negotiate(w: CareerWorld, buyerId: string, c: Choice): Deal | null {
  const season = w.season.season;
  const { p, need } = c;
  const from = p.clubId!;
  const clubs = new Map(w.pack.clubs.map((x) => [x.id, x]));
  const stance = sellerStance({ pack: w.pack, clubId: from }, p, buyerId, season);
  // The most the club pays: over the value by how much it needs him, never over its budget.
  const most = Math.min(
    available(w, buyerId),
    thousands((stance.value * (100 + Math.round(need.urgency / 2))) / 100),
  );
  let offer = Math.min(most, thousands((stance.value * 90) / 100));
  let fee = -1;
  for (let round = 1; round <= MAX_ROUNDS && fee < 0; round++) {
    const a = answerFee(stance, offer, round);
    if (a.kind === 'accept') fee = a.fee;
    else if (a.kind === 'refuse') return null;
    else if (a.fee <= most) offer = a.fee;
    else if (offer >= most) return null;
    else offer = Math.min(most, thousands((offer + a.fee) / 2));
  }
  if (fee < 0) return null;

  const wants = playerStance(w.pack, p, clubs.get(from)!, clubs.get(buyerId)!, season);
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
    why: c.why,
  };
}

/** One round of the market: each club, in the seed's order, tries one signing. */
export function marketRound(w: CareerWorld, day: number): Deal[] {
  const season = w.season.season;
  const done: Deal[] = [];
  const signed = new Map<string, number>();
  for (const d of w.deals ?? [])
    if (d.day >= day - 366 && w.moves?.[d.player]?.season === season)
      signed.set(d.to, (signed.get(d.to) ?? 0) + 1);
  const order = w.pack.clubs
    .filter((c) => c.id !== w.clubId)
    .map((c) => ({ id: c.id, at: seedOf(w.seed, `round:${day}:${c.id}`) }))
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  for (const { id } of order) {
    if ((signed.get(id) ?? 0) >= SIGNINGS) continue;
    if (squadPlayers({ pack: w.pack, clubId: id }).length >= MAX_SQUAD) continue;
    const tried = new Set<string>();
    for (const need of squadPlanOf({ pack: w.pack, clubId: id }).needs.slice(0, 2)) {
      const choice = choose(w, id, need, tried);
      if (!choice) continue;
      tried.add(choice.p.id);
      const deal = negotiate(w, id, choice);
      if (!deal) continue;
      movePlayer(w, choice.p, id, {
        wage: deal.wage,
        until: `${season + deal.years}-12-31`,
      });
      book(w, deal.from, id, deal.fee);
      done.push({ ...deal, day });
      signed.set(id, (signed.get(id) ?? 0) + 1);
      break;
    }
  }
  if (done.length) w.deals = [...(w.deals ?? []), ...done].slice(-KEPT);
  return done;
}

/** The rounds due between two days: one every `ROUND_DAYS` while a window is open. */
export function roundsBetween(from: number, to: number): number[] {
  const days: number[] = [];
  // A long gap (the turn of the year) plays its last four weeks only.
  const start = Math.max(from, to - 4 * ROUND_DAYS);
  for (let k = Math.floor(start / ROUND_DAYS) + 1; k * ROUND_DAYS <= to; k++)
    if (windowOpen(k * ROUND_DAYS)) days.push(k * ROUND_DAYS);
  return days;
}
