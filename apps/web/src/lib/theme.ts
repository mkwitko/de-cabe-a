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

/** "system" removes data-theme so the CSS follows prefers-color-scheme. */
export function applyTheme(t: ThemeChoice) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
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
