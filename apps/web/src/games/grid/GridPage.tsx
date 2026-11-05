/**
 * Football Grid screen (UX_SPEC.md §4, FOOTBALL_GRID.md §6). The board is an album page: empty
 * slots, pasted stickers for right answers, a short shake for a miss. Cell picker and the
 * "finish" confirmation use the native <dialog> (focus trap and Escape for free).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import type {
  AttemptResponse,
  ChallengeKind,
  FootballGridReveal,
  FootballGridView,
  PlayerRef,
} from '@decabeca/contracts';
import { ApiError } from '../../lib/api';
import { track } from '../../lib/analytics';
import { useGameTracking } from '../../lib/useGameTracking';
import { useAction, useAttempt, useNewPractice } from '../../lib/game';
import { ClubBadge } from '../../components/ClubBadge';
import { Icon } from '../../components/Icon';
import { PlayerSearch } from '../../components/PlayerSearch';
import { ShareButton } from '../../components/ShareButton';
import {
  btnPrimary,
  btnSecondary,
  GameHeader,
  Notice,
  Skeleton,
  useNextDaily,
  useOnline,
} from '../../components/ui';

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

export function GridPage({ kind }: { kind: ChallengeKind }) {
  const attempt = useAttempt('FOOTBALL_GRID', kind);
  const action = useAction('FOOTBALL_GRID', kind);
  const online = useOnline();
  const newPractice = useNewPractice('FOOTBALL_GRID');
  const next = useNextDaily();
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

  const title = data?.attempt.publicNumber
    ? `Grid #${data.attempt.publicNumber}`
    : kind === 'practice'
      ? 'Grid · treino'
      : 'Grid';
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
        {e.code === 'NO_DAILY_CHALLENGE' ? (
          <Notice
            title="Sem grid hoje"
            action={
              <Link to="/grid/practice" className={btnPrimary}>
                Jogar no treino
              </Link>
            }
          >
            O grid de hoje ainda não saiu. Aquece no modo treino.
          </Notice>
        ) : e.code === 'PRACTICE_POOL_EXHAUSTED' ? (
          <Notice title="Treino vazio">Ainda não há grids de treino publicados.</Notice>
        ) : (
          <Notice
            title="Deu ruim na conexão"
            action={
              <button className={btnPrimary} onClick={() => void attempt.refetch()}>
                Tentar de novo
              </button>
            }
          >
            {e.message}
          </Notice>
        )}
      </div>
    );
  }
  if (!data || !view) return null;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const reveal = data.reveal as FootballGridReveal | null;
  const left = view.maxAttempts - view.attemptsUsed;

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
      <GameHeader
        title={title}
        aside={
          done ? undefined : (
            <span
              className="font-condensed tabular text-xl font-black"
              aria-label={`${left} tentativas restantes`}
            >
              {left} <span className="text-base text-chalk-soft">tentativas</span>
            </span>
          )
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {done && (
        <div className="rounded-xl bg-cover p-5 text-ink shadow-[0_18px_40px_-14px_rgb(0_0_0/0.55)]">
          <h2 className="font-condensed text-4xl leading-none font-black uppercase">
            {data.attempt.score === 9
              ? 'Álbum completo!'
              : data.attempt.score >= 6
                ? `Bonito! ${data.attempt.score}/9`
                : `${data.attempt.score}/9 desta vez`}
          </h2>
          <p className="mt-2 font-semibold">As células vazias mostram uma resposta possível.</p>
        </div>
      )}

      <div
        className="grid w-full max-w-xl grid-cols-[minmax(4rem,0.7fr)_repeat(3,minmax(0,1fr))] gap-1.5 self-center"
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
                    <span className="font-condensed line-clamp-3 text-sm leading-tight font-black uppercase sm:text-base">
                      {filled.name}
                    </span>
                  ) : example ? (
                    <span className="flex flex-col text-xs leading-tight">
                      <span className="opacity-70">ex.:</span>
                      <span className="font-semibold">{example.example.name}</span>
                    </span>
                  ) : (
                    <span className="font-condensed text-2xl font-black" aria-hidden="true">
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

      {done ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {data.share && (
            <ShareButton
              text={data.share.text}
              onShared={(method) =>
                track('result_shared', { mode: data.attempt.mode, kind: data.attempt.kind, method })
              }
            />
          )}
          {kind === 'practice' ? (
            <button className={btnSecondary} onClick={() => void newPractice()}>
              Treinar de novo
            </button>
          ) : (
            <Link to="/grid/practice" className={btnSecondary}>
              Treinar
            </Link>
          )}
          <Link to="/history" className={btnSecondary}>
            Ver histórico
          </Link>
          {kind === 'daily' && (
            <p className="self-center text-chalk-soft">Próximo grid em {next}.</p>
          )}
        </div>
      ) : (
        <button
          className={`${btnSecondary} self-start`}
          onClick={() => confirm.current?.showModal()}
          disabled={!online || action.isPending}
        >
          Encerrar
        </button>
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
