/**
 * The life of a contract (07 §2, §6). At the season's end the contracts that ran out are dealt
 * with: a club renews the players its plan uses and can pay, and lets the others go as free
 * agents; the person renews theirs at the player's table during the season, and those left
 * unsigned walk too. Free agents cost no fee and sign in any round. A squad is never left
 * without the players a match needs: the last ones stay a year on the going wage.
 * Integers; every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { RELEASED, applyMoves, movePlayer, type Moves } from '../career/market';
import { squadPlayers } from '../career/squad';
import type { PackPlayer } from '../pack/schema';
import { strikesOf, wageRoom } from './books';
import { CLAUSE_TIMES, type Terms } from './deals';
import { squadPlanOf } from './plan';
import { ageOf, goingWage, marketValue, readingsOf } from './value';

/** A squad never ends a season's turn under this, nor with fewer keepers than this. */
const KEEP = 22;
const KEEP_KEEPERS = 2;
/** He renews without a raise when his wage is at least this share of what he asked. */
const FLAT = 85;

/** True when his contract ends with this season. */
export const ends = (p: PackPlayer, season: number) =>
  p.contract !== undefined && Number(p.contract.until.slice(0, 4)) <= season;

const yearsFor = (age: number) => (age <= 24 ? 4 : age <= 29 ? 3 : age <= 32 ? 2 : 1);

/**
 * What he asks to stay: the going wage for his level or his own, whichever is more, plus half
 * his ambition in percent; years by his age; the role the plan has for him.
 */
export function renewalTerms(w: CareerWorld, p: PackPlayer): Terms {
  const season = w.season.season;
  const plan = squadPlanOf({ pack: w.pack, clubId: p.clubId! });
  const level = readingsOf(w.pack).get(p.id)!.level;
  const base = Math.max(p.contract?.wage ?? 0, goingWage(w.pack, level));
  return {
    wage: Math.round((base * (100 + Math.round(p.personality.ambition / 2))) / 100),
    years: yearsFor(ageOf(p, season)),
    role: plan.xi.includes(p.id) ? 'starter' : plan.cover.includes(p.id) ? 'rotation' : 'backup',
  };
}

/** Signs a renewal: the same club, a new wage and end. */
export function renew(w: CareerWorld, p: PackPlayer, terms: Terms): void {
  movePlayer(w, p, p.clubId!, {
    wage: terms.wage,
    until: `${w.season.season + terms.years}-12-31`,
    // A club writes its usual clause; the person writes the one they agreed, or none.
    release:
      terms.release !== undefined
        ? terms.release
        : marketValue(w.pack, p, w.season.season) * CLAUSE_TIMES,
  });
}

export interface Expiry {
  renewed: number;
  released: number;
  /** The person's players who left, by name. */
  left: string[];
  /** The person's players kept a year so the squad can still play, by name. */
  kept: string[];
}

/**
 * Runs the contracts that end with the season, club by club in the pack's order. Called at the
 * season's turn, before the new season is built.
 */
export function expireContracts(w: CareerWorld): Expiry {
  const season = w.season.season;
  const out: Expiry = { renewed: 0, released: 0, left: [], kept: [] };
  const read = readingsOf(w.pack);
  for (const club of w.pack.clubs) {
    const c = { pack: w.pack, clubId: club.id };
    const ending = squadPlayers(c).filter((p) => ends(p, season));
    if (ending.length === 0) continue;
    const mine = club.id === w.clubId;
    const plan = squadPlanOf(c);
    // Those the plan uses first, the best first: they are the ones worth keeping.
    const ranked = [...ending].sort((a, b) => {
      const use = (p: PackPlayer) =>
        plan.xi.includes(p.id) ? 2 : plan.cover.includes(p.id) ? 1 : 0;
      return (
        use(b) - use(a) || read.get(b.id)!.level - read.get(a.id)!.level || (a.id < b.id ? -1 : 1)
      );
    });
    // Decided player by player against the squad as it shrinks, applied to the club at once.
    const changes: Moves = {};
    let size = squadPlayers(c).length;
    let keepers = squadPlayers(c).filter((x) => read.get(x.id)!.keeper).length;
    let room = mine ? 0 : wageRoom(w, club.id);
    const over = strikesOf(w, club.id) > 0;
    for (const p of ranked) {
      const keeper = read.get(p.id)!.keeper;
      const needed = size <= KEEP || (keeper && keepers <= KEEP_KEEPERS);
      const terms = renewalTerms(w, p);
      const used = plan.xi.includes(p.id) || plan.cover.includes(p.id);
      const raise = terms.wage - (p.contract?.wage ?? 0);
      // A rival club renews who its plan uses, is not past it, and fits the wage room.
      const keeps = !mine && used && ageOf(p, season) <= 34;
      const wants = keeps && raise <= room;
      // No room for the raise: he stays on what he earns when that is close to what he asked;
      // a bigger gap and he walks. A club over the fair play limit lets him go: it has to cut.
      const flat = keeps && !wants && !over && (p.contract?.wage ?? 0) * 100 >= terms.wage * FLAT;
      if (wants || flat || needed) {
        // Kept because the squad cannot lose him: one more year, no raise asked.
        const signed = wants
          ? terms
          : {
              ...terms,
              wage: Math.max(p.contract?.wage ?? 0, terms.wage - raise),
              years: flat ? terms.years : 1,
            };
        changes[p.id] = {
          clubId: club.id,
          wage: signed.wage,
          until: `${season + signed.years}-12-31`,
          release: marketValue(w.pack, p, season) * CLAUSE_TIMES,
        };
        if (wants) room -= raise;
        out.renewed++;
        if (!wants && !flat && mine) out.kept.push(p.knownAs ?? p.name);
      } else {
        changes[p.id] = RELEASED;
        size--;
        if (keeper) keepers--;
        out.released++;
        if (mine) out.left.push(p.knownAs ?? p.name);
      }
    }
    applyMoves(w, changes);
  }
  for (const player of out.left) note(w, { day: w.day, kind: 'contractEnded', player });
  for (const player of out.kept) note(w, { day: w.day, kind: 'contractKept', player });
  return out;
}

/** The person's players whose contract ends with this season, by id. */
export const endingSoon = (w: CareerWorld): string[] =>
  squadPlayers({ pack: w.pack, clubId: w.clubId })
    .filter((p) => ends(p, w.season.season) && !w.loans?.[p.id])
    .map((p) => p.id);
