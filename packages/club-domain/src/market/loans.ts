/**
 * Loans (07 §4, the simple kind): a player plays the season for another club and comes back at
 * its end. The borrower pays his wage and a small fee; his contract stays the owner's. The
 * person borrows from other clubs and lends to them; the other clubs do not lend among
 * themselves yet. A club lends who its plan does not start, and a player goes only where he
 * will play. Integers; every number is a PARÂMETRO.
 */
import { ruleOn } from '../rules/registry';
import { isoOf } from '../competition/calendar';
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { movePlayer, settle, windowOpen } from '../career/market';
import { squadPlayers } from '../career/squad';
import type { PackPlayer } from '../pack/schema';
import { embargoed, wageRoom } from './books';
import { fairRole } from './deals';
import { squadPlanOf } from './plan';
import { ageOf, marketValue, readingsOf, thousands } from './value';

/** A player on loan: who owns him and the contract he goes back to. */
export interface Loan {
  owner: string;
  wage: number;
  until: string;
  /** The season the loan ends with. */
  season: number;
}

/** The loan fee, as a share of his value. */
const FEE = 5;
const MAX_SQUAD = 42;
const MIN_SQUAD = 20;
const MIN_KEEPERS = 2;
/**
 * FIFA's loan rules (from July 2024): a club has at most six players out and six in on loan at
 * once, and at most three loans with the same club a season. Boys of 21 or under that the club
 * formed do not count.
 */
/** FIFA's loan limits in force (rules/registry.ts). */
const limits = (w: CareerWorld) =>
  ruleOn('loans', w.day > 0 ? isoOf(w.day) : `${w.season.season}-01-01`);

/** Whether a loan counts toward FIFA's limits: not a boy the owner formed. */
const counts = (w: CareerWorld, p: PackPlayer, owner: string) =>
  !(ageOf(p, w.season.season) <= limits(w).exemptAge && p.origin?.clubId === owner);

/** Loans that count, out from `owner`, in at `to`, and between the two this season. */
function loanCounts(w: CareerWorld, owner: string, to: string) {
  let out = 0;
  let inn = 0;
  let pair = 0;
  for (const [id, loan] of Object.entries(w.loans ?? {})) {
    const p = w.pack.players.find((x) => x.id === id);
    if (!p || !counts(w, p, loan.owner)) continue;
    if (loan.owner === owner) out++;
    if (p.clubId === to) inn++;
    if (loan.owner === owner && p.clubId === to) pair++;
  }
  return { out, inn, pair };
}

export const loanFee = (w: CareerWorld, p: PackPlayer) =>
  thousands((marketValue(w.pack, p, w.season.season) * FEE) / 100);

export type LoanNo =
  | 'window'
  | 'embargo'
  | 'squadFull'
  | 'onLoan'
  | 'starter'
  | 'theirSquad'
  | 'noMinutes'
  | 'cash'
  | 'wageCap'
  | 'loansOut'
  | 'loansIn'
  | 'pairLimit';

const thin = (w: CareerWorld, p: PackPlayer) => {
  const squad = squadPlayers({ pack: w.pack, clubId: p.clubId! });
  const read = readingsOf(w.pack);
  return (
    squad.length <= MIN_SQUAD ||
    (read.get(p.id)!.keeper && squad.filter((x) => read.get(x.id)!.keeper).length <= MIN_KEEPERS)
  );
};

/** Why `to` cannot borrow this player now; null when the loan can be made. */
export function cannotBorrow(w: CareerWorld, p: PackPlayer, to: string): LoanNo | null {
  if (!windowOpen(w.day)) return 'window';
  if (embargoed(w, to)) return 'embargo';
  if (!p.clubId || p.clubId === to) return 'onLoan';
  if (w.loans?.[p.id]) return 'onLoan';
  if (squadPlayers({ pack: w.pack, clubId: to }).length >= MAX_SQUAD) return 'squadFull';
  // A club lends who it does not start, and keeps enough to play.
  if (squadPlanOf({ pack: w.pack, clubId: p.clubId }).xi.includes(p.id)) return 'starter';
  if (thin(w, p)) return 'theirSquad';
  if (counts(w, p, p.clubId)) {
    const n = loanCounts(w, p.clubId, to);
    const l = limits(w);
    if (n.out >= l.atOnce) return 'loansOut';
    if (n.inn >= l.atOnce) return 'loansIn';
    if (n.pair >= l.samePair) return 'pairLimit';
  }
  // He goes to play: a place in the eleven or the rotation there.
  const role = fairRole({ pack: w.pack, clubId: to }, p, w.season.season);
  if (role !== 'starter' && role !== 'rotation') return 'noMinutes';
  if ((p.contract?.wage ?? 0) > wageRoom(w, to)) return 'wageCap';
  if (to === w.clubId && loanFee(w, p) > w.ledger.cash) return 'cash';
  return null;
}

function lend(w: CareerWorld, p: PackPlayer, to: string): void {
  const owner = p.clubId!;
  const contract = { wage: p.contract?.wage ?? 0, until: p.contract?.until ?? '' };
  w.loans = { ...w.loans, [p.id]: { owner, ...contract, season: w.season.season } };
  movePlayer(w, p, to, contract);
}

/** The person borrows a player for the season: the fee is paid and he joins the squad. */
export function borrow(w: CareerWorld, playerId: string): void {
  const p = w.pack.players.find((x) => x.id === playerId);
  if (!p) throw new Error('loan: unknown player');
  const no = cannotBorrow(w, p, w.clubId);
  if (no) throw new Error(`loan: ${no}`);
  const fee = loanFee(w, p);
  const owner = p.clubId!;
  settle(w, p, owner, fee, 'buy', 'loan');
  lend(w, p, w.clubId);
}

/** Puts one of the person's players up for loan, or takes him off. */
export function listForLoan(w: CareerWorld, playerId: string, on: boolean): void {
  const p = w.pack.players.find((x) => x.id === playerId);
  if (p?.clubId !== w.clubId || w.loans?.[playerId]) throw new Error('loan: not yours to lend');
  const list = new Set(w.forLoan ?? []);
  if (on && !list.has(playerId)) delete w.idle;
  if (on) list.add(playerId);
  else list.delete(playerId);
  w.forLoan = [...list].sort();
}

/**
 * The club that takes a listed player on loan: of those where he would play and that can take
 * his wage, the one that needs his position most (ties by id). Null when there is none.
 */
export function borrowerFor(w: CareerWorld, p: PackPlayer): string | null {
  let best: string | null = null;
  let score = 0;
  for (const c of w.pack.clubs) {
    if (c.id === w.clubId || cannotBorrow(w, p, c.id) !== null) continue;
    const need = squadPlanOf({ pack: w.pack, clubId: c.id }).needs.find((n) =>
      p.positions.some((x) => n.positions.includes(x.position) && x.level >= 2),
    );
    const s = need?.urgency ?? 0;
    if (s > score || (s === score && s > 0 && best !== null && c.id < best))
      [best, score] = [c.id, s];
  }
  return best;
}

/** Lends the person's listed players to the clubs that want them; called in a market round. */
export function lendListed(w: CareerWorld): void {
  for (const id of [...(w.forLoan ?? [])]) {
    const p = w.pack.players.find((x) => x.id === id);
    if (p?.clubId !== w.clubId) continue;
    const to = borrowerFor(w, p);
    if (!to) continue;
    const fee = loanFee(w, p);
    settle(w, p, to, fee, 'sell', 'loan');
    lend(w, p, to);
    w.forLoan = (w.forLoan ?? []).filter((x) => x !== id);
    w.listed = (w.listed ?? []).filter((x) => x !== id);
  }
}

/** At the season's end every loan is over: each player goes back on the contract he left. */
export function returnLoans(w: CareerWorld): void {
  for (const [id, loan] of Object.entries(w.loans ?? {})) {
    const p = w.pack.players.find((x) => x.id === id);
    if (!p) continue;
    const mine = loan.owner === w.clubId || p.clubId === w.clubId;
    movePlayer(w, p, loan.owner, { wage: loan.wage, until: loan.until });
    if (mine)
      note(w, {
        day: w.day,
        kind: 'loanBack',
        player: p.knownAs ?? p.name,
        club: loan.owner === w.clubId ? (p.clubId ?? '') : loan.owner,
      });
  }
  delete w.loans;
  delete w.forLoan;
}
