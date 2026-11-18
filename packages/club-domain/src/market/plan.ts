/**
 * A club's squad plan (04 §8.1): for its usual formation, who starts in each slot, who covers
 * it, where the eleven is weak, where there is no cover, and who is left over. This is the
 * "need" every buying and selling decision of a club starts from. Pure reading of the pack.
 */
import { FORMATIONS } from '@decabeca/match-engine';
import {
  bestLineup,
  slotLevels,
  slotPositions,
  slotRating,
  slotRatings,
  squadPlayers,
  type ClubIn,
} from '../career/squad';
import { cached } from '../lib/pack-cache';
import { formationOf } from '../match/fixture-input';
import type { PackPlayer } from '../pack/schema';
import { levelError } from './judgement';
import { readingsOf } from './value';

export interface Need {
  /** Slot of the formation. */
  slot: number;
  /** Positions that fit it. */
  positions: string[];
  keeper: boolean;
  /** `starter`: the eleven is weak there. `cover`: nobody fit to step in. */
  kind: 'starter' | 'cover';
  /** The slot rating a signing must reach to be worth it. */
  wanted: number;
  /** 1..100: how much it hurts. */
  urgency: number;
  /** Points a signing must be worth for it; absent: the market's usual bar (rounds.ts). */
  worth?: number;
}

export interface SquadPlan {
  formation: string;
  /** Mean slot rating of the eleven: the club's level on the pitch. */
  level: number;
  xi: string[];
  /** The best player outside the eleven for each slot, or null. */
  cover: (string | null)[];
  needs: Need[];
  /**
   * The weakest slot of the eleven as a chance to improve on, not a hole: a signing over the
   * team's level there. Null for a club without an eleven.
   */
  upgrade: Need | null;
  /** Players the plan has no use for, least useful first. */
  surplus: string[];
}

/** Below the eleven's level by this much, a starter is a weak link. */
const WEAK_LINK = 4;
/** An upgrade must beat the eleven's level by this much: a clear step up, not a sideways move. */
const UPGRADE = 3;
/** How much an upgrade weighs against real needs (urgency 1..100). */
const UPGRADE_URGENCY = 60;
/**
 * The bar an upgrade must clear: what he brings worth more than what he costs. Lower than a
 * hole's bar, which also pays for the hurry: a club with money spends it on getting better.
 */
const UPGRADE_WORTH = 6;
/** Cover must be within this of the eleven's level, and know the position. */
const COVER_GAP = 9;
/** Squad size a club is comfortable with. */
export const COMFORT = 24;

export const squadPlanOf = (c: ClubIn): SquadPlan =>
  cached(c.pack, 'plan', c.clubId, () => plan(c));

function plan(c: ClubIn): SquadPlan {
  const formation = formationOf(c.clubId);
  const roles = FORMATIONS[formation]!.roles;
  const positions = slotPositions(formation);
  // A club with fewer than eleven (a foreign club holding a few of the pack's players, never in
  // a competition here) has no eleven to plan around: all of them start, it seeks nobody.
  const few = squadPlayers(c);
  if (few.length < roles.length) {
    const read = readingsOf(c.pack);
    const level = few.length
      ? Math.round(few.reduce((s, p) => s + read.get(p.id)!.level, 0) / few.length)
      : 0;
    const xi = few.map((p) => p.id);
    return {
      formation,
      level,
      xi,
      cover: roles.map(() => null),
      needs: [],
      upgrade: null,
      surplus: [],
    };
  }
  const fit = slotRatings(c, formation);
  const known = slotLevels(c, formation);
  const xi = bestLineup(c, formation).xi;
  // The eleven is the coach's, on the pitch. What follows is the director's reading of it: each
  // rating as the club's football office sees it (judgement.ts), right or wrong.
  const squad = squadPlayers(c);
  const offBy = new Map(squad.map((p) => [p.id, levelError(c.pack, c.clubId, p)]));
  const seen = (id: string, slot: number) => fit.get(id)![slot]! + offBy.get(id)!;
  const level = Math.round(xi.reduce((s, id, i) => s + seen(id, i), 0) / xi.length);
  const read = readingsOf(c.pack);
  const out = squad.filter((p) => !xi.includes(p.id));

  // One reserve covers one slot: the best free reserve who knows the position, slot by slot.
  const free = new Set(out.map((p) => p.id));
  const cover = roles.map((role, i) => {
    const keeper = role === 'goalkeeper' || role === 'sweeperKeeper';
    let best: string | null = null;
    for (const p of out) {
      if (!free.has(p.id) || read.get(p.id)!.keeper !== keeper) continue;
      if (known.get(p.id)![i]! < 2) continue;
      if (!best || seen(p.id, i) > seen(best, i)) best = p.id;
    }
    if (best) free.delete(best);
    return best;
  });

  const needs: Need[] = [];
  for (const [i, role] of roles.entries()) {
    const keeper = role === 'goalkeeper' || role === 'sweeperKeeper';
    const starter = seen(xi[i]!, i);
    const base = { slot: i, positions: positions[i]!, keeper };
    if (starter < level - WEAK_LINK)
      needs.push({
        ...base,
        kind: 'starter',
        wanted: level,
        urgency: Math.min(100, 40 + (level - starter) * 6),
      });
    const back = cover[i] ? seen(cover[i]!, i) : 0;
    if (back < level - COVER_GAP)
      needs.push({
        ...base,
        kind: 'cover',
        wanted: level - COVER_GAP,
        urgency: Math.min(100, (keeper ? 55 : 25) + (cover[i] ? 0 : 20)),
      });
  }
  needs.sort((a, b) => b.urgency - a.urgency || a.slot - b.slot);
  let weakest = 0;
  for (let i = 1; i < roles.length; i++) if (seen(xi[i]!, i) < seen(xi[weakest]!, i)) weakest = i;
  const upgrade: Need = {
    slot: weakest,
    positions: positions[weakest]!,
    keeper: roles[weakest] === 'goalkeeper' || roles[weakest] === 'sweeperKeeper',
    kind: 'starter',
    wanted: level + UPGRADE,
    urgency: UPGRADE_URGENCY,
    worth: UPGRADE_WORTH,
  };

  // Left over: neither starting nor the cover of any slot; the weakest go first.
  const used = new Set([...xi, ...cover.filter((x): x is string => x !== null)]);
  const surplus = squad
    .filter((p) => !used.has(p.id))
    .sort(
      (a, b) =>
        read.get(a.id)!.level + offBy.get(a.id)! - (read.get(b.id)!.level + offBy.get(b.id)!) ||
        (a.id < b.id ? -1 : 1),
    )
    .map((p) => p.id);

  return { formation, level, xi, cover, needs, upgrade, surplus };
}

/** The slot rating a player would give this club in the slot of a need. */
export const fitFor = (c: ClubIn, p: PackPlayer, need: Need): number =>
  slotRating(p, formationOf(c.clubId), need.slot);
