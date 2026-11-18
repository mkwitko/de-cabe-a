/**
 * `liga` interpreter (MC-169; 05 §2): round-robin fixtures and the table with
 * tie-breakers in the regulation's order. Also the table of each group (MC-170).
 */
import { fork, next, pick, rngFrom } from '@decabeca/match-engine';
import type { TableBreaker } from './schema';

export type Pair = [home: string, away: string];

/** A finished match as the table sees it: goals and cards per side, home first. */
export interface Played {
  home: string;
  away: string;
  goals: [number, number];
  /** [yellow, red] for home, then away. */
  cards: [[number, number], [number, number]];
}

export interface Row {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  yellow: number;
  red: number;
}

/** Seeded shuffle (Fisher–Yates) without touching the caller's list. */
export function shuffle<T>(items: readonly T[], seed: number, label: string): T[] {
  const r = fork(rngFrom(seed), label);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pick(r, i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Circle method (Berger tables) after a seeded shuffle, the "sorteio
 * balanceado" of 05 §2: in one round-robin home games differ by at most one
 * between clubs; the second leg mirrors the first with home and away swapped.
 */
export function roundRobin(clubs: readonly string[], legs: 1 | 2, seed: number): Pair[][] {
  const t: (string | null)[] = shuffle(clubs, seed, 'round-robin');
  const at = new Map(t.map((c, i) => [c, i]));
  if (t.length % 2) t.push(null);
  const n = t.length;
  const first: Pair[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i]!;
      const b = t[n - 1 - i]!;
      if (a === null || b === null) continue;
      // Balanced orientation: for draw positions p < q, p hosts when p + q is odd.
      const [p, q] = [at.get(a)!, at.get(b)!];
      const homeIsA = p < q === ((p + q) % 2 === 1);
      round.push(homeIsA ? [a, b] : [b, a]);
    }
    first.push(round);
    // Rotate everyone but the first.
    t.splice(1, 0, t.pop()!);
  }
  if (legs === 1) return first;
  return [...first, ...first.map((round) => round.map(([h, a]): Pair => [a, h]))];
}

const empty = (clubId: string): Row => ({
  clubId,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
  yellow: 0,
  red: 0,
});

export interface TableRules {
  points: { win: number; draw: number; loss: number };
  tieBreakers: readonly TableBreaker[];
  seed: number;
  /** Rows carried from an earlier phase (points do not reset). */
  carry?: readonly Row[];
  /** Points taken off a club before the first match (a sanction); not applied to carried rows. */
  deduct?: Readonly<Record<string, number>>;
}

/** Points a club took from a set of matches. */
function pointsIn(clubId: string, games: readonly Played[], p: TableRules['points']): number {
  let sum = 0;
  for (const g of games) {
    if (g.home !== clubId && g.away !== clubId) continue;
    const d = (g.goals[0] - g.goals[1]) * (g.home === clubId ? 1 : -1);
    sum += d > 0 ? p.win : d < 0 ? p.loss : p.draw;
  }
  return sum;
}

export function standings(
  clubs: readonly string[],
  games: readonly Played[],
  rules: TableRules,
): Row[] {
  const rows = new Map(
    clubs.map((c) => [
      c,
      {
        ...(rules.carry?.find((r) => r.clubId === c) ?? {
          ...empty(c),
          points: -(rules.deduct?.[c] ?? 0),
        }),
      },
    ]),
  );
  for (const g of games) {
    const sides = [rows.get(g.home), rows.get(g.away)];
    sides.forEach((row, s) => {
      if (!row) return;
      const gf = g.goals[s]!;
      const ga = g.goals[1 - s]!;
      row.played++;
      row.goalsFor += gf;
      row.goalsAgainst += ga;
      row.yellow += g.cards[s]![0];
      row.red += g.cards[s]![1];
      if (gf > ga) {
        row.won++;
        row.points += rules.points.win;
      } else if (gf < ga) {
        row.lost++;
        row.points += rules.points.loss;
      } else {
        row.drawn++;
        row.points += rules.points.draw;
      }
    });
  }
  const drawKey = (c: string) => next(fork(rngFrom(rules.seed), `draw:${c}`));
  // Higher key ranks first.
  const key = (b: TableBreaker, r: Row, bucket: Row[]): number | null => {
    switch (b) {
      case 'wins':
        return r.won;
      case 'goalDifference':
        return r.goalsFor - r.goalsAgainst;
      case 'goalsFor':
        return r.goalsFor;
      case 'redCards':
        return -r.red;
      case 'yellowCards':
        return -r.yellow;
      case 'draw':
        return drawKey(r.clubId);
      case 'headToHead': {
        if (bucket.length !== 2) return null;
        const ids = new Set(bucket.map((x) => x.clubId));
        const meetings = games.filter((g) => ids.has(g.home) && ids.has(g.away));
        return pointsIn(r.clubId, meetings, rules.points);
      }
    }
  };
  const rank = (bucket: Row[], k: number): Row[] => {
    if (bucket.length < 2 || k >= rules.tieBreakers.length) return bucket;
    const b = rules.tieBreakers[k]!;
    if (key(b, bucket[0]!, bucket) === null) return rank(bucket, k + 1);
    return split(bucket, (r) => key(b, r, bucket)!).flatMap((run) => rank(run, k + 1));
  };
  return split([...rows.values()], (r) => r.points).flatMap((run) => rank(run, 0));
}

/** Stable sort by key, highest first, cut into runs of equal key. */
function split(rows: Row[], key: (r: Row) => number): Row[][] {
  const sorted = rows.map((r, i) => ({ r, k: key(r), i })).sort((a, b) => b.k - a.k || a.i - b.i);
  const runs: Row[][] = [];
  let last: number | undefined;
  for (const { r, k } of sorted) {
    if (k !== last) runs.push([]);
    runs.at(-1)!.push(r);
    last = k;
  }
  return runs;
}
