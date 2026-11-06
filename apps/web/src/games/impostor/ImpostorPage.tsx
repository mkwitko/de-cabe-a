/**
 * Impostor screen (ADR-011): a club and 4 player stickers; three played there, find the one who
 * never did. After each pick the round shows who the impostor was before moving on.
 */
import { useState } from 'react';
import type { AttemptResponse, ImpostorReveal, ImpostorView } from '@decabeca/contracts';
import { ClubBadge } from '../../components/ClubBadge';
import { btnPrimary, GameHeader, Skeleton } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { countryName } from '../../lib/format';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

type Round = ImpostorView['rounds'][number];

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

function ClubCard({ name, countryCode }: { name: string; countryCode: string }) {
  return (
    <div className="flex items-center gap-4">
      <ClubBadge name={name} size="lg" />
      <div>
        <p className="font-condensed text-4xl leading-none font-black uppercase sm:text-5xl">
          {name}
        </p>
        <p className="text-chalk-soft">{countryName(countryCode)}</p>
      </div>
    </div>
  );
}

/** A round already played: who was picked, who the impostor was (text, not colour alone). */
function RoundResult({ r }: { r: Round }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {r.players.map((p) => {
        const isImp = p.id === r.impostorId;
        const picked = p.id === r.picked;
        return (
          <li
            key={p.id}
            className={`flex min-h-20 flex-col justify-center rounded-xl px-4 py-3 ${isImp ? 'bg-cover text-ink' : picked ? 'border-2 border-dashed border-chalk-soft/60 text-chalk' : 'bg-chalk/[0.06] text-chalk-soft'}`}
          >
            <span className="font-condensed text-2xl leading-tight font-black uppercase">
              {p.name}
            </span>
            <span className="text-sm font-semibold">
              {isImp ? 'Impostor: nunca jogou aqui' : 'Jogou aqui'}
              {picked && (isImp ? ' · você achou!' : ' · sua escolha')}
            </span>
          </li>
        );
      })}
    </ul>
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
        <section className="flex flex-col gap-6">
          {showing ? (
            <>
              <ClubCard name={showing.clubName} countryCode={showing.clubCountryCode} />
              <p className="font-condensed text-3xl font-black uppercase">
                {showing.correct ? 'Achou o impostor!' : 'Não era esse.'}
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
              <ClubCard name={view.current.clubName} countryCode={view.current.clubCountryCode} />
              <h2 className="font-condensed text-3xl font-black uppercase">
                Quem nunca jogou aqui?
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {view.current.players.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => pick(p.id)}
                      disabled={action.isPending}
                      className="flex min-h-20 w-full items-center rounded-xl bg-paper px-4 py-3 text-left text-ink shadow-[0_6px_14px_-6px_rgb(0_0_0/0.45)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                    >
                      <span className="font-condensed text-2xl leading-tight font-black uppercase">
                        {p.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
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
              Três desses jogaram no clube. Um nunca vestiu a camisa: toque nele. Cinco rodadas, uma
              escolha por rodada.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
