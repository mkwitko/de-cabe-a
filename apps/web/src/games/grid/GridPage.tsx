/**
 * Football Grid screen (UX_SPEC.md §4, FOOTBALL_GRID.md §6). The board is a tactics chalkboard: empty
 * chalk slots, a magnet that snaps on for each right answer, a chalk stroke per finished line. Cell picker and the
 * "finish" confirmation use the native <dialog> (focus trap and Escape for free).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AttemptResponse,
  FootballGridReveal,
  FootballGridView,
  PlayerRef,
} from '@decabeca/contracts';
import { ApiError } from '../../lib/api';
import { useGameTracking } from '../../lib/useGameTracking';
import { useAction, useAttempt } from '../../lib/game';
import { HintMask } from '../../components/HintMask';
import { LevelEnd, LevelError } from '../LevelParts';
import { Countdown } from '../Clock';
import { ClubBadge } from '../../components/ClubBadge';
import { Icon } from '../../components/Icon';
import { buzz } from '../../lib/haptics';
import { play } from '../../lib/sound';
import { PlayerSearch } from '../../components/PlayerSearch';
import { btnSecondary, GameHeader, Skeleton, useOnline } from '../../components/ui';

type Crit = FootballGridView['rows'][number];

function CriterionHead({ c }: { c: Crit }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 p-1 text-center">
      {c.type === 'club' ? (
        <ClubBadge name={c.label} size="sm" />
      ) : (
        <span className="font-condensed grid size-8 shrink-0 place-items-center rounded-full bg-chalk text-xs font-black text-pitch">
          {c.code}
        </span>
      )}
      <span
        className="font-condensed line-clamp-2 w-full text-xs leading-tight font-bold break-words uppercase sm:text-sm"
        title={c.label}
      >
        {c.label}
      </span>
    </div>
  );
}

const LINES = [
  ...[0, 1, 2].map((r) => ({ key: `r${r}`, cells: [r * 3, r * 3 + 1, r * 3 + 2], row: r })),
  ...[0, 1, 2].map((c) => ({ key: `c${c}`, cells: [c, c + 3, c + 6], col: c })),
];

/** A chalk stroke over each completed row or column; strokes done before mount stay still. */
function ChalkLines({ filled }: { filled: boolean[] }) {
  const done = LINES.filter((l) => l.cells.every((i) => filled[i]));
  const before = useRef<Set<string> | null>(null);
  before.current ??= new Set(done.map((l) => l.key));
  const count = useRef(done.length);
  useEffect(() => {
    if (done.length > count.current) {
      play('tick');
      buzz([10, 40, 10]);
    }
    count.current = done.length;
  }, [done.length]);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-1.5 grid grid-cols-[minmax(4rem,0.6fr)_repeat(3,minmax(0,1fr))] grid-rows-[4.75rem_repeat(3,minmax(0,1fr))] gap-1.5 sm:inset-3 sm:gap-2.5"
    >
      {done.map((l) => (
        <i
          key={l.key}
          style={
            'row' in l
              ? { gridRow: l.row + 2, gridColumn: '2 / 5' }
              : { gridColumn: l.col! + 2, gridRow: '2 / 5' }
          }
          className={`chalk-line m-auto rounded-full bg-cover/90 ${'row' in l ? 'h-1.5 w-[96%] origin-left' : 'h-[96%] w-1.5 origin-top'} ${before.current!.has(l.key) ? '' : 'chalk-draw'}`}
        />
      ))}
    </div>
  );
}

const cellLabel = (v: FootballGridView, i: number) =>
  `${v.rows[Math.floor(i / 3)]!.label} e ${v.cols[i % 3]!.label}`;

export function GridPage({
  level,
  timed = false,
  challengeId,
  name,
}: {
  level: number;
  timed?: boolean;
  /** An Oficina level, played by id. */
  challengeId?: string;
  name?: string;
}) {
  const attempt = useAttempt('FOOTBALL_GRID', level, timed, challengeId);
  const action = useAction('FOOTBALL_GRID', level, challengeId);
  const online = useOnline();
  const [cell, setCell] = useState<number | null>(null);
  const [miss, setMiss] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const seen = useRef<Set<number> | null>(null); // cells already filled at mount: no snap
  const [announce, setAnnounce] = useState('');
  const sheet = useRef<HTMLDialogElement>(null);
  const confirm = useRef<HTMLDialogElement>(null);
  const data = attempt.data;
  useGameTracking(data);
  const view = data?.view as FootballGridView | undefined;
  const used = useMemo(
    () => new Set(view?.cells.flatMap((c) => (c.player ? [c.player.id] : [])) ?? []),
    [view?.cells],
  );

  useEffect(() => {
    if (cell === null) sheet.current?.close();
    else if (!sheet.current?.open) sheet.current?.showModal();
  }, [cell]);

  const title = name ?? `Grid · Fase ${level}`;
  if (attempt.isPending)
    return (
      <div className="flex flex-col gap-4">
        <GameHeader title={title} />
        <Skeleton className="aspect-square w-full max-w-xl" />
      </div>
    );
  if (attempt.error) {
    const e = attempt.error as ApiError;
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError error={e} mode="FOOTBALL_GRID" retry={() => void attempt.refetch()} />
      </div>
    );
  }
  if (!data || !view) return null;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const reveal = data.reveal as FootballGridReveal | null;
  const left = view.maxAttempts - view.attemptsUsed;
  const hintOf = (i: number) => view.hints.find((h) => h.cellIndex === i);

  async function guess(p: PlayerRef | null) {
    if (!p || cell === null) return;
    const index = cell;
    setCell(null);
    try {
      const res: AttemptResponse = await action.mutateAsync({
        attemptId: data!.attempt.id,
        input: { kind: 'guess', cellIndex: index, playerId: p.id },
      });
      if (res.event?.type === 'wrong') {
        setMiss(index);
        setFlash((n) => n + 1);
        setTimeout(() => setMiss(null), 600);
        setAnnounce(`${p.name} não serve aqui. Tentativa perdida.`);
      } else setAnnounce(`${p.name}! Acertou.`);
    } catch {
      /* rendered from action.error */
    }
  }

  const frame = done ? 'h-[26rem] sm:h-[32rem]' : 'min-h-0 flex-1';
  const filledAt = view.cells.map((c) => !!c.player);
  seen.current ??= new Set(filledAt.flatMap((f, i) => (f ? [i] : [])));

  return (
    <div
      className={`flex flex-col gap-3 ${done ? '' : 'h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-9rem)]'}`}
    >
      <GameHeader
        title={title}
        aside={
          <Countdown
            data={data}
            onTimeUp={() =>
              void action.mutate({ attemptId: data.attempt.id, input: { kind: 'finish' } })
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
          className="pointer-events-none fixed inset-0 z-40 bg-[#a3242f] opacity-0 motion-safe:animate-[red-flash_450ms_ease-out]"
        />
      )}

      {!done && (
        <div className="mx-auto flex w-full max-w-5xl shrink-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap">
            <p
              className="font-condensed tabular shrink-0 text-3xl leading-none font-black"
              aria-label={`${left} tentativas restantes`}
            >
              {left}
              <span className="ml-1 text-sm text-chalk-soft">de 9</span>
            </p>
            <div
              className="order-last flex min-w-0 basis-full gap-1 sm:order-none sm:basis-0 sm:flex-1"
              aria-hidden="true"
            >
              {Array.from({ length: 9 }, (_, k) => (
                <span
                  key={k}
                  className={`h-2 flex-1 rounded-full ${k < view.attemptsUsed ? 'bg-chalk-soft/25' : 'bg-cover'}`}
                />
              ))}
            </div>
            <p className="font-condensed shrink-0 text-base font-extrabold text-cover uppercase">
              Dicas: {view.hintsLeft} de 3
            </p>
            <button
              className={`${btnSecondary} min-h-11 shrink-0 px-3 text-base`}
              onClick={() => confirm.current?.showModal()}
              disabled={!online || action.isPending}
            >
              Encerrar
            </button>
          </div>
          <p className="text-xs text-chalk-soft">
            Toque numa célula e escolha um jogador que cumpra a linha e a coluna. Errar gasta uma
            tentativa.{' '}
            {view.hints.length
              ? 'Fase vale no máximo 2 estrelas.'
              : 'Usar uma dica limita a fase a 2 estrelas.'}
          </p>
          {view.wrongGuesses.length > 0 && (
            <ul
              className="flex max-h-7 gap-1.5 overflow-x-auto text-xs"
              aria-label="Chutes errados"
            >
              {view.wrongGuesses.map((w, k) => (
                <li
                  key={k}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-chalk-soft/40 px-2 py-0.5 text-chalk-soft"
                >
                  <Icon name="cross" className="size-3 shrink-0" />
                  <span>
                    <strong className="text-chalk">{w.player.name}</strong> não serve em{' '}
                    {cellLabel(view, w.cellIndex)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className={`${frame} relative mx-auto w-full max-w-5xl rounded-xl border-[10px] border-[#8a5a33] bg-[radial-gradient(120%_90%_at_30%_20%,#34493f,#1f2d26)] p-1.5 shadow-[inset_0_0_0_1px_#0006,0_6px_0_#0005] sm:p-3`}
      >
        <ChalkLines filled={filledAt} />
        <div
          className="relative grid h-full w-full grid-cols-[minmax(4rem,0.6fr)_repeat(3,minmax(0,1fr))] grid-rows-[4.75rem_repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2.5"
          role="grid"
          aria-label="Grade 3 por 3"
        >
          <div />
          {view.cols.map((c, i) => (
            <CriterionHead key={i} c={c} />
          ))}
          {[0, 1, 2].map((r) => (
            <div key={r} className="contents" role="row">
              <CriterionHead c={view.rows[r]!} />
              {[0, 1, 2].map((col) => {
                const i = r * 3 + col;
                const filled = view.cells[i]!.player;
                const example = !filled && reveal ? reveal.cells[i] : null;
                return (
                  <button
                    key={i}
                    role="gridcell"
                    type="button"
                    disabled={done || !!filled || !online || action.isPending}
                    onClick={() => setCell(i)}
                    aria-label={
                      filled
                        ? `${cellLabel(view, i)}: ${filled.name}`
                        : `${cellLabel(view, i)}: vazia${example ? `, exemplo ${example.example.name}` : ''}`
                    }
                    className={`relative grid min-h-11 min-w-0 place-items-center rounded-lg p-1 text-center [container-type:size] transition-colors ${
                      filled
                        ? ''
                        : example
                          ? 'border-2 border-dashed border-chalk-soft/40 text-chalk-soft'
                          : 'border-2 border-dashed border-chalk-soft/50 text-chalk-soft/70 hover:border-cover hover:bg-chalk/[0.06]'
                    } ${miss === i ? 'motion-safe:animate-[shake_400ms_ease-out] border-cover' : ''}`}
                  >
                    {filled ? (
                      <span
                        className={`font-condensed grid aspect-square w-[min(92cqw,92cqh)] place-items-center rounded-full border-[3px] border-cover bg-paper p-[6%] text-[clamp(0.6rem,15cqmin,1.4rem)] leading-[0.95] font-black text-ink uppercase shadow-[0_4px_0_#0007,inset_0_0_0_2px_#0002] ${seen.current!.has(i) ? '' : 'magnet-snap'}`}
                      >
                        <span className="line-clamp-3 break-words">{filled.name}</span>
                      </span>
                    ) : example ? (
                      <span className="flex flex-col text-xs leading-tight sm:text-sm">
                        <span className="opacity-70">ex.:</span>
                        <span className="font-semibold">{example.example.name}</span>
                      </span>
                    ) : hintOf(i) ? (
                      <span className="flex flex-col items-center gap-0.5 leading-tight">
                        <HintMask initial={hintOf(i)!.initial} pattern={hintOf(i)!.pattern} />
                        <span className="text-[0.7rem] text-chalk-soft sm:text-xs">
                          {hintOf(i)!.validAnswers} servem
                        </span>
                      </span>
                    ) : (
                      <span
                        className="font-condensed text-2xl font-black sm:text-4xl"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {action.error && (
        <p role="alert" className="mx-auto w-full max-w-5xl text-cover">
          {(action.error as ApiError).message}
        </p>
      )}
      {done && (
        <div className="mx-auto w-full max-w-5xl">
          <LevelEnd
            data={data}
            headline={
              data.attempt.score === 9
                ? 'Álbum completo!'
                : data.attempt.score >= 6
                  ? `Bonito! ${data.attempt.score} de 9`
                  : `${data.attempt.score} de 9 desta vez`
            }
            detail={<p>As células vazias mostram uma resposta possível.</p>}
          />
        </div>
      )}
      <dialog
        ref={sheet}
        onClose={() => setCell(null)}
        aria-labelledby="cell-title"
        className="mx-auto mt-auto mb-0 w-full max-w-xl rounded-t-2xl bg-pitch-deep p-5 text-chalk backdrop:bg-black/55 sm:my-auto sm:rounded-2xl"
      >
        {cell !== null && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <h2
                id="cell-title"
                className="font-condensed text-2xl leading-tight font-extrabold uppercase"
              >
                {view.rows[Math.floor(cell / 3)]!.label} <span className="text-chalk-soft">×</span>{' '}
                {view.cols[cell % 3]!.label}
              </h2>
              <button
                className="ml-auto grid size-11 shrink-0 place-items-center rounded-lg hover:bg-chalk/10"
                onClick={() => setCell(null)}
                aria-label="Fechar"
              >
                <Icon name="close" />
              </button>
            </div>
            <PlayerSearch
              label="Quem cumpre os dois critérios?"
              onSelect={(p) => void guess(p)}
              exclude={used}
              autoFocus
            />
            {hintOf(cell) ? (
              <p className="flex flex-col items-start gap-1.5 rounded-lg bg-chalk/[0.07] px-3 py-2.5">
                <span className="text-sm text-chalk-soft">Dica: </span>
                <HintMask
                  initial={hintOf(cell)!.initial}
                  pattern={hintOf(cell)!.pattern}
                  size="lg"
                />
                <span className="text-sm text-chalk-soft">
                  {' '}
                  {hintOf(cell)!.validAnswers} jogadores servem aqui
                </span>
              </p>
            ) : (
              <button
                type="button"
                className="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-cover/70 px-3 py-2 text-left hover:bg-cover/10 disabled:opacity-40"
                disabled={view.hintsLeft === 0 || action.isPending}
                onClick={() =>
                  void action
                    .mutateAsync({
                      attemptId: data.attempt.id,
                      input: { kind: 'hint', cellIndex: cell },
                    })
                    .catch(() => undefined)
                }
              >
                <span>
                  <span className="font-condensed block text-lg font-extrabold uppercase text-cover">
                    Usar dica ({view.hintsLeft} de 3)
                  </span>
                  <span className="text-sm text-chalk-soft">
                    Mostra a inicial de um jogador que serve. Com dica, a fase vale no máximo 2
                    estrelas.
                  </span>
                </span>
              </button>
            )}
            <p className="text-sm text-chalk-soft">
              Errar gasta uma tentativa. Cada jogador vale uma vez por grid.
            </p>
          </div>
        )}
      </dialog>

      <dialog
        ref={confirm}
        aria-labelledby="finish-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-paper p-5 text-ink backdrop:bg-black/55"
      >
        <h2 id="finish-title" className="font-condensed text-2xl font-extrabold uppercase">
          Encerrar o grid?
        </h2>
        <p className="mt-2">As tentativas que sobram são perdidas e o resultado fica como está.</p>
        <form method="dialog" className="mt-5 flex justify-end gap-3">
          <button className="min-h-11 rounded-lg px-4 font-semibold hover:bg-ink/5">
            Continuar jogando
          </button>
          <button
            className="min-h-11 rounded-lg bg-ink px-4 font-semibold text-paper"
            onClick={() =>
              void action
                .mutateAsync({ attemptId: data.attempt.id, input: { kind: 'finish' } })
                .catch(() => undefined)
            }
          >
            Encerrar
          </button>
        </form>
      </dialog>
    </div>
  );
}
