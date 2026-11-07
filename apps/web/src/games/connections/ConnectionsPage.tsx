/**
 * Conexões screen (ADR-011): 16 player stickers; pick 4 that share something (club, national
 * team, a final's XI) and confirm. Found groups lock in as coloured bands with their label.
 */
import { useMemo, useState } from 'react';
import type { AttemptResponse, ConnectionsReveal, ConnectionsView } from '@decabeca/contracts';
import { btnPrimary, btnSecondary, GameHeader, Skeleton, useOnline } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

const MAX_MISTAKES = 4;
/** Band colours by group (easiest first), all with dark ink for contrast. */
const BAND = [
  'bg-cover text-ink',
  'bg-[oklch(0.82_0.13_150)] text-ink',
  'bg-[oklch(0.8_0.09_235)] text-ink',
  'bg-[oklch(0.78_0.1_305)] text-ink',
];

function Band({ g }: { g: ConnectionsView['found'][number] }) {
  return (
    <li
      className={`flex flex-col items-center gap-1 rounded-xl px-4 py-3 text-center ${BAND[g.group]}`}
    >
      <span className="font-condensed text-lg leading-tight font-black uppercase">{g.label}</span>
      <span className="text-sm font-semibold">{g.players.map((p) => p.name).join(' · ')}</span>
    </li>
  );
}

function resultCopy(data: AttemptResponse) {
  const view = data.view as ConnectionsView;
  const reveal = data.reveal as ConnectionsReveal;
  const n = view.found.length;
  const errors = MAX_MISTAKES - view.mistakesLeft;
  return {
    headline:
      n === 4
        ? errors === 0
          ? 'Conexão perfeita! Sem erros.'
          : `4 grupos com ${errors} ${errors === 1 ? 'erro' : 'erros'}`
        : `${n} de 4 grupos desta vez`,
    detail: (
      <ul className="flex flex-col gap-0.5 text-base">
        {reveal.groups.map((g) => (
          <li key={g.group}>
            <strong>{g.label}:</strong> {g.players.map((p) => p.name).join(', ')}
          </li>
        ))}
      </ul>
    ),
  };
}

export function ConnectionsPage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('CONNECTIONS', level, timed);
  const action = useAction('CONNECTIONS', level);
  const online = useOnline();
  const [picked, setPicked] = useState<string[]>([]);
  const [order, setOrder] = useState<string[] | null>(null);
  const [note, setNote] = useState('');
  const data = attempt.data;
  useGameTracking(data);
  const title = `Conexões · Fase ${level}`;
  const view = data?.view as ConnectionsView | undefined;
  const tiles = useMemo(() => {
    if (!view) return [];
    if (!order) return view.tiles;
    const rank = new Map(order.map((id, i) => [id, i]));
    return [...view.tiles].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
  }, [view, order]);

  if (attempt.isPending) return <Skeleton className="h-96" />;
  if (attempt.error || !data || !view)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError
          error={attempt.error as ApiError}
          mode="CONNECTIONS"
          retry={() => void attempt.refetch()}
        />
      </div>
    );
  const done = data.attempt.status !== 'IN_PROGRESS';
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 4 ? [...p, id] : p));
  const confirm = () =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'group', playerIds: picked } },
      {
        onSuccess: (res) => {
          const ev = res.event;
          if (ev?.type === 'group_found') {
            setPicked([]);
            setNote('Grupo certo!');
          } else if (ev?.type === 'miss')
            setNote(ev.oneAway ? 'Quase! Falta trocar um.' : 'Não é um grupo.');
        },
      },
    );
  const shuffle = () => setOrder([...tiles].map((t) => t.id).sort(() => Math.random() - 0.5));

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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] lg:items-start">
        <section className="flex flex-col gap-3">
          <ol className="flex flex-col gap-2" aria-label="Grupos encontrados">
            {(done ? (data.reveal as ConnectionsReveal).groups : view.found).map((g) => (
              <Band key={g.group} g={g} />
            ))}
          </ol>
          {!done && (
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Jogadores">
              {tiles.map((t) => {
                const on = picked.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(t.id)}
                    disabled={action.isPending}
                    className={`flex min-h-20 items-center justify-center rounded-xl p-2 text-center text-sm leading-tight font-bold transition-transform duration-150 ease-out-expo sm:text-base ${on ? '-translate-y-0.5 bg-ink text-paper shadow-[0_10px_20px_-8px_rgb(0_0_0/0.6)]' : 'bg-paper text-ink shadow-[0_6px_14px_-8px_rgb(0_0_0/0.5)] hover:-translate-y-0.5'}`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </section>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          {done ? (
            <LevelEnd data={data} {...resultCopy(data)} />
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-chalk/15 bg-chalk/[0.05] p-4">
              <p className="text-sm font-semibold text-chalk-soft">
                Escolha 4 jogadores com algo em comum: mesmo clube, mesma seleção ou titulares da
                mesma final. Cada um está em um grupo só.
              </p>
              <p className="flex items-center gap-2 text-sm font-semibold">
                Erros restantes:
                <span className="flex gap-1" aria-label={`${view.mistakesLeft} erros restantes`}>
                  {Array.from({ length: MAX_MISTAKES }, (_, i) => (
                    <span
                      key={i}
                      className={`size-3 rounded-full ${i < view.mistakesLeft ? 'bg-cover' : 'bg-chalk/20'}`}
                    />
                  ))}
                </span>
              </p>
              <p className="min-h-6 font-condensed text-xl font-black uppercase" aria-live="polite">
                {note}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`${btnSecondary} min-h-11`} onClick={shuffle}>
                  Embaralhar
                </button>
                <button
                  type="button"
                  className={`${btnSecondary} min-h-11`}
                  onClick={() => setPicked([])}
                  disabled={!picked.length}
                >
                  Limpar
                </button>
              </div>
              <button
                type="button"
                className={btnPrimary}
                disabled={picked.length !== 4 || !online || action.isPending}
                onClick={confirm}
              >
                Confirmar grupo ({picked.length}/4)
              </button>
              {action.error && (
                <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
                  {(action.error as ApiError).message}
                </p>
              )}
              <button
                type="button"
                className="min-h-10 self-center text-sm font-semibold text-chalk-soft underline underline-offset-4"
                disabled={!online || action.isPending}
                onClick={() =>
                  action.mutate({ attemptId: data.attempt.id, input: { kind: 'give_up' } })
                }
              >
                Desistir e ver os grupos
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
