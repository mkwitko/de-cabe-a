/**
 * Season of every competition, without the user (MC-179; ADR-016 items 5–6).
 */
import type { Competition, Phase } from './schema';

/** Clubs entering a phase, from the regulation alone (selector widths). */
function entrantCount(c: Competition, p: Phase, sizes: Map<string, { tables: number }>): number {
  let n = 0;
  for (const e of p.entrants) {
    if (e.from === 'members') n += c.size;
    else if (e.from === 'list') n += e.clubIds.length;
    else if (e.from === 'ranking') n += e.count;
    else if (e.from === 'slots') throw new Error('slot entrants are not known in advance');
    else {
      const tables = e.from === 'phase' ? sizes.get(e.phaseId)!.tables : 1;
      const width = (e.positions[1] - e.positions[0] + 1) * tables;
      n += e.best ?? width;
    }
  }
  return n;
}

/** Matches a regulation produces in a season. */
export function matchCount(c: Competition): number {
  const sizes = new Map<string, { tables: number }>();
  let total = 0;
  for (const p of c.phases) {
    const n = entrantCount(c, p, sizes);
    if (p.kind === 'liga') total += ((n * (n - 1)) / 2) * p.legs;
    else if (p.kind === 'grupos') {
      if (p.opponents === 'other') total += (n / 2) * (n / 2) * p.legs;
      else
        for (let g = 0; g < p.groups; g++) {
          const k = Math.floor(n / p.groups) + (g < n % p.groups ? 1 : 0);
          total += ((k * (k - 1)) / 2) * p.legs;
        }
    } else total += (n - p.survivors) * p.legs;
    sizes.set(p.id, { tables: p.kind === 'grupos' ? p.groups : 1 });
  }
  return total;
}
