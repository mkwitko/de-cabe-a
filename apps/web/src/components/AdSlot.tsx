/**
 * Non-intrusive ad slot (ADR-012): only between moments of play (end of a track page, under a
 * level result, foot of the home), never during a level. Google AdSense: the script is loaded
 * only after the player accepted ads in the consent banner (LGPD); until then, and after a
 * refusal, nothing is requested and the slot renders nothing. Also nothing until
 * VITE_ADSENSE_CLIENT is set, so the layout never shows an empty box.
 */
import { useEffect, useRef } from 'react';
import { useConsent } from '../lib/consent';

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  }
}

export const ADS_ENABLED = Boolean(CLIENT);

let loaded = false;
function loadAdSense() {
  if (loaded || !CLIENT) return;
  loaded = true;
  window.adsbygoogle = window.adsbygoogle ?? [];
  // Only called after the player accepted ads (LGPD), so they may be personalised.
  window.adsbygoogle.requestNonPersonalizedAds = 0;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(s);
}

export function AdSlot({ slot }: { slot: string }) {
  const ref = useRef<HTMLModElement>(null);
  const allowed = useConsent()?.ads === true;
  useEffect(() => {
    if (!CLIENT || !slot || !allowed) return;
    loadAdSense();
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      /* ad blocked or not ready: the slot stays empty */
    }
  }, [slot, allowed]);
  if (!CLIENT || !slot || !allowed) return null;
  return (
    <aside aria-label="Publicidade" className="mx-auto flex w-full max-w-3xl flex-col gap-1">
      <span className="text-xs font-semibold tracking-wide text-chalk-soft/70 uppercase">
        Publicidade
      </span>
      <ins
        ref={ref}
        className="adsbygoogle block min-h-[100px] overflow-hidden rounded-lg bg-chalk/[0.04]"
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

/** Slot ids from AdSense (one per placement), set at build time. */
export const AD_SLOTS = {
  track: (import.meta.env.VITE_ADSENSE_SLOT_TRACK as string | undefined) ?? '',
  result: (import.meta.env.VITE_ADSENSE_SLOT_RESULT as string | undefined) ?? '',
  home: (import.meta.env.VITE_ADSENSE_SLOT_HOME as string | undefined) ?? '',
};
