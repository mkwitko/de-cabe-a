/**
 * The two tables of a transfer (07 §2): club to club, for the fee, and club to player, for the
 * contract. Each side has a stance it does not show (a floor, a demand) and answers an offer
 * with yes, a counter-offer, or a no that names its reason. Pure functions over the pack and
 * the two clubs: the same for a rival and for the person. Integers only; every number is a
 * PARÂMETRO, not calibrated.
 */

/** The clause a club writes into a contract by default: three times his value. */
export const CLAUSE_TIMES = 3;
import type { ClubIn } from '../career/squad';
import { cached } from '../lib/pack-cache';
import type { Pack, PackClub, PackPlayer } from '../pack/schema';
import { squadPlanOf } from './plan';
import { bargaining, seenValue } from './judgement';
import { ageOf, goingWage, marketValue, readingsOf, thousands, yearsLeft } from './value';

/** Rounds of offer and counter-offer before a side walks away. */
export const MAX_ROUNDS = 4;

// ── Club to club: the fee ────────────────────────────────────────────────────

export type SellerMood = 'starter' | 'cover' | 'surplus';
export interface SellerStance {
  /** What he is to the selling club's plan. */
  mood: SellerMood;
  value: number;
  /** The least the club takes. Never shown. */
  floor: number;
  /** What it asks for first. */
  asking: number;
  /** Why the floor sits where it does, in percentage points over the value. */
  why: { plan: number; noCover: number; contract: number; rival: number; broke: number };
  /** His release clause: a fee that reaches it cannot be refused. Null without one. */
  release: number | null;
}

/** Points under the value a club in the red takes: it lives on selling players. PARÂMETRO. */
const BROKE_DISCOUNT = 15;

/** How the selling club sees a sale of this player to this buyer. */
export function sellerStance(
  seller: ClubIn,
  p: PackPlayer,
  buyerId: string,
  season: number,
  /** The seller is in the red: it needs the money and takes less (career/clubs.ts cash). */
  broke = false,
): SellerStance {
  const plan = squadPlanOf(seller);
  const slot = plan.xi.indexOf(p.id);
  const mood: SellerMood = slot >= 0 ? 'starter' : plan.cover.includes(p.id) ? 'cover' : 'surplus';
  const rivals = cached(
    seller.pack,
    'rivals',
    seller.clubId,
    () => seller.pack.clubs.find((c) => c.id === seller.clubId)!.rivals,
  );
  const why = {
    plan: mood === 'starter' ? 35 : mood === 'cover' ? 5 : -20,
    noCover: slot >= 0 && plan.cover[slot] === null ? 25 : 0,
    contract: yearsLeft(p, season) <= 1 ? -20 : 0,
    rival: rivals.includes(buyerId) ? 20 : 0,
    broke: broke ? -BROKE_DISCOUNT : 0,
  };
  // What the club thinks he is worth, and how hard its office holds out (judgement.ts).
  const value = seenValue(seller.pack, seller.clubId, p, season);
  const holds = bargaining(seller.pack, seller.clubId).holds;
  const floor = thousands(
    (value * (100 + why.plan + why.noCover + why.contract + why.rival + why.broke + holds)) / 100,
  );
  return {
    mood,
    value,
    floor,
    asking: thousands((floor * 125) / 100),
    why,
    release: p.contract?.releaseFee ?? null,
  };
}

export type FeeAnswer =
  | { kind: 'accept'; fee: number }
  | { kind: 'counter'; fee: number }
  | { kind: 'refuse'; reason: 'insult' | 'final' };

/**
 * The selling club's answer to `fee` in round `round` (1 = the first offer). It comes down from
 * its asking price toward its floor as the rounds go, and takes an offended no for less than
 * 60% of the floor.
 */
export function answerFee(s: SellerStance, fee: number, round: number): FeeAnswer {
  // The clause is in his contract: the club has no say once it is met.
  if (s.release !== null && fee >= s.release) return { kind: 'accept', fee };
  if (fee >= s.floor) return { kind: 'accept', fee };
  if (fee * 100 < s.floor * 60) return { kind: 'refuse', reason: 'insult' };
  if (round >= MAX_ROUNDS) return { kind: 'refuse', reason: 'final' };
  const step = ((s.asking - s.floor) * (MAX_ROUNDS - round)) / MAX_ROUNDS;
  return { kind: 'counter', fee: thousands(s.floor + step) };
}

// ── Club to player: the contract ─────────────────────────────────────────────

export const ROLES = ['starter', 'rotation', 'backup', 'prospect'] as const;
export type Role = (typeof ROLES)[number];
export interface Terms {
  /** Monthly wage. */
  wage: number;
  years: number;
  role: Role;
  /** Release clause the club writes in; absent or null for none. */
  release?: number | null;
  /** Image-rights share of his pay, 0 to 40 (image.ts); absent: the club's usual one. */
  image?: number;
}

export type PlayerNo = 'loyal' | 'stepDown' | 'role' | 'final';
export interface PlayerStance {
  /** The role the club can honestly promise him, from its plan. */
  fair: Role;
  /** The least role he signs for. */
  wants: Role;
  /** The least wage he signs for in that role. */
  wage: number;
  years: number;
  /** A no before any talk, with its reason; null when he listens. */
  no: PlayerNo | null;
  /** Why the wage sits where it does, in percentage points over his base. */
  why: { ambition: number; step: number; raise: number };
  /** His market value: a clause within three times it is a door he pays for with wage. */
  value: number;
}

/** Percent under the going wage a free agent asks. PARÂMETRO. */
const FREE_DISCOUNT = 15;

const rank = (r: Role) => (r === 'starter' ? 3 : r === 'rotation' ? 2 : r === 'prospect' ? 1 : 0);

/** The role this club's plan has for him: he starts, he rotates in, or he waits. */
export function fairRole(buyer: ClubIn, p: PackPlayer, season: number): Role {
  const r = readingsOf(buyer.pack).get(p.id)!;
  const level = squadPlanOf(buyer).level;
  if (r.level >= level) return 'starter';
  if (r.level >= level - 6) return 'rotation';
  return ageOf(p, season) <= 21 && r.ceiling >= level ? 'prospect' : 'backup';
}

/**
 * What the player wants to sign for `to`, coming from `from` (null: a free agent). He weighs the
 * wage against the going one for his level and his own, the step up or down in club standing,
 * the role, and who he is: the loyal stay, the ambitious do not step down.
 */
export function playerStance(
  pack: Pack,
  p: PackPlayer,
  from: PackClub | null,
  to: PackClub,
  season: number,
): PlayerStance {
  const r = readingsOf(pack).get(p.id)!;
  const age = ageOf(p, season);
  const step = to.reputation - (from?.reputation ?? 0);
  const fair = fairRole({ pack, clubId: to.id }, p, season);
  const startsNow = from ? squadPlanOf({ pack, clubId: from.id }).xi.includes(p.id) : false;
  // A starter does not leave to sit, unless the step up is big; a youngster accepts to wait.
  const wants: Role = startsNow && step < 20 ? 'rotation' : age <= 21 ? 'prospect' : 'backup';
  let no: PlayerNo | null = null;
  if (from && p.personality.loyalty >= 16 && step < 15) no = 'loyal';
  else if (from && p.personality.ambition >= 14 && step <= -15) no = 'stepDown';
  else if (rank(fair) < rank(wants)) no = 'role';
  const why = {
    ambition: p.personality.ambition,
    step: step >= 10 ? -10 : step <= -10 ? 20 : 0,
    // A free agent earns nothing while he waits: he signs for less than the going wage.
    raise: from ? 5 : -FREE_DISCOUNT,
  };
  const base = Math.max(p.contract?.wage ?? 0, goingWage(pack, r.level));
  return {
    fair,
    wants,
    wage: Math.round((base * (100 + why.ambition + why.step + why.raise)) / 100),
    years: age <= 24 ? 4 : age <= 29 ? 3 : age <= 32 ? 2 : 1,
    no,
    why,
    value: marketValue(pack, p, season),
  };
}

export type TermsAnswer =
  | { kind: 'accept'; terms: Terms }
  /** `impatient`: the agent's patience ran out and he asks more than before (agents.ts). */
  | { kind: 'counter'; terms: Terms; impatient?: boolean }
  | { kind: 'refuse'; reason: PlayerNo };

/**
 * The player's answer to the contract offered in round `round`. A better role than he asked for
 * is worth 8% of wage a step; a longer deal than he wants costs 5% a year. He meets the club
 * part of the way as the rounds go.
 */
export function answerTerms(
  s: PlayerStance,
  t: Terms,
  round: number,
  /** The player's agent: past his patience, each round asks 3% to 5% more, by his greed. */
  agent?: { patience: number; greed: number },
): TermsAnswer {
  if (s.no) return { kind: 'refuse', reason: s.no };
  if (rank(t.role) < rank(s.wants)) return { kind: 'refuse', reason: 'role' };
  const sweet = (rank(t.role) - rank(s.wants)) * 8;
  const long = Math.max(0, t.years - s.years) * 5;
  // A clause he could be bought out by is worth 5% of wage to him.
  const door = t.release != null && t.release <= s.value * 3 ? 5 : 0;
  const hard =
    agent && round > agent.patience
      ? (round - agent.patience) * (3 + Math.min(2, Math.max(0, Math.floor((agent.greed - 5) / 4))))
      : 0;
  const demand = Math.round((s.wage * (100 - sweet - door + long + hard)) / 100);
  if (t.wage >= demand) return { kind: 'accept', terms: t };
  if (round >= MAX_ROUNDS) return { kind: 'refuse', reason: 'final' };
  // He opens 10% over what he would take and comes down to it.
  const ask = Math.round((demand * (100 + (10 * (MAX_ROUNDS - round)) / MAX_ROUNDS)) / 100);
  return {
    kind: 'counter',
    terms: { ...t, wage: ask, years: Math.min(t.years, 5), role: t.role },
    ...(hard > 0 && { impatient: true }),
  };
}
