/** Stars 0–3 per finished level, from the engine score (ADR-007). */
export function starsFor(engine: 'career-path' | 'football-grid', score: number): 0 | 1 | 2 | 3 {
  if (engine === 'career-path') {
    // score = (7 - attempts) * 10: 1–2 attempts -> 3, 3–4 -> 2, 5–6 -> 1, lost -> 0
    return score >= 50 ? 3 : score >= 30 ? 2 : score >= 10 ? 1 : 0;
  }
  return score === 9 ? 3 : score >= 6 ? 2 : score >= 3 ? 1 : 0;
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
