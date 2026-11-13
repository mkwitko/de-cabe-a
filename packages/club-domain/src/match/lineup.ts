/**
 * From a pack club to the engine's team input (corte 0,5 friendly match): the
 * coach picks the eleven that fit the plan's roles best, then a bench of seven
 * with a keeper. Greedy by role rating, deterministic (ties by player id).
 */
import type { PlayerInput, TacticalPlan, TeamInput } from '@decabeca/match-engine';
import type { Pack, PackPlayer } from '../pack/schema';
import { roleRating } from '../player/ratings';

const toInput = (p: PackPlayer): PlayerInput => ({
  id: p.id,
  attributes: p.attributes,
  hidden: {
    consistency: p.hidden.consistency,
    bigMatches: p.hidden.bigMatches,
    injuryProneness: p.hidden.injuryProneness,
  },
  traits: p.traits,
  positions: Object.fromEntries(p.positions.map((x) => [x.position, x.level])),
  preferredFoot: p.foot,
  heightCm: p.heightCm ?? 180,
  condition: 1,
  morale: 0.7,
  familiarity: 1,
});

export function teamForMatch(pack: Pack, clubId: string, plan: TacticalPlan): TeamInput {
  const squad = pack.players
    .filter((p) => p.clubId === clubId)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (squad.length < 18) throw new Error(`club ${clubId} has ${squad.length} players`);
  const left = new Set(squad.map((p) => p.id));
  const xi: PackPlayer[] = [];
  // Slots in plan order; the keeper slot first so nobody else is spent there.
  for (const role of plan.roles) {
    let best: PackPlayer | null = null;
    let score = -Infinity;
    for (const p of squad) {
      if (!left.has(p.id)) continue;
      const keeper = p.positions.some((x) => x.position === 'GK');
      if ((role === 'goalkeeper' || role === 'sweeperKeeper') !== keeper) continue;
      const r = roleRating(p.attributes, role);
      if (r > score) {
        score = r;
        best = p;
      }
    }
    if (!best) throw new Error(`no player for ${role}`);
    left.delete(best.id);
    xi.push(best);
  }
  const rest = squad.filter((p) => left.has(p.id));
  const keeper = rest.find((p) => p.positions.some((x) => x.position === 'GK'));
  const outfield = rest
    .filter((p) => p !== keeper)
    .sort((a, b) => Math.max(...bestOf(b)) - Math.max(...bestOf(a)) || (a.id < b.id ? -1 : 1))
    .slice(0, keeper ? 6 : 7);
  const bench = keeper ? [keeper, ...outfield] : outfield;
  return {
    players: [...xi, ...bench].map(toInput),
    plan,
    coach: { gameReading: 60, flexibility: 60 },
  };
}

const bestOf = (p: PackPlayer) =>
  (['centreBack', 'boxToBox', 'advancedForward', 'wideWinger'] as const).map((r) =>
    roleRating(p.attributes, r),
  );
