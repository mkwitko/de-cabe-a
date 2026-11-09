import { useEffect, useState } from 'react';
import { onSoundChange, setSound, soundOn } from '../lib/sound';

/** Sound on/off (off by default); the state lives on the device. */
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
          ? `flex min-h-11 items-center gap-3 font-semibold ${on ? 'text-cover' : 'text-chalk'}`
          : `font-condensed flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-lg font-extrabold tracking-wide uppercase ${on ? 'text-cover' : 'text-chalk-soft hover:text-chalk'}`
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
      {withLabel ? (on ? 'Som ligado' : 'Som desligado') : 'Som'}
    </button>
  );
}
