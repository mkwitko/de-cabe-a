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

/** Hint mask: first letter, then one underscore per hidden letter, per word ("R______ _______"). */
export const hintMask = (initial: string, pattern: number[]) =>
  pattern
    .map((n, i) => (i === 0 ? initial + '_'.repeat(Math.max(0, n - 1)) : '_'.repeat(n)))
    .join(' ');

/** Title thresholds in total stars; mirrors titleFor in packages/engine/src/stars.ts (web may not import the engine). */
export const TITLE_LADDER = [
  { name: 'Peneira', min: 0, tone: 'oklch(0.82 0.02 150)', perk: 'Camisa de teste' },
  { name: 'Base', min: 10, tone: 'oklch(0.76 0.1 60)', perk: 'Moldura de bronze' },
  { name: 'Reserva', min: 25, tone: 'oklch(0.82 0.03 250)', perk: 'Moldura de prata' },
  { name: 'Titular', min: 50, tone: 'oklch(0.82 0.11 150)', perk: 'Moldura verde de titular' },
  { name: 'Capitão', min: 100, tone: 'oklch(0.8 0.1 225)', perk: 'Braçadeira azul' },
  { name: 'Craque', min: 175, tone: 'oklch(0.87 0.16 95)', perk: 'Moldura de ouro' },
  { name: 'Ídolo', min: 275, tone: 'oklch(0.78 0.16 55)', perk: 'Moldura de ídolo' },
  { name: 'Lenda', min: 400, tone: 'oklch(0.76 0.17 22)', perk: 'Moldura de lenda' },
  { name: 'Imortal', min: 600, tone: 'oklch(0.78 0.12 320)', perk: 'Moldura imortal' },
  { name: 'Rei da Bola', min: 900, tone: 'oklch(0.92 0.15 95)', perk: 'Coroa e moldura dourada' },
] as const;

export const titleTone = (name: string) =>
  TITLE_LADDER.find((t) => t.name === name)?.tone ?? TITLE_LADDER[0].tone;

/** The title this level's stars earned (total is after the level), or null if the title did not change. */
export function promotedTo(totalStars: number, levelStars: number): string | null {
  const at = (n: number) => TITLE_LADDER.findLast((t) => n >= t.min)!.name;
  const now = at(totalStars);
  return levelStars > 0 && now !== at(totalStars - levelStars) ? now : null;
}
