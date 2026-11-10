/**
 * What is open at launch (docs/superpowers/specs/2026-11-10-lancamento-career-path-design.md).
 * Everything else stays in the code, its routes show "Em breve"; reopening is editing these lists.
 * `VITE_LAUNCH_ALL=1` opens everything (the e2e stack, which still tests the closed modes).
 */
import { GAME_MODES, GAME_PATH, type GameMode } from '@decabeca/contracts/modes';

export const LAUNCH_ALL = import.meta.env.VITE_LAUNCH_ALL === '1';

export const LAUNCHED_MODES: readonly GameMode[] = ['CAREER_PATH'];

/** Pages that can be closed. Open pages (album, perfil, conta, entrar, legais, como jogar) are not listed. */
const GATED_PAGES = [
  { key: 'daily', name: 'Desafio do Dia', re: /^\/d(\/|$)/ },
  { key: 'ranking', name: 'Ranking', re: /^\/ranking(\/|$)/ },
  { key: 'leagues', name: 'Ligas', re: /^\/ligas?(\/|$)/ },
  { key: 'fantasy', name: 'Fantasy', re: /^\/fantasy(\/|$)/ },
  { key: 'career', name: 'Modo Carreira', re: /^\/carreira(\/|$)/ },
  { key: 'copa', name: 'Copa dos Sonhos', re: /^\/copa(\/|$)/ },
  { key: 'oficina', name: 'Oficina', re: /^\/(oficina|criador|eventos)(\/|$)/ },
  // Pagamentos (deploy/STRIPE-SETUP.md): the shop, plans and gift redeem ship closed.
  { key: 'clube', name: 'Clube', re: /^\/(clube|presente)(\/|$)/ },
  // Apoie (/apoie): voluntary support on Stripe Checkout; ships closed like the Clube.
  { key: 'apoie', name: 'Apoie', re: /^\/apoie(\/|$)/ },
] as const;
export type PageKey = (typeof GATED_PAGES)[number]['key'];

export const LAUNCHED_PAGES: readonly PageKey[] = [];

export const isModeLaunched = (mode: GameMode, all = LAUNCH_ALL) =>
  all || LAUNCHED_MODES.includes(mode);
export const isPageLaunched = (key: PageKey, all = LAUNCH_ALL) =>
  all || LAUNCHED_PAGES.includes(key);

export type Closed = { name: string; mode?: GameMode };

/** The closed mode or page a path belongs to, or null when it is open (or not a gated route). */
export function closedRoute(pathname: string, all = LAUNCH_ALL): Closed | null {
  if (all) return null;
  for (const [mode, path] of Object.entries(GAME_PATH) as [GameMode, string][])
    if ((pathname === path || pathname.startsWith(`${path}/`)) && !isModeLaunched(mode, all))
      return { name: '', mode };
  const page = GATED_PAGES.find((p) => p.re.test(pathname));
  return page && !isPageLaunched(page.key, all) ? { name: page.name } : null;
}

/** Achievements tied to a game or page; they show only while it is open. Others always show. */
const GATE: Record<string, (all: boolean) => boolean> = {
  'oito-jogos': (all) => GAME_MODES.every((m) => isModeLaunched(m, all)),
  'grid-perfeito': (all) => isModeLaunched('FOOTBALL_GRID', all),
  detetive: (all) => isModeLaunched('IMPOSTOR', all),
  prancheta: (all) => isModeLaunched('MISSING_XI', all),
  'conexao-total': (all) => isModeLaunched('CONNECTIONS', all),
  relogio: (all) => isPageLaunched('ranking', all), // the clock is offered only with the ranking
  'dia-completo': (all) => isPageLaunched('daily', all),
  fregues: (all) => isPageLaunched('daily', all),
  resenha: (all) => isPageLaunched('leagues', all),
};
export const achievementOpen = (id: string, all = LAUNCH_ALL) => GATE[id]?.(all) ?? true;
