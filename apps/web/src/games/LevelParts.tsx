/** Pieces shared by both games' level screens (ADR-007): end-of-level panel and level errors. */
import { formatClock } from './Clock';
import { useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { AttemptResponse, GameMode } from '@decabeca/contracts';
import { track } from '../lib/analytics';
import { api, type ApiError } from '../lib/api';
import { GAME_PATH, useLevelRanking, useMe, useTrack } from '../lib/game';
import { ShareButton } from '../components/ShareButton';
import { Stars } from '../components/Stars';
import { btnPrimary, btnSecondary, Notice } from '../components/ui';

export function LevelError({
  error,
  mode,
  retry,
}: {
  error: ApiError;
  mode: GameMode;
  retry: () => void;
}) {
  const back = (
    <Link to={GAME_PATH[mode]} className={btnPrimary}>
      Ver fases
    </Link>
  );
  if (error.code === 'LEVEL_LOCKED')
    return (
      <Notice title="Fase trancada" action={back}>
        Termine a fase anterior para liberar esta.
      </Notice>
    );
  if (error.code === 'LEVEL_NOT_FOUND')
    return (
      <Notice title="Fase não encontrada" action={back}>
        Essa fase não existe (ainda).
      </Notice>
    );
  return (
    <Notice
      title="Deu ruim na conexão"
      action={
        <button className={btnPrimary} onClick={retry}>
          Tentar de novo
        </button>
      }
    >
      {error.message}
    </Notice>
  );
}

/**
 * End of a level: the result pasted as one album sticker (verdict, answer, stars, points),
 * then the next step, sharing and the level's top 10.
 */
export function LevelEnd({
  data,
  headline,
  detail,
}: {
  data: AttemptResponse;
  headline: string;
  detail: ReactNode;
}) {
  const { mode, level, stars, score } = data.attempt;
  const trackQ = useTrack(mode);
  const top = useLevelRanking(mode, level, true);
  const me = useMe();
  const next = trackQ.data?.levels.find((l) => l.level > level && l.state !== 'done');
  return (
    <section aria-labelledby="level-end" className="flex flex-col gap-6">
      <div className="-rotate-1 rounded-[12px] bg-paper p-2 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)] motion-safe:animate-[paste_520ms_var(--ease-out-expo)]">
        <div className="rounded-[6px] bg-cover px-5 pt-5 pb-4 text-ink">
          <h2
            id="level-end"
            className="font-condensed text-4xl leading-[0.92] font-black text-balance uppercase sm:text-5xl"
          >
            {headline}
          </h2>
          <div className="mt-3 text-lg leading-snug font-semibold">{detail}</div>
          {data.attempt.durationSec !== null && (
            <p className="mt-2 text-base font-semibold">
              ⏱ {formatClock(data.attempt.durationSec)}
              {data.attempt.timed ? ' · contra o relógio' : ''}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-4 border-t-2 border-dashed border-ink/25 pt-3">
            <Stars n={stars} size="size-9" onCover />
            <p className="font-condensed tabular text-right leading-none font-black uppercase">
              <span className="text-3xl">{score}</span>
              <span className="ml-1 text-base">pts</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {next ? (
          <Link to={`${GAME_PATH[mode]}/${next.level}`} className={btnPrimary}>
            Próxima fase · {next.level}
          </Link>
        ) : (
          <Link to={GAME_PATH[mode]} className={btnPrimary}>
            Ver fases
          </Link>
        )}
        {data.share && (
          <ShareButton
            secondary
            text={data.share.text}
            onShared={(method) => track('result_shared', { mode, level, method })}
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-condensed text-xl font-extrabold uppercase">Top 10 da fase</h3>
          <Link
            to={GAME_PATH[mode]}
            className="text-sm font-semibold text-chalk-soft underline underline-offset-4 hover:text-chalk"
          >
            Voltar às fases
          </Link>
        </div>
        {me.data && !me.data.nickname && (
          <p className="text-sm text-chalk-soft">
            <Link to="/conta" className="text-chalk underline underline-offset-4">
              Escolha um apelido
            </Link>{' '}
            para aparecer aqui.
          </p>
        )}
        {top.data?.entries.length ? (
          <ol className="flex flex-col">
            {top.data.entries.map((e) => (
              <li
                key={e.position}
                className={`flex min-h-11 items-center gap-3 border-b border-chalk/10 px-2 last:border-b-0 ${e.isMe ? 'rounded-md border-transparent bg-cover text-ink' : ''}`}
              >
                <span className="font-condensed tabular w-6 text-right text-lg font-black">
                  {e.position}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}</span>
                <Stars n={e.stars} size="size-4" onCover={e.isMe} />
                <span className="font-condensed tabular w-10 text-right font-bold">{e.score}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-lg border-2 border-dashed border-chalk-soft/40 px-4 py-3 text-sm text-chalk-soft">
            Ninguém com apelido terminou essa fase ainda. O lugar 1 está vago.
          </p>
        )}
      </div>
      <ReportError mode={mode} level={level} />
    </section>
  );
}

const REASONS: Record<GameMode, [string, string][]> = {
  CAREER_PATH: [
    ['position', 'Posição errada'],
    ['club_missing', 'Clube faltando, sobrando ou fora de ordem'],
    ['wrong_stats', 'Jogos, gols ou anos errados'],
    ['other', 'Outra coisa'],
  ],
  IMPOSTOR: [
    ['club_missing', 'Um dos "jogou aqui" nunca jogou no clube'],
    ['answer_refused', 'O impostor jogou, sim, no clube'],
    ['other', 'Outra coisa'],
  ],
  FOOTBALL_GRID: [
    ['answer_refused', 'Uma resposta certa foi recusada'],
    ['position', 'Posição errada de algum jogador'],
    ['club_missing', 'Clube ou país errado de algum jogador'],
    ['other', 'Outra coisa'],
  ],
};

/** "Essa fase tem um erro?": goes to the editorial panel (and the AI curator), after the level. */
function ReportError({ mode, level }: { mode: GameMode; level: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState(REASONS[mode][0]![0]);
  const [note, setNote] = useState('');
  const send = useMutation({
    mutationFn: () =>
      api(`/v1/levels/${mode}/${level}/report`, {
        method: 'POST',
        json: { reason, ...(note.trim() ? { note: note.trim() } : {}) },
      }),
  });
  return (
    <div className="flex flex-col items-center gap-2 border-t border-chalk/10 pt-4 text-center">
      {send.isSuccess ? (
        <p role="status" className="text-chalk-soft">
          Valeu! A gente vai conferir essa fase.
        </p>
      ) : (
        <button
          type="button"
          className="text-sm font-semibold text-chalk-soft underline underline-offset-4 hover:text-chalk"
          onClick={() => dialog.current?.showModal()}
        >
          Essa fase tem um erro?
        </button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="report-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-paper p-5 text-left text-ink backdrop:bg-black/55"
      >
        <form
          method="dialog"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate(undefined, { onSuccess: () => dialog.current?.close() });
          }}
        >
          <h2 id="report-title" className="font-condensed text-2xl font-black uppercase">
            O que está errado?
          </h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Motivo</legend>
            {REASONS[mode].map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-3 font-semibold">
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="size-5 accent-ink"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 font-semibold">
            Detalhe (opcional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex.: o Kaká era meia, não atacante"
              className="rounded-lg border-2 border-ink/15 bg-white px-3 py-2 text-base"
            />
          </label>
          {send.error && (
            <p role="alert" className="rounded-lg bg-cover px-3 py-2 font-semibold">
              {(send.error as ApiError).message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary} disabled={send.isPending}>
              Enviar
            </button>
            <button
              type="button"
              className={`${btnSecondary} border-ink/30 text-ink hover:border-ink hover:bg-ink/5`}
              onClick={() => dialog.current?.close()}
            >
              Cancelar
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
