/**
 * Non-intrusive ad slot (ADR-012): only between moments of play (end of a track page, under a
 * level result, foot of the home), never during a level. Google AdSense: personalised ads only
 * for players who accepted them in the consent banner, non-personalised for everyone else.
 * Renders nothing until VITE_ADSENSE_CLIENT is set, so the layout never shows an empty box.
 */
import { useEffect, useRef, useState } from 'react';

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  }
}

const CONSENT_KEY = 'dc_ads_consent';
export type AdConsent = 'personalized' | 'basic';
export const readConsent = (): AdConsent | null => {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'personalized' || v === 'basic' ? v : null;
  } catch {
    return null;
  }
};
export const ADS_ENABLED = Boolean(CLIENT);

let loaded = false;
function loadAdSense() {
  if (loaded || !CLIENT) return;
  loaded = true;
  window.adsbygoogle = window.adsbygoogle ?? [];
  // LGPD: profile-based (personalised) ads only with the player's consent.
  window.adsbygoogle.requestNonPersonalizedAds = readConsent() === 'personalized' ? 0 : 1;
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

/**
 * Ad choice banner (LGPD), shown once and only when ads are on. Either answer is fine: ads appear
 * in both cases, only their targeting changes. The choice can be changed in /privacidade.
 */
export function AdConsentBanner() {
  const [choice, setChoice] = useState(readConsent);
  if (!CLIENT || choice) return null;
  const decide = (c: AdConsent) => {
    try {
      localStorage.setItem(CONSENT_KEY, c);
    } catch {
      /* private mode: asked again next visit */
    }
    setChoice(c);
    // AdSense reads the flag when it loads; a reload applies the new choice to slots on screen.
    if (loaded) location.reload();
  };
  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-2xl flex-col gap-3 rounded-xl bg-paper p-4 text-ink shadow-[0_18px_40px_-12px_rgb(0_0_0/0.55)] sm:bottom-6"
    >
      <p id="consent-title" className="font-semibold">
        O De Cabeça é grátis graças aos anúncios, que nunca aparecem durante as fases.
      </p>
      <p className="text-sm">
        Podemos mostrar anúncios do seu interesse (o Google usa cookies para isso) ou só anúncios
        comuns. Você muda quando quiser em{' '}
        <a href="/privacidade" className="underline underline-offset-4">
          Privacidade
        </a>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="font-condensed rounded-lg bg-ink px-4 py-2 font-extrabold text-paper uppercase"
          onClick={() => decide('personalized')}
        >
          Aceitar anúncios do meu interesse
        </button>
        <button
          className="font-condensed rounded-lg border-2 border-ink/40 px-4 py-2 font-extrabold uppercase"
          onClick={() => decide('basic')}
        >
          Só anúncios comuns
        </button>
      </div>
    </div>
  );
}

/** For /privacidade: shows the current choice and lets the player change it. */
export function AdConsentChoice() {
  const [choice, setChoice] = useState(readConsent);
  if (!CLIENT) return null;
  const set = (c: AdConsent) => {
    try {
      localStorage.setItem(CONSENT_KEY, c);
    } catch {
      /* ignore */
    }
    setChoice(c);
  };
  return (
    <p className="flex flex-wrap items-center gap-3">
      Sua escolha:{' '}
      <strong>
        {choice === 'personalized' ? 'anúncios do seu interesse' : 'só anúncios comuns'}
      </strong>
      <button
        className="underline underline-offset-4"
        onClick={() => set(choice === 'personalized' ? 'basic' : 'personalized')}
      >
        Trocar
      </button>
    </p>
  );
}
