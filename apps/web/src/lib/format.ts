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

/** A metal frame: light, dark, light again along the diagonal. */
const metal = (light: string, dark: string) =>
  `linear-gradient(135deg, ${light}, ${dark} 45%, ${light} 70%, ${dark})`;

/**
 * Title thresholds in total stars; mirrors titleFor in packages/engine/src/stars.ts (web may not
 * import the engine). Each title has its colour (`tone`, the card field, ink text on it), its
 * badge emblem and its reward: the frame around the member card (`frame`, a CSS background).
 */
export const TITLE_LADDER = [
  {
    name: 'Peneira',
    min: 0,
    tone: 'oklch(0.88 0.17 128)',
    emblem: 'cone',
    perk: 'Camisa de teste',
    frame: 'var(--color-paper)',
  },
  {
    name: 'Base',
    min: 10,
    tone: 'oklch(0.78 0.11 60)',
    emblem: 'ball',
    perk: 'Moldura de bronze',
    frame: metal('oklch(0.78 0.1 60)', 'oklch(0.52 0.09 50)'),
  },
  {
    name: 'Reserva',
    min: 25,
    tone: 'oklch(0.86 0.035 245)',
    emblem: '12',
    perk: 'Moldura de prata',
    frame: metal('oklch(0.94 0.01 250)', 'oklch(0.66 0.02 250)'),
  },
  {
    name: 'Titular',
    min: 50,
    tone: 'oklch(0.8 0.15 155)',
    emblem: 'shirt',
    perk: 'Moldura verde de titular',
    frame: metal('oklch(0.72 0.15 155)', 'oklch(0.45 0.1 155)'),
  },
  {
    name: 'Capitão',
    min: 100,
    tone: 'oklch(0.8 0.11 235)',
    emblem: 'C',
    perk: 'Braçadeira azul',
    frame: metal('oklch(0.72 0.13 240)', 'oklch(0.45 0.12 255)'),
  },
  {
    name: 'Craque',
    min: 175,
    tone: 'oklch(0.87 0.16 92)',
    emblem: 'star',
    perk: 'Moldura de ouro',
    frame: metal('oklch(0.9 0.14 92)', 'oklch(0.62 0.12 75)'),
  },
  {
    name: 'Ídolo',
    min: 275,
    tone: 'oklch(0.79 0.15 50)',
    emblem: 'stars2',
    perk: 'Moldura de ídolo',
    frame: metal('oklch(0.78 0.16 50)', 'oklch(0.52 0.16 35)'),
  },
  {
    name: 'Lenda',
    min: 400,
    tone: 'oklch(0.74 0.16 22)',
    emblem: 'stars3',
    perk: 'Moldura de lenda',
    frame: metal('oklch(0.66 0.19 25)', 'oklch(0.42 0.14 20)'),
  },
  {
    name: 'Imortal',
    min: 600,
    tone: 'oklch(0.76 0.13 310)',
    emblem: 'ring',
    perk: 'Moldura imortal',
    frame: metal('oklch(0.72 0.15 305)', 'oklch(0.42 0.14 295)'),
  },
  {
    name: 'Rei da Bola',
    min: 900,
    tone: 'oklch(0.92 0.15 95)',
    emblem: 'crown',
    perk: 'Coroa e moldura dourada',
    frame: metal('oklch(0.95 0.12 98)', 'oklch(0.66 0.14 80)'),
  },
] as const;
export type TitleEmblem = (typeof TITLE_LADDER)[number]['emblem'];

const titleOf = (name: string) => TITLE_LADDER.find((t) => t.name === name) ?? TITLE_LADDER[0];
export const titleTone = (name: string) => titleOf(name).tone;
export const titleFrame = (name: string) => titleOf(name).frame;
export const titleEmblem = (name: string): TitleEmblem => titleOf(name).emblem;

/** The title this level's stars earned (total is after the level), or null if the title did not change. */
export function promotedTo(totalStars: number, levelStars: number): string | null {
  const at = (n: number) => TITLE_LADDER.findLast((t) => n >= t.min)!.name;
  const now = at(totalStars);
  return levelStars > 0 && now !== at(totalStars - levelStars) ? now : null;
}
