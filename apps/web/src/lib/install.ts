/**
 * "Instalar o app" (PWA). Chrome/Android hands over `beforeinstallprompt`, kept here to show our
 * own invitation; iOS has no prompt, only Compartilhar → Adicionar à Tela de Início. Nothing shows
 * when the app already runs installed. The invitation after a level can be dismissed for good;
 * Ajustes always offers it.
 */
import { useSyncExternalStore } from 'react';

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
export type InstallKind = 'prompt' | 'ios' | null;

let deferred: PromptEvent | null = null;
let dismissed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const KEY = 'dc_install_dismissed';

/** Pure, for the test: which invitation this device gets. */
export function installKind(o: {
  ua: string;
  touchPoints: number;
  standalone: boolean;
  prompt: boolean;
}): InstallKind {
  if (o.standalone) return null;
  if (o.prompt) return 'prompt';
  const ios = /iphone|ipad|ipod/i.test(o.ua) || (/macintosh/i.test(o.ua) && o.touchPoints > 1);
  return ios ? 'ios' : null;
}

const current = (): InstallKind =>
  typeof window === 'undefined'
    ? null
    : installKind({
        ua: navigator.userAgent,
        touchPoints: navigator.maxTouchPoints,
        standalone:
          matchMedia('(display-mode: standalone)').matches ||
          (navigator as { standalone?: boolean }).standalone === true,
        prompt: deferred !== null,
      });

/** Called once at boot, before the browser fires the event. */
export function initInstall() {
  try {
    dismissed = localStorage.getItem(KEY) === '1';
  } catch {
    /* private mode: ask again next visit */
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // our card instead of the mini-infobar
    deferred = e as PromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export async function promptInstall() {
  const e = deferred;
  if (!e) return;
  deferred = null; // a prompt event works once
  await e.prompt();
  emit();
}

export function dismissInstall() {
  dismissed = true;
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* private mode */
  }
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useInstall = () => ({
  kind: useSyncExternalStore(subscribe, current, () => null),
  dismissed: useSyncExternalStore(
    subscribe,
    () => dismissed,
    () => true,
  ),
});
