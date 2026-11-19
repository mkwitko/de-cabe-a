/**
 * What a signing would do to the best eleven, before the person confirms the terms: the club's
 * best lineup (squad.ts `bestLineup`, in the formation in force, injured and the foreigner limit
 * held) with and without him.
 */
import type { CareerWorld } from './advance';
import { outOn } from './health';
import { bestLineup, foreignLimit, lineupOf, slotRatings } from './squad';

export interface SigningEffect {
  /** Whether he makes the best eleven. */
  enters: boolean;
  /** What he gives the slot he would take (1..99); 0 when he does not start. */
  rating: number;
  /** The man he pushes out of the eleven and what he gave there; null when nobody loses a place. */
  displaced: { name: string; rating: number } | null;
}

export function signingEffect(w: CareerWorld, playerId: string): SigningEffect {
  const formation = lineupOf(w).formation;
  const limit = foreignLimit(w.season.season);
  const out = outOn(w, w.day + 1);
  const now = { pack: w.pack, clubId: w.clubId };
  const next = {
    pack: {
      ...w.pack,
      players: w.pack.players.map((p) => (p.id === playerId ? { ...p, clubId: w.clubId } : p)),
    },
    clubId: w.clubId,
  };
  const before = bestLineup(now, formation, out, limit);
  const after = bestLineup(next, formation, out, limit);
  const slot = after.xi.indexOf(playerId);
  if (slot < 0) return { enters: false, rating: 0, displaced: null };
  const fitNow = slotRatings(now, formation);
  const fitNext = slotRatings(next, formation);
  const lost = before.xi.findIndex((id) => !after.xi.includes(id));
  const man = lost < 0 ? undefined : w.pack.players.find((p) => p.id === before.xi[lost]);
  return {
    enters: true,
    rating: fitNext.get(playerId)![slot]!,
    displaced: man ? { name: man.knownAs ?? man.name, rating: fitNow.get(man.id)![lost]! } : null,
  };
}
