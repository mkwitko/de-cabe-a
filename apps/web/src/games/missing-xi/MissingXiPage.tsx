/**
 * Escalação screen (ADR-011): the starting XI of a real final on a vertical pitch, some names
 * hidden. Search a player to fill a hidden slot; five wrong guesses end the level. Line-ups come
 * from English Wikipedia (CC BY-SA), credited under the pitch.
 */
import { useState } from 'react';
import type {
  AttemptResponse,
  MissingXiReveal,
  MissingXiView,
  PlayerRef,
} from '@decabeca/contracts';
import { teamPt } from '@decabeca/contracts';
import { PlayerSearch } from '../../components/PlayerSearch';
import { btnPrimary, btnSecondary, GameHeader, Skeleton, useOnline } from '../../components/ui';
import type { ApiError } from '../../lib/api';
import { useAction, useAttempt } from '../../lib/game';
import { useGameTracking } from '../../lib/useGameTracking';
import { Countdown } from '../Clock';
import { LevelEnd, LevelError } from '../LevelParts';

export const COMPETITION_PT: Record<string, string> = {
  'FIFA World Cup': 'Copa do Mundo',
  'UEFA Champions League': 'Liga dos Campeões',
  'Copa Libertadores': 'Libertadores',
  'Copa América': 'Copa América',
};
export const STAGE_PT: Record<string, string> = {
  Final: 'Final',
  'Semi-finals': 'Semifinal',
  'Quarter-finals': 'Quartas de final',
  'Round of 16': 'Oitavas de final',
  'Third place play-off': 'Disputa do 3º lugar',
  'Match for third place': 'Disputa do 3º lugar',
};

export function matchTitle(m: MissingXiView['match']) {
  const score = m.homeScore !== null && m.awayScore !== null;
  return {
    title: `${STAGE_PT[m.stage ?? 'Final'] ?? 'Jogo'} da ${COMPETITION_PT[m.competition] ?? m.competition} ${m.season}`,
    score: `${teamPt(m.homeTeam)} ${score ? `${m.homeScore} × ${m.awayScore}` : '×'} ${teamPt(m.awayTeam)}`,
  };
}

/** Pitch line of a Wikipedia position code, from the goal (0) to the attack (5). */
function lineOf(pos: string) {
  if (pos === 'GK') return 0;
  if (['SW', 'CB', 'RB', 'LB', 'DF', 'FB', 'CH'].includes(pos)) return 1;
  if (['DM', 'RWB', 'LWB'].includes(pos)) return 2;
  if (['CM', 'MF', 'RM', 'LM', 'RH', 'LH', 'HB'].includes(pos)) return 3;
  if (['AM', 'RW', 'LW', 'SS', 'OL', 'OR', 'IL', 'IR'].includes(pos)) return 4;
  return 5;
}
/** Left to right inside a line: L* first, R* last, centre in sheet order. */
const sideOf = (pos: string) => (/^(L|OL|IL)/.test(pos) ? 0 : /^(R|OR|IR)/.test(pos) ? 2 : 1);

/**
 * Horizontal place on the pitch, in %: wide players (L*, R*) hug the touchlines, the others
 * spread evenly across the middle.
 */
function xOf<T extends { position: string }>(row: T[], s: T) {
  const side = sideOf(s.position);
  const wide = (p: string) => sideOf(p) !== 1;
  if (wide(s.position)) return side === 0 ? 14 : 86;
  const mid = row.filter((x) => !wide(x.position));
  const k = mid.indexOf(s);
  // A central pair stays central; a full line of centrals (back three, four) spreads wider.
  const [lo, hi] = row.length > mid.length || mid.length <= 2 ? [32, 68] : [16, 84];
  return mid.length === 1 ? 50 : lo + ((hi - lo) * k) / (mid.length - 1);
}

type Slot = {
  position: string;
  jersey: number | null;
  name: string | null;
  found?: boolean;
  missed?: boolean;
};

function Pitch({ slots }: { slots: Slot[] }) {
  const lines = new Map<number, (Slot & { i: number })[]>();
  slots.forEach((s, i) => {
    const l = lineOf(s.position);
    lines.set(l, [...(lines.get(l) ?? []), { ...s, i }]);
  });
  const rows = [...lines.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, r]) => r.sort((a, b) => sideOf(a.position) - sideOf(b.position) || a.i - b.i));
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-chalk/40 bg-pitch px-2 py-5 [background-image:repeating-linear-gradient(0deg,transparent_0_48px,rgb(0_0_0/0.06)_48px_96px)]">
      {/* Field markings: halfway line, centre circle and the box. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-chalk/40" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 left-1/2 size-24 -translate-x-1/2 rounded-full border-2 border-chalk/30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-16 w-1/2 -translate-x-1/2 border-2 border-b-0 border-chalk/30"
      />
      <ol className="relative flex min-h-[30rem] flex-col justify-between gap-3">
        {rows.map((row, r) => (
          <li key={r} className="relative h-16">
            {row.map((s) => (
              <div
                key={s.i}
                style={{ left: `${xOf(row, s)}%` }}
                className="absolute top-0 flex w-20 -translate-x-1/2 flex-col items-center gap-1 text-center sm:w-24"
              >
                <span
                  className={`font-condensed grid size-11 place-items-center rounded-full text-lg font-black shadow-[0_4px_10px_-4px_rgb(0_0_0/0.6)] ${s.found ? 'bg-cover text-ink' : s.missed ? 'bg-chalk/25 text-chalk' : s.name ? 'bg-paper text-ink' : 'border-2 border-dashed border-chalk bg-pitch-deep/60 text-chalk'}`}
                >
                  {s.jersey ?? ''}
                </span>
                <span
                  className={`text-xs leading-tight font-bold sm:text-sm ${s.missed ? 'text-chalk-soft line-through' : 'text-chalk'}`}
                >
                  {s.name ?? '?'}
                </span>
                <span className="sr-only">{s.position}</span>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Credit({ source }: { source: string }) {
  return (
    <p className="text-sm text-chalk-soft">
      Escalação:{' '}
      <a
        className="underline underline-offset-4"
        href={`https://en.wikipedia.org/wiki/${source
          .split('#')
          .map((x) => encodeURIComponent(x.replace(/ /g, '_')))
          .join('#')}`}
        target="_blank"
        rel="noreferrer"
      >
        Wikipédia
      </a>{' '}
      (CC BY-SA)
    </p>
  );
}

function resultCopy(data: AttemptResponse) {
  const view = data.view as MissingXiView;
  const found = view.slots.filter((s) => s.found).length;
  const reveal = data.reveal as MissingXiReveal;
  return {
    headline:
      found === view.hidden
        ? `Escalação completa! ${found} de ${found}.`
        : `${found} de ${view.hidden} desta vez`,
    detail: (
      <p className="text-base">
        Faltaram:{' '}
        {reveal.slots
          .filter((s, i) => s.hidden && !view.slots[i]!.found)
          .map((s) => s.name)
          .join(', ') || 'ninguém'}
        .
      </p>
    ),
  };
}

export function MissingXiPage({ level, timed = false }: { level: number; timed?: boolean }) {
  const attempt = useAttempt('MISSING_XI', level, timed);
  const action = useAction('MISSING_XI', level);
  const online = useOnline();
  const [selected, setSelected] = useState<PlayerRef | null>(null);
  const [misses, setMisses] = useState<string[]>([]);
  const [announce, setAnnounce] = useState('');
  const data = attempt.data;
  useGameTracking(data);
  const title = `Escalação · Fase ${level}`;

  if (attempt.isPending) return <Skeleton className="h-96" />;
  if (attempt.error || !data)
    return (
      <div className="flex flex-col gap-6">
        <GameHeader title={title} />
        <LevelError
          error={attempt.error as ApiError}
          mode="MISSING_XI"
          retry={() => void attempt.refetch()}
        />
      </div>
    );
  const view = data.view as MissingXiView;
  const done = data.attempt.status !== 'IN_PROGRESS';
  const reveal = data.reveal as MissingXiReveal | null;
  const { title: final, score } = matchTitle(view.match);
  const team = teamPt(view.side === 'home' ? view.match.homeTeam : view.match.awayTeam);
  const found = view.slots.filter((s) => s.found).length;
  const shown = new Set(view.slots.map((s) => s.playerId).filter(Boolean) as string[]);
  const slots: Slot[] =
    done && reveal
      ? reveal.slots.map((s, i) => ({
          ...s,
          found: view.slots[i]!.found,
          missed: s.hidden && !view.slots[i]!.found,
        }))
      : view.slots;

  const guess = (p: PlayerRef) =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'guess', playerId: p.id } },
      {
        onSuccess: (res) => {
          setSelected(null);
          if (res.event?.type === 'found') setAnnounce(`${p.name} estava no time!`);
          else if (res.event?.type === 'wrong') {
            setMisses((m) => [...m, p.name]);
            setAnnounce(`${p.name} não jogou essa final.`);
          }
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
              {found}/{view.hidden}
            </span>
          </div>
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)] lg:items-start">
        <section className="flex flex-col gap-4">
          <div>
            <p className="font-semibold text-chalk-soft">{final}</p>
            <h2 className="font-condensed text-3xl leading-tight font-black uppercase">{score}</h2>
            <p className="font-semibold">Escale o {team}: os titulares daquele jogo.</p>
          </div>
          <Pitch slots={slots} />
          <Credit source={view.match.source} />
        </section>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
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
                  Quem estava em campo? Faltam {view.hidden - found}.
                </p>
                <div className="flex items-stretch gap-2">
                  <div className="min-w-0 flex-1">
                    <PlayerSearch
                      label="Jogador titular"
                      onSelect={setSelected}
                      selected={selected}
                      exclude={shown}
                      disabled={!online || action.isPending}
                      autoFocus
                    />
                  </div>
                  <button
                    className={`${btnPrimary} px-4`}
                    disabled={!selected || !online || action.isPending}
                  >
                    Escalar
                  </button>
                </div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  Erros restantes:
                  <span className="flex gap-1" aria-label={`${view.wrongLeft} erros restantes`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={`size-3 rounded-full ${i < view.wrongLeft ? 'bg-cover' : 'bg-chalk/20'}`}
                      />
                    ))}
                  </span>
                </p>
                {misses.length > 0 && (
                  <p className="text-sm text-chalk-soft">Não jogaram: {misses.join(', ')}</p>
                )}
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
                Desistir e ver a escalação
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
