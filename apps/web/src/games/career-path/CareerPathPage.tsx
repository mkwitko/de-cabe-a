/**
 * Career Path screen (UX_SPEC.md §3, CAREER_PATH.md §2-§3). Each revealed club is a sticker
 * pasted in the next numbered slot; the rest of the album page stays dashed.
 */
import { useMemo, useState } from 'react';
import type {
  AttemptResponse,
  CareerPathReveal,
  CareerPathView,
  PlayerRef,
} from '@decabeca/contracts';
import { ApiError } from '../../lib/api';
import { useGameTracking } from '../../lib/useGameTracking';
import { useAction, useAttempt } from '../../lib/game';
import { LevelEnd, LevelError } from '../LevelParts';
import { ClubBadge } from '../../components/ClubBadge';
import { Icon } from '../../components/Icon';
import { PlayerSearch } from '../../components/PlayerSearch';
import {
  AttemptDots,
  btnPrimary,
  btnSecondary,
  GameHeader,
  Skeleton,
  useOnline,
} from '../../components/ui';

const POSITION = { GK: 'Goleiro', DF: 'Defensor', MF: 'Meio-campista', FW: 'Atacante' } as const;
const years = (from: number | null, to: number | null) =>
  from === null
    ? '—'
    : to === null
      ? `${from}–`
      : from === to
        ? String(from)
        : `${from}–${String(to).slice(-2)}`;

type Club = CareerPathView['revealed'][number];

function ClubRow({ n, club, fresh }: { n: number; club: Club; fresh: boolean }) {
  return (
    <li
      className={`flex min-h-16 items-center gap-3 rounded-lg bg-paper px-3 py-2.5 text-ink shadow-[0_6px_16px_-8px_rgb(0_0_0/0.5)] ${fresh ? 'motion-safe:animate-[paste_420ms_var(--ease-out-expo)]' : ''}`}
    >
      <span className="font-condensed tabular w-6 text-right text-lg font-black text-ink/40">
        {n}
      </span>
      <ClubBadge name={club.clubName} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-lg leading-tight font-bold">
          {club.clubName}
          {club.isLoan && <span className="ml-1.5 text-sm font-semibold text-ink/60">(emp.)</span>}
        </span>
        <span className="text-sm text-ink/65">{club.countryCode}</span>
      </span>
      <span className="font-condensed tabular ml-auto text-lg font-bold">
        {years(club.fromYear, club.toYear)}
      </span>
    </li>
  );
}

function EmptySlot({ n }: { n: number }) {
  return (
    <li
      className="flex min-h-16 items-center gap-3 rounded-lg border-2 border-dashed border-chalk-soft/40 px-3 text-chalk-soft/60"
      aria-hidden="true"
    >
      <span className="font-condensed tabular w-6 text-right text-lg font-black">{n}</span>
      <span className="font-condensed text-lg font-bold uppercase tracking-wide">
        próximo clube
      </span>
    </li>
  );
}

function Result({ data }: { data: AttemptResponse }) {
  const reveal = data.reveal as CareerPathReveal;
  const won = data.attempt.status === 'WON';
  const view = data.view as CareerPathView;
  return (
    <section aria-labelledby="result" className="flex flex-col gap-5">
      <div className="rounded-xl bg-cover p-5 text-ink shadow-[0_18px_40px_-14px_rgb(0_0_0/0.55)]">
        <h2 id="result" className="font-condensed text-4xl leading-none font-black uppercase">
          {won
            ? view.attemptsUsed === 1
              ? 'De placa! Na primeira.'
              : `Acertou em ${view.attemptsUsed}/6!`
            : 'Não foi dessa vez.'}
        </h2>
        <p className="mt-3 text-lg font-semibold">
          Era <strong className="font-black">{reveal.answer.name}</strong> ·{' '}
          {reveal.trajectory.length} clubes
        </p>
        <p className="mt-1 font-semibold">Pontuação: {data.attempt.score}</p>
      </div>
      <LevelEnd data={data} />
      <ol className="flex flex-col gap-2" aria-label="Trajetória completa">
        {reveal.trajectory.map((c, i) => (
          <ClubRow key={i} n={i + 1} club={c} fresh={false} />
        ))}
      </ol>
    </section>
  );
}

export function CareerPathPage({ level }: { level: number }) {
  const attempt = useAttempt('CAREER_PATH', level);
  const action = useAction('CAREER_PATH', level);
  const online = useOnline();
  const [selected, setSelected] = useState<PlayerRef | null>(null);
  const [announce, setAnnounce] = useState('');
  const data = attempt.data;
  useGameTracking(data);
  const view = data?.view as CareerPathView | undefined;
  const guessed = useMemo(
    () => new Set(view?.history.flatMap((h) => (h.kind === 'guess' ? [h.playerId] : [])) ?? []),
    [view?.history],
  );
  const title = `Career Path · Fase ${level}`;

  if (attempt.isPending)
    return (
      <div className="flex flex-col gap-3">
        <GameHeader title={title} />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  if (attempt.error) {
    const e = attempt.error as ApiError;
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError error={e} mode="CAREER_PATH" retry={() => void attempt.refetch()} />
      </div>
    );
  }
  if (!data || !view) return null;
  const done = data.attempt.status !== 'IN_PROGRESS';

  async function submit(input: object, describe: string) {
    try {
      const res = await action.mutateAsync({ attemptId: data!.attempt.id, input });
      setSelected(null);
      const ev = res.event;
      setAnnounce(
        ev?.type === 'correct'
          ? 'Acertou!'
          : ev?.type === 'lost'
            ? 'Fim de jogo.'
            : `${describe}. ${ev?.type === 'wrong' && ev.revealed === 'club' ? 'Novo clube revelado.' : ev?.type === 'wrong' && ev.revealed === 'extraHint' ? 'Nova pista revelada.' : ''}`,
      );
      if (ev?.type === 'wrong' && 'vibrate' in navigator) navigator.vibrate?.(60);
    } catch {
      /* shown below from action.error */
    }
  }

  const slots = Math.max(
    0,
    Math.min(view.maxAttempts, view.revealed.length + 1) - view.revealed.length,
  );

  return (
    <div className="flex flex-col gap-6">
      <GameHeader
        title={title}
        aside={
          <AttemptDots
            used={view.attemptsUsed}
            max={view.maxAttempts}
            won={data.attempt.status === 'WON'}
          />
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {done ? (
        <Result data={data} />
      ) : (
        <>
          <ol className="flex flex-col gap-2" aria-label="Clubes revelados">
            {view.revealed.map((c, i) => (
              <ClubRow key={i} n={i + 1} club={c} fresh={i === view.revealed.length - 1 && i > 0} />
            ))}
            {Array.from({ length: slots }, (_, i) => (
              <EmptySlot key={i} n={view.revealed.length + i + 1} />
            ))}
          </ol>

          {(view.extraHints.position || view.extraHints.nationalityCode) && (
            <ul className="flex flex-wrap gap-2" aria-label="Pistas extras">
              {view.extraHints.position && (
                <li className="rounded-full bg-cover px-3 py-1 font-semibold text-ink">
                  Posição: {POSITION[view.extraHints.position]}
                </li>
              )}
              {view.extraHints.nationalityCode && (
                <li className="rounded-full bg-cover px-3 py-1 font-semibold text-ink">
                  Nacionalidade: {view.extraHints.nationalityCode}
                </li>
              )}
            </ul>
          )}

          {view.history.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-sm" aria-label="Seus palpites">
              {view.history.map((h, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-chalk-soft/50 px-2.5 py-1 text-chalk-soft"
                >
                  <Icon name={h.kind === 'skip' ? 'skip' : 'cross'} className="size-3.5" />
                  {h.kind === 'guess' ? h.name : 'Pulou'}
                </li>
              ))}
            </ul>
          )}

          <form
            className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-xl bg-pitch-deep/95 p-3 backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
            onSubmit={(e) => {
              e.preventDefault();
              if (selected)
                void submit({ kind: 'guess', playerId: selected.id }, `Não é ${selected.name}`);
            }}
          >
            <PlayerSearch
              label="Quem é o jogador?"
              onSelect={setSelected}
              selected={selected}
              exclude={guessed}
              disabled={!online || action.isPending}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                className={`${btnPrimary} flex-1`}
                disabled={!selected || !online || action.isPending}
              >
                Chutar
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={!online || action.isPending}
                onClick={() => void submit({ kind: 'skip' }, 'Pulou')}
              >
                <Icon name="skip" /> Pular
              </button>
            </div>
            {action.error && (
              <p role="alert" className="text-sm text-cover">
                {(action.error as ApiError).message}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
