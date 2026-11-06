/**
 * Mais ou Menos screen (ADR-011): two real spells side by side; tap the one with more goals (or
 * games) at that club, as the player's Wikipedia infobox gives them (league only or all
 * competitions, depending on the article). Then both numbers show, the bigger one on the cover-yellow sticker.
 */
import { useState } from 'react';
import type { AttemptResponse, HigherLowerReveal, HigherLowerView } from '@decabeca/contracts';
import { ClubBadge } from '../../components/ClubBadge';
import { btnPrimary, GameHeader, Skeleton } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

type Side = { playerName: string; clubName: string; value?: number };
const QUESTION = {
  goals: 'Quem fez mais gols pelo clube?',
  games: 'Quem jogou mais jogos pelo clube?',
} as const;
const UNIT = { goals: 'gols', games: 'jogos' } as const;

function Card({
  side,
  metric,
  state,
  onPick,
  disabled,
}: {
  side: Side;
  metric: 'goals' | 'games';
  state: 'pick' | 'winner' | 'loser';
  onPick?: () => void;
  disabled?: boolean;
}) {
  const body = (
    <>
      <ClubBadge name={side.clubName} size="lg" />
      <span className="font-condensed text-3xl leading-[0.95] font-black uppercase">
        {side.playerName}
      </span>
      <span className="font-semibold opacity-80">no {side.clubName}</span>
      {side.value !== undefined && (
        <span className="font-condensed tabular mt-1 text-5xl leading-none font-black">
          {side.value}
          <span className="ml-1 text-xl">{UNIT[metric]}</span>
        </span>
      )}
    </>
  );
  const cls = `flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl p-5 text-center ${state === 'winner' ? 'bg-cover text-ink' : state === 'loser' ? 'border-2 border-dashed border-chalk-soft/50 text-chalk' : 'bg-paper text-ink shadow-[0_10px_24px_-10px_rgb(0_0_0/0.5)] transition-transform duration-150 ease-out-expo hover:-translate-y-1'}`;
  return onPick ? (
    <button className={cls} onClick={onPick} disabled={disabled}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function resultCopy(data: AttemptResponse) {
  const right = data.attempt.score;
  const reveal = data.reveal as HigherLowerReveal;
  return {
    headline:
      right === 5
        ? 'Olho de olheiro! 5 de 5.'
        : right === 4
          ? 'Quase perfeito: 4 de 5'
          : `${right} de 5 desta vez`,
    detail: (
      <ul className="flex flex-col gap-0.5 text-base">
        {reveal.rounds.map((r, i) => (
          <li key={i}>
            {r.a.playerName} ({r.a.value}) × {r.b.playerName} ({r.b.value}) {UNIT[r.metric]}
          </li>
        ))}
      </ul>
    ),
  };
}

export function HigherLowerPage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('HIGHER_LOWER', level, timed);
  const action = useAction('HIGHER_LOWER', level);
  const [shown, setShown] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const data = attempt.data;
  useGameTracking(data);
  const title = `Mais ou Menos · Fase ${level}`;

  if (attempt.isPending) return <Skeleton className="h-96" />;
  if (attempt.error || !data)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError
          error={attempt.error as ApiError}
          mode="HIGHER_LOWER"
          retry={() => void attempt.refetch()}
        />
      </div>
    );
  const view = data.view as HigherLowerView;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const showing = shown !== null ? view.rounds[shown] : undefined;
  const choose = (side: 'a' | 'b') =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'choose', side } },
      {
        onSuccess: (res) => {
          const ev = res.event;
          if (ev && 'values' in ev) {
            setShown(ev.round);
            setAnnounce(
              `${ev.type === 'correct' ? 'Acertou' : 'Errou'}: ${ev.values[0]} contra ${ev.values[1]}.`,
            );
          }
        },
      },
    );
  const dots = (
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
  const round = showing ?? view.current;

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
            {dots}
          </div>
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)] lg:items-start">
        <section className="flex flex-col gap-5">
          {round && (
            <h2 className="font-condensed text-3xl leading-tight font-black uppercase">
              {QUESTION[round.metric]}
            </h2>
          )}
          {showing ? (
            <>
              <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                {(['a', 'b'] as const).map((k, i) => {
                  const other = k === 'a' ? showing.b : showing.a;
                  const side = showing[k];
                  return (
                    <div key={k} className={i === 1 ? 'sm:order-3' : ''}>
                      <Card
                        side={side}
                        metric={showing.metric}
                        state={side.value > other.value ? 'winner' : 'loser'}
                      />
                    </div>
                  );
                })}
                <span className="font-condensed text-center text-2xl font-black text-chalk-soft sm:order-2">
                  ou
                </span>
              </div>
              <p className="font-condensed text-2xl font-black uppercase">
                {showing.correct ? 'Acertou!' : 'Não foi dessa vez.'}
              </p>
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
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <Card
                side={view.current.a}
                metric={view.current.metric}
                state="pick"
                onPick={() => choose('a')}
                disabled={action.isPending}
              />
              <span className="font-condensed text-center text-2xl font-black text-chalk-soft">
                ou
              </span>
              <Card
                side={view.current.b}
                metric={view.current.metric}
                state="pick"
                onPick={() => choose('b')}
                disabled={action.isPending}
              />
            </div>
          ) : null}
          {action.error && (
            <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
              {(action.error as ApiError).message}
            </p>
          )}
        </section>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          {done ? (
            <LevelEnd data={data} {...resultCopy(data)} />
          ) : (
            <p className="rounded-xl border-2 border-dashed border-chalk-soft/40 p-4 text-chalk-soft">
              Duas passagens reais, um número escondido. Toque em quem tem mais gols (ou jogos)
              naquele clube. Cinco rodadas. Números da ficha do jogador na Wikipédia.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
