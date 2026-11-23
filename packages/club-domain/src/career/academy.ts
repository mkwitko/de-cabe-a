/**
 * The person's academy on day one. A club comes with its youth teams (FM's under-20 and under-17
 * slots, `pack.youth`); where the data has fewer than a dozen boys, yearly crops of the club's
 * own academy make up the rest (development.ts `crop`), as if it had brought boys in over the
 * last years. The other clubs' boys join the world too, in their academies (`base:<club>`, bases.ts):
 * out of the squads, so the league plays as it did, but there to be scouted and bought.
 */
import type { Pack, PackPlayer } from '../pack/schema';
import { WHOLE, carryCache } from '../lib/pack-cache';
import { crop } from './development';
import { ACADEMY, homeOf, isBase } from './bases';
import type { CareerWorld } from './advance';
import { applyMoves, type Moves } from './market';

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
 * The pack this career plays with: `base` and the club's boys after its players, then (with
 * `bases`) the other clubs' boys in their academies, so every player's place in `base` is kept
 * (the saved moves and growth read players by it). The readings already made of `base` carry
 * over, the club's own and the whole pack's excepted.
 */
export function withAcademy(
  base: Pack,
  seed: number,
  clubId: string,
  bases = false,
): { pack: Pack; academy: string[] } {
  const boys = academyOf(base, seed, clubId);
  const others = bases
    ? (base.youth ?? [])
        .filter((y) => y.player.clubId !== clubId)
        .map((y) => ({ ...y.player, clubId: `${ACADEMY}${y.player.clubId}` }))
    : [];
  if (boys.length === 0 && others.length === 0) return { pack: base, academy: [] };
  const pack = { ...base, players: [...base.players, ...boys, ...others] };
  // Readings of the whole pack (WHOLE) are read again: the boys are new players in it.
  carryCache(base, pack, [clubId, WHOLE]);
  return { pack, academy: boys.map((p) => p.id) };
}

/**
 * Boys of the clubs' academies into those clubs' first teams, on the contracts they have (two
 * more years where it ran out). Not a transfer: the season's move is not stamped, so a boy
 * brought up can still be bought or sold this season.
 */
export function bringUp(w: CareerWorld, boys: readonly PackPlayer[]): void {
  const season = w.season.season;
  const changes: Moves = {};
  for (const p of boys) {
    if (!isBase(p.clubId)) continue;
    const until = p.contract && Number(p.contract.until.slice(0, 4)) > season;
    changes[p.id] = {
      clubId: homeOf(p.clubId),
      wage: p.contract?.wage ?? 0,
      until: until ? p.contract!.until : `${season + 2}-12-31`,
      release: p.contract?.releaseFee ?? null,
    };
  }
  applyMoves(w, changes);
  for (const id of Object.keys(changes)) delete w.moves![id]!.season;
}

/** The boys still in the academy of `clubId` (`base:<club>`). */
export const baseOf = (w: CareerWorld, clubId: string): PackPlayer[] =>
  w.pack.players.filter((p) => p.clubId === `${ACADEMY}${clubId}`);
