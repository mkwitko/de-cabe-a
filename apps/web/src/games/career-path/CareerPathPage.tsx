/**
 * Career Path level (UX_SPEC.md §3, ADR-007). The level happens in the home's locker room: the
 * career is a leather passport whose stamps land per revealed club, opening by itself after a beat.
 * Phones: the passport fills the screen, the guess box docks at the bottom. From lg: the passport
 * lies open on the bench as a spread (clues and tries on the inside cover) and the guess box sits
 * on the bench edge at the foot of the scene.
 */
import { AD_SLOTS, AdSlot } from '../../components/AdSlot';
import { startTransition, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  AttemptResponse,
  CareerPathReveal,
  CareerPathView,
  PlayerRef,
} from '@decabeca/contracts';
import { ApiError } from '../../lib/api';
import { motionReduced } from '../../lib/settings';
import { useGameTracking } from '../../lib/useGameTracking';
import { useAction, useAttempt } from '../../lib/game';
import { countryName, POSITION_LABEL } from '../../lib/format';
import { LevelEnd, LevelError } from '../LevelParts';
import { Countdown } from '../Clock';
import { Icon } from '../../components/Icon';
import { LockerBackdrop } from '../../components/LockerBackdrop';
import { PlayerSearch } from '../../components/PlayerSearch';
import { SoundOffer } from '../../components/SoundToggle';
import {
  AttemptDots,
  btnPrimary,
  btnSecondary,
  GameHeader,
  Skeleton,
  useOnline,
} from '../../components/ui';
import { Passport } from './Passport';
import { Tutorial, tutorialSeen } from './Tutorial';

/** Clues and guesses printed on the inside of the cover (the spread's left page, from lg). */
function Leaf({ view, won }: { view: CareerPathView; won: boolean }) {
  const fields = [
    view.position && {
      label: 'Posição',
      value: [view.position, ...view.secondaryPositions].map((g) => POSITION_LABEL[g]).join(' / '),
    },
    view.extraHints.nationalityCode && {
      label: 'Nacionalidade',
      value: countryName(view.extraHints.nationalityCode),
    },
  ].filter((f): f is { label: string; value: string } => !!f);
  return (
    <div className="relative flex h-full min-h-0 flex-col gap-[clamp(1rem,3.5cqh,2rem)]">
      <p className="font-condensed text-[clamp(2.25rem,7.5cqh,4.25rem)] leading-[0.86] font-black uppercase [text-shadow:0_-1px_0_#0007,0_1px_0_#fff3]">
        De quem é esse passaporte?
      </p>
      <dl className="flex flex-col gap-3 border-t border-[var(--pp-foil)]/33 pt-[clamp(0.75rem,2.5cqh,1.5rem)]">
        {fields.map((f) => (
          <div key={f.label} className="motion-safe:animate-[stamp-fade_150ms_ease-out]">
            <dt className="text-xs font-bold tracking-[0.2em] text-[var(--pp-foil-soft)] uppercase">
              {f.label}
            </dt>
            <dd className="font-condensed text-[clamp(1.5rem,4.5cqh,2.25rem)] leading-tight font-black text-[var(--pp-foil-hi)] uppercase">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-xs font-bold tracking-[0.2em] text-[var(--pp-foil-soft)] uppercase">
            Tentativas
          </p>
          <div className="[&_[role=img]>span]:size-6">
            <AttemptDots used={view.attemptsUsed} max={view.maxAttempts} won={won} />
          </div>
        </div>
        <Guesses view={view} />
      </div>
    </div>
  );
}

function Clues({ view }: { view: CareerPathView }) {
  return (
    <dl className="flex flex-wrap gap-2">
      {view.position && (
        <div className="flex items-baseline gap-2 rounded-full bg-cover px-3 py-1 text-ink">
          <dt className="text-xs font-bold uppercase">Posição</dt>
          <dd className="font-condensed text-lg font-black uppercase">
            {[view.position, ...view.secondaryPositions].map((g) => POSITION_LABEL[g]).join(' / ')}
          </dd>
        </div>
      )}
      {view.extraHints.nationalityCode && (
        <div className="flex items-baseline gap-2 rounded-full bg-cover px-3 py-1 text-ink motion-safe:animate-[paste_150ms_ease-out]">
          <dt className="text-xs font-bold uppercase">Nacionalidade</dt>
          <dd className="font-condensed text-lg font-black uppercase">
            {countryName(view.extraHints.nationalityCode)}
          </dd>
        </div>
      )}
    </dl>
  );
}

function Guesses({ view }: { view: CareerPathView }) {
  if (!view.history.length) return null;
  return (
    <ul className="flex flex-wrap gap-2 text-sm" aria-label="Seus palpites">
      {view.history.map((h, i) => (
        <li
          key={i}
          className="inline-flex items-center gap-1 rounded-full border border-chalk-soft/50 px-2.5 py-1 text-chalk-soft"
        >
          <Icon
            name={h.kind === 'skip' ? 'skip' : h.kind === 'correct' ? 'check' : 'cross'}
            className="size-3.5"
          />
          {h.kind === 'guess' ? h.name : h.kind === 'skip' ? 'Pulou' : 'Acertou'}
        </li>
      ))}
    </ul>
  );
}

/** Verdict and answer for the result sticker. */
function resultCopy(data: AttemptResponse) {
  const reveal = data.reveal as CareerPathReveal;
  const view = data.view as CareerPathView;
  const won = data.attempt.status === 'WON';
  return {
    answer: reveal.answer,
    headline: won
      ? view.attemptsUsed === 1
        ? 'De placa! Na primeira.'
        : `Acertou em ${view.attemptsUsed} de 6!`
      : 'Não foi dessa vez.',
    starRule: 'Até 2 tentativas: 3 estrelas · até 4: 2 · até 6: 1.',
    detail: (
      <p>
        Era <strong className="font-black">{reveal.answer.name}</strong> ·{' '}
        {reveal.trajectory.length} clubes
        {reveal.answerPage && (
          // Server-rendered career page (not a SPA route): plain link, dressed as a button.
          <a
            href={reveal.answerPage}
            className="font-condensed mt-2 flex min-h-11 w-fit items-center rounded-lg border-2 border-current px-3 text-base font-extrabold tracking-wide uppercase"
          >
            Ver a carreira
          </a>
        )}
      </p>
    ),
  };
}

export function CareerPathPage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('CAREER_PATH', level, timed);
  const action = useAction('CAREER_PATH', level);
  const online = useOnline();
  const [selected, setSelected] = useState<PlayerRef | null>(null);
  // An empty box turns Chutar into Pular, which asks first (a skip spends a try).
  const [typed, setTyped] = useState('');
  const [asking, setAsking] = useState(false);
  const skipBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const askId = useId();
  useEffect(() => {
    if (asking) cancelBtn.current?.focus();
  }, [asking]);
  // typing a name drops the question (Pular is no longer there)
  const onQuery = useCallback((q: string) => {
    setTyped(q);
    if (q.trim()) setAsking(false);
  }, []);
  const [announce, setAnnounce] = useState('');
  const [flash, setFlash] = useState(0);
  // First tap opens the cover; a resumed attempt or reduced motion starts open.
  const [tapped, setTapped] = useState(false);
  const reduced = useRef(motionReduced());
  const data = attempt.data;
  useGameTracking(data);
  const view = data?.view as CareerPathView | undefined;
  const guessed = useMemo(
    () => new Set(view?.history.flatMap((h) => (h.kind === 'guess' ? [h.playerId] : [])) ?? []),
    [view?.history],
  );
  const title = `Career Path · Fase ${level}`;
  // First run: level 1 in the player's own time (no clock running), nothing played yet, never
  // seen on this device. The passport opens by itself, the first stamp lands, then the three
  // steps lay over the level.
  const [tour, setTour] = useState(() => level === 1 && !timed && !tutorialSeen());
  const [tourReady, setTourReady] = useState(false);
  const touring =
    tour && !!view && data?.attempt.status === 'IN_PROGRESS' && view.attemptsUsed === 0;
  // The cover opens by itself after a short beat; a tap opens it sooner.
  const shut = !!view && !tapped && view.history.length === 0 && view.revealed.length <= 1;
  useEffect(() => {
    if (!shut) return;
    const t = window.setTimeout(() => startTransition(() => setTapped(true)), 1200);
    return () => window.clearTimeout(t);
  }, [shut]);
  useEffect(() => {
    if (!touring) return;
    setTapped(true);
    const t = window.setTimeout(
      () => startTransition(() => setTourReady(true)),
      reduced.current ? 200 : 1700,
    );
    return () => window.clearTimeout(t);
  }, [touring]);

  // Offline the query waits (paused) rather than failing: say so instead of a skeleton forever.
  const error =
    attempt.error ??
    (attempt.isPending && !online
      ? new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor.')
      : null);
  if (attempt.isPending && !error)
    return (
      <div className="flex flex-col gap-4">
        <LockerBackdrop className="cp-room" />
        <GameHeader title={title} back="/career-path" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} back="/career-path" />
        <LevelError
          error={error as ApiError}
          mode="CAREER_PATH"
          retry={() => void attempt.refetch()}
        />
      </div>
    );
  if (!data || !view) return null;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const reveal = data.reveal as CareerPathReveal | null;

  async function submit(input: object, describe: string) {
    try {
      const res = await action.mutateAsync({ attemptId: data!.attempt.id, input });
      setSelected(null);
      const ev = res.event;
      if (ev?.type === 'wrong' || ev?.type === 'lost') setFlash((n) => n + 1);
      setAnnounce(
        ev?.type === 'correct'
          ? 'Acertou!'
          : ev?.type === 'lost'
            ? 'Fim de jogo.'
            : `${describe}. ${ev && 'revealed' in ev && ev.revealed === 'club' ? 'Novo clube revelado.' : ev && 'revealed' in ev && ev.revealed === 'extraHint' ? 'Nova pista revelada.' : ''}`,
      );
    } catch {
      /* shown from action.error */
    }
  }

  const left = view.maxAttempts - view.attemptsUsed;
  function closeAsk() {
    setAsking(false);
    skipBtn.current?.focus();
  }

  const opened = tapped || reduced.current || view.history.length > 0 || view.revealed.length > 1;
  const clubs = done && reveal ? reveal.trajectory : view.revealed;

  return (
    <div
      className={`flex flex-col gap-3 ${done ? '' : 'h-[calc(var(--app-h,100dvh)-4rem-var(--nav-room,4rem)-env(safe-area-inset-bottom)-var(--consent-room,0px))] sm:h-[calc(100dvh-9rem-var(--consent-room,0px))] lg:pb-28'}`}
    >
      {!done && <LockerBackdrop className="cp-room" />}
      <GameHeader
        title={title}
        back="/career-path"
        aside={
          !done && (
            <div className="flex items-center gap-3 lg:[&>[role=img]]:hidden" data-tour="tries">
              <Countdown
                data={data}
                onTimeUp={() => void submit({ kind: 'give_up' }, 'Acabou o tempo')}
              />
              <AttemptDots
                used={view.attemptsUsed}
                max={view.maxAttempts}
                won={data.attempt.status === 'WON'}
              />
            </div>
          )
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {flash > 0 && (
        <div
          key={flash}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40 bg-[#a3242f] opacity-0 motion-safe:animate-[red-flash_180ms_ease-out]"
        />
      )}

      {/* A thin strip at the top, the far end of the screen from the guess dock; only on a
          screen tall enough to spare it, and never while the tutorial points at things. */}
      {!done && !touring && (
        <AdSlot
          slot={AD_SLOTS.level}
          className="shrink-0 [@media(max-height:719px)]:hidden"
        />
      )}
      {!done && (
        <div className="mx-auto flex max-h-20 w-full max-w-2xl shrink-0 flex-wrap gap-2 overflow-y-auto lg:hidden">
          <Clues view={view} />
          <Guesses view={view} />
        </div>
      )}
      {/* Asked once; the first-run tutorial asks it as its last step instead. */}
      {!done && !touring && <SoundOffer />}
      {done ? (
        // Finished: the open passport, the verdict stamped on its left page, the stamps on the right.
        <LevelEnd
          data={data}
          {...resultCopy(data)}
          passport={
            <Passport
              clubs={clubs}
              total={clubs.length}
              opened
              onOpen={() => startTransition(() => setTapped(true))}
              label="Trajetória completa"
              done
            />
          }
        />
      ) : (
        <section aria-label="Trajetória" className="min-h-0 flex-1">
          <div data-tour="passport" className="mx-auto h-full w-full max-w-2xl lg:max-w-none">
            <Passport
              clubs={clubs}
              total={view.maxAttempts}
              opened={opened}
              onOpen={() => startTransition(() => setTapped(true))}
              label="Clubes revelados"
              leaf={<Leaf view={view} won={false} />}
            />
          </div>
        </section>
      )}

      {!done && (
        <form
          data-tour="guess"
          className="fixed inset-x-0 bottom-(--dock-bottom,calc(4rem+env(safe-area-inset-bottom))) z-20 flex flex-col gap-1 border-t border-chalk/15 bg-pitch-deep/95 p-3 sm:relative sm:inset-x-auto sm:bottom-auto sm:shrink-0 sm:-mt-24 sm:mx-auto sm:w-full sm:max-w-2xl sm:rounded-xl sm:border sm:p-4 lg:fixed lg:inset-x-0 lg:bottom-6 lg:mt-0 lg:w-[min(48rem,calc(100%-4rem))] lg:p-3 lg:shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected)
              void submit({ kind: 'guess', playerId: selected.id }, `Não é ${selected.name}`);
          }}
          onKeyDown={(e) => {
            if (asking && e.key === 'Escape') closeAsk();
          }}
        >
          <p className="hidden text-center text-sm font-semibold text-chalk-soft sm:block lg:hidden">
            De quem é esse passaporte?
          </p>
          {asking && (
            <div
              role="alertdialog"
              aria-labelledby={`${askId}-t`}
              aria-describedby={`${askId}-d`}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-cover/40 bg-pitch px-3 py-2 motion-safe:animate-[stamp-fade_150ms_ease-out]"
            >
              <p className="min-w-48 flex-1 text-sm leading-snug text-chalk">
                <strong id={`${askId}-t`} className="font-bold">
                  Pular esta dica?
                </strong>{' '}
                <span id={`${askId}-d`} className="text-chalk-soft">
                  {left > 1
                    ? `Você perde 1 tentativa (restam ${left - 1}).`
                    : 'Você perde a última tentativa e a fase.'}
                </span>
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  ref={cancelBtn}
                  type="button"
                  className={`${btnSecondary} px-3 text-base`}
                  onClick={closeAsk}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`${btnPrimary} px-3 text-base`}
                  disabled={!online || action.isPending}
                  onClick={() => {
                    closeAsk();
                    void submit({ kind: 'skip' }, 'Pulou');
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <PlayerSearch
                label="Quem é o jogador?"
                onSelect={setSelected}
                selected={selected}
                exclude={guessed}
                disabled={!online || action.isPending}
                autoFocus
                dropUp
                onQuery={onQuery}
              />
            </div>
            {/* One spot, one action: Chutar once there is a name, Pular (asks first) while empty. */}
            {selected || typed.trim() ? (
              <button
                className={`${btnPrimary} min-w-28 px-4`}
                disabled={!selected || !online || action.isPending}
              >
                Chutar
              </button>
            ) : (
              <button
                ref={skipBtn}
                type="button"
                aria-expanded={asking}
                className={`${btnSecondary} min-w-28 px-4`}
                disabled={!online || action.isPending}
                onClick={() => setAsking(true)}
              >
                <Icon name="skip" className="size-4" /> Pular
              </button>
            )}
          </div>
          {action.error && (
            <p role="alert" className="text-sm text-gold">
              {(action.error as ApiError).message}
            </p>
          )}
        </form>
      )}
      {touring && tourReady && <Tutorial onDone={() => setTour(false)} />}
      {/* room for the guess form docked at the bottom on phones */}
      {!done && <div className="h-6 shrink-0 sm:hidden" aria-hidden="true" />}
    </div>
  );
}
