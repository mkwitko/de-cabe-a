/**
 * Non-intrusive ad slot (ADR-012): only between moments of play (end of a track page, under a
 * level result, foot of the home), never during a level. Google AdSense for everyone, but
 * personalised only after the player accepted ads in the consent banner (LGPD); before a choice
 * and after a refusal, ads are non-personalised (`requestNonPersonalizedAds = 1`). Nothing until
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
    if (!CLIENT || !slot) return;
    const ads = (window.adsbygoogle = window.adsbygoogle ?? []);
    // Read by AdSense on each push: personalised only with consent (LGPD).
    ads.requestNonPersonalizedAds = allowed ? 0 : 1;
    loadAdSense();
    try {
      ads.push({});
    } catch {
      /* ad blocked or not ready: the slot stays empty */
    }
  }, [slot, allowed]);
  if (!CLIENT || !slot) return null;
  return (
    // 150px+ clear of any button above it: Google's spacing for ads near games (accidental clicks).
    <aside
      aria-label="Publicidade"
      className="mx-auto mt-[152px] flex w-full max-w-3xl flex-col gap-1"
    >
      <span className="text-xs font-semibold tracking-wide text-chalk-soft/70 uppercase">
        Publicidade
      </span>
      <ins
        key={String(allowed)}
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
  album: (import.meta.env.VITE_ADSENSE_SLOT_ALBUM as string | undefined) ?? '',
  profile: (import.meta.env.VITE_ADSENSE_SLOT_PROFILE as string | undefined) ?? '',
};
