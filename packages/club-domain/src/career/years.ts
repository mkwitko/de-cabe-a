/**
 * The career's pack through the years: the pack it opened with, a year for each finished
 * season (development.ts), then every move still in force. The world that never stopped walks
 * this one season at a time; a loaded one walks it all at once from the log, and the two arrive
 * at the same players.
 */
import { WHOLE, carryCache, recache } from '../lib/pack-cache';
import { goingWages } from '../market/value';
import type { Pack } from '../pack/schema';
import { evolve, type SeasonLog } from './development';
import { withMoves, type Moves } from './market';
import { PRICE_BASE, priced } from './prices';

/** The opening pack's going wages brought to the market's wage index. */
const wagesAt = (origin: Pack, index = PRICE_BASE) =>
  goingWages(origin).map((x) => priced(x, index));

/**
 * The pack for the season after `log.season`. The readings of the old pack are not carried:
 * every level changed. The going wage by level stays the one of the pack the career opened
 * with, the market's yardstick, brought to the year's wage index (prices.ts).
 */
export function yearOn(pack: Pack, origin: Pack, seed: number, log: SeasonLog): Pack {
  const next = evolve(pack, origin, seed, log);
  recache(next, 'goingWages', WHOLE, wagesAt(origin, log.wages));
  return next;
}

/** The season each player joined the club he is at, from the moves in force. */
export function arrivalsOf(moves: Moves): [string, number][] {
  const at: [string, number][] = [];
  for (const [id, m] of Object.entries(moves)) {
    const joined = m.joined ?? m.season;
    if (m.clubId && joined !== undefined) at.push([id, joined]);
  }
  return at;
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
  for (const log of logs) pack = yearOn(pack, origin, seed, log);
  const moved = withMoves(pack, moves);
  if (moved !== pack) recache(moved, 'goingWages', WHOLE, goingWages(pack));
  return moved;
}
