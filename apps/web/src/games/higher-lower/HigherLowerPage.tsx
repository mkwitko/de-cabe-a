/**
 * Quem fez mais? (ADR-011): a night match at the stadium, played on its giant scoreboard. Two real
 * spells face each other like the two teams on the placar, the number hidden behind dark LEDs;
 * tap the one with more goals (or games) at that club, as the player's Wikipedia infobox gives
 * them. Then both numbers light up digit by digit and the duel lamp turns green or red. Five duels;
 * the end is the final whistle on the same board.
 *
 * Phones: the two sides stacked, the question bar between them (thumb's reach). Wide: the two
 * sides face to face across the board, the question in the centre column. Still art only: the
 * stadium is gradients, the digits a dot mask; motion is ≤150 ms opacity/transform feedback.
 */
import { useEffect, useRef, useState } from 'react';
import type { AttemptResponse, HigherLowerReveal, HigherLowerView } from '@decabeca/contracts';
import { ClubBadge } from '../../components/ClubBadge';
import { GameHeader, Skeleton } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { useAction, useAttempt } from '../../lib/game';
import { motionReduced } from '../../lib/settings';
import { play } from '../../lib/sound';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

type Metric = 'goals' | 'games';
type Side = { playerName: string; clubName: string; value?: number };
const QUESTION = {
  goals: 'Quem fez mais gols pelo clube?',
  games: 'Quem jogou mais jogos pelo clube?',
} as const;
const UNIT = { goals: 'gols', games: 'jogos' } as const;
const DIGIT_MS = 220;
const BACK = '/quem-fez-mais';

/** The number lights up digit by digit on the board; a tick per digit. Reduced motion: at once. */
function LedNumber({ value, unit, start }: { value: number; unit: string; start: number }) {
  const digits = String(value).split('');
  const still = useRef(motionReduced()).current;
  useEffect(() => {
    if (still) return;
    const ids = digits.map((_, i) => window.setTimeout(() => play('tick'), start + i * DIGIT_MS));
    return () => ids.forEach((id) => window.clearTimeout(id));
    // once per reveal: the side remounts with a new duel
  }, []);
  return (
    <>
      <span className="sr-only">
        {value} {unit}
      </span>
      <span aria-hidden="true" className="hl-led flex">
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
    </>
  );
}

/** One team's half of the placar: club, player, and the number (dark until the pick). */
function Panel({
  side,
  metric,
  state,
  mine,
  start,
  onPick,
  disabled,
  hotkey,
}: {
  side: Side;
  metric: Metric;
  state: 'pick' | 'winner' | 'loser';
  /** This was the player's pick: right or wrong. */
  mine?: 'right' | 'wrong' | undefined;
  start: number;
  onPick?: (() => void) | undefined;
  disabled?: boolean;
  hotkey: string;
}) {
  const body = (
    <>
      <span className="flex w-full items-center gap-3 sm:flex-col sm:gap-2">
        <ClubBadge name={side.clubName} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col text-left sm:items-center sm:text-center">
          <span className="hl-name font-condensed text-[clamp(1.6rem,7.4vw,2.4rem)] leading-[0.9] font-black uppercase sm:text-[clamp(2.2rem,3.4vw,3.6rem)]">
            {side.playerName}
          </span>
          <span className="mt-1 text-sm font-bold tracking-[0.12em] text-[#9aa3a8] uppercase sm:text-base">
            no {side.clubName}
          </span>
        </span>
      </span>
      <span className="hl-digits font-condensed tabular flex items-end gap-2 leading-none font-black">
        {side.value === undefined ? (
          <span aria-hidden="true" className="hl-led hl-led-off">
            ???
          </span>
        ) : (
          <LedNumber value={side.value} unit={UNIT[metric]} start={start} />
        )}
        <span
          aria-hidden="true"
          className="pb-[0.35em] text-[0.24em] font-extrabold tracking-[0.1em] text-[#9aa3a8] uppercase"
        >
          {UNIT[metric]}
        </span>
      </span>
      {mine && (
        <span
          className={`hl-tag font-condensed ${mine === 'right' ? 'bg-[#2fd27a] text-[#062312]' : 'bg-[#ff5a4e] text-[#2a0603]'}`}
        >
          Seu palpite
        </span>
      )}
      {state === 'pick' && (
        <span aria-hidden="true" className="hl-key font-condensed">
          {hotkey}
        </span>
      )}
    </>
  );
  const cls = `hl-panel ${state === 'winner' ? 'is-winner' : state === 'loser' ? 'is-loser' : 'is-open'}`;
  return onPick ? (
    <button
      type="button"
      data-side
      className={cls}
      onClick={onPick}
      disabled={disabled}
      aria-keyshortcuts={hotkey}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** The five duel lamps along the top of the board: green right, red wrong, outlined now. */
function Lamps({ view }: { view: HigherLowerView }) {
  return (
    <ol
      className="flex gap-1.5"
      aria-label={`Duelo ${Math.min(view.round + 1, view.totalRounds)} de ${view.totalRounds}`}
    >
      {Array.from({ length: view.totalRounds }, (_, i) => {
        const r = view.rounds[i];
        return (
          <li
            key={i}
            className={`hl-lamp font-condensed ${r ? (r.correct ? 'is-right' : 'is-wrong') : i === view.round ? 'is-now' : ''}`}
          >
            <span className="sr-only">{r ? (r.correct ? 'acertou' : 'errou') : 'a jogar'} </span>
            {i + 1}
          </li>
        );
      })}
    </ol>
  );
}

/** Full time on the same board: the score and every duel as a line of the placar. */
function FinalBoard({ data }: { data: AttemptResponse }) {
  const reveal = data.reveal as HigherLowerReveal | null;
  const view = data.view as HigherLowerView;
  const rounds = reveal?.rounds ?? view.rounds;
  const right = data.attempt.score;
  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 border-b-2 border-[#262c30] pb-3">
        <div>
          <p className="text-xs font-extrabold tracking-[0.3em] text-[#9aa3a8] uppercase">
            Fim de jogo
          </p>
          <p className="font-condensed text-3xl leading-none font-black text-[var(--hl-led)] uppercase sm:text-5xl">
            Placar final
          </p>
        </div>
        <p className="font-condensed tabular flex items-baseline leading-none font-black">
          <span className="sr-only">
            {right} de {rounds.length} acertos
          </span>
          <span aria-hidden="true" className="hl-led text-[4.5rem] sm:text-[7rem]">
            {right}
          </span>
          <span aria-hidden="true" className="text-2xl text-[var(--hl-dim)] sm:text-4xl">
            /{rounds.length}
          </span>
        </p>
      </div>
      <ol className="flex flex-col gap-1.5" aria-label="Os duelos">
        {rounds.map((r, i) => {
          const ok = view.rounds[i]?.correct;
          const aWins = r.a.value > r.b.value;
          const tone = (win: boolean) => (win ? 'text-[var(--hl-led)]' : 'text-[var(--hl-dim)]');
          const who = (s: Side, area: string, right = false) => (
            <span className={`min-w-0 ${right ? 'sm:text-right' : ''}`} style={{ gridArea: area }}>
              <span className="font-condensed block truncate text-xl leading-tight font-black uppercase sm:text-2xl">
                {s.playerName}
              </span>
              <span className="block truncate text-xs font-semibold text-[var(--hl-dim)]">
                {s.clubName}
              </span>
            </span>
          );
          const num = (v: number, area: string) => (
            <span
              className={`font-condensed tabular text-right text-2xl leading-none font-black sm:text-4xl ${area === 'bv' ? 'sm:text-left' : ''}`}
              style={{ gridArea: area }}
            >
              {v}
              <span className="ml-1 text-[0.5em] font-extrabold uppercase sm:hidden">
                {UNIT[r.metric]}
              </span>
            </span>
          );
          return (
            <li key={i} className="hl-row">
              <span
                className={`hl-lamp font-condensed [grid-area:n] ${ok === undefined ? '' : ok ? 'is-right' : 'is-wrong'}`}
              >
                <span className="sr-only">{ok ? 'acertou' : 'errou'}: </span>
                {i + 1}
              </span>
              <span className={`contents ${tone(aWins)}`}>
                {who(r.a, 'a', true)}
                {num(r.a.value, 'av')}
              </span>
              <span
                aria-hidden="true"
                className="font-condensed text-center leading-none font-black text-[#59626a] [grid-area:x] max-sm:hidden"
              >
                <span className="text-3xl">×</span>
                <span className="block text-xs tracking-[0.12em] text-[var(--hl-dim)] uppercase">
                  {UNIT[r.metric]}
                </span>
              </span>
              <span className="sr-only">contra</span>
              <span className={`contents ${tone(!aWins)}`}>
                {num(r.b.value, 'bv')}
                {who(r.b, 'b')}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-[#9aa3a8]">
        Jogos e gols só na liga nacional, pela ficha de cada jogador na Wikipédia em inglês.
      </p>
    </div>
  );
}

function resultCopy(data: AttemptResponse) {
  const right = data.attempt.score;
  const missed = (data.view as HigherLowerView).rounds.filter((r) => !r.correct);
  return {
    headline:
      right === 5
        ? 'Olho de olheiro! 5 de 5.'
        : right === 4
          ? 'Quase perfeito: 4 de 5'
          : `${right} de 5 desta vez`,
    detail: missed.length
      ? `Faltou: ${missed.map((r) => `${r.a.playerName} × ${r.b.playerName}`).join(', ')}.`
      : 'Leu todos os duelos do placar.',
    starRule: '5 acertos: 3 estrelas · 4: 2 · 3: 1.',
  };
}

export function HigherLowerPage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('HIGHER_LOWER', level, timed);
  const action = useAction('HIGHER_LOWER', level);
  const [shown, setShown] = useState<number | null>(null);
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const [announce, setAnnounce] = useState('');
  const [flash, setFlash] = useState(0);
  const data = attempt.data;
  useGameTracking(data);
  const title = `Quem fez mais? · Fase ${level}`;
  const view = data?.view as HigherLowerView | undefined;
  const done = !!data && data.attempt.status !== 'IN_PROGRESS';
  const picking = !!view?.current && shown === null && !done;

  const choose = (side: 'a' | 'b') => {
    if (!data || action.isPending) return;
    setPicked(side);
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
        onSettled: () => setPicked(null),
      },
    );
  };
  // Desktop: 1 / ← picks the left side, 2 / → the right one.
  const pick = useRef(choose);
  pick.current = choose;
  useEffect(() => {
    if (!picking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [role=dialog]'))
        return;
      if (e.key === '1' || e.key === 'ArrowLeft') pick.current('a');
      else if (e.key === '2' || e.key === 'ArrowRight') pick.current('b');
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [picking]);

  if (attempt.isPending)
    return (
      <div className="flex flex-col gap-4">
        <div aria-hidden="true" className="hl-stadium" />
        <GameHeader title={title} back={BACK} />
        <Skeleton className="h-[28rem]" />
      </div>
    );
  if (attempt.error || !data || !view)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} back={BACK} />
        <LevelError
          error={attempt.error as ApiError}
          mode="HIGHER_LOWER"
          retry={() => void attempt.refetch()}
        />
      </div>
    );

  const showing = shown !== null ? view.rounds[shown] : undefined;
  const cur = showing ?? view.current;
  // Side b's number starts after side a's digits.
  const startB = 150 + String(showing?.a.value ?? 0).length * DIGIT_MS + 150;
  const verdict = showing && (
    <p
      className={`font-condensed text-[1.9rem] leading-none font-black uppercase sm:text-5xl ${showing.correct ? 'text-[#2fd27a]' : 'text-[#ff5a4e]'}`}
    >
      {showing.correct ? 'Acertou!' : 'Errou!'}
    </p>
  );
  // The last duel shows its numbers too; then the final whistle (the board, the stars).
  const ended = done && !showing;
  const next = showing && (
    <button
      type="button"
      className="hl-next font-condensed"
      onClick={() => setShown(null)}
      // the board's one action: Enter goes on with a keyboard; a phone gets no keyboard from it
      autoFocus
    >
      {done ? 'Placar final' : 'Próximo duelo'}
    </button>
  );

  return (
    <div
      className={`flex flex-col gap-2 sm:gap-3 ${ended ? '' : 'h-[calc(var(--app-h,100dvh)-4rem-var(--nav-room,4rem)-env(safe-area-inset-bottom)-var(--consent-room,0px))] sm:h-[calc(100dvh-9rem-var(--consent-room,0px))]'}`}
    >
      <div aria-hidden="true" className="hl-stadium" />
      <GameHeader
        title={title}
        back={BACK}
        aside={
          <Countdown
            data={data}
            onTimeUp={() =>
              action.mutate({ attemptId: data.attempt.id, input: { kind: 'give_up' } })
            }
          />
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
        aria-label="Placar"
        className={`hl-board mx-auto flex w-full flex-col gap-2 sm:gap-4 ${ended ? '' : 'min-h-0 flex-1'}`}
      >
        <header className="relative flex shrink-0 items-center justify-between gap-3">
          <Lamps view={view} />
          <p className="font-condensed text-sm font-extrabold tracking-[0.2em] text-[#9aa3a8] uppercase sm:text-base">
            {ended
              ? 'Encerrado'
              : `Duelo ${Math.min(view.round + 1, view.totalRounds)}/${view.totalRounds}`}
          </p>
        </header>

        {ended ? (
          <FinalBoard data={data} />
        ) : (
          cur && (
            <div className="hl-field relative grid min-h-0 flex-1 gap-2 sm:gap-4">
              <h2 className="sr-only">{QUESTION[cur.metric]}</h2>
              {(['a', 'b'] as const).map((k) => {
                const side: Side = cur[k];
                const other: Side = cur[k === 'a' ? 'b' : 'a'];
                const mine =
                  showing && showing.choice === k
                    ? showing.correct
                      ? 'right'
                      : 'wrong'
                    : undefined;
                return (
                  <div key={k} className={`min-h-0 ${k === 'a' ? 'hl-a' : 'hl-b'}`}>
                    <Panel
                      side={side}
                      metric={cur.metric}
                      state={
                        showing
                          ? (side.value ?? 0) > (other.value ?? 0)
                            ? 'winner'
                            : 'loser'
                          : 'pick'
                      }
                      mine={mine}
                      start={k === 'a' ? 150 : startB}
                      onPick={showing ? undefined : () => choose(k)}
                      disabled={action.isPending && picked !== null}
                      hotkey={k === 'a' ? '1' : '2'}
                    />
                  </div>
                );
              })}
              {/* the question between the two sides: a bar on phones, the centre column wide */}
              <div className="hl-mid flex items-center justify-between gap-3 sm:flex-col sm:justify-center sm:gap-5 sm:text-center">
                {showing ? (
                  <>
                    {verdict}
                    {next}
                  </>
                ) : (
                  <>
                    <p
                      aria-hidden="true"
                      className="font-condensed flex w-full flex-wrap items-baseline justify-center gap-x-2 leading-none font-black uppercase sm:flex-col sm:items-center sm:gap-1"
                    >
                      <span className="text-base tracking-[0.12em] text-[var(--hl-dim)]">
                        Quem tem mais
                      </span>
                      <span className="hl-led text-[2.6rem] sm:text-[4.5rem]">
                        {UNIT[cur.metric]}
                      </span>
                      <span className="text-base tracking-[0.12em] text-[var(--hl-dim)]">
                        pelo clube?
                      </span>
                    </p>
                    <p className="text-sm font-semibold text-[var(--hl-dim)] max-sm:sr-only">
                      {action.isPending
                        ? 'Conferindo a ficha…'
                        : 'Toque no lado com o número maior.'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )
        )}
        {action.error && (
          <p role="alert" className="relative rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
            {(action.error as ApiError).message}
          </p>
        )}
      </section>
      {ended && (
        <div className="mx-auto w-full max-w-5xl">
          <LevelEnd data={data} {...resultCopy(data)} />
        </div>
      )}
    </div>
  );
}
