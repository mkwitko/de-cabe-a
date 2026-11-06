/**
 * Non-intrusive ad slot (ADR-012): only between moments of play (end of a track page, under a
 * level result, foot of the home), never during a level. Google AdSense, non-personalised ads
 * (no tracking-based targeting). Renders nothing until VITE_ADSENSE_CLIENT is set, so the
 * layout never shows an empty box.
 */
import { useEffect, useRef } from 'react';

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  }
}

let loaded = false;
function loadAdSense() {
  if (loaded || !CLIENT) return;
  loaded = true;
  window.adsbygoogle = window.adsbygoogle ?? [];
  // Non-personalised ads only (LGPD-friendly: no profile built from the player's browsing).
  window.adsbygoogle.requestNonPersonalizedAds = 1;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(s);
}

export function AdSlot({ slot }: { slot: string }) {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!CLIENT || !slot) return;
    loadAdSense();
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      /* ad blocked or not ready: the slot stays empty */
    }
  }, [slot]);
  if (!CLIENT || !slot) return null;
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
