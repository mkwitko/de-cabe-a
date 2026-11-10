/**
 * Escalação screen (ADR-011): the starting XI of a real final on a vertical pitch, some names
 * hidden. Search a player to fill a hidden slot; five wrong guesses end the level. Line-ups come
 * from English Wikipedia (CC BY-SA), credited under the pitch.
 */
import { useEffect, useRef, useState } from 'react';
import type {
  AttemptResponse,
  MissingXiReveal,
  MissingXiView,
  PlayerRef,
} from '@decabeca/contracts';
import { teamPt } from '@decabeca/contracts';
import { buzz } from '../../lib/haptics';
import { play } from '../../lib/sound';
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
  'Copa do Brasil': 'Copa do Brasil',
  'FIFA Club World Cup': 'Mundial de Clubes',
};
export const STAGE_PT: Record<string, string> = {
  Final: 'Final',
  'Final, first leg': 'Final (ida)',
  'Final, second leg': 'Final (volta)',
  'Semi-finals': 'Semifinal',
  'Quarter-finals': 'Quartas de final',
  Semifinals: 'Semifinal',
  Quarterfinals: 'Quartas de final',
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

/** A head-and-shoulders portrait; `dark` is the empty silhouette waiting to be developed. */
function Portrait({ dark }: { dark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 flex flex-col items-center justify-end overflow-hidden rounded-full border-2 ${dark ? 'border-[#0b0b0b] bg-[#26241f]' : 'border-[#6b5a3c] bg-[#d8c79f]'}`}
    >
      <i className={`size-[42%] rounded-full ${dark ? 'bg-[#0b0b0b]' : 'bg-[#b98c5e]'}`} />
      <i
        className={`mt-[4%] h-[34%] w-[84%] rounded-t-full ${dark ? 'bg-[#0b0b0b]' : 'bg-[#e0c14a]'}`}
      />
    </span>
  );
}

/**
 * One player in the photo. Hidden = dark silhouette; a name just found develops the face
 * (silhouette fades out, once, only for what was found while the screen was open).
 */
function Face({ s, fresh }: { s: Slot; fresh: boolean }) {
  useEffect(() => {
    if (!fresh) return;
    play('shimmer');
    buzz(15);
  }, [fresh]);
  const dark = s.name === null || s.missed;
  return (
    <span className={`relative block size-10 sm:size-12 ${s.missed ? 'opacity-70' : ''}`}>
      {dark ? <Portrait dark /> : <Portrait />}
      {!dark && fresh && (
        <span className="develop-out absolute inset-0">
          <Portrait dark />
        </span>
      )}
      <span className="font-condensed absolute -right-1.5 -bottom-1 grid min-w-5 place-items-center rounded-full bg-paper px-1 text-[0.8rem] leading-5 font-black text-ink shadow-[0_1px_0_#0006]">
        {s.jersey ?? ''}
      </span>
    </span>
  );
}

/**
 * The team photo. The pitch lies in perspective (only the grass is tilted); the players stand on
 * top of it, smaller and closer together the further back their line is.
 */
function Pitch({ slots, freshAt }: { slots: Slot[]; freshAt: (i: number) => boolean }) {
  const lines = new Map<number, (Slot & { i: number })[]>();
  slots.forEach((s, i) => {
    const l = lineOf(s.position);
    lines.set(l, [...(lines.get(l) ?? []), { ...s, i }]);
  });
  const rows = [...lines.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, r]) => r.sort((a, b) => sideOf(a.position) - sideOf(b.position) || a.i - b.i));
  return (
    <div className="obj-dark relative min-h-0 flex-1 overflow-hidden border-2 border-[#2b2418] bg-[#3a372e] [background-image:radial-gradient(#0000004d_1px,transparent_1.5px)] [background-size:6px_6px] [perspective:560px]">
      <div className="absolute inset-0 origin-bottom [transform:rotateX(32deg)] bg-[#6f7a4f] [background-image:repeating-linear-gradient(0deg,transparent_0_44px,rgb(0_0_0/0.07)_44px_88px)]">
        {/* Field markings: halfway line, centre circle and the box. */}
        <div aria-hidden className="absolute inset-x-0 top-[12%] h-0.5 bg-[#f1ead2]/60" />
        <div
          aria-hidden
          className="absolute top-[12%] left-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#f1ead2]/50"
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-1/2 h-1/5 w-3/5 -translate-x-1/2 border-2 border-b-0 border-[#f1ead2]/50"
        />
      </div>
      {/* Old-photo vignette. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_100%_at_50%_45%,transparent_55%,#0000008c)]"
      />
      <div className="absolute inset-0 overflow-y-auto">
        <ol
          className="relative mx-1 my-1 h-[calc(100%-0.5rem)]"
          style={{ minHeight: `${rows.length * 4.8}rem` }}
        >
          {rows.map((row, r) => {
            const t = rows.length > 1 ? r / (rows.length - 1) : 1;
            const k = 0.9 + 0.1 * t;
            return (
              <li
                key={r}
                style={{ top: `calc(${t} * (100% - 4.8rem))` }}
                className="absolute inset-x-0 h-[4.8rem]"
              >
                {row.map((s) => (
                  <div
                    key={s.i}
                    style={{
                      left: `${50 + (xOf(row, s) - 50) * (0.84 + 0.16 * t)}%`,
                      transform: `translateX(-50%) scale(${k})`,
                    }}
                    className="absolute top-0 flex w-[4.4rem] origin-top flex-col items-center gap-0.5 text-center sm:w-24"
                  >
                    <Face s={s} fresh={freshAt(s.i) && !!s.found} />
                    {s.name === null ? (
                      <span className="sr-only">jogador oculto</span>
                    ) : (
                      <span
                        className={`line-clamp-2 rounded-sm bg-[#f1ead2] px-1 text-[0.8rem] leading-tight font-bold text-[#2b2418] sm:text-sm ${s.missed ? 'line-through opacity-80' : ''}`}
                      >
                        {s.name}
                      </span>
                    )}
                    <span className="sr-only">{s.position}</span>
                  </div>
                ))}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Credit({ source }: { source: string }) {
  return (
    <p className="text-xs">
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
  const [flash, setFlash] = useState(0);
  const initial = useRef<Set<number> | null>(null); // faces already developed when the screen opened
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
  initial.current ??= new Set(view.slots.flatMap((s, i) => (s.found ? [i] : [])));
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
            setFlash((n) => n + 1);
            setAnnounce(`${p.name} não jogou essa final.`);
          }
        },
      },
    );

  return (
    <div
      className={`flex flex-col gap-3 ${done ? '' : 'h-[calc(100dvh-8rem-env(safe-area-inset-bottom)-var(--consent-room,0px))] sm:h-[calc(100dvh-9rem-var(--consent-room,0px))]'}`}
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
            <span className="font-condensed tabular text-2xl font-black">
              {found}/{view.hidden}
            </span>
          </div>
        }
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {flash > 0 && (
        <div
          key={flash}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40 bg-[#a3242f] opacity-0 motion-safe:animate-[red-flash_450ms_ease-out]"
        />
      )}
      <section
        aria-label="Foto oficial do time"
        className={`relative mx-auto flex w-full max-w-3xl flex-col gap-2 border-[10px] border-paper bg-paper p-0 text-[#2b2418] shadow-[0_6px_14px_-4px_#0008] ${done ? 'h-[36rem]' : 'min-h-0 flex-1'}`}
      >
        <Pitch slots={slots} freshAt={(i) => !initial.current!.has(i)} />
        <div className="shrink-0 px-1 pb-1">
          <p className="text-xs font-semibold">{final}</p>
          <h2 className="font-condensed text-xl leading-tight font-black uppercase sm:text-2xl">
            {score}
          </h2>
          <p className="text-sm font-semibold">Escale o {team}: os titulares daquele jogo.</p>
          <Credit source={view.match.source} />
        </div>
      </section>

      {done ? (
        <div className="mx-auto w-full max-w-3xl">
          <LevelEnd data={data} {...resultCopy(data)} />
        </div>
      ) : (
        <form
          className="fixed inset-x-0 bottom-14 z-20 flex flex-col gap-2 border-t border-chalk/15 bg-pitch-deep/95 p-3 backdrop-blur sm:relative sm:inset-x-auto sm:bottom-auto sm:mx-auto sm:w-full sm:max-w-3xl sm:shrink-0 sm:rounded-xl sm:border sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) guess(selected);
          }}
        >
          <p className="sr-only text-sm font-semibold text-chalk-soft sm:not-sr-only">
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
                dropUp
              />
            </div>
            <button
              className={`${btnPrimary} px-4`}
              disabled={!selected || !online || action.isPending}
            >
              Escalar
            </button>
          </div>
          {action.error && (
            <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
              {(action.error as ApiError).message}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <span className="shrink-0 sm:hidden">Faltam {view.hidden - found}</span>
              <span className="shrink-0">Erros:</span>
              <span
                className="flex shrink-0 gap-1"
                aria-label={`${view.wrongLeft} erros restantes`}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className={`size-3 rounded-full ${i < view.wrongLeft ? 'bg-cover' : 'bg-chalk/20'}`}
                  />
                ))}
              </span>
              {misses.length > 0 && (
                <span className="truncate text-chalk-soft">Não jogaram: {misses.join(', ')}</span>
              )}
            </p>
            <button
              type="button"
              aria-label="Desistir e ver a escalação"
              className={`${btnSecondary} min-h-11 shrink-0 px-3 text-base`}
              disabled={!online || action.isPending}
              onClick={() =>
                action.mutate({ attemptId: data.attempt.id, input: { kind: 'give_up' } })
              }
            >
              Desistir
            </button>
          </div>
        </form>
      )}
      {/* room for the form docked at the bottom on phones */}
      {!done && <div className="h-28 shrink-0 sm:hidden" aria-hidden="true" />}
    </div>
  );
}
