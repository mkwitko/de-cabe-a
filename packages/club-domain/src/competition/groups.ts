/**
 * `grupos` interpreter (MC-170; 05 §2): draw, fixtures inside the group or
 * against the other group, and the selection of qualifiers (positions in each
 * table, then the best of those across tables). Each group's table is a
 * league table (MC-169).
 */
import { roundRobin, shuffle, standings, type Pair, type Row, type TableRules } from './league';
import type { Phase, Selector } from './schema';

type Draw = Extract<Phase, { kind: 'grupos' }>['draw'];

/**
 * pots: entrants in seed order cut into pots of `groups` clubs, one per group;
 * random: seeded shuffle dealt in turn; regional: sorted by region (stable on
 * seed order) and cut in consecutive blocks, so neighbours share a group.
 */
export function drawGroups(
  entrants: readonly string[],
  groups: number,
  draw: Draw,
  seed: number,
  regionOf: (clubId: string) => string = () => '',
): string[][] {
  const out: string[][] = Array.from({ length: groups }, () => []);
  if (draw === 'regional') {
    const sorted = entrants
      .map((c, i) => ({ c, i, r: regionOf(c) }))
      .sort((a, b) => (a.r < b.r ? -1 : a.r > b.r ? 1 : a.i - b.i));
    // Block sizes differ by at most one.
    let k = 0;
    for (let gi = 0; gi < groups; gi++) {
      const size = Math.floor(entrants.length / groups) + (gi < entrants.length % groups ? 1 : 0);
      for (let j = 0; j < size; j++) out[gi]!.push(sorted[k++]!.c);
    }
    return out;
  }
  if (draw === 'random') {
    shuffle(entrants, seed, 'groups').forEach((c, i) => out[i % groups]!.push(c));
    return out;
  }
  for (let p = 0; p * groups < entrants.length; p++) {
    const pot = shuffle(entrants.slice(p * groups, (p + 1) * groups), seed, `pot:${p}`);
    pot.forEach((c, gi) => out[gi]!.push(c));
  }
  return out;
}

/** Rounds of the group phase: the groups' rounds side by side. */
export function groupFixtures(
  groups: readonly string[][],
  legs: 1 | 2,
  opponents: 'own' | 'other',
  seed: number,
): Pair[][] {
  if (opponents === 'own') {
    const each = groups.map((grp, i) => roundRobin(grp, legs, seed + i));
    const n = Math.max(...each.map((r) => r.length));
    return Array.from({ length: n }, (_, r) => each.flatMap((rounds) => rounds[r] ?? []));
  }
  // Groups meet in pairs (0 with 1, 2 with 3...): A[i] v B[(i + r) mod n]; four groups of five
  // are two such pairs side by side (Copa do Nordeste).
  if (groups.length % 2 || groups.some((g, i) => g.length !== groups[i ^ 1]!.length))
    throw new Error('opponents "other" needs groups in pairs of equal size');
  const pairs = Array.from({ length: groups.length / 2 }, (_, k) => {
    const [a, b] = [groups[2 * k]!, groups[2 * k + 1]!];
    const first: Pair[][] = a.map((_, r) =>
      a.map((x, i): Pair => {
        const y = b[(i + r) % b.length]!;
        return (i + r) % 2 === 0 ? [x, y] : [y, x];
      }),
    );
    return legs === 1 ? first : [...first, ...first.map((rd) => rd.map(([h, w]): Pair => [w, h]))];
  });
  return pairs[0]!.map((_, r) => pairs.flatMap((p) => p[r]!));
}

/**
 * Clubs at the selector's positions in every table, ordered by position and
 * then by campaign (points and the table's breakers, head to head left out
 * across groups). `best` keeps the first N.
 */
export function select(tables: readonly Row[][], sel: Selector, rules: TableRules): string[] {
  const [from, to] = sel.positions;
  const tieBreakers = rules.tieBreakers.filter((b) => b !== 'headToHead');
  const out: string[] = [];
  for (let pos = from; pos <= to; pos++) {
    const rows = tables.map((t) => t[pos - 1]).filter((r): r is Row => r !== undefined);
    const ranked = standings(
      rows.map((r) => r.clubId),
      [],
      { ...rules, tieBreakers, carry: rows },
    );
    out.push(...ranked.map((r) => r.clubId));
  }
  return sel.best === undefined ? out : out.slice(0, sel.best);
}
