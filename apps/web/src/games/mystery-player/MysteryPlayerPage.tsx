/**
 * Craque Misterioso screen (ADR-011): search a player; each guess shows, next to his own data,
 * what matches the hidden player (nationality, position, birth year, clubs and countries).
 */
import { useState } from 'react';
import type { AttemptResponse, MysteryReveal, MysteryView, PlayerRef } from '@decabeca/contracts';
import { PlayerSearch } from '../../components/PlayerSearch';
import { btnPrimary, btnSecondary, GameHeader, Skeleton, useOnline } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { countryName, POSITION_LABEL } from '../../lib/format';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

const MAX = 8;
type Guess = MysteryView['guesses'][number];

function Cell({ ok, label, value }: { ok: boolean | 'close'; label: string; value: string }) {
  return (
    <div
      className={`flex min-h-16 flex-col justify-center rounded-lg px-2.5 py-1.5 ${ok === true ? 'bg-cover text-ink' : ok === 'close' ? 'bg-cover/35 text-chalk' : 'bg-chalk/[0.08] text-chalk'}`}
    >
      <span className="text-[0.7rem] font-semibold tracking-wide uppercase opacity-75">
        {label}
      </span>
      <span className="text-sm leading-tight font-bold">{value}</span>
      <span className="sr-only">
        {ok === true ? ', bate' : ok === 'close' ? ', perto' : ', não bate'}
      </span>
    </div>
  );
}

function GuessRow({ g }: { g: Guess }) {
  const f = g.feedback;
  const born =
    g.birthYear === null
      ? '—'
      : f.birthYear === 'same'
        ? String(g.birthYear)
        : `${g.birthYear} ${f.birthYear === 'older' ? '↑ ele nasceu depois' : '↓ ele nasceu antes'}`;
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-chalk/15 bg-pitch-deep/40 p-3">
      <span className="font-condensed text-xl leading-none font-black uppercase">{g.name}</span>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Cell ok={f.nationality} label="Nacionalidade" value={countryName(g.nationalityCode)} />
        <Cell
          ok={f.position}
          label="Posição"
          value={g.positionGroup ? POSITION_LABEL[g.positionGroup] : '—'}
        />
        <Cell
          ok={f.birthYear === 'same' ? true : f.birthYearClose ? 'close' : false}
          label="Nascimento"
          value={born}
        />
        <Cell
          ok={f.sharedClubs.length > 0}
          label="Clubes em comum"
          value={f.sharedClubs.length ? f.sharedClubs.join(', ') : 'nenhum'}
        />
      </div>
      {f.sharedCountries.length > 0 && !f.sharedClubs.length && (
        <p className="text-sm text-chalk-soft">
          Jogou nos mesmos países: {f.sharedCountries.map(countryName).join(', ')}
        </p>
      )}
    </li>
  );
}

function resultCopy(data: AttemptResponse) {
  const view = data.view as MysteryView;
  const { answer } = data.reveal as MysteryReveal;
  const n = view.guesses.length;
  return {
    headline: data.attempt.status === 'WON' ? `Acertou em ${n} de ${MAX}!` : `Era ${answer.name}`,
    detail: (
      <p className="text-base">
        {answer.name}: {countryName(answer.nationalityCode)}
        {answer.positionGroup ? `, ${POSITION_LABEL[answer.positionGroup].toLowerCase()}` : ''}
        {answer.birthYear ? `, nascido em ${answer.birthYear}` : ''}. Clubes:{' '}
        {answer.clubs.map((c) => c.name).join(' → ')}.
      </p>
    ),
  };
}

export function MysteryPlayerPage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('MYSTERY_PLAYER', level, timed);
  const action = useAction('MYSTERY_PLAYER', level);
  const online = useOnline();
  const [selected, setSelected] = useState<PlayerRef | null>(null);
  const [announce, setAnnounce] = useState('');
  const data = attempt.data;
  useGameTracking(data);
  const title = `Craque Misterioso · Fase ${level}`;

  if (attempt.isPending) return <Skeleton className="h-96" />;
  if (attempt.error || !data)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError
          error={attempt.error as ApiError}
          mode="MYSTERY_PLAYER"
          retry={() => void attempt.refetch()}
        />
      </div>
    );
  const view = data.view as MysteryView;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const guessed = new Set(view.guesses.map((g) => g.playerId));
  const guess = (p: PlayerRef) =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'guess', playerId: p.id } },
      {
        onSuccess: (res) => {
          setSelected(null);
          setAnnounce(res.event?.type === 'won' ? `É ${p.name}!` : `Não é ${p.name}.`);
        },
      },
    );

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
            <span className="font-condensed tabular text-2xl font-black">
              {view.guesses.length}/{MAX}
            </span>
          </div>
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)] lg:items-start">
        <section className="order-2 flex flex-col gap-3 lg:order-1">
          {view.guesses.length === 0 && !done ? (
            <p className="rounded-xl border-2 border-dashed border-chalk-soft/40 p-5 text-chalk-soft">
              Chute um jogador qualquer para começar. Amarelo é o que bate com o craque escondido;
              amarelo claro na idade é perto (até 2 anos).
            </p>
          ) : (
            <ol className="flex flex-col-reverse gap-3" aria-label="Palpites">
              {view.guesses.map((g) => (
                <GuessRow key={g.playerId} g={g} />
              ))}
            </ol>
          )}
        </section>
        <aside className="order-1 flex flex-col gap-5 lg:sticky lg:top-6 lg:order-2">
          {done ? (
            <LevelEnd data={data} {...resultCopy(data)} />
          ) : (
            <>
              <form
                className="flex flex-col gap-3 rounded-xl border border-chalk/15 bg-chalk/[0.05] p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selected) guess(selected);
                }}
              >
                <p className="text-sm font-semibold text-chalk-soft">
                  Quem é o craque? {view.guessesLeft} palpites restantes.
                </p>
                <div className="flex items-stretch gap-2">
                  <div className="min-w-0 flex-1">
                    <PlayerSearch
                      label="Seu palpite"
                      onSelect={setSelected}
                      selected={selected}
                      exclude={guessed}
                      disabled={!online || action.isPending}
                      autoFocus
                    />
                  </div>
                  <button
                    className={`${btnPrimary} px-4`}
                    disabled={!selected || !online || action.isPending}
                  >
                    Chutar
                  </button>
                </div>
                {action.error && (
                  <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
                    {(action.error as ApiError).message}
                  </p>
                )}
              </form>
              <button
                type="button"
                className={`${btnSecondary} min-h-10 text-base`}
                disabled={!online || action.isPending}
                onClick={() =>
                  action.mutate({ attemptId: data.attempt.id, input: { kind: 'give_up' } })
                }
              >
                Desistir e ver quem era
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
