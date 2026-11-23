/**
 * FIFA call-ups (rules/registry.ts `fifaWindows`). In an international window the national teams
 * take the best players of their nation: the matches go on (the Brazilian leagues rarely stop) and
 * the called players are out, like the injured (`outOn`). No dice beyond a fixed number of the
 * career's seed, the player and the window. Every number is a PARÂMETRO, calibrated so that a
 * typical Série A club loses 0-3 players a window and most lower-division clubs none
 * (`callups.test.ts` checks the spread on a generated world).
 */
import { dayOf, isoOf } from '../competition/calendar';
import { readingsOf } from '../market/value';
import { cached } from '../lib/pack-cache';
import { ruleOn } from '../rules/registry';
import type { Pack } from '../pack/schema';
import type { CareerWorld } from './advance';

/** First day of the FIFA window `day` falls in; null outside every window. */
export function fifaWindowOn(day: number): number | null {
  const iso = isoOf(day);
  const year = iso.slice(0, 4);
  for (const [from, to] of ruleOn('fifaWindows', iso))
    if (iso.slice(5) >= from && iso.slice(5) <= to) return dayOf(`${year}-${from}`);
  return null;
}

/** Nothing below this level is called, whatever the nation. */
export const FLOOR = 66;
/** Percent of the eligible players a coach actually names in a window (the rest are rested or hurt). */
const NAMED = 75;
/** Brazil calls only its very best here: the pack holds thousands of Brazilians, the squad has 26. */
const BRAZIL_DEPTH = 8;
/** Other nations: a tenth of the players of the nation in the pack, from 1 to 5. */
export const depthOf = (nation: string, n: number) =>
  nation === 'BR' ? BRAZIL_DEPTH : Math.min(5, Math.max(1, Math.floor(n / 10)));

/** A fixed number 0..99 for a player and a window. */
function roll(seed: number, id: string, start: number): number {
  let h = Math.imul(2166136261 ^ start, 16777619) ^ seed;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) % 100;
}

/** Who of the whole pack is called in the window starting `start` (club-independent). */
export function calledIn(pack: Pack, seed: number, start: number): Set<string> {
  return cached(pack, 'called', `${seed}:${start}`, () => {
    const level = readingsOf(pack);
    const byNation = new Map<string, { id: string; level: number }[]>();
    for (const p of pack.players) {
      const l = level.get(p.id)!.level;
      if (l < FLOOR) continue;
      (byNation.get(p.nationality) ?? byNation.set(p.nationality, []).get(p.nationality)!).push({
        id: p.id,
        level: l,
      });
    }
    const out = new Set<string>();
    for (const [nation, list] of byNation) {
      list.sort((a, b) => b.level - a.level || (a.id < b.id ? -1 : 1));
      for (const x of list.slice(0, depthOf(nation, list.length)))
        if (roll(seed, x.id, start) < NAMED) out.add(x.id);
    }
    return out;
  });
}

/** The players of `clubId` away with their national teams on `day`. */
export function calledOf(w: CareerWorld, clubId: string, day: number): string[] {
  const start = fifaWindowOn(day);
  if (start === null) return [];
  const called = calledIn(w.pack, w.seed, start);
  return w.pack.players.filter((p) => p.clubId === clubId && called.has(p.id)).map((p) => p.id);
}
