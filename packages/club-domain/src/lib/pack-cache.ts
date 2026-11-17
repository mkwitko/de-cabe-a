/**
 * Readings derived from a pack, kept beside it. A transfer gives the career a new pack object
 * (career/market.ts), so a plain per-pack cache would be thrown away after every deal and a
 * market round of a hundred deals would rebuild every club's plan a hundred times. Here each
 * reading is kept by club, and `carryCache` hands them all on to the new pack except those of
 * the clubs whose squads changed.
 */
import type { Pack } from '../pack/schema';

/** Key for a reading that depends on no club's squad (attributes, the pack's wage table). */
export const WHOLE = '*';

const stores = new WeakMap<Pack, Map<string, Map<string, unknown>>>();

export function cached<T>(pack: Pack, name: string, key: string, make: () => T): T {
  let store = stores.get(pack);
  if (!store) stores.set(pack, (store = new Map()));
  let by = store.get(name);
  if (!by) store.set(name, (by = new Map()));
  if (!by.has(key)) by.set(key, make());
  return by.get(key) as T;
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
}
