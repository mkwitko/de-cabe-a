/**
 * What is open at launch (docs/superpowers/specs/2026-11-10-lancamento-career-path-design.md).
 * Everything else stays in the code, its routes show "Em breve"; reopening is editing these lists.
 * `VITE_LAUNCH_ALL=1` opens everything (the e2e stack, which still tests the closed modes).
 */
import { GAME_PATH, type GameMode } from '@decabeca/contracts';

export const LAUNCH_ALL = import.meta.env.VITE_LAUNCH_ALL === '1';

export const LAUNCHED_MODES: readonly GameMode[] = ['CAREER_PATH'];

/** Pages that can be closed. Open pages (album, perfil, conta, legais, como jogar) are not listed. */
const GATED_PAGES = [
  { key: 'daily', name: 'Desafio do Dia', re: /^\/d(\/|$)/ },
  { key: 'ranking', name: 'Ranking', re: /^\/ranking(\/|$)/ },
  { key: 'leagues', name: 'Ligas', re: /^\/ligas?(\/|$)/ },
  { key: 'fantasy', name: 'Fantasy', re: /^\/fantasy(\/|$)/ },
  { key: 'career', name: 'Modo Carreira', re: /^\/carreira(\/|$)/ },
  { key: 'copa', name: 'Copa dos Sonhos', re: /^\/copa(\/|$)/ },
  { key: 'oficina', name: 'Oficina', re: /^\/(oficina|criador|eventos)(\/|$)/ },
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
