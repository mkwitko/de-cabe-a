import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'dc-theme';
const listeners = new Set<() => void>();

export function getTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Browser chrome colour per theme (same values as the theme-color metas in index.html). */
const CHROME = { light: '#bfe8c4', dark: '#0f1f16' } as const;

/** "system" removes data-theme so the CSS follows prefers-color-scheme. */
export function applyTheme(t: ThemeChoice) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  // Each meta keeps its media query; an explicit choice paints both with that theme.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = CHROME[t === 'system' ? (m.media.includes('dark') ? 'dark' : 'light') : t];
  });
}

export function setTheme(t: ThemeChoice) {
  try {
    if (t === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    // private mode: the choice lasts until reload
  }
  applyTheme(t);
  listeners.forEach((l) => l());
}

export function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  const t = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getTheme,
    () => 'system' as const,
  );
  return [t, setTheme];
}

export const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
};
