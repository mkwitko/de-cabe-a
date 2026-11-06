/**
 * Football Grid screen (UX_SPEC.md §4, FOOTBALL_GRID.md §6). The board is an album page: empty
 * slots, pasted stickers for right answers, a short shake for a miss. Cell picker and the
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
import { ClubBadge } from '../../components/ClubBadge';
import { Icon } from '../../components/Icon';
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

const cellLabel = (v: FootballGridView, i: number) =>
  `${v.rows[Math.floor(i / 3)]!.label} e ${v.cols[i % 3]!.label}`;

export function GridPage({ level }: { level: number }) {
  const attempt = useAttempt('FOOTBALL_GRID', level);
  const action = useAction('FOOTBALL_GRID', level);
  const online = useOnline();
  const [cell, setCell] = useState<number | null>(null);
  const [miss, setMiss] = useState<number | null>(null);
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

  const title = `Grid · Fase ${level}`;
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
        setTimeout(() => setMiss(null), 600);
        setAnnounce(`${p.name} não serve aqui. Tentativa perdida.`);
        if ('vibrate' in navigator) navigator.vibrate?.(60);
      } else setAnnounce(`${p.name}! Acertou.`);
    } catch {
      /* rendered from action.error */
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <GameHeader title={title} />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:items-start">
        <div className="flex flex-col gap-3">
          <div
            className="grid w-full grid-cols-[minmax(4rem,0.6fr)_repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2.5"
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
                      className={`relative grid aspect-square min-h-11 place-items-center rounded-lg p-1 text-center transition-colors ${
                        filled
                          ? 'bg-paper text-ink shadow-[0_6px_14px_-6px_rgb(0_0_0/0.5)] motion-safe:animate-[paste_420ms_var(--ease-out-expo)]'
                          : example
                            ? 'border-2 border-dashed border-chalk-soft/40 text-chalk-soft'
                            : 'border-2 border-dashed border-chalk-soft/50 text-chalk-soft/70 hover:border-cover hover:bg-chalk/[0.06]'
                      } ${miss === i ? 'motion-safe:animate-[shake_400ms_ease-out] border-cover' : ''}`}
                    >
                      {filled ? (
                        <span className="font-condensed line-clamp-3 text-sm leading-tight font-black uppercase sm:text-lg lg:text-xl">
                          {filled.name}
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

          {action.error && (
            <p role="alert" className="text-cover">
              {(action.error as ApiError).message}
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          {done ? (
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
          ) : (
            <>
              <div className="flex flex-col gap-2 rounded-xl bg-chalk/[0.05] p-4">
                <p
                  className="font-condensed tabular text-5xl leading-none font-black"
                  aria-label={`${left} tentativas restantes`}
                >
                  {left}
                  <span className="ml-2 text-xl text-chalk-soft">de 9 tentativas</span>
                </p>
                <div className="flex gap-1" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, k) => (
                    <span
                      key={k}
                      className={`h-2 flex-1 rounded-full ${k < view.attemptsUsed ? 'bg-chalk-soft/25' : 'bg-cover'}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-sm text-chalk-soft">
                  Toque numa célula e escolha um jogador que cumpra a linha e a coluna. Errar gasta
                  uma tentativa.
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <span className="font-condensed text-lg font-extrabold text-cover uppercase">
                    Dicas: {view.hintsLeft} de 3
                  </span>
                  <span className="text-chalk-soft">
                    {view.hints.length
                      ? 'Fase vale no máximo 2 estrelas.'
                      : 'Usar uma limita a fase a 2 estrelas.'}
                  </span>
                </p>
              </div>
              {view.wrongGuesses.length > 0 && (
                <ul className="flex flex-col gap-1.5 text-sm" aria-label="Chutes errados">
                  {view.wrongGuesses.map((w, k) => (
                    <li key={k} className="flex items-center gap-2 text-chalk-soft">
                      <Icon name="cross" className="size-3.5 shrink-0" />
                      <span>
                        <strong className="text-chalk">{w.player.name}</strong> não serve em{' '}
                        {cellLabel(view, w.cellIndex)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                className={`${btnSecondary} self-start`}
                onClick={() => confirm.current?.showModal()}
                disabled={!online || action.isPending}
              >
                Encerrar
              </button>
            </>
          )}
        </aside>
      </div>

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
