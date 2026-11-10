/**
 * Draft screen (GROWTH_PLAN.md 2.4): build a 4-3-3 one slot per round. Each round names a real
 * match and a team; of 4 players of that position, pick the one who started. The XI fills up
 * on the pitch as you go, right picks in yellow.
 */
import { useEffect, useState } from 'react';
import type { AttemptResponse, DraftReveal, DraftView } from '@decabeca/contracts';
import { teamPt } from '@decabeca/contracts';
import { btnPrimary, GameHeader, Skeleton } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { buzz } from '../../lib/haptics';
import { play } from '../../lib/sound';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';
import { COMPETITION_PT, STAGE_PT } from '../missing-xi/MissingXiPage';

type Match = DraftView['rounds'][number]['match'];
const SLOT_PT = { GK: 'Goleiro', DF: 'Defensor', MF: 'Meio-campo', FW: 'Atacante' } as const;
/** Attack on top, as the shared result. */
const LINES = [[8, 9, 10], [5, 6, 7], [1, 2, 3, 4], [0]];

function matchLine(m: Match) {
  const score = m.teamScore !== null && m.opponentScore !== null;
  return {
    title: `${STAGE_PT[m.stage ?? 'Final'] ?? 'Jogo'} da ${COMPETITION_PT[m.competition] ?? m.competition} ${m.season}`,
    score: `${teamPt(m.team)} ${score ? `${m.teamScore} × ${m.opponentScore}` : '×'} ${teamPt(m.opponent)}`,
  };
}

/** The XI so far on a pitch lying in perspective; each slot shows the starter once its round is played. */
function Pitch({ view }: { view: DraftView }) {
  return (
    <div className="relative min-h-[11.5rem] flex-1 shrink-0 overflow-hidden rounded-md border-2 border-ink/70 bg-[#1f2d26] [perspective:520px]">
      <div className="absolute inset-0 origin-bottom [transform:rotateX(24deg)] bg-[#4c6b3f] [background-image:repeating-linear-gradient(0deg,transparent_0_36px,rgb(0_0_0/0.08)_36px_72px)]">
        <div aria-hidden className="absolute inset-x-0 top-[38%] h-0.5 bg-[#f1ead2]/50" />
        <div
          aria-hidden
          className="absolute bottom-0 left-1/2 h-1/4 w-3/5 -translate-x-1/2 border-2 border-b-0 border-[#f1ead2]/50"
        />
      </div>
      <ol
        aria-label="Seu time"
        className="absolute inset-0 flex flex-col justify-between gap-1 p-2"
      >
        {LINES.map((line) => (
          <li key={line[0]} className="flex justify-center gap-2">
            {line.map((i) => {
              const r = view.rounds[i];
              const name = r?.players.find((p) => p.id === r.answerId)?.name;
              return (
                <span
                  key={i}
                  className={`flex min-h-11 min-w-0 max-w-28 flex-1 items-center justify-center rounded-lg px-1 text-center text-[0.6875rem] leading-tight font-bold sm:text-xs ${r ? (r.correct ? 'bg-cover text-ink' : 'bg-[#1f2d26] text-chalk-soft line-through') : i === view.round ? 'border-2 border-cover bg-[#1f2d26]/70 text-cover' : 'border-2 border-dashed border-chalk-soft/50 text-chalk-soft'}`}
                >
                  <span className="sr-only">{r ? (r.correct ? 'acertou: ' : 'errou: ') : ''}</span>
                  {name ?? SLOT_PT[i === 0 ? 'GK' : i < 5 ? 'DF' : i < 8 ? 'MF' : 'FW']}
                </span>
              );
            })}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Light leaks from the pack's seam as it opens (once per round). */
function Seam() {
  useEffect(() => {
    play('shimmer');
  }, []);
  return (
    <i
      aria-hidden="true"
      className="pack-seam pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[#fffbe6]"
    />
  );
}

function MatchCard({ m, slot }: { m: Match; slot: keyof typeof SLOT_PT }) {
  const { title, score } = matchLine(m);
  return (
    <div>
      <p className="text-sm font-semibold text-ink/80">{title}</p>
      <p className="font-condensed text-2xl leading-none font-black uppercase sm:text-4xl">
        {score}
      </p>
      <h2 className="font-condensed mt-2 text-xl font-black uppercase sm:mt-4 sm:text-2xl">
        {SLOT_PT[slot]} titular de {teamPt(m.team)}?
      </h2>
    </div>
  );
}

function resultCopy(data: AttemptResponse) {
  const right = data.attempt.score;
  const reveal = data.reveal as DraftReveal;
  return {
    headline:
      right === 11
        ? 'Time completo! 11 de 11.'
        : right >= 9
          ? `Que memória: ${right} de 11`
          : `${right} de 11 desta vez`,
    detail: (
      <ul className="flex flex-col gap-0.5 text-base">
        {reveal.rounds.map((r, i) => (
          <li key={i}>
            {matchLine(r.match).title.replace(/^.* da /, '')} · {teamPt(r.match.team)}:{' '}
            <strong className="font-black">
              {r.players.find((p) => p.id === r.answerId)?.name}
            </strong>
          </li>
        ))}
      </ul>
    ),
  };
}

export function DraftPage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('DRAFT', level, timed);
  const action = useAction('DRAFT', level);
  const [shown, setShown] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const data = attempt.data;
  useGameTracking(data);
  const title = `Draft · Fase ${level}`;

  if (attempt.isPending) return <Skeleton className="h-96" />;
  if (attempt.error || !data)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError
          error={attempt.error as ApiError}
          mode="DRAFT"
          retry={() => void attempt.refetch()}
        />
      </div>
    );
  const view = data.view as DraftView;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const pick = (playerId: string) =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'pick', playerId } },
      {
        onSuccess: (res) => {
          const ev = res.event;
          if (ev && 'round' in ev) {
            setShown(ev.round);
            setAnnounce(ev.type === 'correct' ? 'Titular certo!' : 'Não foi ele.');
            if (ev.type !== 'correct') buzz(30);
          }
        },
      },
    );
  const showing = shown !== null ? view.rounds[shown] : undefined;

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
              action.mutate({ attemptId: data.attempt.id, input: { kind: 'give_up' } })
            }
          />
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <section
        aria-label="Pacote"
        style={{
          backgroundImage:
            'linear-gradient(115deg, #b9c4cc 0%, #eef2f4 28%, #9aa7b1 52%, #e6ebee 76%, #aab6bf 100%)',
        }}
        className={`relative mx-auto flex w-full max-w-3xl flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-md border-2 border-ink/70 p-3 pt-4 text-ink shadow-[0_3px_0_#0003] sm:gap-3 sm:p-5 sm:pt-6 ${done ? 'hidden' : 'min-h-0 flex-1'}`}
      >
        {!done && !showing && view.current && <Seam key={view.round} />}
        {showing ? (
          <>
            <MatchCard m={showing.match} slot={showing.slot} />
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {showing.players.map((p) => {
                const starter = p.id === showing.answerId;
                const picked = p.id === showing.picked;
                return (
                  <li
                    key={p.id}
                    className={`flex min-h-16 flex-col justify-center rounded-lg px-2 py-2 sm:px-3 ${starter ? 'bg-cover text-ink' : picked ? 'border-2 border-dashed border-ink/60 text-ink' : 'bg-ink/10 text-ink/80'}`}
                  >
                    <span className="font-condensed text-lg leading-tight font-black uppercase sm:text-2xl">
                      {p.name}
                    </span>
                    <span className="text-xs font-semibold sm:text-sm">
                      {starter ? 'Titular nesse jogo' : 'Não jogou esse jogo'}
                      {picked && ' · sua escolha'}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-3">
              {!done && (
                <button
                  className={`${btnPrimary} whitespace-nowrap`}
                  onClick={() => setShown(null)}
                  autoFocus
                >
                  Próxima posição
                </button>
              )}
              <p className="font-condensed text-lg leading-tight font-black uppercase sm:text-3xl">
                {showing.correct ? 'Titular certo!' : 'Não foi ele.'}
              </p>
            </div>
          </>
        ) : view.current ? (
          <>
            <MatchCard m={view.current.match} slot={view.current.slot} />
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 [perspective:700px]">
              {view.current.players.map((p, i) => (
                <li
                  key={p.id}
                  className="card-flip"
                  style={{ animationDelay: `${250 + i * 160}ms` }}
                >
                  <button
                    onClick={() => pick(p.id)}
                    disabled={action.isPending}
                    className="flex min-h-16 w-full flex-col sm:min-h-20 items-start justify-between rounded-lg border-2 border-ink/70 bg-paper px-2 py-2 text-left text-ink shadow-[0_6px_14px_-6px_rgb(0_0_0/0.45)] sm:px-3 transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                  >
                    <span aria-hidden="true" className="text-[0.6875rem] font-bold text-ink/70">
                      {SLOT_PT[view.current!.slot]}
                    </span>
                    <span className="font-condensed text-lg leading-tight font-black uppercase sm:text-2xl">
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
        {!done && <Pitch view={view} />}
        <p className="sr-only text-sm sm:not-sr-only">
          Monte um 4-3-3 com titulares de jogos de verdade. Os outros três jogaram pelo mesmo time,
          mas não nesse jogo.
        </p>
      </section>
      {done && (
        <div className="mx-auto w-full max-w-3xl">
          <LevelEnd data={data} {...resultCopy(data)} />
        </div>
      )}
    </div>
  );
}
