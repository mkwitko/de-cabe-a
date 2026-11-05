/** PT-BR display helpers for career data. */
const regions = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

export const countryName = (code: string) => {
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
};

/** "2009 – 2013", "desde 2023", "2013" (same year), "—" (unknown). */
export function yearsLabel(from: number | null, to: number | null): string {
  if (from === null) return '—';
  if (to === null) return `desde ${from}`;
  return from === to ? String(from) : `${from} – ${to}`;
}

/** Time at the club from year-precision dates: "menos de 1 ano", "1 ano", "4 anos"; null when open or unknown. */
export function durationLabel(from: number | null, to: number | null): string | null {
  if (from === null || to === null) return null;
  const n = to - from;
  return n <= 0 ? 'menos de 1 ano' : n === 1 ? '1 ano' : `${n} anos`;
}

/** "47 jogos · 44 gols", "47 jogos", null. */
export function statsLabel(apps: number | null, goals: number | null): string | null {
  const parts = [
    apps !== null ? `${apps} ${apps === 1 ? 'jogo' : 'jogos'}` : null,
    goals !== null ? `${goals} ${goals === 1 ? 'gol' : 'gols'}` : null,
  ];
  return parts.filter(Boolean).join(' · ') || null;
}

export const POSITION_LABEL = {
  GK: 'Goleiro',
  DF: 'Defensor',
  MF: 'Meio-campista',
  FW: 'Atacante',
} as const;
