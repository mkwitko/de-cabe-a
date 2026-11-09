/**
 * Draft screen (GROWTH_PLAN.md 2.4): build a 4-3-3 one slot per round. Each round names a real
 * match and a team; of 4 players of that position, pick the one who started. The XI fills up
 * on the pitch as you go, right picks in yellow.
 */
import { useState } from 'react';
import type { AttemptResponse, DraftReveal, DraftView } from '@decabeca/contracts';
import { teamPt } from '@decabeca/contracts';
import { btnPrimary, GameHeader, Skeleton } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
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

/** The XI so far: each slot shows the starter once its round is played. */
function Pitch({ view }: { view: DraftView }) {
  return (
    <ol
      aria-label="Seu time"
      className="flex flex-col gap-2 rounded-xl border border-chalk/15 bg-chalk/[0.05] p-3"
    >
      {LINES.map((line) => (
        <li key={line[0]} className="flex justify-center gap-2">
          {line.map((i) => {
            const r = view.rounds[i];
            const name = r?.players.find((p) => p.id === r.answerId)?.name;
            return (
              <span
                key={i}
                className={`flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-1 text-center text-xs leading-tight font-bold ${r ? (r.correct ? 'bg-cover text-ink' : 'bg-chalk/15 text-chalk-soft line-through') : i === view.round ? 'border-2 border-cover text-cover' : 'border-2 border-dashed border-chalk-soft/40 text-chalk-soft/70'}`}
              >
                <span className="sr-only">{r ? (r.correct ? 'acertou: ' : 'errou: ') : ''}</span>
                {name ?? SLOT_PT[i === 0 ? 'GK' : i < 5 ? 'DF' : i < 8 ? 'MF' : 'FW']}
              </span>
            );
          })}
        </li>
      ))}
    </ol>
  );
}

function MatchCard({ m, slot }: { m: Match; slot: keyof typeof SLOT_PT }) {
  const { title, score } = matchLine(m);
  return (
    <div>
      <p className="text-sm font-semibold text-chalk-soft">{title}</p>
      <p className="font-condensed text-3xl leading-none font-black uppercase sm:text-4xl">
        {score}
      </p>
      <h2 className="font-condensed mt-4 text-2xl font-black uppercase">
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)] lg:items-start">
        <section className="flex flex-col gap-6">
          {showing ? (
            <>
              <MatchCard m={showing.match} slot={showing.slot} />
              <p className="font-condensed text-3xl font-black uppercase">
                {showing.correct ? 'Titular certo!' : 'Não foi ele.'}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {showing.players.map((p) => {
                  const starter = p.id === showing.answerId;
                  const picked = p.id === showing.picked;
                  return (
                    <li
                      key={p.id}
                      className={`flex min-h-16 flex-col justify-center rounded-xl px-4 py-3 ${starter ? 'bg-cover text-ink' : picked ? 'border-2 border-dashed border-chalk-soft/60 text-chalk' : 'bg-chalk/[0.06] text-chalk-soft'}`}
                    >
                      <span className="font-condensed text-2xl leading-tight font-black uppercase">
                        {p.name}
                      </span>
                      <span className="text-sm font-semibold">
                        {starter ? 'Titular nesse jogo' : 'Não jogou esse jogo'}
                        {picked && ' · sua escolha'}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {!done && (
                <button
                  className={`${btnPrimary} self-start`}
                  onClick={() => setShown(null)}
                  autoFocus
                >
                  Próxima posição
                </button>
              )}
            </>
          ) : view.current ? (
            <>
              <MatchCard m={view.current.match} slot={view.current.slot} />
              <ul className="grid gap-3 sm:grid-cols-2">
                {view.current.players.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => pick(p.id)}
                      disabled={action.isPending}
                      className="flex min-h-16 w-full items-center rounded-xl bg-paper px-4 py-3 text-left text-ink shadow-[0_6px_14px_-6px_rgb(0_0_0/0.45)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
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
            <>
              <Pitch view={view} />
              <p className="text-sm text-chalk-soft">
                Monte um 4-3-3 com titulares de jogos de verdade. Os outros três jogaram pelo mesmo
                time, mas não nesse jogo.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
