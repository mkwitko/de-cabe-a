/**
 * Modo Carreira (docs/GAME_DESIGN/CAREER_MODE.md): pure rules for the player's own footballer.
 * Attributes grow from training (stars earned in the minigames); matches are simulated with a
 * seeded random generator, so a stored seed always gives the same result.
 */
export const ATTRIBUTES = ['finishing', 'passing', 'vision', 'defending', 'physical'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];
export type Attributes = Record<Attribute, number>;
export type CareerPosition = 'GK' | 'DF' | 'MF' | 'FW';

/** Which attribute each minigame trains. */
export const TRAINS: Record<string, Attribute> = {
  CAREER_PATH: 'vision',
  FOOTBALL_GRID: 'passing',
  IMPOSTOR: 'defending',
  TIMELINE: 'physical',
  HIGHER_LOWER: 'finishing',
  MISSING_XI: 'vision',
  MYSTERY_PLAYER: 'finishing',
  CONNECTIONS: 'passing',
};

/** Stars that count as training per day; the rest still count for ranking and titles. */
export const DAILY_TRAINING_CAP = 15;
/** Training points needed for a match. */
export const TRAINING_PER_MATCH = 3;
export const MATCHES_PER_SEASON = 10;

const WEIGHTS: Record<CareerPosition, Attributes> = {
  FW: { finishing: 0.4, passing: 0.15, vision: 0.2, defending: 0.05, physical: 0.2 },
  MF: { finishing: 0.15, passing: 0.3, vision: 0.3, defending: 0.1, physical: 0.15 },
  DF: { finishing: 0.05, passing: 0.2, vision: 0.15, defending: 0.4, physical: 0.2 },
  GK: { finishing: 0, passing: 0.15, vision: 0.25, defending: 0.4, physical: 0.2 },
};

export function startingAttributes(position: CareerPosition): Attributes {
  const base = { finishing: 42, passing: 44, vision: 44, defending: 42, physical: 46 };
  const best = { FW: 'finishing', MF: 'passing', DF: 'defending', GK: 'defending' } as const;
  return { ...base, [best[position]]: 50 };
}

export const overall = (a: Attributes, p: CareerPosition) =>
  Math.round(ATTRIBUTES.reduce((s, k) => s + a[k] * WEIGHTS[p][k], 0));

/** Points for the next +1: dearer as the attribute grows (3 up to 69, 4 up to 84, then 5). */
export const costOf = (value: number) => (value < 70 ? 3 : value < 85 ? 4 : 5);

/** Spends banked training points on an attribute; returns the new value and the leftover. */
export function train(value: number, points: number): { value: number; left: number } {
  let v = value;
  let left = points;
  while (v < 99 && left >= costOf(v)) {
    left -= costOf(v);
    v++;
  }
  return { value: v, left };
}

/** mulberry32: small, fast, seedable. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poisson sample (small means). */
function poisson(mean: number, r: () => number) {
  const l = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > l);
  return k - 1;
}

export interface MatchInput {
  overall: number;
  position: CareerPosition;
  /** 0–100 team strengths. */
  team: number;
  opponent: number;
  home: boolean;
  seed: number;
}
export interface MatchResult {
  teamGoals: number;
  opponentGoals: number;
  playerGoals: number;
  assists: number;
  /** 0–10, one decimal. */
  rating: number;
}

/**
 * The player lifts the team in proportion to how far their overall is above the team's level;
 * goals per side are Poisson around a mean set by the strength gap; the player's share of the
 * team's goals depends on position and overall.
 */
export function simulateMatch(m: MatchInput): MatchResult {
  const r = rng(m.seed);
  const lift = (m.overall - m.team) * 0.25;
  const diff = m.team + lift - m.opponent + (m.home ? 4 : -2);
  const teamMean = Math.max(0.3, 1.35 + diff / 25);
  const oppMean = Math.max(0.3, 1.25 - diff / 30);
  const teamGoals = poisson(teamMean, r);
  const opponentGoals = poisson(oppMean, r);
  const share = { FW: 0.42, MF: 0.2, DF: 0.07, GK: 0 }[m.position] * (0.6 + m.overall / 100);
  const assistShare = { FW: 0.2, MF: 0.3, DF: 0.1, GK: 0.02 }[m.position];
  let playerGoals = 0;
  let assists = 0;
  for (let g = 0; g < teamGoals; g++) {
    const x = r();
    if (x < share) playerGoals++;
    else if (x < share + assistShare) assists++;
  }
  const result = teamGoals > opponentGoals ? 0.6 : teamGoals === opponentGoals ? 0 : -0.6;
  const keeper = m.position === 'GK' ? (opponentGoals === 0 ? 1.2 : -0.3 * opponentGoals) : 0;
  const defender = m.position === 'DF' && opponentGoals === 0 ? 0.6 : 0;
  const rating =
    5.8 +
    (m.overall - 50) / 25 +
    playerGoals * 1.1 +
    assists * 0.6 +
    result +
    keeper +
    defender +
    (r() - 0.5);
  return {
    teamGoals,
    opponentGoals,
    playerGoals,
    assists,
    rating: Math.round(Math.min(10, Math.max(3, rating)) * 10) / 10,
  };
}

/** Career ladder; offers come from the same level or the next one. */
export const TIERS = ['BASE', 'C', 'B', 'A', 'LIB', 'EUR', 'UCL'] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_STRENGTH: Record<Tier, number> = {
  BASE: 48,
  C: 54,
  B: 61,
  A: 69,
  LIB: 74,
  EUR: 78,
  UCL: 84,
};
/** Overall a club of the tier looks for. */
export const TIER_BAR: Record<Tier, number> = {
  BASE: 0,
  C: 52,
  B: 58,
  A: 64,
  LIB: 70,
  EUR: 75,
  UCL: 81,
};

/** Tiers that make offers at the end of a season, from the player's numbers. */
export function offerTiers(o: { tier: Tier; overall: number; avgRating: number }): Tier[] {
  const i = TIERS.indexOf(o.tier);
  const next = TIERS[i + 1];
  const tiers: Tier[] = [];
  if (next && o.overall >= TIER_BAR[next] - 2 && o.avgRating >= 6.5) tiers.push(next);
  if (next && o.overall >= TIER_BAR[next] + 3 && o.avgRating >= 7.2) tiers.push(next);
  // A club of the same level always wants a good season.
  if (o.tier !== 'BASE' && o.avgRating >= 6.2) tiers.push(o.tier);
  // From the youth team: the first team, or a loan to Série C when not ready yet.
  if (o.tier === 'BASE' && !tiers.length) tiers.push('C');
  return tiers.slice(0, 3);
}

/** Headline for a match: our own text, in the "resenha" voice; picks a template with the seed. */
export function headline(o: {
  name: string;
  club: string;
  opponent: string;
  result: MatchResult;
  seed: number;
}): string {
  const { result: x, name, club, opponent } = o;
  const r = rng(o.seed ^ 0x9e3779b9);
  const pick = (xs: string[]) => xs[Math.floor(r() * xs.length)]!;
  const won = x.teamGoals > x.opponentGoals;
  const lost = x.teamGoals < x.opponentGoals;
  if (x.playerGoals >= 3)
    return pick([
      `${name} faz chover: hat-trick contra o ${opponent}!`,
      `Três de ${name}! ${club} atropela o ${opponent}.`,
    ]);
  if (x.playerGoals === 2)
    return pick([
      `${name} marca duas vezes e é o nome do jogo.`,
      `Doblete de ${name} contra o ${opponent}.`,
    ]);
  if (x.playerGoals === 1 && won)
    return pick([
      `${name} decide e o ${club} vence o ${opponent}.`,
      `Gol de ${name}, festa do ${club}.`,
    ]);
  if (x.assists >= 2) return pick([`${name}, o garçom: duas assistências contra o ${opponent}.`]);
  if (x.rating >= 8)
    return pick([
      `Atuação de gala: ${name} leva nota ${x.rating.toFixed(1)}.`,
      `${name} jogou por música contra o ${opponent}.`,
    ]);
  if (lost && x.rating < 5.5)
    return pick([
      `Noite para esquecer: ${club} perde para o ${opponent}.`,
      `${name} some e o ${club} sai derrotado.`,
    ]);
  if (!won && !lost)
    return pick([
      `Empate truncado entre ${club} e ${opponent}.`,
      `${club} e ${opponent} ficam no ${x.teamGoals} a ${x.opponentGoals}.`,
    ]);
  return won
    ? `${club} vence o ${opponent} por ${x.teamGoals} a ${x.opponentGoals}.`
    : `${club} perde para o ${opponent} por ${x.opponentGoals} a ${x.teamGoals}.`;
}
