/**
 * The person's academy on day one. A club comes with its youth teams (FM's under-20 and under-17
 * slots, `pack.youth`); where the data has fewer than a dozen boys, yearly crops of the club's
 * own academy make up the rest (development.ts `crop`), as if it had brought boys in over the
 * last years. Only the person's club takes them in: the other clubs' boys stay out of the world, so the
 * league plays as it did.
 */
import type { Pack, PackPlayer } from '../pack/schema';
import { carryCache } from '../lib/pack-cache';
import { crop } from './development';

/** Boys an academy aims at on day one; a thin youth team is topped up by up to three crops. */
const MIN_BOYS = 12;

/** The club's boys: its real youth teams, topped up by crops of its academy (up to three). */
export function academyOf(pack: Pack, seed: number, clubId: string): PackPlayer[] {
  const boys = (pack.youth ?? []).filter((y) => y.player.clubId === clubId).map((y) => y.player);
  for (let k = 0; k < 3 && boys.length < MIN_BOYS; k++)
    boys.push(...crop(pack, clubId, seed, pack.season - k));
  return boys;
}

/**
 * The pack this career plays with: `base` and the club's boys after its players, so every
 * player's place in `base` is kept (the saved moves and growth read players by it). The readings
 * already made of `base` carry over, the club's own excepted.
 */
export function withAcademy(
  base: Pack,
  seed: number,
  clubId: string,
): { pack: Pack; academy: string[] } {
  const boys = academyOf(base, seed, clubId);
  if (boys.length === 0) return { pack: base, academy: [] };
  const pack = { ...base, players: [...base.players, ...boys] };
  carryCache(base, pack, [clubId]);
  return { pack, academy: boys.map((p) => p.id) };
}
