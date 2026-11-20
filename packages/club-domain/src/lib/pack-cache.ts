/**
 * Readings derived from a pack, kept beside it. A transfer gives the career a new pack object
 * (career/market.ts), so a plain per-pack cache would be thrown away after every deal and a
 * market round of a hundred deals would rebuild every club's plan a hundred times. Here each
 * reading is kept by club, and `carryCache` hands them all on to the new pack except those of
 * the clubs whose squads changed.
 */
import type { Pack, PackClub } from '../pack/schema';

/** Key for a reading that depends on no club's squad (attributes, the pack's wage table). */
export const WHOLE = '*';

const stores = new WeakMap<Pack, Map<string, Map<string, unknown>>>();

// The pack read last: the market asks for readings of one pack millions of times in a row.
let lastPack: Pack | undefined;
let lastStore: Map<string, Map<string, unknown>> | undefined;

function storeOf(pack: Pack): Map<string, Map<string, unknown>> {
  if (pack === lastPack) return lastStore!;
  let store = stores.get(pack);
  if (!store) stores.set(pack, (store = new Map()));
  lastPack = pack;
  return (lastStore = store);
}

export function cached<T>(pack: Pack, name: string, key: string, make: () => T): T {
  const store = storeOf(pack);
  let by = store.get(name);
  if (!by) store.set(name, (by = new Map()));
  const known = by.get(key);
  if (known !== undefined || by.has(key)) return known as T;
  const made = make();
  by.set(key, made);
  return made;
}

/** Hands every reading of `from` on to `to`, except those of the clubs in `changed`. */
export function carryCache(from: Pack, to: Pack, changed: readonly string[]): void {
  const store = stores.get(from);
  if (!store) return;
  const next = new Map<string, Map<string, unknown>>();
  for (const [name, by] of store) {
    const kept = new Map(by);
    for (const clubId of changed) kept.delete(clubId);
    next.set(name, kept);
  }
  stores.set(to, next);
  if (to === lastPack) lastStore = next;
}

/** A reading already made for a pack, without making it. */
export function peek<T>(pack: Pack, name: string, key: string): T | undefined {
  return stores.get(pack)?.get(name)?.get(key) as T | undefined;
}

/** Sets a reading outright, replacing what was there. */
export function recache<T>(pack: Pack, name: string, key: string, value: T): T {
  const store = storeOf(pack);
  let by = store.get(name);
  if (!by) store.set(name, (by = new Map()));
  by.set(key, value);
  return value;
}

/** A club of the pack by id: a lookup instead of a scan of the list (clubs never change in place). */
export const clubById = (pack: Pack, id: string): PackClub | undefined =>
  cached(pack, 'clubById', WHOLE, () => new Map(pack.clubs.map((c) => [c.id, c]))).get(id);
