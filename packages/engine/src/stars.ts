/** Stars 0–3 per finished level, from the engine score (ADR-007). */
export function starsFor(
  engine:
    | 'career-path'
    | 'football-grid'
    | 'impostor'
    | 'timeline'
    | 'higher-lower'
    | 'missing-xi'
    | 'mystery-player'
    | 'connections'
    | 'draft',
  score: number,
  opts: { hintsUsed?: number } = {},
): 0 | 1 | 2 | 3 {
  if (engine === 'career-path') {
    // score = (7 - attempts) * 10: 1–2 attempts -> 3, 3–4 -> 2, 5–6 -> 1, lost -> 0
    return score >= 50 ? 3 : score >= 30 ? 2 : score >= 10 ? 1 : 0;
  }
  // Draft: right picks out of 11.
  if (engine === 'draft') return score >= 10 ? 3 : score >= 7 ? 2 : score >= 4 ? 1 : 0;
  // Conexões: 10 per group + mistakes left when all four are found.
  if (engine === 'connections') return score >= 43 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
  // Craque Misterioso: score = 9 - guesses (8 = first guess).
  if (engine === 'mystery-player') return score >= 6 ? 3 : score >= 4 ? 2 : score >= 1 ? 1 : 0;
  // Escalação: share of hidden players found, 0–100.
  if (engine === 'missing-xi') return score === 100 ? 3 : score >= 70 ? 2 : score >= 40 ? 1 : 0;
  // Impostor: right picks out of 5.
  if (engine === 'impostor' || engine === 'timeline' || engine === 'higher-lower')
    return score === 5 ? 3 : score === 4 ? 2 : score === 3 ? 1 : 0;
  const stars = score === 9 ? 3 : score >= 6 ? 2 : score >= 3 ? 1 : 0;
  // A grid solved with hints is worth at most 2 stars.
  return opts.hintsUsed ? (Math.min(stars, 2) as 0 | 1 | 2) : stars;
}

const TITLES = [
  { name: 'Reserva', min: 0 },
  { name: 'Titular', min: 15 },
  { name: 'Craque', min: 60 },
  { name: 'Lenda', min: 150 },
] as const;

/** Player title by total stars, and what is missing for the next one. */
export function titleFor(stars: number): {
  name: string;
  next: { name: string; missing: number } | null;
} {
  const i = TITLES.findLastIndex((t) => stars >= t.min);
  const next = TITLES[i + 1];
  return {
    name: TITLES[i]!.name,
    next: next ? { name: next.name, missing: next.min - stars } : null,
  };
}
