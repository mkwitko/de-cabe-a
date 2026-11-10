/**
 * First run on this device: the welcome to the club, in the locker room. Three ways in: create an
 * account (the forms live on /conta), sign in, or play as a guest with a nickname chosen right
 * here (PATCH /v1/me, the same rules as Conta). Esc = guest with a generated nickname. On a shared
 * level link it waits for that level to end. Also hosts the home's "crie sua conta" nudge.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { api, type ApiError } from '../lib/api';
import { useAccount, useMe } from '../lib/game';
import { sceneFor } from '../lib/music';
import { suggestNickname } from '../lib/nickname';
import {
  due,
  LEVEL_ENDED,
  loadNudges,
  markWelcomed,
  saveNudges,
  shown,
  started,
  welcomed,
} from '../lib/nudges';
import { AlbumIcon, RankingIcon, TrophyIcon } from './Icons';
import { Crest } from './Crest';
import { MemberCard } from './MemberCard';
import { Nudge } from './Nudge';
import { signInHref, signUpHref } from './SignInButton';
import { btnPrimary, btnSecondary } from './ui';

export function FirstRun() {
  const { pathname } = useLocation();
  const me = useMe().data;
  const [welcome, setWelcome] = useState(false);
  const [homeNudge, setHomeNudge] = useState(false);
  const [levelEnded, setLevelEnded] = useState(false);
  useEffect(() => {
    const on = () => setLevelEnded(true);
    addEventListener(LEVEL_ENDED, on);
    return () => removeEventListener(LEVEL_ENDED, on);
  }, []);

  useEffect(() => {
    if (!me || welcome) return;
    if (!welcomed()) {
      // Already a member, or a guest who picked a nickname before: not a first visit.
      if (me.account || me.nickname) return markWelcomed();
      if (/^\/(conta|entrar)(\/|$)/.test(pathname)) return;
      if (sceneFor(pathname) === 'level' && !levelEnded) return;
      setWelcome(true);
      return;
    }
    if (me.account || pathname !== '/') return;
    const now = Date.now();
    const s = started(loadNudges(), now);
    if (due(s, 'home', now)) {
      saveNudges(shown(s, 'home', now));
      setHomeNudge(true);
    } else saveNudges(s);
  }, [me, pathname, levelEnded, welcome]);

  if (welcome)
    return (
      <Welcome
        onDone={() => {
          markWelcomed();
          saveNudges(shown(loadNudges(), 'home', Date.now())); // the home waits 3 days from here
          setWelcome(false);
        }}
      />
    );
  if (homeNudge && pathname === '/' && !me?.account)
    return <Nudge moment="home" floating onDone={() => setHomeNudge(false)} />;
  return null;
}

/** Saves a generated nickname in the background; a taken one gets another try. */
async function autoNickname(tries = 3) {
  for (let i = 0; i < tries; i++)
    try {
      await api('/v1/me', { method: 'PATCH', json: { nickname: suggestNickname() } });
      return;
    } catch (e) {
      if ((e as ApiError).code !== 'NICKNAME_TAKEN') return;
    }
}

function Welcome({ onDone }: { onDone: () => void }) {
  const { pathname } = useLocation();
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLAnchorElement>(null);
  const act = useAccount();
  const [nickname, setNickname] = useState(() => suggestNickname());
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    primary.current?.focus();
    return () => d.close();
  }, []);

  const asGuest = (e: FormEvent) => {
    e.preventDefault();
    act.mutate({ path: '/v1/me', method: 'PATCH', json: { nickname } }, { onSuccess: onDone });
  };
  const error = act.error as ApiError | null;
  const back = /^\/(conta|entrar)(\/|$)/.test(pathname) ? '/' : pathname;
  const name = nickname.trim() || 'Seu apelido';
  const perks = [
    { Icon: AlbumIcon, title: 'Álbum salvo', text: 'Estrelas e figurinhas em qualquer aparelho' },
    { Icon: RankingIcon, title: 'Ranking', text: 'Seu apelido na tabela da galera' },
    { Icon: TrophyIcon, title: 'Voto', text: 'Você escolhe o próximo modo a abrir' },
  ];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-lede"
      onCancel={(e) => {
        // Esc: straight onto the pitch as a guest, with a nickname we pick.
        e.preventDefault();
        void autoNickname();
        onDone();
      }}
      className="welcome text-chalk"
    >
      <div aria-hidden="true" className="welcome-art" />
      <div className="welcome-body">
        <header className="flex flex-col items-center gap-3 text-center">
          <Crest className="h-12 w-11 drop-shadow-[0_6px_10px_rgb(0_0_0/0.6)] sm:h-20 sm:w-[4.5rem]" />
          <h2
            id="welcome-title"
            className="font-condensed text-[clamp(2.25rem,9vw,4.75rem)] leading-[0.88] font-black uppercase"
          >
            Bem-vindo ao <span className="whitespace-nowrap text-gold">De Cabeça F.C.</span>
          </h2>
          <p
            id="welcome-lede"
            className="max-w-[40ch] text-base font-medium sm:text-lg text-chalk-soft"
          >
            Adivinhe o craque pela carreira, ganhe estrelas e cole as figurinhas no álbum. Como você
            quer entrar em campo?
          </p>
          {/* phones: the guest form is below the fold; this takes the player straight to it */}
          <button
            type="button"
            onClick={() => document.getElementById('welcome-nick')?.focus()}
            className="min-h-11 px-2 font-semibold text-chalk underline underline-offset-4 hover:text-gold lg:hidden"
          >
            Ou jogue como visitante
          </button>
        </header>

        <div className="grid w-full grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 lg:gap-8">
          <section
            aria-labelledby="welcome-member"
            className="welcome-panel gate-stub flex flex-col gap-4 rounded-[18px] p-5 sm:p-8"
          >
            <h3
              id="welcome-member"
              className="font-condensed text-3xl leading-none font-black uppercase"
            >
              Seja sócio
            </h3>
            <ul className="flex flex-col gap-3 lg:my-auto lg:gap-8">
              {perks.map(({ Icon, title, text }) => (
                <li key={title} className="flex items-center gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-gold/50 bg-gold/10 text-gold lg:size-16">
                    <Icon className="size-5 lg:size-8" />
                  </span>
                  <span className="min-w-0">
                    <span className="font-condensed block text-lg leading-none font-extrabold uppercase lg:text-3xl">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-sm text-chalk-soft lg:text-lg">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-chalk-soft">
              Grátis. O que você jogar como visitante vai junto para a conta.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                ref={primary}
                to={signUpHref(back)}
                onClick={onDone}
                className={`${btnPrimary} min-h-14 flex-1 text-xl`}
              >
                Criar conta
              </Link>
              <Link to={signInHref(back)} onClick={onDone} className={`${btnSecondary} min-h-14`}>
                Já tenho conta · Entrar
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="welcome-guest"
            className="welcome-panel scoreboard flex flex-col gap-5 rounded-[18px] p-5 sm:p-8"
          >
            <h3
              id="welcome-guest"
              className="font-condensed text-3xl leading-none font-black uppercase"
            >
              Jogar como visitante
            </h3>
            {/* the card as it will read, live from the field below */}
            <div aria-hidden="true" className="welcome-card self-center">
              <MemberCard
                guest
                heading="h2"
                name={name}
                title="Peneira"
                stars={0}
                levels={0}
                className="max-w-sm"
              />
            </div>
            <form onSubmit={asGuest} className="flex flex-col gap-3">
              <label htmlFor="welcome-nick" className="font-semibold">
                Seu apelido
              </label>
              <div className="flex gap-2">
                <input
                  id="welcome-nick"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  minLength={3}
                  maxLength={20}
                  required
                  autoComplete="nickname"
                  aria-describedby="welcome-nick-hint"
                  aria-invalid={error ? true : undefined}
                  className="min-h-12 min-w-0 flex-1 rounded-lg border-2 border-chalk-soft/40 bg-pitch-deep/80 px-3 text-lg font-semibold text-chalk focus:border-cover"
                />
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => {
                    act.reset();
                    setNickname(suggestNickname());
                  }}
                >
                  Sugerir
                </button>
              </div>
              <p
                id="welcome-nick-hint"
                role={error ? 'alert' : undefined}
                className={`text-sm ${error ? 'font-semibold text-gold' : 'text-chalk-soft'}`}
              >
                {error
                  ? error.code === 'NICKNAME_TAKEN'
                    ? 'Esse apelido já tem dono. Tente outro ou toque em Sugerir.'
                    : error.message
                  : 'De 3 a 20 letras ou números. Dá para trocar e criar a conta depois.'}
              </p>
              <button
                className={`${btnSecondary} min-h-14 border-chalk/70 text-xl`}
                disabled={act.isPending}
              >
                {act.isPending ? 'Entrando em campo…' : 'Jogar como visitante'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </dialog>
  );
}
