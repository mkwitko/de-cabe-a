/**
 * Linha do tempo screen (ADR-011): a player and 4 of their clubs, shuffled; tap them in career
 * order (tap again to take one back), then confirm. The round then shows the right order with years.
 */
import { useState } from 'react';
import type { AttemptResponse, TimelineReveal, TimelineView } from '@decabeca/contracts';
import { ClubBadge } from '../../components/ClubBadge';
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
            className={`font-condensed grid size-7 place-items-center rounded-md text-sm font-black ${r ? (r.correct ? 'bg-cover text-ink' : 'bg-chalk/15 text-chalk-soft line-through') : i === view.round ? 'border-2 border-cover text-cover' : 'border-2 border-dashed border-chalk-soft/50 text-chalk-soft/70'}`}
          >
            <span className="sr-only">{r ? (r.correct ? 'acertou' : 'errou') : 'a jogar'} </span>
            {i + 1}
          </li>
        );
      })}
    </ol>
  );
}

/** A played round: the career order with years; marks where the answer differed. */
function RoundResult({ r }: { r: Round }) {
  return (
    <ol className="flex flex-col gap-2">
      {r.clubs.map((c, i) => {
        const placed = r.answer[i] === c.id;
        return (
          <li
            key={c.id}
            className={`flex min-h-16 items-center gap-3 rounded-xl px-4 py-2 ${placed ? 'bg-cover text-ink' : 'border-2 border-dashed border-chalk-soft/60 text-chalk'}`}
          >
            <span className="font-condensed w-6 text-2xl font-black">{i + 1}</span>
            <ClubBadge name={c.name} size="sm" />
            <span className="flex flex-col">
              <span className="font-condensed text-xl leading-tight font-black uppercase">
                {c.name}
              </span>
              <span className="text-sm font-semibold">
                {years(c)} · {placed ? 'você acertou a posição' : 'posição errada'}
              </span>
            </span>
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
    <div className="flex flex-col gap-6">
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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)] lg:items-start">
        <section className="flex flex-col gap-5">
          {showing ? (
            <>
              <p className="font-condensed text-4xl leading-none font-black uppercase">
                {showing.playerName}
              </p>
              <p className="font-condensed text-2xl font-black uppercase">
                {showing.correct ? 'Ordem certa!' : 'Não foi essa a ordem.'}
              </p>
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
              <h2 className="text-lg font-semibold text-chalk-soft">
                Toque nos clubes na ordem da carreira, do primeiro ao último.
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {view.current.clubs.map((c) => {
                  const pos = order.indexOf(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => toggle(c.id)}
                        aria-pressed={pos >= 0}
                        className={`flex min-h-16 w-full items-center gap-3 rounded-xl px-4 py-3 text-left shadow-[0_6px_14px_-6px_rgb(0_0_0/0.45)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 ${pos >= 0 ? 'bg-cover text-ink' : 'bg-paper text-ink'}`}
                      >
                        <span className="font-condensed grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink/30 text-lg font-black">
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
              <div className="flex flex-wrap gap-3">
                <button
                  className={btnPrimary}
                  disabled={order.length < 4 || action.isPending}
                  onClick={confirm}
                >
                  Confirmar ordem
                </button>
                {order.length > 0 && (
                  <button className={btnSecondary} onClick={() => setOrder([])}>
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
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          {done ? (
            <LevelEnd data={data} {...resultCopy(data)} />
          ) : (
            <p className="rounded-xl border-2 border-dashed border-chalk-soft/40 p-4 text-chalk-soft">
              Cinco jogadores, quatro clubes de cada um. Ponha na ordem em que ele jogou: do
              primeiro clube ao último.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
