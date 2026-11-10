/**
 * Mais ou Menos screen (ADR-011): two real spells side by side; tap the one with more goals (or
 * games) at that club, as the player's Wikipedia infobox gives them (league only or all
 * competitions, depending on the article). Then both numbers show, the bigger one on the cover-yellow sticker.
 */
import { useEffect, useRef, useState } from 'react';
import type { AttemptResponse, HigherLowerReveal, HigherLowerView } from '@decabeca/contracts';
import { ClubBadge } from '../../components/ClubBadge';
import { btnPrimary, GameHeader, Skeleton } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { useAction, useAttempt } from '../../lib/game';
import { buzz } from '../../lib/haptics';
import { motionReduced } from '../../lib/settings';
import { play } from '../../lib/sound';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

type Side = { playerName: string; clubName: string; value?: number };
const QUESTION = {
  goals: 'Quem fez mais gols pelo clube?',
  games: 'Quem jogou mais jogos pelo clube?',
} as const;
const UNIT = { goals: 'gols', games: 'jogos' } as const;

const LED = 'text-[#f5e27a]';
const reduced = motionReduced;
const DIGIT_MS = 220;

/** The number lights up digit by digit on the scoreboard; a tick per digit. Reduced motion: all at once. */
function LedNumber({
  value,
  unit,
  start,
  win,
}: {
  value: number;
  unit: string;
  start: number;
  win: boolean;
}) {
  const digits = String(value).split('');
  const still = useRef(reduced()).current;
  useEffect(() => {
    if (still) return;
    const ids = digits.map((_, i) => window.setTimeout(() => play('tick'), start + i * DIGIT_MS));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);
  return (
    <span
      className={`flex shrink-0 flex-col items-end sm:flex-row sm:gap-1 ${win ? LED : 'text-chalk-soft'}`}
    >
      <span className="sr-only">
        {value} {unit}
      </span>
      <span
        aria-hidden="true"
        className="font-condensed tabular flex text-4xl leading-none font-black sm:text-7xl"
      >
        {digits.map((d, i) => (
          <span
            key={i}
            className={still ? '' : 'led-digit'}
            style={still ? undefined : { animationDelay: `${start + i * DIGIT_MS}ms` }}
          >
            {d}
          </span>
        ))}
      </span>
      <span
        aria-hidden="true"
        className="font-condensed text-sm font-extrabold uppercase sm:pb-1 sm:text-2xl"
      >
        {unit}
      </span>
    </span>
  );
}

/** Five floodlights; each right answer in a row lights the next one (flicker, then steady). */
function Floodlights({ streak, total }: { streak: number; total: number }) {
  const before = useRef(streak);
  // Lights that finished flickering; a fresh one keeps its class until animationend, re-renders or not.
  const settled = useRef(streak);
  if (streak < settled.current) settled.current = streak;
  useEffect(() => {
    if (streak > before.current) {
      const id = window.setTimeout(() => {
        play('clunk');
        buzz(15);
      }, FLOOD_DELAY);
      before.current = streak;
      return () => window.clearTimeout(id);
    }
    before.current = streak;
  }, [streak]);
  return (
    <div role="img" aria-label={`${streak} acertos seguidos`} className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="relative size-6 overflow-hidden rounded-full border-2 border-[#3a4046] bg-[#1d2124] sm:size-7"
        >
          {i < streak && (
            <i
              className={`absolute inset-0 rounded-full bg-[radial-gradient(circle,#fffbe0,#f5e27a_60%,#d9b73a)] ${i >= settled.current ? 'flood-on' : ''}`}
              style={i >= settled.current ? { animationDelay: `${FLOOD_DELAY}ms` } : undefined}
              onAnimationEnd={() => (settled.current = Math.max(settled.current, i + 1))}
            />
          )}
        </span>
      ))}
    </div>
  );
}
const FLOOD_DELAY = 700;

function Player({
  side,
  metric,
  state,
  start,
  onPick,
  disabled,
}: {
  side: Side;
  metric: 'goals' | 'games';
  state: 'pick' | 'winner' | 'loser';
  start: number;
  onPick?: (() => void) | undefined;
  disabled?: boolean;
}) {
  const body = (
    <>
      <ClubBadge name={side.clubName} size="lg" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left sm:flex-none sm:items-center sm:text-center">
        <span
          className={`font-condensed text-2xl leading-[0.95] font-black uppercase sm:text-4xl ${state === 'loser' ? 'text-chalk-soft' : LED}`}
        >
          {side.playerName}
        </span>
        <span className="text-sm font-semibold text-chalk-soft sm:text-base">
          no {side.clubName}
        </span>
      </span>
      {side.value !== undefined && (
        <LedNumber value={side.value} unit={UNIT[metric]} start={start} win={state === 'winner'} />
      )}
    </>
  );
  const cls = `flex h-full min-h-20 w-full min-w-0 items-center gap-3 rounded-xl border-2 px-4 py-2 sm:flex-col sm:justify-center sm:gap-3 sm:px-6 ${
    state === 'winner'
      ? 'border-[#f5e27a] bg-[#2a2810]'
      : state === 'loser'
        ? 'border-dashed border-chalk-soft/30 bg-[#15181a]'
        : 'border-[#3a4046] bg-[#1d2124] transition-transform duration-150 ease-out-expo hover:border-[#f5e27a] active:scale-[0.99]'
  }`;
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
  const [flash, setFlash] = useState(0);
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
  const showing = shown !== null ? view.rounds[shown] : done ? view.rounds.at(-1) : undefined;
  const choose = (side: 'a' | 'b') =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'choose', side } },
      {
        onSuccess: (res) => {
          const ev = res.event;
          if (ev && 'values' in ev) {
            setShown(ev.round);
            if (ev.type !== 'correct') setFlash((n) => n + 1);
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
            className={`font-condensed grid size-7 place-items-center rounded-md text-sm font-black ${r ? (r.correct ? 'bg-cover text-ink' : 'bg-chalk/15 text-chalk-soft line-through') : i === view.round ? 'border-2 border-cover text-gold' : 'border-2 border-dashed border-chalk-soft/50 text-chalk-soft/70'}`}
          >
            <span className="sr-only">{r ? (r.correct ? 'acertou' : 'errou') : 'a jogar'} </span>
            {i + 1}
          </li>
        );
      })}
    </ol>
  );
  const round = showing ?? view.current;
  let streak = 0;
  for (let i = view.rounds.length - 1; i >= 0 && view.rounds[i]!.correct; i--) streak++;
  // Side b's number starts after side a's digits.
  const startB = 150 + String(showing?.a.value ?? 0).length * DIGIT_MS + 150;

  return (
    <div
      className={`flex flex-col gap-3 ${done ? '' : 'h-[calc(100dvh-8rem-env(safe-area-inset-bottom)-var(--consent-room,0px))] sm:h-[calc(100dvh-9rem-var(--consent-room,0px))]'}`}
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
            {dots}
          </div>
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
      <section
        aria-label="Telão"
        className={`obj-dark relative mx-auto flex w-full max-w-5xl flex-col gap-3 overflow-hidden rounded-xl border-[6px] border-[#2a2f33] bg-[linear-gradient(#15181a,#0b0d0e)] p-3 shadow-[inset_0_0_30px_#000a] sm:p-5 ${done ? 'min-h-[30rem]' : 'min-h-0 flex-1'}`}
      >
        <i
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(0deg,#0004_0_1px,transparent_1px_3px)]"
        />
        <div className="relative flex shrink-0 items-center justify-between gap-3">
          {round && (
            <h2
              className={`font-condensed text-xl leading-tight font-black uppercase sm:text-3xl ${LED}`}
            >
              {QUESTION[round.metric]}
            </h2>
          )}
          <Floodlights streak={streak} total={view.totalRounds} />
        </div>
        {(showing || view.current) && (
          <div className="relative grid min-h-0 flex-1 grid-rows-[1fr_auto_1fr] items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr] sm:grid-rows-1 sm:gap-4">
            {(['a', 'b'] as const).map((k, i) => {
              const cur = showing ?? view.current!;
              const other = k === 'a' ? cur.b : cur.a;
              const side = cur[k];
              return (
                <div
                  key={k}
                  className={`min-h-0 ${i === 1 ? 'row-start-3 sm:order-3 sm:row-start-auto' : ''}`}
                >
                  <Player
                    side={side}
                    metric={cur.metric}
                    start={k === 'a' ? 150 : startB}
                    state={
                      showing
                        ? ((side as Side).value ?? 0) > ((other as Side).value ?? 0)
                          ? 'winner'
                          : 'loser'
                        : 'pick'
                    }
                    onPick={showing ? undefined : () => choose(k)}
                    disabled={action.isPending}
                  />
                </div>
              );
            })}
            <span className="font-condensed grid size-11 place-self-center self-center rounded-full border-2 border-[#3a4046] bg-[#0b0d0e] text-center text-lg leading-[2.6rem] font-black text-chalk-soft sm:order-2 sm:row-start-auto">
              ou
            </span>
          </div>
        )}
        <div className="relative flex shrink-0 flex-wrap items-center gap-3">
          {showing ? (
            <>
              <p className={`font-condensed text-2xl font-black uppercase ${LED}`}>
                {showing.correct ? 'Acertou!' : 'Não foi dessa vez.'}
              </p>
              {!done && (
                <button
                  className={`${btnPrimary} ml-auto`}
                  onClick={() => setShown(null)}
                  autoFocus
                >
                  Próxima rodada
                </button>
              )}
            </>
          ) : (
            <p className="sr-only text-sm text-chalk-soft sm:not-sr-only">
              Duas passagens reais, um número escondido. Toque em quem tem mais gols (ou jogos)
              naquele clube. Cinco rodadas. Números da ficha do jogador na Wikipédia.
            </p>
          )}
        </div>
        {action.error && (
          <p role="alert" className="relative rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
            {(action.error as ApiError).message}
          </p>
        )}
      </section>
      {done && (
        <div className="mx-auto w-full max-w-5xl">
          <LevelEnd data={data} {...resultCopy(data)} />
        </div>
      )}
    </div>
  );
}
