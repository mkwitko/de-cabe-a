/**
 * How hard a Career Path level is to guess, and the track order that follows from it.
 * Pure: the facts come from scripts/research/career-path-difficulty.ts, which reads the database.
 *
 * The level shows the first club, then one more per wrong guess, with 6 guesses in all: a player
 * sees at most the first 6 clubs. So the opening clubs weigh more than the rest of the career.
 */

export type Notability = 'T1' | 'T2' | 'T3' | 'T4';

export interface CareerLevelFacts {
  /** Challenge id: the stable tie-break. */
  id: string;
  number: number;
  notability: Notability;
  /** Primary nationality is Brazil. */
  brazilian: boolean;
  /** Started for Brazil in a lineup we hold (World Cup, Copa América). */
  selecao: boolean;
  trajectory: {
    clubName: string;
    countryCode: string;
    toYear: number | null;
    appearances: number | null;
  }[];
  /** Per trajectory entry: 0..1, how many careers in the database pass through the club (log). */
  clubFame: number[];
  /** Other players whose careers open with the same first two clubs. */
  openingShared: number;
}

/** The 12 grandes: the clubs every Brazilian fan follows. */
export const BIG_BRAZILIAN_CLUBS = new Set([
  'Flamengo',
  'Corinthians',
  'Palmeiras',
  'São Paulo',
  'Santos',
  'Vasco',
  'Fluminense',
  'Botafogo',
  'Grêmio',
  'Internacional',
  'Atlético-MG',
  'Cruzeiro',
]);

/**
 * Weights of the parts, summing to 100 (see the report for the reasoning):
 * fame decides most of all whether a fan has heard of the player; the Brazilian anchor follows,
 * as the audience is Brazilian; the visible clubs decide whether the clues help; era and opening
 * ambiguity refine.
 */
export const WEIGHTS = { fame: 40, brazil: 20, clubs: 20, era: 12, opening: 8 } as const;

const FAME: Record<Notability, number> = { T1: 0, T2: 0.35, T3: 0.7, T4: 1 };
const clamp = (x: number) => Math.min(1, Math.max(0, x));
/** Clubs a player can see: the first, plus one per wrong guess (6 guesses). */
const VISIBLE = 6;

/** Each part is 0 (easiest) .. 1 (hardest); the score is their weighted sum, 0..100. */
export function scoreCareerLevel(f: CareerLevelFacts, nowYear: number) {
  const t = f.trajectory;
  const bigBR = t.filter((s) => s.countryCode === 'BR' && BIG_BRAZILIAN_CLUBS.has(s.clubName));
  const anchor = Math.max(
    f.selecao ? 1 : 0,
    bigBR.some((s) => (s.appearances ?? 0) >= 30) ? 0.9 : bigBR.length ? 0.6 : 0,
    t.some((s) => s.countryCode === 'BR') ? 0.3 : 0,
  );
  const brazil = 1 - clamp(anchor + (f.brazilian ? 0.2 : 0));

  // The earlier the club, the more players see it: weights 6, 5, .., 1 over the visible clubs.
  const visible = f.clubFame.slice(0, VISIBLE);
  const w = visible.map((_, i) => VISIBLE - i);
  const fame = visible.reduce((sum, x, i) => sum + x * w[i]!, 0) / w.reduce((a, b) => a + b, 0);
  const journeyman = clamp((t.length - 4) / 8); // 4 clubs or fewer: none; 12: full
  const clubs = 0.6 * (1 - fame) + 0.4 * journeyman;

  const years = t.map((s) => s.toYear ?? nowYear);
  const lastYear = years.length ? Math.max(...years) : nowYear - 15;
  const era = clamp((nowYear - lastYear) / 30); // still active: 0; retired 30+ years: 1

  const opening = clamp(Math.log2(1 + f.openingShared) / 6); // 63+ share the opening: full

  const parts = { fame: FAME[f.notability], brazil, clubs, era, opening };
  const score = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce(
    (sum, k) => sum + WEIGHTS[k] * parts[k],
    0,
  );
  return { score: Math.round(score * 10) / 10, parts };
}

/** Track rules: the opening levels are famous players; no T4 before level 60. */
export function allowedAt(position: number, notability: Notability) {
  if (position <= 20) return notability === 'T1' || notability === 'T2';
  if (position < 60) return notability !== 'T4';
  return true;
}

/** difficultyTier from the score; the free levels 1–20 are 1 by rule (orderTrack). */
export const tierFor = (score: number): 1 | 2 | 3 => (score < 35 ? 1 : score < 55 ? 2 : 3);

export interface Placement {
  id: string;
  from: number;
  to: number;
  score: number;
  tier: 1 | 2 | 3;
  pinned: boolean;
}

/**
 * New track order. Pinned levels (someone played them, or a Desafio do Dia drew them) keep their
 * number; the others fill the free numbers easiest first, each slot taking the easiest level the
 * track rules allow there (or the easiest at all when none fits).
 */
export function orderTrack(
  levels: (CareerLevelFacts & { score: number })[],
  pinned: ReadonlySet<number>,
): Placement[] {
  const byScore = (a: { score: number; id: string }, b: { score: number; id: string }) =>
    a.score - b.score || a.id.localeCompare(b.id);
  const free = levels.filter((l) => !pinned.has(l.number)).sort(byScore);
  const slots = levels
    .map((l) => l.number)
    .filter((n) => !pinned.has(n))
    .sort((a, b) => a - b);
  const out: Placement[] = levels
    .filter((l) => pinned.has(l.number))
    .map((l) => ({
      id: l.id,
      from: l.number,
      to: l.number,
      score: l.score,
      tier: tierFor(l.score),
      pinned: true,
    }));
  // ponytail: O(n²) greedy, fine for a few thousand levels.
  let floor: 1 | 2 | 3 = 1; // the tier never drops along the free levels
  for (const slot of slots) {
    const i = Math.max(
      0,
      free.findIndex((l) => allowedAt(slot, l.notability)),
    );
    const [l] = free.splice(i, 1);
    floor = Math.max(floor, slot <= 20 ? 1 : tierFor(l!.score)) as 1 | 2 | 3;
    out.push({ id: l!.id, from: l!.number, to: slot, score: l!.score, tier: floor, pinned: false });
  }
  return out.sort((a, b) => a.to - b.to);
}
