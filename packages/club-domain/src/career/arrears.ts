/**
 * Wages in arrears (salários atrasados): a club runs on credit first (banks, advances on TV
 * money), and a month it cannot even borrow for, its cash past the credit line when the month
 * turns, it did not pay. The squad feels it at once, on the pitch and in the dressing room; at
 * three months the law lets a player walk out (Lei Pelé, art. 31: wages or image rights three
 * months or more in arrears end the contract, and he is free to sign for anyone), and the
 * ones other clubs want go first. Paying up (cash back above zero) clears the arrears. Only the
 * person's club; the others cut their squads when broke (contracts.ts). Every number is a
 * PARÂMETRO.
 */
import { pick, rngFrom } from '@decabeca/match-engine';
import type { CareerWorld } from './advance';
import { note } from './inbox';
import { releasePlayer } from './market';
import { squadPlayers } from './squad';
import { seedOf } from '../competition/season';
import { marketValue } from '../market/value';
import { incomeOf } from '../market/books';
import { unrestCost } from '../market/unrest';
import { flagGrudge } from '../market/image';

/** The credit a club gets before it stops paying: months of its season's income. */
const CREDIT_MONTHS = 4;

/** Months owed after which a player may end his contract (Lei Pelé, art. 31). */
export const WALKOUT_MONTHS = 3;
/** Chance a month, per hundred, that a player the market wants walks out once he may. */
const WALKOUT = 25;
/** Below this many players nobody else may walk out: the match needs eighteen and some cover. */
const MIN_SQUAD = 22;
/** Strength lost, per thousand, for each month owed, up to three months. */
const STRENGTH_PER_MONTH = 7;
/** The engine's morale (0..1): a paid squad, and what each month owed takes off it. */
const MORALE = 0.7;
const MORALE_PER_MONTH = 0.05;

const owed = (w: CareerWorld) => Math.min(WALKOUT_MONTHS, w.arrears ?? 0);

/** The person's strength with the months owed weighing on it. */
export const strengthOwed = (w: CareerWorld, strength: number) =>
  (strength * (1000 - STRENGTH_PER_MONTH * owed(w))) / 1000;

/** The squad's morale in a watched match. */
export const moraleOf = (w: CareerWorld) => MORALE - MORALE_PER_MONTH * owed(w) - unrestCost(w);

/**
 * The month turned on `day`, its bills posted and the ledger brought to it: unpaid if the cash
 * is below zero, paid up if it is back above. Past three months, those the market wants may go.
 */
export function monthTurned(w: CareerWorld, day: number): void {
  const credit = Math.round((incomeOf(w, w.clubId) * CREDIT_MONTHS) / 12);
  if (w.ledger.cash >= -credit) {
    if (w.arrears) note(w, { day, kind: 'arrearsPaid' });
    delete w.arrears;
    return;
  }
  w.arrears = (w.arrears ?? 0) + 1;
  note(w, { day, kind: 'arrears', months: w.arrears });
  if (w.arrears < WALKOUT_MONTHS) return;
  const squad = squadPlayers(w);
  // The upper half by value: those with somewhere else to go.
  const value = new Map(squad.map((p) => [p.id, marketValue(w.pack, p, w.season.season)]));
  const ranked = [...squad].sort((a, b) => value.get(b.id)! - value.get(a.id)!);
  const r = rngFrom(seedOf(w.seed, `walkout:${day}`));
  let left = squad.length;
  let keepers = squad.filter((p) => p.positions.some((x) => x.position === 'GK')).length;
  for (const p of ranked.slice(0, Math.floor(ranked.length / 2))) {
    if (pick(r, 100) >= WALKOUT) continue;
    // The club still has to field a team: the last ones stay, whatever they are owed.
    const keeper = p.positions.some((x) => x.position === 'GK');
    if (left <= MIN_SQUAD || (keeper && keepers <= 2)) continue;
    left--;
    if (keeper) keepers--;
    flagGrudge(w, p);
    releasePlayer(w, p);
    note(w, { day, kind: 'walkout', player: p.knownAs ?? p.name });
  }
}
