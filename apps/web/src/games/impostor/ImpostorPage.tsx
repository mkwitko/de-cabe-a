/**
 * Impostor screen (ADR-011): a club and 4 player stickers; three played there, find the one who
 * never did. After each pick the round shows who the impostor was before moving on.
 */
import { useEffect, useState } from 'react';
import type { AttemptResponse, ImpostorReveal, ImpostorView } from '@decabeca/contracts';
import { ClubBadge } from '../../components/ClubBadge';
import { buzz } from '../../lib/haptics';
import { play } from '../../lib/sound';
import { btnPrimary, GameHeader, Skeleton } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { countryName } from '../../lib/format';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

function RoundDots({ view }: { view: ImpostorView }) {
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

function ClubCard({ name, countryCode }: { name: string; countryCode: string }) {
  return (
    <div className="flex items-center gap-4">
      <ClubBadge name={name} size="lg" />
      <div>
        <p className="font-condensed text-4xl leading-none font-black uppercase sm:text-5xl">
          {name}
        </p>
        <p className="text-[#1c1e21]/80">{countryName(countryCode)}</p>
      </div>
    </div>
  );
}

const HEIGHTS = [74, 88, 80, 94];
const MARKS = ['2,00', '1,90', '1,80', '1,70', '1,60'];

/** Silhouette: head and shoulders, tall or short so the height marks on the wall mean something. */
function Silhouette({ h }: { h: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ height: `${h}%` }}
      className="relative mx-auto flex w-3/5 max-w-24 flex-col items-center"
    >
      <i className="aspect-square w-[46%] shrink-0 rounded-full bg-[#1c1e21]" />
      <i className="mt-[3%] w-full flex-1 rounded-t-[45%] bg-[#1c1e21]" />
    </span>
  );
}

/** Door sound and a buzz when the intruder is pulled out of the line (on arrival only). */
function DoorFx() {
  useEffect(() => {
    play('clunk');
    buzz(40);
  }, []);
  return null;
}

/**
 * The line-up wall: height marks behind, hard light from the top. While playing each suspect is a
 * button; once played the impostor steps out of the line and the others dim.
 */
function Lineup({
  players,
  picked,
  impostorId,
  onPick,
  disabled,
}: {
  players: { id: string; name: string }[];
  picked?: string;
  impostorId?: string;
  onPick?: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative min-h-60 flex-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex w-7 flex-col justify-between border-r-2 border-[#1c1e21]/50 bg-[repeating-linear-gradient(0deg,#1c1e2180_0_2px,transparent_2px_14px)] pb-9"
      >
        {MARKS.map((m) => (
          <span key={m} className="font-condensed bg-[#8d9096] pl-1 text-xs font-bold">
            {m}
          </span>
        ))}
      </div>
      <ol className="absolute inset-y-0 right-0 left-9 grid grid-cols-4 items-end gap-1 sm:gap-4">
        {players.map((p, i) => {
          const isImp = p.id === impostorId;
          const state =
            impostorId === undefined ? '' : isImp ? 'lineup-pull z-10' : '[&_i]:opacity-40';
          const body = (
            <>
              <Silhouette h={HEIGHTS[i % 4]!} />
              <span className="mt-1.5 flex w-full min-w-0 flex-col [overflow-wrap:break-word] hyphens-auto rounded-sm border-2 border-[#2a2d31] bg-[#f1efe6] px-0.5 py-1 text-center text-[#1c1e21]">
                <span className="font-condensed text-xs leading-none font-black">Nº {i + 1}</span>
                <span className="font-condensed text-[0.75rem] leading-tight font-black uppercase sm:text-xl">
                  {p.name}
                </span>
                {impostorId !== undefined && (
                  <span className="text-[0.6875rem] leading-tight font-bold sm:text-xs">
                    {isImp ? 'Impostor: nunca jogou aqui' : 'Jogou aqui'}
                    {p.id === picked && (isImp ? ' · você achou!' : ' · sua escolha')}
                  </span>
                )}
              </span>
            </>
          );
          return (
            <li
              key={p.id}
              className={`flex h-full min-w-0 transition-opacity duration-150 ${state}`}
            >
              {onPick ? (
                <button
                  onClick={() => onPick(p.id)}
                  disabled={disabled}
                  className="flex min-h-11 w-full flex-col justify-end rounded-md transition-transform duration-150 ease-out-expo hover:-translate-y-1 active:translate-y-0 focus-visible:outline-offset-2 disabled:opacity-60"
                >
                  {body}
                </button>
              ) : (
                <div className="flex w-full flex-col justify-end">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function resultCopy(data: AttemptResponse) {
  const right = data.attempt.score;
  const reveal = data.reveal as ImpostorReveal;
  return {
    headline:
      right === 5
        ? 'Faro de olheiro! 5 de 5.'
        : right === 4
          ? 'Quase perfeito: 4 de 5'
          : `${right} de 5 desta vez`,
    detail: (
      <ul className="flex flex-col gap-0.5 text-base">
        {reveal.rounds.map((r) => (
          <li key={r.clubName}>
            {r.clubName}:{' '}
            <strong className="font-black">
              {r.players.find((p) => p.id === r.impostorId)?.name}
            </strong>
          </li>
        ))}
      </ul>
    ),
  };
}

export function ImpostorPage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('IMPOSTOR', level, timed);
  const action = useAction('IMPOSTOR', level);
  const [shown, setShown] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const data = attempt.data;
  useGameTracking(data);
  const title = `Impostor · Fase ${level}`;

  if (attempt.isPending) return <Skeleton className="h-96" />;
  if (attempt.error || !data)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError
          error={attempt.error as ApiError}
          mode="IMPOSTOR"
          retry={() => void attempt.refetch()}
        />
      </div>
    );
  const view = data.view as ImpostorView;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const pick = (playerId: string) =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'pick', playerId } },
      {
        onSuccess: (res) => {
          const ev = res.event;
          if (ev && 'round' in ev) {
            setShown(ev.round);
            setAnnounce(ev.type === 'correct' ? 'Achou o impostor!' : 'Não era esse.');
          }
        },
      },
    );
  const showing = shown !== null ? view.rounds[shown] : undefined;

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
        aria-label="Reconhecimento"
        style={{
          backgroundImage:
            'radial-gradient(60% 55% at 50% 0, #fffb 0, #fff0 100%), repeating-linear-gradient(90deg, #0000001f 0 2px, transparent 2px 28px)',
        }}
        className={`relative mx-auto flex w-full max-w-5xl flex-col gap-3 overflow-hidden rounded-lg border-4 border-[#2a2d31] bg-[#8d9096] p-3 pt-5 text-[#1c1e21] shadow-[0_6px_0_#0004] sm:p-5 sm:pt-6 ${done ? 'min-h-[32rem]' : 'min-h-0 flex-1'}`}
      >
        <i
          aria-hidden="true"
          className="absolute top-0 left-1/2 h-2 w-40 -translate-x-1/2 rounded-b-md bg-[#2a2d31]"
        />
        {showing ? (
          <>
            <DoorFx />
            <ClubCard name={showing.clubName} countryCode={showing.clubCountryCode} />
            <p className="font-condensed text-2xl font-black uppercase">
              {showing.correct ? 'Achou o impostor!' : 'Não era esse.'}
            </p>
            <Lineup
              players={showing.players}
              picked={showing.picked}
              impostorId={showing.impostorId}
            />
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
            <ClubCard name={view.current.clubName} countryCode={view.current.clubCountryCode} />
            <h2 className="font-condensed text-2xl font-black uppercase">Quem nunca jogou aqui?</h2>
            <Lineup players={view.current.players} onPick={pick} disabled={action.isPending} />
            <p className="text-sm font-semibold">
              Três jogaram no clube; um nunca vestiu a camisa. Uma escolha por rodada.
            </p>
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
