/**
 * The squad and the eleven the person picks (03 §2, 02 §8.1). The line-up is a formation and one
 * player per role of it, in the formation's slot order. Until the person picks one, the coach's
 * own choice stands (match/lineup.ts), so nothing changes for a career that never opens this.
 * The eleven counts in both kinds of match: the engine gets these players in these roles, and
 * the level 3 result reads the club's strength from them.
 */
import { FORMATIONS, defaultPlan, type RoleId } from '@decabeca/match-engine';
import { formationOf } from '../match/fixture-input';
import { teamForMatch } from '../match/lineup';
import type { PackPlayer } from '../pack/schema';
import { bestRoles, roleRating } from '../player/ratings';
import type { CareerWorld } from './advance';

export interface Lineup {
  formation: string;
  /** Player ids; `xi[i]` plays `FORMATIONS[formation].roles[i]`. */
  xi: string[];
}

export interface SquadPlayer {
  id: string;
  name: string;
  age: number;
  /** Natural positions first. */
  positions: string[];
  best: { role: RoleId; rating: number };
}

const isKeeper = (p: PackPlayer) => p.positions.some((x) => x.position === 'GK');
const isKeeperRole = (r: RoleId) => r === 'goalkeeper' || r === 'sweeperKeeper';
const squad = (w: CareerWorld) =>
  w.pack.players.filter((p) => p.clubId === w.clubId).sort((a, b) => (a.id < b.id ? -1 : 1));

/** Whole years on 1 January of the season: the same all season long. */
const ageOf = (p: PackPlayer, season: number) => season - Number(p.birthDate.slice(0, 4));

export function squadOf(w: CareerWorld): SquadPlayer[] {
  return squad(w).map((p) => ({
    id: p.id,
    name: p.knownAs ?? p.name,
    age: ageOf(p, w.season.season),
    positions: [...p.positions].sort((a, b) => b.level - a.level).map((x) => x.position),
    best: bestRoles(p.attributes, 1)[0]!,
  }));
}

/** The eleven the coach would pick for this formation. */
export function suggestedLineup(w: CareerWorld, formation: string): Lineup {
  if (!FORMATIONS[formation]) throw new Error(`lineup: unknown formation ${formation}`);
  const team = teamForMatch(w.pack, w.clubId, defaultPlan(formation));
  return { formation, xi: team.players.slice(0, 11).map((p) => p.id) };
}

/** The line-up in force: the person's, or the coach's for the club's usual formation. */
export const lineupOf = (w: CareerWorld): Lineup =>
  w.lineup ?? suggestedLineup(w, formationOf(w.clubId));

/**
 * Takes the person's line-up. Eleven different players of the club, and a keeper in goal and
 * nowhere else: the match engine has no outfield keeper.
 */
export function setLineup(w: CareerWorld, l: Lineup): void {
  const f = FORMATIONS[l.formation];
  if (!f) throw new Error(`lineup: unknown formation ${l.formation}`);
  const byId = new Map(squad(w).map((p) => [p.id, p]));
  if (l.xi.length !== f.roles.length || new Set(l.xi).size !== l.xi.length)
    throw new Error('lineup: eleven different players');
  for (const [i, id] of l.xi.entries()) {
    const p = byId.get(id);
    if (!p) throw new Error(`lineup: ${id} is not in the squad`);
    if (isKeeper(p) !== isKeeperRole(f.roles[i]!)) throw new Error('lineup: keeper out of goal');
  }
  w.lineup = { formation: l.formation, xi: [...l.xi] };
}

/** How each squad player would do in each slot of the formation, 1..99, by player id. */
export function slotRatings(w: CareerWorld, formation: string): Map<string, number[]> {
  const roles = FORMATIONS[formation]!.roles;
  return new Map(squad(w).map((p) => [p.id, roles.map((r) => roleRating(p.attributes, r))]));
}

/**
 * The club's strength for a level 3 result with this eleven, on the scale of `clubStrength`
 * (mean of sixteen): the eleven in their roles and the five best of the rest. PARÂMETRO.
 */
export function lineupStrength(w: CareerWorld, l: Lineup): number {
  const fit = slotRatings(w, l.formation);
  const eleven = l.xi.reduce((s, id, i) => s + fit.get(id)![i]!, 0);
  const rest = squad(w)
    .filter((p) => !l.xi.includes(p.id))
    .map((p) => bestRoles(p.attributes, 1)[0]!.rating)
    .sort((a, b) => b - a)
    .slice(0, 5)
    .reduce((a, b) => a + b, 0);
  return (eleven + rest) / 16;
}
