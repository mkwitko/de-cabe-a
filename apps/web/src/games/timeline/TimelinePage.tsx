/**
 * Linha do tempo screen (ADR-011): a player and 4 of their clubs, shuffled; tap them in career
 * order (tap again to take one back), then confirm. The round then shows the right order with years.
 */
import { useEffect, useState } from 'react';
import type { AttemptResponse, TimelineReveal, TimelineView } from '@decabeca/contracts';
import { ClubBadge } from '../../components/ClubBadge';
import { buzz } from '../../lib/haptics';
import { play } from '../../lib/sound';
import { btnPrimary, btnSecondary, GameHeader, Skeleton } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

type Round = TimelineView['rounds'][number];
const years = (c: { from: number; to: number | null }) =>
  c.to === null ? `${c.from}–atual` : c.from === c.to ? `${c.from}` : `${c.from}–${c.to}`;

function RoundDots({ view }: { view: TimelineView }) {
  return (
    <ol
      className="flex gap-1.5"
      aria-label={`Rodada ${Math.min(view.round + 1, view.totalRounds)} de ${view.totalRounds}`}
    >
      {Array.from({ length: view.totalRounds }, (_, i) => {
        const r = view.rounds[i];
        return (
          <li
            key={i}
            className={`font-condensed grid size-7 place-items-center rounded-md text-sm font-black ${r ? (r.correct ? 'bg-cover text-ink' : 'bg-chalk/15 text-chalk-soft line-through') : i === view.round ? 'border-2 border-cover text-gold' : 'border-2 border-dashed border-chalk-soft/50 text-chalk-soft/70'}`}
          >
            <span className="sr-only">{r ? (r.correct ? 'acertou' : 'errou') : 'a jogar'} </span>
            {i + 1}
          </li>
        );
      })}
    </ol>
  );
}

/** Newsprint clipping: hung on the line by a peg, tilted a little differently each. */
const TILT = [-2.2, 1.6, -1.2, 2.4];
const clipping =
  'relative flex min-h-16 w-full items-center gap-3 rounded-sm bg-[#f3ead2] px-3 py-2 text-[#2b2418] shadow-[0_4px_0_#0003] [background-image:repeating-linear-gradient(0deg,#0000000d_0_1px,transparent_1px_5px)] [filter:sepia(0.25)]';

function Peg() {
  return (
    <i
      aria-hidden="true"
      className="absolute -top-3 left-1/2 h-5 w-2.5 -translate-x-1/2 rounded-sm bg-[#8a5a33] shadow-[0_1px_0_#0006]"
    />
  );
}

/** Wrong order: the clipping crumples and a paper-tear sound plays (once, on arrival). */
function CrumpleFx({ wrong }: { wrong: boolean }) {
  useEffect(() => {
    if (!wrong) return;
    play('rip');
    buzz(30);
  }, [wrong]);
  return null;
}

/** A played round: the career order with years; clippings out of place crumple. */
function RoundResult({ r }: { r: Round }) {
  return (
    <ol className="grid grid-cols-2 gap-x-3 gap-y-5 pt-3 lg:my-auto lg:grid-cols-4">
      {r.clubs.map((c, i) => {
        const placed = r.answer[i] === c.id;
        return (
          <li
            key={c.id}
            style={{ rotate: `${TILT[i]}deg` }}
            className={placed ? '' : 'clip-crumple'}
          >
            <div
              className={`${clipping} h-full flex-col items-start gap-1 ${placed ? 'border-2 border-[#2b2418]' : 'border-2 border-dashed border-[#2b2418]/60 opacity-90'}`}
            >
              <Peg />
              <span className="flex w-full items-center gap-2">
                <span className="font-condensed text-2xl leading-none font-black">{i + 1}</span>
                <ClubBadge name={c.name} size="sm" />
              </span>
              <span className="font-condensed text-lg leading-tight font-black uppercase">
                {c.name}
              </span>
              <span className="text-xs font-semibold">
                {years(c)} · {placed ? 'você acertou a posição' : 'posição errada'}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function resultCopy(data: AttemptResponse) {
  const right = data.attempt.score;
  const reveal = data.reveal as TimelineReveal;
  return {
    headline:
      right === 5
        ? 'Memória de almanaque! 5 de 5.'
        : right === 4
          ? 'Quase perfeito: 4 de 5'
          : `${right} de 5 desta vez`,
    detail: (
      <ul className="flex flex-col gap-0.5 text-base">
        {reveal.rounds.map((r) => (
          <li key={r.playerName}>
            <strong className="font-black">{r.playerName}</strong>:{' '}
            {r.clubs.map((c) => c.name).join(' → ')}
          </li>
        ))}
      </ul>
    ),
  };
}

export function TimelinePage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('TIMELINE', level, timed);
  const action = useAction('TIMELINE', level);
  const [order, setOrder] = useState<string[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const data = attempt.data;
  useGameTracking(data);
  const title = `Linha do tempo · Fase ${level}`;

  if (attempt.isPending) return <Skeleton className="h-96" />;
  if (attempt.error || !data)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError
          error={attempt.error as ApiError}
          mode="TIMELINE"
          retry={() => void attempt.refetch()}
        />
      </div>
    );
  const view = data.view as TimelineView;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const showing = shown !== null ? view.rounds[shown] : undefined;
  const toggle = (id: string) =>
    setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : o.length < 4 ? [...o, id] : o));
  const confirm = () =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'order', clubIds: order } },
      {
        onSuccess: (res) => {
          const ev = res.event;
          if (ev && 'round' in ev) {
            setShown(ev.round);
            setOrder([]);
            setAnnounce(ev.type === 'correct' ? 'Ordem certa!' : 'Não foi essa a ordem.');
          }
        },
      },
    );

  return (
    <div
      className={`flex flex-col gap-3 ${done ? '' : 'h-[calc(var(--app-h,100dvh)-4rem-var(--nav-room,4rem)-env(safe-area-inset-bottom)-var(--consent-room,0px))] sm:h-[calc(100dvh-9rem-var(--consent-room,0px))]'}`}
    >
      <GameHeader
        title={title}
        aside={
          <div className="flex items-center gap-3">
            <Countdown
              data={data}
              onTimeUp={() =>
                action.mutate({ attemptId: data.attempt.id, input: { kind: 'give_up' } })
              }
            />
            <RoundDots view={view} />
          </div>
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <section
        aria-label="Varal de recortes"
        className={`relative mx-auto flex w-full max-w-5xl flex-col gap-3 overflow-y-auto rounded-lg border-2 border-[#2b2418] bg-[#e8dcc0] p-3 pt-6 text-[#2b2418] shadow-[0_6px_0_#0004] [background-image:repeating-linear-gradient(0deg,#0000000d_0_1px,transparent_1px_6px)] sm:p-5 sm:pt-8 ${done ? '' : 'min-h-0 flex-1'}`}
      >
        <i
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 top-3 h-4 rounded-b-[50%] border-b-2 border-[#5a4a32]"
        />
        {showing ? (
          <>
            <p className="font-condensed text-4xl leading-none font-black uppercase">
              {showing.playerName}
            </p>
            <p className="font-condensed text-2xl font-black uppercase">
              {showing.correct ? 'Ordem certa!' : 'Não foi essa a ordem.'}
            </p>
            <CrumpleFx wrong={!showing.correct} />
            <RoundResult r={showing} />
            {!done && (
              <button
                className={`${btnPrimary} self-start`}
                onClick={() => setShown(null)}
                autoFocus
              >
                Próxima rodada
              </button>
            )}
          </>
        ) : view.current ? (
          <>
            <p className="font-condensed text-4xl leading-none font-black uppercase sm:text-5xl">
              {view.current.playerName}
            </p>
            <h2 className="text-base font-semibold sm:text-lg">
              Toque nos recortes na ordem da carreira, do primeiro ao último clube.
            </h2>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 pt-3 lg:my-auto lg:grid-cols-4">
              {view.current.clubs.map((c, i) => {
                const pos = order.indexOf(c.id);
                return (
                  <li key={c.id} style={{ rotate: `${TILT[i % 4]}deg` }}>
                    <button
                      onClick={() => {
                        play('tap');
                        toggle(c.id);
                      }}
                      aria-pressed={pos >= 0}
                      className={`${clipping} min-h-24 flex-col items-start lg:min-h-40 justify-between border-2 text-left transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 ${pos >= 0 ? 'border-[#2b2418] bg-cover' : 'border-transparent'}`}
                    >
                      <Peg />
                      <span className="font-condensed grid size-8 shrink-0 place-items-center rounded-full border-2 border-[#2b2418]/40 text-lg font-black">
                        {pos >= 0 ? pos + 1 : ''}
                        <span className="sr-only">{pos >= 0 ? 'º na ordem' : 'sem posição'}</span>
                      </span>
                      <span className="font-condensed text-xl leading-tight font-black uppercase">
                        {c.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              <button
                className={btnPrimary}
                disabled={order.length < 4 || action.isPending}
                onClick={confirm}
              >
                Confirmar ordem
              </button>
              {order.length > 0 && (
                <button
                  className={`${btnSecondary} border-[#2b2418]/50! text-[#2b2418]!`}
                  onClick={() => setOrder([])}
                >
                  Recomeçar
                </button>
              )}
            </div>
            {action.error && (
              <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
                {(action.error as ApiError).message}
              </p>
            )}
          </>
        ) : null}
      </section>
      {done && (
        <div className="mx-auto w-full max-w-5xl">
          <LevelEnd data={data} {...resultCopy(data)} />
        </div>
      )}
    </div>
  );
}
