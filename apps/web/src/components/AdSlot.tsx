/**
 * Discreet ad slot (ADR-012): small fixed sizes, in the pauses and, as a thin strip away from the
 * controls, at the top of a level. No interstitials, nothing over the game. Google AdSense, never personalised
 * (`requestNonPersonalizedAds = 1`) for anyone: minors are likely to play, and profiling them for
 * ads is forbidden (ECA Digital, Lei 15.211/2025, art. 22), consent or not. Nothing until
 * VITE_ADSENSE_CLIENT is set, so the layout never shows an empty box.
 */
import { useEffect } from 'react';

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

/**
 * One fixed AdSense size everywhere: 320x50 on phones, 468x60 from 768px. The box is reserved
 * before the ad loads (no layout shift) and never grows past it. The larger sizes (320x100,
 * 728x90, 160x600) came back unfilled in production, so they are gone.
 */
const SIZE = 'h-[50px] w-[320px] md:h-[60px] md:w-[468px]';

export function AdSlot({
  slot,
  className = 'mt-10',
}: {
  slot: string;
  className?: string;
}) {
  useEffect(() => {
    if (!CLIENT || !slot) return;
    const ads = (window.adsbygoogle = window.adsbygoogle ?? []);
    // Read by AdSense on each push.
    ads.requestNonPersonalizedAds = 1;
    loadAdSense();
    try {
      ads.push({});
    } catch {
      /* ad blocked or not ready: the slot stays empty */
    }
  }, [slot]);
  if (!CLIENT || !slot) return null;
  return (
    // `.ad-slot` (index.css): the label shows only over a filled ad; an unfilled slot collapses.
    <aside
      aria-label="Publicidade"
      className={`ad-slot mx-auto flex max-w-full flex-col items-center gap-1 overflow-hidden ${className}`}
    >
      <span className="text-[0.65rem] font-semibold tracking-wide text-chalk-soft/60 uppercase">
        Publicidade
      </span>
      <ins
        className={`adsbygoogle inline-block ${SIZE}`}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
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
  /** Inside a level (AdSense unit "fase"); empty = no ad in the level. */
  level: (import.meta.env.VITE_ADSENSE_SLOT_LEVEL as string | undefined) ?? '',
};
