/**
 * Career Path level (UX_SPEC.md §3, ADR-007). The career is a full-screen leather passport whose
 * stamps land per revealed club; the guess box docks at the bottom (overlapping the passport's foot
 * on wide screens).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AttemptResponse,
  CareerPathReveal,
  CareerPathView,
  PlayerRef,
} from '@decabeca/contracts';
import { ApiError } from '../../lib/api';
import { useGameTracking } from '../../lib/useGameTracking';
import { useAction, useAttempt } from '../../lib/game';
import { countryName, POSITION_LABEL } from '../../lib/format';
import { LevelEnd, LevelError } from '../LevelParts';
import { Countdown } from '../Clock';
import { Icon } from '../../components/Icon';
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
        <div className="flex items-baseline gap-2 rounded-full bg-cover px-3 py-1 text-ink motion-safe:animate-[paste_420ms_var(--ease-out-expo)]">
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
    detail: (
      <p>
        Era <strong className="font-black">{reveal.answer.name}</strong> ·{' '}
        {reveal.trajectory.length} clubes
        {reveal.answerPage && (
          <>
            {' · '}
            {/* Server-rendered career page (not a SPA route): plain link. */}
            <a href={reveal.answerPage} className="underline underline-offset-4">
              Ver a carreira
            </a>
          </>
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
  const [announce, setAnnounce] = useState('');
  const [flash, setFlash] = useState(0);
  // First tap opens the cover; a resumed attempt or reduced motion starts open.
  const [tapped, setTapped] = useState(false);
  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
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
  useEffect(() => {
    if (!touring) return;
    setTapped(true);
    const t = window.setTimeout(() => setTourReady(true), reduced.current ? 200 : 1700);
    return () => window.clearTimeout(t);
  }, [touring]);

  if (attempt.isPending)
    return (
      <div className="flex flex-col gap-4">
        <GameHeader title={title} back="/career-path" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  if (attempt.error)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} back="/career-path" />
        <LevelError
          error={attempt.error as ApiError}
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

  const opened = tapped || reduced.current || view.history.length > 0 || view.revealed.length > 1;
  const clubs = done && reveal ? reveal.trajectory : view.revealed;

  return (
    <div
      className={`flex flex-col gap-3 ${done ? '' : 'h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-9rem)]'}`}
    >
      <GameHeader
        title={title}
        back="/career-path"
        aside={
          !done && (
            <div className="flex items-center gap-3" data-tour="tries">
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
          className="pointer-events-none fixed inset-0 z-40 bg-[#a3242f] opacity-0 motion-safe:animate-[red-flash_450ms_ease-out]"
        />
      )}

      {!done && (
        <div className="mx-auto flex max-h-20 w-full max-w-2xl shrink-0 flex-wrap gap-2 overflow-y-auto">
          <Clues view={view} />
          <Guesses view={view} />
        </div>
      )}
      {/* Asked once; the first-run tutorial asks it as its last step instead. */}
      {!done && !touring && <SoundOffer />}
      {/* Finished: the result first, the full passport beside it (below on phones). */}
      <div className={done ? 'grid items-start gap-8 lg:grid-cols-2' : 'contents'}>
        {done && <LevelEnd data={data} {...resultCopy(data)} />}
        <section
          aria-labelledby="path-title"
          className={done ? 'flex flex-col gap-3 lg:sticky lg:top-6' : 'min-h-0 flex-1'}
        >
          <h2
            id="path-title"
            className={
              done ? 'font-condensed text-2xl leading-none font-extrabold uppercase' : 'sr-only'
            }
          >
            {done ? 'O passaporte completo' : 'Trajetória'}
          </h2>
          <div
            data-tour="passport"
            className={`mx-auto w-full max-w-2xl ${done ? 'h-[28rem] sm:h-[34rem]' : 'h-full'}`}
          >
            <Passport
              clubs={clubs}
              total={done ? clubs.length : view.maxAttempts}
              opened={done || opened}
              onOpen={() => setTapped(true)}
              label={done ? 'Trajetória completa' : 'Clubes revelados'}
              done={done}
            />
          </div>
        </section>
      </div>

      {!done && (
        <form
          data-tour="guess"
          className="fixed inset-x-0 bottom-14 z-20 flex flex-col gap-2 border-t border-chalk/15 bg-pitch-deep/95 p-3 backdrop-blur sm:relative sm:inset-x-auto sm:bottom-auto sm:shrink-0 sm:-mt-24 sm:mx-auto sm:w-full sm:max-w-2xl sm:rounded-xl sm:border sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected)
              void submit({ kind: 'guess', playerId: selected.id }, `Não é ${selected.name}`);
          }}
        >
          <p className="hidden text-center text-sm font-semibold text-chalk-soft sm:block">
            De quem é esse passaporte?
          </p>
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
              />
            </div>
            <button
              className={`${btnPrimary} px-4`}
              disabled={!selected || !online || action.isPending}
            >
              Chutar
            </button>
          </div>
          <button
            type="button"
            className={`${btnSecondary} min-h-10 text-base`}
            disabled={!online || action.isPending}
            onClick={() => void submit({ kind: 'skip' }, 'Pulou')}
          >
            <Icon name="skip" /> Pular e ver o próximo clube
          </button>
          {action.error && (
            <p role="alert" className="text-sm text-gold">
              {(action.error as ApiError).message}
            </p>
          )}
        </form>
      )}
      {touring && tourReady && <Tutorial onDone={() => setTour(false)} />}
      {/* room for the guess form docked at the bottom on phones */}
      {!done && <div className="h-20 shrink-0 sm:hidden" aria-hidden="true" />}
    </div>
  );
}
