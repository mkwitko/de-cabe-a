/**
 * Seeded randomness for the match engine (ADR-013 §5). The state is a plain
 * object so it serialises with the match; never use Math.random in this package.
 */
export interface Rng {
  s: number;
}

export const rngFrom = (seed: number): Rng => ({ s: seed | 0 });

/** Next value in [0, 1). mulberry32. */
export function next(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) | 0;
  let t = Math.imul(r.s ^ (r.s >>> 15), 1 | r.s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const between = (r: Rng, min: number, max: number) => min + next(r) * (max - min);

/** Integer in [0, n). */
export const pick = (r: Rng, n: number) => Math.floor(next(r) * n);

/** Independent stream for one subject (players, weather, referee…). Does not advance `r`. */
export function fork(r: Rng, label: string): Rng {
  let h = 0x811c9dc5 ^ r.s;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 0x01000193);
  return { s: h | 0 };
}
