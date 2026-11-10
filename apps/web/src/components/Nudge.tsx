import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  canSilence,
  COPY,
  dismissed,
  loadNudges,
  saveNudges,
  silenced,
  type Moment,
} from '../lib/nudges';
import { Crest } from './Crest';
import { btnPrimary } from './ui';
import { signUpHref } from './SignInButton';

/**
 * "Crie sua conta", tied to the moment: a scoreboard ribbon. Inline at the end of a level; on the
 * home a compact strip floating above the bottom bar, clear of "Jogar fase N". Dismissible; after
 * 2 dismissals it also offers "Não mostrar de novo".
 */
export function Nudge({
  moment,
  floating = false,
  onDone,
}: {
  moment: Moment;
  floating?: boolean;
  onDone: () => void;
}) {
  const { pathname } = useLocation();
  const id = useId();
  const [state] = useState(loadNudges);
  const { title, text } = COPY[moment];
  const close = (silence: boolean) => {
    const s = dismissed(state);
    saveNudges(silence ? silenced(s) : s);
    onDone();
  };
  const ghost =
    'min-h-11 rounded-lg px-3 text-sm font-bold text-chalk-soft underline-offset-4 hover:text-chalk hover:underline';
  const create = (
    <Link
      to={signUpHref(pathname)}
      onClick={onDone}
      className={`shrink-0 ${floating ? btnPrimary.replace('min-h-11', 'min-h-10').replace('px-5', 'px-3').replace('text-lg', 'text-base') : btnPrimary}`}
    >
      Criar conta
    </Link>
  );
  const silence = canSilence(state) && (
    <button type="button" className={ghost} onClick={() => close(true)}>
      Não mostrar de novo
    </button>
  );

  if (floating)
    return (
      <aside
        aria-labelledby={id}
        className="nudge scoreboard floodlit obj-dark fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-chalk/10 py-2 pr-1.5 pl-3 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.85)] sm:inset-x-auto sm:right-8 sm:bottom-8 sm:w-[30rem] sm:p-3"
      >
        <Crest className="h-9 w-8 shrink-0 max-[379px]:hidden" />
        <p className="min-w-0 flex-1">
          <span
            id={id}
            className="font-condensed block text-base leading-none font-extrabold text-gold uppercase sm:text-lg"
          >
            {title}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-chalk-soft max-sm:hidden">
            {text}
          </span>
        </p>
        {create}
        <button
          type="button"
          onClick={() => close(false)}
          aria-label="Agora não"
          className="grid size-11 shrink-0 place-items-center rounded-full text-chalk-soft hover:bg-chalk/10 hover:text-chalk"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {silence && <div className="flex w-full justify-end">{silence}</div>}
      </aside>
    );

  return (
    <aside
      aria-labelledby={id}
      className="nudge scoreboard floodlit obj-dark flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-chalk/10 p-4 shadow-[0_14px_30px_-16px_rgb(0_0_0/0.8)]"
    >
      <Crest className="h-11 w-10 shrink-0 drop-shadow-[0_2px_3px_rgb(0_0_0/0.5)]" />
      <p className="min-w-0 flex-1 basis-52">
        <span
          id={id}
          className="font-condensed block text-xl leading-none font-extrabold text-gold uppercase"
        >
          {title}
        </span>
        <span className="mt-1 block text-sm text-chalk-soft">{text}</span>
      </p>
      <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto">
        {silence}
        <button type="button" className={ghost} onClick={() => close(false)}>
          Agora não
        </button>
        {create}
      </div>
    </aside>
  );
}
