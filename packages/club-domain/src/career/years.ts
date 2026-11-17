/**
 * The career's pack through the years: the pack it opened with, each finished season's moves
 * and the year that followed (development.ts), then the current season's moves. The world
 * that never stopped walks this one season at a time; a loaded one walks it all at once from
 * the log, and the two arrive at the same players.
 */
import { WHOLE, carryCache, recache } from '../lib/pack-cache';
import { goingWages } from '../market/value';
import type { Pack } from '../pack/schema';
import { evolve, type SeasonLog } from './development';
import { withMoves, type Moves } from './market';

/**
 * The pack for the season after `log.season`. The readings of the old pack are not carried:
 * every level changed. The going wage by level stays the one of the pack the career opened
 * with, the market's fixed yardstick.
 */
export function yearOn(pack: Pack, origin: Pack, seed: number, log: SeasonLog): Pack {
  const next = evolve(pack, origin, seed, log);
  recache(next, 'goingWages', WHOLE, goingWages(origin));
  return next;
}

/** When each player last joined a club, from the log and the current season's moves. */
export function arrivalsOf(logs: readonly SeasonLog[], moves: Moves): [string, number][] {
  const at = new Map<string, number>();
  for (const log of logs)
    for (const [id, m] of Object.entries(log.moves))
      if (m.clubId) at.set(id, m.season ?? log.season);
  for (const [id, m] of Object.entries(moves))
    if (m.clubId && m.season !== undefined) at.set(id, m.season);
  return [...at];
}

/** The career's own pack object as it stands: every finished season replayed, then `moves`. */
export function rebuildPack(
  origin: Pack,
  seed: number,
  logs: readonly SeasonLog[],
  moves: Moves,
): Pack {
  let pack: Pack = { ...origin };
  goingWages(origin);
  if (logs.length === 0) {
    const moved = withMoves(pack, moves);
    // Nothing evolved yet: the readings of the opening pack still hold, squads apart.
    carryCache(origin, moved, moved === pack ? [] : origin.clubs.map((c) => c.id));
    return moved;
  }
  for (const log of logs) pack = yearOn(withMoves(pack, log.moves), origin, seed, log);
  const moved = withMoves(pack, moves);
  if (moved !== pack) recache(moved, 'goingWages', WHOLE, goingWages(origin));
  return moved;
}
