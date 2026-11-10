import { useEffect, useState } from 'react';
import { onSoundChange, setSound, soundOn } from '../lib/sound';
import { musicOn, onMusicChange, setMusic } from '../lib/music';
import { hapticsOn, hapticsSupported, onHapticsChange, setHaptics } from '../lib/haptics';

/** Efeitos (sound effects) on/off, off by default; the state lives on the device. */
export function SoundToggle({ withLabel = false }: { withLabel?: boolean }) {
  const [on, setOn] = useState(soundOn);
  useEffect(() => onSoundChange(setOn), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setSound(!on)}
      className={
        withLabel
          ? `flex min-h-11 items-center gap-3 font-semibold ${on ? 'text-gold' : 'text-chalk'}`
          : `font-condensed flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-lg font-extrabold tracking-wide uppercase ${on ? 'text-gold' : 'text-chalk-soft hover:text-chalk'}`
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {on ? (
          <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
        ) : (
          <path d="M17 9l5 6M22 9l-5 6" />
        )}
      </svg>
      {withLabel ? (on ? 'Efeitos ligados' : 'Efeitos desligados') : 'Efeitos'}
    </button>
  );
}

/** Música on/off, off by default; separate from Efeitos. */
export function MusicToggle({ withLabel = false }: { withLabel?: boolean }) {
  const [on, setOn] = useState(musicOn);
  useEffect(() => onMusicChange(setOn), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setMusic(!on)}
      className={
        withLabel
          ? `flex min-h-11 items-center gap-3 font-semibold ${on ? 'text-gold' : 'text-chalk'}`
          : `font-condensed flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-lg font-extrabold tracking-wide uppercase ${on ? 'text-gold' : 'text-chalk-soft hover:text-chalk'}`
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V6l11-2v12" />
        <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
        <circle cx="17.5" cy="16" r="2.5" fill="currentColor" />
        {!on && <path d="M3 3l18 18" />}
      </svg>
      {withLabel ? (on ? 'Música ligada' : 'Música desligada') : 'Música'}
    </button>
  );
}

const OFFER_KEY = 'dc_sound_offer';

/** The one-time "Ligar som?" is still to be asked: never answered, and both sounds still off. */
export function soundOfferPending(): boolean {
  try {
    if (localStorage.getItem(OFFER_KEY) === '1') return false;
  } catch {
    return false; // no storage: it would ask on every visit
  }
  return !musicOn() && !soundOn();
}

/** The player's answer, kept on the device; "yes" turns on Música and Efeitos together. */
export function answerSoundOffer(on: boolean) {
  try {
    localStorage.setItem(OFFER_KEY, '1');
  } catch {
    /* ask again next visit */
  }
  if (on) {
    setMusic(true);
    setSound(true);
  }
}

/**
 * The offer in the page flow, above the passport when the first-run tutorial (whose last step
 * asks the same) is not showing. In the flow, never floating, so it never covers the guess dock.
 */
export function SoundOffer() {
  const [pending, setPending] = useState(soundOfferPending);
  if (!pending) return null;
  const answer = (on: boolean) => {
    answerSoundOffer(on);
    setPending(false);
  };
  return (
    <div
      role="group"
      aria-labelledby="sound-offer"
      className="mx-auto flex w-full max-w-2xl shrink-0 items-center gap-2 rounded-xl border border-chalk/20 bg-pitch-deep py-1 pr-1 pl-3 motion-safe:animate-[paste_420ms_var(--ease-out-expo)]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5 shrink-0 text-gold max-[380px]:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V6l11-2v12" />
        <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
        <circle cx="17.5" cy="16" r="2.5" fill="currentColor" />
      </svg>
      <p id="sound-offer" className="min-w-0 flex-1 leading-tight font-semibold text-chalk">
        <span className="block whitespace-nowrap">Ligar som?</span>
        <span className="block text-sm font-medium whitespace-nowrap text-chalk-soft">
          Música e efeitos
        </span>
      </p>
      <button
        type="button"
        onClick={() => answer(false)}
        className="min-h-11 shrink-0 px-1.5 text-sm font-semibold text-chalk-soft hover:text-chalk"
      >
        Agora não
      </button>
      <button
        type="button"
        onClick={() => answer(true)}
        className="font-condensed min-h-11 shrink-0 rounded-lg bg-cover px-4 text-lg font-extrabold tracking-wide text-ink uppercase"
      >
        Ligar
      </button>
    </div>
  );
}

/** Vibration on/off, shown only where the phone can vibrate. */
export function HapticsToggle() {
  const [on, setOn] = useState(hapticsOn);
  useEffect(() => onHapticsChange(setOn), []);
  if (!hapticsSupported()) return null;
  return (
    <label className="flex min-h-11 items-center gap-3 font-semibold">
      <input
        type="checkbox"
        className="size-5 accent-cover"
        checked={on}
        onChange={(e) => setHaptics(e.target.checked)}
      />
      Vibrar ao acertar, errar e ganhar estrela
    </label>
  );
}
