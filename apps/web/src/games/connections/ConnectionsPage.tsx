/**
 * Conexões screen (ADR-011): 16 player stickers; pick 4 that share something (club, national
 * team, a final's XI) and confirm. Found groups lock in as coloured bands with their label.
 */
import { useMemo, useState } from 'react';
import type { AttemptResponse, ConnectionsReveal, ConnectionsView } from '@decabeca/contracts';
import { btnPrimary, btnSecondary, GameHeader, Skeleton, useOnline } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { buzz } from '../../lib/haptics';
import { play } from '../../lib/sound';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

const MAX_MISTAKES = 4;
/** Door colours by group (easiest first), all with dark ink for contrast. */
const BAND = [
  'bg-cover text-ink',
  'bg-[oklch(0.82_0.13_150)] text-ink',
  'bg-[oklch(0.8_0.09_235)] text-ink',
  'bg-[oklch(0.78_0.1_305)] text-ink',
];
const STEEL = 'bg-[linear-gradient(90deg,#7d8a91,#aab5ba_50%,#7d8a91)]';
const SHIRT =
  '[clip-path:polygon(0_20%,24%_0,38%_0,50%_10%,62%_0,76%_0,100%_20%,90%_38%,92%_100%,8%_100%,10%_38%)]';

/** A locker door slammed shut over its row, the group theme printed on it. */
function Band({ g }: { g: ConnectionsView['found'][number] }) {
  return (
    <li
      className={`locker-slam flex min-h-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-sm border-4 border-[#4b565c] px-3 py-1.5 text-center shadow-[inset_0_0_0_2px_#fff3] ${BAND[g.group]}`}
    >
      <span className="font-condensed text-lg leading-tight font-black uppercase">{g.label}</span>
      <span className="text-xs font-semibold sm:text-sm">
        {g.players.map((p) => p.name).join(' · ')}
      </span>
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
  const [flash, setFlash] = useState(0);
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
            play('clunk');
            buzz(40);
          } else if (ev?.type === 'miss') {
            setNote(ev.oneAway ? 'Quase! Falta trocar um.' : 'Não é um grupo.');
            setFlash((n) => n + 1);
            play('wrong');
            buzz([30, 40, 30]);
          }
        },
      },
    );
  const shuffle = () => setOrder([...tiles].map((t) => t.id).sort(() => Math.random() - 0.5));

  return (
    <div
      className={`flex flex-col gap-3 ${done ? '' : 'h-[calc(100dvh-8rem-env(safe-area-inset-bottom)-var(--consent-room,0px))] sm:h-[calc(100dvh-9rem-var(--consent-room,0px))]'}`}
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
      <section
        aria-label="Vestiário"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #0000001a 0 1px, transparent 1px 14px), linear-gradient(90deg,#7d8a91,#aab5ba 50%,#7d8a91)',
        }}
        className={`relative mx-auto flex w-full max-w-3xl flex-col gap-2 overflow-y-auto rounded-lg border-4 border-[#4b565c] p-2 pt-4 text-[#20282c] shadow-[0_6px_0_#0004,inset_0_0_0_2px_#fff3] sm:p-4 sm:pt-5 ${done ? 'min-h-[24rem]' : 'min-h-0 flex-1'}`}
      >
        {/* Warning lamp: flashes red on a wrong group. */}
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-3 size-4 rounded-full border-2 border-[#4b565c] bg-[#5a1a1a]"
        />
        {flash > 0 && (
          <>
            <span
              key={`l${flash}`}
              aria-hidden="true"
              className="lamp-blink absolute top-1.5 right-3 size-4 rounded-full border-2 border-[#4b565c] bg-[#e5252f]"
            />
            <span
              key={`w${flash}`}
              aria-hidden="true"
              className="lamp-wash pointer-events-none absolute inset-0 bg-[#a3242f]"
            />
          </>
        )}
        <ol className="flex flex-col gap-2 [perspective:700px]" aria-label="Grupos encontrados">
          {(done ? (data.reveal as ConnectionsReveal).groups : view.found).map((g) => (
            <Band key={g.group} g={g} />
          ))}
        </ol>
        {!done && (
          <>
            <p className="sr-only text-sm font-semibold sm:not-sr-only">
              Escolha 4 jogadores com algo em comum: mesmo clube, mesma seleção ou titulares da
              mesma final. Cada um está em um grupo só.
            </p>
            <div
              className="grid auto-rows-[3.5rem] grid-cols-4 content-start sm:auto-rows-[5rem] gap-1.5 sm:gap-3"
              role="group"
              aria-label="Jogadores"
            >
              {tiles.map((t) => {
                const on = picked.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(t.id)}
                    disabled={action.isPending}
                    className={`relative flex items-end justify-center rounded-sm border-2 border-[#4b565c] px-0.5 pt-3 pb-1 ${STEEL} shadow-[inset_0_0_0_1px_#fff4] disabled:opacity-70`}
                  >
                    <i
                      aria-hidden="true"
                      className="absolute inset-x-2 top-1 h-1.5 bg-[repeating-linear-gradient(90deg,#20282c_0_2px,transparent_2px_5px)] opacity-70"
                    />
                    <span
                      className={`flex h-full w-full items-center justify-center px-2 text-center text-[0.6875rem] leading-tight font-bold transition-transform duration-150 ease-out-expo [overflow-wrap:anywhere] hyphens-auto sm:text-sm ${SHIRT} ${on ? '-translate-y-1 bg-ink text-paper' : 'bg-paper text-ink'}`}
                    >
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>
      {done ? (
        <div className="mx-auto w-full max-w-3xl">
          <LevelEnd data={data} {...resultCopy(data)} />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              Erros:
              <span className="flex gap-1" aria-label={`${view.mistakesLeft} erros restantes`}>
                {Array.from({ length: MAX_MISTAKES }, (_, i) => (
                  <span
                    key={i}
                    className={`size-3 rounded-full ${i < view.mistakesLeft ? 'bg-cover' : 'bg-chalk/20'}`}
                  />
                ))}
              </span>
            </p>
            <p
              className="font-condensed min-w-0 flex-1 text-base leading-tight font-black uppercase"
              aria-live="polite"
            >
              {note}
            </p>
            <button
              type="button"
              aria-label="Desistir e ver os grupos"
              className="min-h-11 shrink-0 text-sm font-semibold text-chalk-soft underline underline-offset-4"
              disabled={!online || action.isPending}
              onClick={() =>
                action.mutate({ attemptId: data.attempt.id, input: { kind: 'give_up' } })
              }
            >
              Desistir
            </button>
          </div>
          {action.error && (
            <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
              {(action.error as ApiError).message}
            </p>
          )}
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
        </div>
      )}
    </div>
  );
}
