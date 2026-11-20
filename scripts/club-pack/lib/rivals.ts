// Curated rivalries (data/rivals.json) resolved against the clubs of a pack.
export type Derby = [
  club: string,
  state: string,
  club: string,
  state: string,
  name: string,
  intensity: number,
];

/** Parses the data file; throws on a malformed row so a typo never ships silently. */
export function parseDerbies(json: { derbies: unknown[] }): Derby[] {
  return json.derbies.map((row, i) => {
    const r = row as Derby;
    const ok =
      Array.isArray(r) &&
      r.length === 6 &&
      [0, 1, 2, 3, 4].every((k) => typeof r[k] === 'string' && r[k]) &&
      [1, 2, 3].includes(r[5]) &&
      r[0] + r[1] !== r[2] + r[3];
    if (!ok) throw new Error(`rivals.json row ${i}: ${JSON.stringify(row)}`);
    return r;
  });
}

/**
 * Per club id, its rivals ordered by derby intensity (3 first, then pack order); `find` resolves a
 * name and state to a club id. Rows with a club missing from the pack are counted in `unmatched`.
 */
export function resolveRivals(
  derbies: Derby[],
  find: (name: string, state: string) => string | undefined,
): { rivals: Map<string, string[]>; matched: number; unmatched: Derby[] } {
  const scored = new Map<string, Map<string, number>>();
  const unmatched: Derby[] = [];
  let matched = 0;
  const add = (a: string, b: string, n: number) => {
    const m = scored.get(a) ?? scored.set(a, new Map()).get(a)!;
    m.set(b, Math.max(n, m.get(b) ?? 0));
  };
  for (const [x, sx, y, sy, , n] of derbies) {
    const a = find(x, sx);
    const b = find(y, sy);
    if (!a || !b || a === b) {
      unmatched.push([x, sx, y, sy, '', n]);
      continue;
    }
    add(a, b, n);
    add(b, a, n);
    matched++;
  }
  const rivals = new Map<string, string[]>();
  for (const [id, m] of scored)
    rivals.set(
      id,
      [...m].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).map(([k]) => k),
    );
  return { rivals, matched, unmatched };
}
