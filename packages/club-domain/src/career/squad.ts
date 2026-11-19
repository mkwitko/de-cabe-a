/**
 * The squad and the eleven the person picks (03 §2, 02 §8.1). The line-up is a formation and one
 * player per role of it, in the formation's slot order. Until the person picks one, the coach's
 * own choice stands (match/lineup.ts), so nothing changes for a career that never opens this.
 * The eleven counts in both kinds of match: the engine gets these players in these roles, and
 * the level 3 result reads the club's strength from them. The team instructions count in the
 * engine match only: the level 3 result has no tactics. A starter out of his position is worth
 * less in both: a lower slot rating here, and less familiarity with the plan in the engine.
 */
import { FORMATIONS, defaultPlan, type RoleId, type TeamInput } from '@decabeca/match-engine';
import { formationOf } from '../match/fixture-input';
import { teamForMatch } from '../match/lineup';
import type { PackPlayer } from '../pack/schema';
import { bestRoles, roleRating } from '../player/ratings';
import type { CareerWorld } from './advance';
import { cached } from '../lib/pack-cache';

export interface Lineup {
  formation: string;
  /** Player ids; `xi[i]` plays `FORMATIONS[formation].roles[i]`. */
  xi: string[];
  /** The team instructions the person set before the match; the formation's default otherwise. */
  plan?: PlanChoice;
}

/** The five team instructions the person sets (02 §8.2), each 1..5 but the block. */
export interface PlanChoice {
  block: 'low' | 'mid' | 'high';
  pressIntensity: number;
  tempo: number;
  width: number;
  risk: number;
}
const LEVELS = ['pressIntensity', 'tempo', 'width', 'risk'] as const;

/** The plan in force: the person's, or the default every club plays with. */
export function planOf(w: CareerWorld): PlanChoice {
  const t = defaultPlan(lineupOf(w).formation).team;
  return (
    w.lineup?.plan ?? {
      block: t.block,
      pressIntensity: t.pressIntensity,
      tempo: t.tempo,
      width: t.width,
      risk: t.risk,
    }
  );
}

export interface SquadPlayer {
  id: string;
  name: string;
  age: number;
  /** Natural positions first. */
  positions: string[];
  best: { role: RoleId; rating: number };
}

type Position = PackPlayer['positions'][number]['position'];

const isKeeper = (p: PackPlayer) => p.positions.some((x) => x.position === 'GK');
const isKeeperRole = (r: RoleId) => r === 'goalkeeper' || r === 'sweeperKeeper';
/** A club in a pack: all the line-up rules need. A career world is one. */
export type ClubIn = Pick<CareerWorld, 'pack' | 'clubId' | 'academy'>;

/** Everyone under contract with the club, by id: read once per club (lib/pack-cache.ts). */
const everyone = (w: ClubIn): PackPlayer[] =>
  cached(w.pack, 'squad', w.clubId, () => {
    // One pass over the pack fills every club still missing its squad: one filter per club
    // would cost clubs × players on a new pack (829 × 15,700 in the real one).
    const by = new Map<string, PackPlayer[]>();
    for (const p of w.pack.players)
      if (p.clubId) {
        let l = by.get(p.clubId);
        if (!l) by.set(p.clubId, (l = []));
        l.push(p);
      }
    const sorted = (l: PackPlayer[]) => l.sort((x, y) => (x.id < y.id ? -1 : 1));
    for (const [id, l] of by) if (id !== w.clubId) cached(w.pack, 'squad', id, () => sorted(l));
    return sorted(by.get(w.clubId) ?? []);
  });
/** The first team: the club's players less the boys still in the person's academy. */
const squad = (w: ClubIn): PackPlayer[] =>
  w.academy?.length ? everyone(w).filter((p) => !w.academy!.includes(p.id)) : everyone(w);
/** The boys of the person's academy: under contract, not yet in the first team. */
export const academyPlayers = (w: ClubIn): readonly PackPlayer[] =>
  w.academy?.length ? everyone(w).filter((p) => w.academy!.includes(p.id)) : [];

/** Brings a boy up to the first team, for good: from now he can be picked. */
export function promote(w: CareerWorld, id: string): void {
  if (!w.academy?.includes(id)) throw new Error('academy: not there');
  w.academy = w.academy.filter((x) => x !== id);
}
/** The squad as a list anyone may read. */
export const squadPlayers = (w: ClubIn): readonly PackPlayer[] => squad(w);

/** Whole years on 1 January of the season: the same all season long. */
const ageOf = (p: PackPlayer, season: number) => season - Number(p.birthDate.slice(0, 4));

export function squadOf(w: CareerWorld, of: readonly PackPlayer[] = squad(w)): SquadPlayer[] {
  return of.map((p) => ({
    id: p.id,
    name: p.knownAs ?? p.name,
    age: ageOf(p, w.season.season),
    positions: [...p.positions].sort((a, b) => b.level - a.level).map((x) => x.position),
    best: bestRoles(p.attributes, 1)[0]!,
  }));
}

/** The line-up in force: the person's, or the coach's best for the club's usual formation. */
export const lineupOf = (w: CareerWorld): Lineup =>
  w.lineup ?? bestLineup(w, formationOf(w.clubId), undefined, foreignLimit(w.season.season));

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
  const plan = l.plan;
  if (
    plan &&
    (!['low', 'mid', 'high'].includes(plan.block) ||
      LEVELS.some((k) => !Number.isInteger(plan[k]) || plan[k] < 1 || plan[k] > 5))
  )
    throw new Error('lineup: plan out of range');
  w.lineup = {
    formation: l.formation,
    xi: [...l.xi],
    ...(plan && {
      plan: {
        block: plan.block,
        pressIntensity: plan.pressIntensity,
        tempo: plan.tempo,
        width: plan.width,
        risk: plan.risk,
      },
    }),
  };
}

/**
 * The positions that count as "his position" in each slot: from the slot's role and the side of
 * the pitch it stands on (low y is the team's right, FORMATIONS).
 */
const slotPositionsBy = new Map<string, Position[][]>();
export function slotPositions(formation: string): Position[][] {
  let known = slotPositionsBy.get(formation);
  if (!known) slotPositionsBy.set(formation, (known = readSlotPositions(formation)));
  return known;
}

function readSlotPositions(formation: string): Position[][] {
  const f = FORMATIONS[formation]!;
  return f.roles.map((role, i) => {
    const { x, y } = f.inPossession[i]!;
    const side = <T>(right: T[], left: T[]) =>
      y < 30 ? right : y > 38 ? left : [...right, ...left];
    switch (role) {
      case 'goalkeeper':
      case 'sweeperKeeper':
        return ['GK'];
      case 'centreBack':
      case 'libero':
        return ['CB'];
      case 'supportFullBack':
      case 'invertedFullBack':
      case 'wingBack':
        return side<Position>(['RB'], ['LB']);
      case 'anchor':
      case 'deepPlaymaker':
        return ['DM'];
      case 'boxToBox':
        return ['CM'];
      case 'playmaker':
        return x >= 60 ? ['AM', 'CM'] : ['CM', 'AM'];
      case 'wideWinger':
      case 'insideForward':
        return side<Position>(['RW', 'RM'], ['LW', 'LM']);
      default:
        return ['ST', 'SS'];
    }
  });
}

/** PARÂMETRO: what is left of a player's rating by how well he knows the position (0..3). */
const POSITION_FACTOR = [0.75, 0.85, 0.93, 1] as const;
/** PARÂMETRO: his familiarity with the plan in the engine match, same levels. */
const POSITION_FAMILIARITY = [0.6, 0.75, 0.9, 1] as const;

const levelIn = (p: PackPlayer, positions: Position[]) =>
  Math.max(0, ...p.positions.filter((x) => positions.includes(x.position)).map((x) => x.level));

/**
 * What one player gives one slot of a formation, 1..99: his attributes in the role, less when
 * the position is not his. The same number `slotRatings` gives a squad player.
 */
export function slotRating(p: PackPlayer, formation: string, slot: number): number {
  const role = FORMATIONS[formation]!.roles[slot]!;
  const level = levelIn(p, slotPositions(formation)[slot]!);
  return Math.round(roleRating(p.attributes, role) * POSITION_FACTOR[level]!);
}

/** How well each squad player knows each slot's position: 3 natural … 0 not his. By player id. */
export function slotLevels(w: ClubIn, formation: string): Map<string, number[]> {
  const slots = slotPositions(formation);
  return new Map(squad(w).map((p) => [p.id, slots.map((ps) => levelIn(p, ps))]));
}

/**
 * How each squad player would do in each slot of the formation, 1..99, by player id: what his
 * attributes give the role, less when the position is not his.
 */
export function slotRatings(w: ClubIn, formation: string): Map<string, number[]> {
  const roles = FORMATIONS[formation]!.roles;
  const slots = slotPositions(formation);
  return new Map(
    squad(w).map((p) => [
      p.id,
      roles.map((r, i) =>
        Math.round(roleRating(p.attributes, r) * POSITION_FACTOR[levelIn(p, slots[i]!)]!),
      ),
    ]),
  );
}

/** Each starter's familiarity for the engine match: lower out of position. */
export function slotFamiliarity(w: ClubIn, l: Lineup): number[] {
  const levels = slotLevels(w, l.formation);
  return l.xi.map((id, i) => POSITION_FAMILIARITY[levels.get(id)![i]!]!);
}

/**
 * The best eleven for a formation counting positions: slot by slot in the formation's order, the
 * free player with the highest slot rating (ties by id). What "the coach's eleven" offers.
 */
/**
 * Foreigners a club may name for a match (CBF, Regulamento Geral de Competições): nine until
 * 2026; eight in 2027, one fewer a year down to five from 2030 (CBF and the clubs, Sep 2026).
 * More than that can never start, so the eleven is held to it.
 */
export const foreignLimit = (season: number) =>
  season <= 2026 ? 9 : Math.max(5, 8 - (season - 2027));
/** Foreign in a matchday squad: neither his nationality nor a second one is Brazilian. */
export const isForeign = (p: { nationality: string; secondNationality?: string | undefined }) =>
  p.nationality !== 'BR' && p.secondNationality !== 'BR';

export function bestLineup(
  w: ClubIn,
  formation: string,
  /** Players who cannot be picked (the injured). */
  out?: ReadonlySet<string>,
  /** Foreigners the eleven may hold (`foreignLimit`). */
  foreigners = Infinity,
): Lineup {
  const f = FORMATIONS[formation];
  if (!f) throw new Error(`lineup: unknown formation ${formation}`);
  const fit = slotRatings(w, formation);
  const left = out ? squad(w).filter((p) => !out.has(p.id)) : [...squad(w)];
  let abroad = 0;
  const xi = f.roles.map((role, i) => {
    // A short squad fields whoever is left: a keeper plays out of goal, or an outfield player
    // in it, rather than the club not turning up; past the limit of foreigners, a Brazilian.
    let at = -1;
    for (const strict of [true, false]) {
      for (const [k, p] of left.entries())
        if (
          (!strict ||
            (isKeeper(p) === isKeeperRole(role) && (abroad < foreigners || !isForeign(p)))) &&
          (at < 0 || fit.get(p.id)![i]! > fit.get(left[at]!.id)![i]!)
        )
          at = k;
      if (at >= 0) break;
    }
    if (at < 0) throw new Error(`lineup: no player for ${role}`);
    const p = left.splice(at, 1)[0]!;
    if (isForeign(p)) abroad++;
    return p.id;
  });
  return { formation, xi };
}

/**
 * The club's strength for a level 3 result with this eleven, on the scale of `clubStrength`
 * (mean of sixteen): the eleven in their slots and the five best of the rest. PARÂMETRO.
 */
export function lineupStrength(w: ClubIn, l: Lineup): number {
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

/**
 * A club's team for the engine: this eleven in these roles, the plan's instructions, each
 * starter's stamina from his freshness, and his familiarity from the team's drill and his
 * position (training.ts). Every club goes through here, the person's or not.
 */
export function teamWith(
  c: ClubIn,
  l: Lineup,
  state: { fresh: (id: string) => number; familiarity: number; morale?: number },
): TeamInput {
  const plan = defaultPlan(l.formation);
  if (l.plan) plan.team = { ...plan.team, ...l.plan };
  const team = teamForMatch(c.pack, c.clubId, plan, l.xi);
  const known = slotFamiliarity(c, l);
  return {
    ...team,
    players: team.players.map((p, i) => ({
      ...p,
      condition: state.fresh(p.id),
      ...(state.morale !== undefined && { morale: state.morale }),
      ...(i < 11 && { familiarity: known[i]! * state.familiarity }),
    })),
  };
}
