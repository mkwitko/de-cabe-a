/**
 * Copa dos Sonhos (manager mode): draft an XI from the great World Cup sides, then take it
 * through a World Cup of simulated matches against legendary national teams.
 *
 * Ratings are ours, from the World Cup line-ups we hold (no game-studio ratings): matches
 * started, the deepest round started, titles, World Cups played and the curator's notability
 * tier. Affinity is real: players who started together for the same side at a World Cup, who
 * shared a club in the same years, or come from the same country. Pure; `rng` is injected.
 */
export type Slot = 'GK' | 'DF' | 'MF' | 'FW';
export type Tactic = 'retranca' | 'equilibrado' | 'ofensivo';
export type Rng = () => number;

export const FORMATIONS = {
  '4-3-3': ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW'],
  '4-4-2': ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW'],
  '3-5-2': ['GK', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW'],
} as const satisfies Record<string, readonly Slot[]>;
export type Formation = keyof typeof FORMATIONS;

export interface Facts {
  /** World Cups played, matches started, finals started, titles. */
  cups: number;
  starts: number;
  finals: number;
  titles: number;
}
export interface Rated {
  id: string;
  name: string;
  slot: Slot;
  overall: number;
  facts: Facts;
  /** The side he is drafted from: his World Cup with the most starts. */
  team: string;
  season: string;
  /** Every side he started for, "Brazil|1970". */
  sides: string[];
  nationality: string;
  /** Club spells with years, for the club link: [clubId, clubName, from, to]. */
  clubs: [string, string, number, number][];
}

const STAGE_DEPTH: Record<string, number> = {
  Final: 4,
  'Semi-finals': 3,
  Semifinals: 3,
  'Third place play-off': 2,
  'Match for third place': 2,
  'Quarter-finals': 2,
  Quarterfinals: 2,
  'Round of 16': 1,
};
export const stageDepth = (stage: string | null) => STAGE_DEPTH[stage ?? ''] ?? 0;

/** Nota De Cabeça, 60–96, from the facts above. */
export function overall(f: Facts & { depth: number; tier: string }) {
  const tier = { T1: 8, T2: 4, T3: 0, T4: -2 }[f.tier] ?? 0;
  const raw =
    63 +
    2 * Math.min(f.starts, 10) +
    2 * f.depth +
    4 * Math.min(f.titles, 2) +
    Math.min(f.cups - 1, 3) +
    tier;
  return Math.max(60, Math.min(96, Math.round(raw)));
}

export interface Link {
  a: string;
  b: string;
  why: string;
  points: number;
}
/** Affinity links inside an XI, and the team's chemistry 0–100. */
export function chemistry(xi: Rated[]) {
  const links: Link[] = [];
  for (let i = 0; i < xi.length; i++)
    for (let j = i + 1; j < xi.length; j++) {
      const a = xi[i]!;
      const b = xi[j]!;
      const side = a.sides.find((s) => b.sides.includes(s));
      if (side) {
        links.push({ a: a.name, b: b.name, why: `side:${side}`, points: 3 });
        continue;
      }
      const club = a.clubs.find(([id, , from, to]) =>
        b.clubs.some(([id2, , f2, t2]) => id2 === id && from <= t2 && f2 <= to),
      );
      if (club) {
        links.push({ a: a.name, b: b.name, why: `club:${club[1]}`, points: 2 });
        continue;
      }
      if (a.nationality === b.nationality)
        links.push({ a: a.name, b: b.name, why: 'country', points: 1 });
    }
  const total = links.reduce((s, l) => s + l.points, 0);
  return { links, value: Math.min(100, Math.round((total / 45) * 100)) };
}

/** Team strength: average rating plus up to 4 for chemistry. */
export const strength = (xi: { overall: number }[], chem: number) =>
  xi.reduce((s, p) => s + p.overall, 0) / Math.max(1, xi.length) + (chem / 100) * 4;

const TACTIC: Record<Tactic, { atk: number; def: number }> = {
  retranca: { atk: 0.7, def: 0.7 },
  equilibrado: { atk: 1, def: 1 },
  ofensivo: { atk: 1.3, def: 1.25 },
};

function poisson(lambda: number, rng: Rng) {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > l);
  return k - 1;
}

export interface MatchEvent {
  minute: number;
  side: 'mine' | 'theirs';
  name: string;
}
export interface MatchResult {
  goalsFor: number;
  goalsAgainst: number;
  events: MatchEvent[];
  extraTime: boolean;
  penalties: { mine: number; theirs: number } | null;
}

interface Side {
  strength: number;
  /** Who can score, with weights (forwards most). */
  scorers: { name: string; weight: number }[];
}
const pickScorer = (s: Side, rng: Rng) => {
  const total = s.scorers.reduce((a, p) => a + p.weight, 0);
  let r = rng() * total;
  for (const p of s.scorers) if ((r -= p.weight) <= 0) return p.name;
  return s.scorers.at(-1)?.name ?? '';
};
export const scorersOf = (xi: { name: string; slot: Slot; overall: number }[]) =>
  xi.map((p) => ({
    name: p.name,
    weight: ({ GK: 0, DF: 0.4, MF: 1.5, FW: 4 }[p.slot] * p.overall) / 80,
  }));

/** One match; knockout draws go to extra time and penalties. */
export function simulate(
  mine: Side,
  theirs: Side,
  tactic: Tactic,
  knockout: boolean,
  rng: Rng,
): MatchResult {
  const diff = mine.strength - theirs.strength;
  const t = TACTIC[tactic];
  const lf = 1.3 * Math.exp(diff / 10) * t.atk;
  const la = 1.3 * Math.exp(-diff / 10) * t.def;
  const events: MatchEvent[] = [];
  const goals = (lambda: number, side: 'mine' | 'theirs', from: number, to: number) => {
    const n = poisson(lambda, rng);
    for (let i = 0; i < n; i++)
      events.push({
        minute: from + Math.floor(rng() * (to - from)) + 1,
        side,
        name: pickScorer(side === 'mine' ? mine : theirs, rng),
      });
    return n;
  };
  let gf = goals(lf, 'mine', 0, 90);
  let ga = goals(la, 'theirs', 0, 90);
  let extraTime = false;
  let penalties: MatchResult['penalties'] = null;
  if (knockout && gf === ga) {
    extraTime = true;
    gf += goals(lf / 3, 'mine', 90, 120);
    ga += goals(la / 3, 'theirs', 90, 120);
    if (gf === ga) {
      const p = { mine: 0, theirs: 0 };
      const scoreChance = (s: number) => Math.min(0.9, Math.max(0.6, 0.75 + s / 100));
      for (let k = 0; k < 5 || p.mine === p.theirs; k++) {
        if (rng() < scoreChance(diff)) p.mine++;
        if (rng() < scoreChance(-diff)) p.theirs++;
        if (k > 30) break;
      }
      if (p.mine === p.theirs) p.mine++;
      penalties = p;
    }
  }
  events.sort((a, b) => a.minute - b.minute);
  return { goalsFor: gf, goalsAgainst: ga, events, extraTime, penalties };
}

export const won = (r: MatchResult) =>
  r.penalties ? r.penalties.mine > r.penalties.theirs : r.goalsFor > r.goalsAgainst;

export interface Row {
  team: string;
  played: number;
  points: number;
  gf: number;
  ga: number;
}
/** Group table, best first: points, goal difference, goals scored. */
export function table(rows: Row[]) {
  return [...rows].sort(
    (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf,
  );
}
export function record(rows: Row[], team: string, gf: number, ga: number) {
  const r = rows.find((x) => x.team === team)!;
  r.played++;
  r.gf += gf;
  r.ga += ga;
  r.points += gf > ga ? 3 : gf === ga ? 1 : 0;
}

export const KNOCKOUT = ['Oitavas', 'Quartas', 'Semifinal', 'Final'] as const;
export type Finish = 'Grupos' | 'Oitavas' | 'Quartas' | 'Semifinal' | 'Vice' | 'Campeão';
export const FINISH_ORDER: Finish[] = [
  'Campeão',
  'Vice',
  'Semifinal',
  'Quartas',
  'Oitavas',
  'Grupos',
];
