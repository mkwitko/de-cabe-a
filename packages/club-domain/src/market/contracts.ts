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
import { movePlayer, releasePlayer } from '../career/market';
import { squadPlayers } from '../career/squad';
import type { PackPlayer } from '../pack/schema';
import { wageRoom } from './books';
import type { Terms } from './deals';
import { squadPlanOf } from './plan';
import { ageOf, goingWage, readingsOf } from './value';

/** A squad never ends a season's turn under this, nor with fewer keepers than this. */
const KEEP = 22;
const KEEP_KEEPERS = 2;

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
    for (const p of ranked) {
      const now = squadPlayers({ pack: w.pack, clubId: club.id });
      const keepers = now.filter((x) => read.get(x.id)!.keeper).length;
      const needed = now.length <= KEEP || (read.get(p.id)!.keeper && keepers <= KEEP_KEEPERS);
      const terms = renewalTerms(w, p);
      const used = plan.xi.includes(p.id) || plan.cover.includes(p.id);
      const raise = terms.wage - (p.contract?.wage ?? 0);
      // A rival club renews who its plan uses, is not past it, and fits the wage room.
      const wants = !mine && used && ageOf(p, season) <= 34 && raise <= wageRoom(w, club.id);
      if (wants) {
        renew(w, p, terms);
        out.renewed++;
      } else if (needed) {
        // The squad cannot lose him: one more year on the going wage, no raise asked.
        renew(w, p, {
          ...terms,
          wage: Math.max(p.contract?.wage ?? 0, terms.wage - raise),
          years: 1,
        });
        out.renewed++;
        if (mine) out.kept.push(p.knownAs ?? p.name);
      } else {
        releasePlayer(w, p);
        out.released++;
        if (mine) out.left.push(p.knownAs ?? p.name);
      }
    }
  }
  for (const player of out.left) note(w, { day: w.day, kind: 'contractEnded', player });
  for (const player of out.kept) note(w, { day: w.day, kind: 'contractKept', player });
  return out;
}

/** The person's players whose contract ends with this season, by id. */
export const endingSoon = (w: CareerWorld): string[] =>
  squadPlayers({ pack: w.pack, clubId: w.clubId })
    .filter((p) => ends(p, w.season.season))
    .map((p) => p.id);
