import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { onSoundChange, setSound, soundOn } from '../lib/sound';
import { musicOn, onMusicChange, sceneFor, setMusic } from '../lib/music';
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

/** One-time offer on the first level: both sounds are off until the player asks. */
export function SoundOffer() {
  const { pathname } = useLocation();
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem('dc_sound_offer') === '1';
    } catch {
      return true;
    }
  });
  if (seen || sceneFor(pathname) !== 'level' || musicOn() || soundOn()) return null;
  const done = (on: boolean) => {
    try {
      localStorage.setItem('dc_sound_offer', '1');
    } catch {
      /* ask again next visit */
    }
    setSeen(true);
    if (on) {
      setMusic(true);
      setSound(true);
    }
  };
  return (
    <div
      role="group"
      aria-label="Ligar som"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl border border-chalk/20 bg-pitch-deep px-4 py-2 shadow-lg shadow-black/30 sm:bottom-6"
    >
      <span className="font-semibold text-chalk">Ligar som?</span>
      <span className="flex gap-1">
        <button
          type="button"
          onClick={() => done(false)}
          className="min-h-11 px-3 font-semibold text-chalk-soft hover:text-chalk"
        >
          Agora não
        </button>
        <button
          type="button"
          onClick={() => done(true)}
          className="min-h-11 rounded-lg bg-cover px-4 font-bold text-ink"
        >
          Ligar
        </button>
      </span>
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
