/**
 * Cookie and tracking consent (LGPD). Two optional choices, off until the player says yes:
 * `analytics` (PostHog) and `ads` (Google AdSense). The strictly necessary session cookie needs
 * no consent. The choice lives in localStorage, can be changed at any time (footer, Conta) and
 * every subscriber (PostHog, AdSense, the banner) follows it.
 */
import { useSyncExternalStore } from 'react';

export type Consent = { analytics: boolean; ads: boolean };

const KEY = 'dc_consent_v1';
const OLD_ADS_KEY = 'dc_ads_consent';

/** Whether there is anything optional to ask about in this build. */
export const CONSENT_NEEDED = Boolean(
  import.meta.env.VITE_POSTHOG_KEY || import.meta.env.VITE_ADSENSE_CLIENT,
);

let current: Consent | null = read();
let panelOpen = false;
const listeners = new Set<() => void>();

function read(): Consent | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Consent> | null;
    if (v && typeof v.analytics === 'boolean' && typeof v.ads === 'boolean')
      return { analytics: v.analytics, ads: v.ads };
    // The old ads-only banner ("personalized" | "basic") is not valid consent for the new scope.
    localStorage.removeItem(OLD_ADS_KEY);
  } catch {
    /* private mode: asked again on every visit */
  }
  return null;
}

const emit = () => listeners.forEach((l) => l());

export const getConsent = () => current;

export function setConsent(c: Consent) {
  current = c;
  panelOpen = false;
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* kept for this visit only */
  }
  emit();
}

/** The footer and Conta reopen the settings panel. */
export function openConsentPanel() {
  panelOpen = true;
  emit();
}
export function closeConsentPanel() {
  panelOpen = false;
  emit();
}

export function subscribeConsent(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export const useConsent = () => useSyncExternalStore(subscribeConsent, getConsent, getConsent);
export const useConsentPanelOpen = () =>
  useSyncExternalStore(
    subscribeConsent,
    () => panelOpen,
    () => false,
  );
