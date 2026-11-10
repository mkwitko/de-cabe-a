/**
 * Craque Misterioso screen (ADR-011): search a player; each guess shows, next to his own data,
 * what matches the hidden player (nationality, position, birth year, clubs and countries).
 */
import { useEffect, useRef, useState } from 'react';
import type { AttemptResponse, MysteryReveal, MysteryView, PlayerRef } from '@decabeca/contracts';
import { buzz } from '../../lib/haptics';
import { play } from '../../lib/sound';
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

/** Post-it paper: a match is the yellow chip with an ink border, "perto" a pale one. */
function Cell({ ok, label, value }: { ok: boolean | 'close'; label: string; value: string }) {
  return (
    <div
      className={`flex min-h-14 flex-col justify-center rounded-md border-2 px-2 py-1 text-ink ${ok === true ? 'border-ink bg-cover' : ok === 'close' ? 'border-ink/30 bg-cover/40' : 'border-transparent bg-ink/[0.07]'}`}
    >
      <span className="text-[0.65rem] font-bold tracking-wide uppercase opacity-70">{label}</span>
      <span className="text-sm leading-tight font-bold">{value}</span>
      <span className="sr-only">
        {ok === true ? ', bate' : ok === 'close' ? ', perto' : ', não bate'}
      </span>
    </div>
  );
}

function GuessRow({ g, i, fresh }: { g: Guess; i: number; fresh: boolean }) {
  const f = g.feedback;
  const born =
    g.birthYear === null
      ? '—'
      : f.birthYear === 'same'
        ? String(g.birthYear)
        : `${g.birthYear} ${f.birthYear === 'older' ? '↑ ele nasceu depois' : '↓ ele nasceu antes'}`;
  return (
    <li
      style={{ rotate: `${i % 2 ? 0.5 : -0.5}deg` }}
      className={`flex flex-col gap-1.5 bg-[#fff9dc] p-2.5 text-ink shadow-[0_3px_0_#0003] ${fresh ? 'motion-safe:animate-[paste_150ms_ease-out]' : ''}`}
    >
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
        <p className="text-sm opacity-80">
          Jogou nos mesmos países: {f.sharedCountries.map(countryName).join(', ')}
        </p>
      )}
    </li>
  );
}

type Known = { nationality?: string; position?: string; birth?: string; clubs?: string };

/** What the guesses (or, at the end, the answer) have proved about the hidden player. */
function dossier(
  guesses: Guess[],
  answer: MysteryReveal['answer'] | null,
): Known & { note?: string } {
  if (answer)
    return {
      nationality: countryName(answer.nationalityCode),
      position: answer.positionGroup ? POSITION_LABEL[answer.positionGroup] : '—',
      birth: answer.birthYear ? String(answer.birthYear) : '—',
      clubs: answer.clubs.map((c) => c.name).join(', '),
    };
  const k: Known & { note?: string } = {};
  let after = -Infinity;
  let before = Infinity;
  const clubs = new Set<string>();
  for (const g of guesses) {
    const f = g.feedback;
    if (f.nationality) k.nationality ??= countryName(g.nationalityCode);
    if (f.position && g.positionGroup) k.position ??= POSITION_LABEL[g.positionGroup];
    if (g.birthYear !== null) {
      if (f.birthYear === 'same') k.birth ??= String(g.birthYear);
      else if (f.birthYear === 'older') after = Math.max(after, g.birthYear);
      else if (f.birthYear === 'younger') before = Math.min(before, g.birthYear);
    }
    f.sharedClubs.forEach((c) => clubs.add(c));
  }
  if (clubs.size) k.clubs = [...clubs].join(', ');
  if (!k.birth && (after > -Infinity || before < Infinity))
    k.note = `Nasceu ${after > -Infinity ? `depois de ${after}` : ''}${after > -Infinity && before < Infinity ? ' e ' : ''}${before < Infinity ? `antes de ${before}` : ''}`;
  return k;
}

const FIELDS = [
  ['nationality', 'Nacionalidade'],
  ['position', 'Posição'],
  ['birth', 'Nascimento'],
  ['clubs', 'Clubes'],
] as const;

/** One field of the scout's folder: a black censor bar covers it until a guess proves it. */
function Field({
  label,
  value,
  ripped,
  note,
}: {
  label: string;
  value: string | undefined;
  ripped: boolean;
  note?: string | undefined;
}) {
  const known = value !== undefined;
  return (
    <div className="relative min-w-0 border-b-2 border-[#5a4520]/40 pb-1">
      <p className="text-[0.65rem] font-extrabold tracking-[0.14em] uppercase opacity-70">
        {label}
      </p>
      <p className="font-condensed truncate text-xl leading-tight font-black uppercase sm:text-2xl">
        {known ? value : '??????'}
      </p>
      {!known && (
        <i
          aria-hidden="true"
          className="absolute inset-x-0 top-4 bottom-1 bg-[#1c1c1c] [background-image:repeating-linear-gradient(135deg,#ffffff0d_0_6px,transparent_6px_12px)]"
        />
      )}
      {known && !ripped && (
        <i
          aria-hidden="true"
          className="censor-tear pointer-events-none absolute inset-x-0 top-4 bottom-1 bg-[#1c1c1c]"
        />
      )}
      {note && !known && (
        <span className="absolute -top-1 right-0 z-10 rotate-3 bg-[#fff9dc] px-1.5 py-0.5 text-[0.7rem] leading-tight font-bold shadow-[0_2px_0_#0003] motion-safe:animate-[paste_150ms_ease-out]">
          {note}
        </span>
      )}
    </div>
  );
}

/** "CONTRATADO" lands on the folder when the player is found. */
function HireStamp({ won, fresh }: { won: boolean; fresh: boolean }) {
  useEffect(() => {
    if (!fresh) return;
    const id = window.setTimeout(() => {
      play('stamp');
      buzz(30);
    }, 250);
    return () => window.clearTimeout(id);
  }, [fresh]);
  return (
    <span
      aria-hidden="true"
      style={{ '--rot': '-12deg', transform: 'rotate(-12deg)' } as React.CSSProperties}
      className={`font-condensed pointer-events-none absolute right-4 bottom-4 z-20 rounded-md border-4 border-current bg-[#d6b46f]/70 px-3 text-[clamp(1.6rem,7vw,3rem)] leading-[1.1] font-black tracking-wider uppercase mix-blend-multiply ${won ? 'text-[#b3261e]' : 'text-[#5a4520]'} ${fresh ? 'stamp-hit' : ''}`}
    >
      {won ? 'Contratado' : 'Dispensado'}
    </span>
  );
}

/** Sound and buzz when another field of the folder is proved (never on the first render). */
function RipSound({ count }: { count: number }) {
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) {
      play('rip');
      buzz(12);
    }
    prev.current = count;
  }, [count]);
  return null;
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
  const [flash, setFlash] = useState(0);
  const live = useRef<boolean | null>(null); // was the level still on when the screen opened?
  const base = useRef<number | null>(null); // guesses present at mount stay still
  const mounted = useRef<Known | null>(null); // fields already proved at mount: no bar to tear
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
  const reveal = data.reveal as MysteryReveal | null;
  const guessed = new Set(view.guesses.map((g) => g.playerId));
  const known = dossier(view.guesses, done && reveal ? reveal.answer : null);
  live.current ??= !done;
  base.current ??= view.guesses.length;
  mounted.current ??= { ...known };
  const guess = (p: PlayerRef) =>
    action.mutate(
      { attemptId: data.attempt.id, input: { kind: 'guess', playerId: p.id } },
      {
        onSuccess: (res) => {
          setSelected(null);
          if (res.event?.type !== 'won') setFlash((n) => n + 1);
          setAnnounce(res.event?.type === 'won' ? `É ${p.name}!` : `Não é ${p.name}.`);
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
              {view.guesses.length}/{MAX}
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
          className="pointer-events-none fixed inset-0 z-40 bg-[#a3242f] opacity-0 motion-safe:animate-[red-flash_180ms_ease-out]"
        />
      )}

      <section
        aria-label="Dossiê do olheiro"
        className={`relative mx-auto flex w-full max-w-5xl flex-col gap-3 overflow-hidden rounded-lg border-2 border-dashed border-[#5a4520] bg-[#d6b46f] p-3 text-[#3d2f14] shadow-[0_6px_0_#0004] [background-image:repeating-linear-gradient(0deg,#0000000f_0_1px,transparent_1px_9px)] sm:p-5 ${done ? 'h-[34rem] sm:h-[36rem]' : 'min-h-0 flex-1'}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <p className="font-condensed text-sm font-bold tracking-[0.2em] uppercase">
            Pasta de olheiro
          </p>
          <span
            aria-hidden="true"
            className="font-condensed rotate-3 rounded border-[3px] border-[#b3261e] px-2 text-base leading-tight font-black tracking-wider text-[#b3261e] uppercase opacity-85"
          >
            Confidencial
          </span>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {FIELDS.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={known[key]}
              ripped={mounted.current![key] !== undefined || !live.current}
              note={key === 'birth' ? known.note : undefined}
            />
          ))}
        </div>
        <RipSound count={FIELDS.filter(([k]) => known[k] !== undefined).length} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view.guesses.length === 0 && !done ? (
            <p className="rounded-md border-2 border-dashed border-[#5a4520]/60 p-4">
              Chute um jogador qualquer para começar. Amarelo é o que bate com o craque escondido;
              amarelo claro na idade é perto (até 2 anos). Cada pista arranca uma tarja preta da
              ficha.
            </p>
          ) : (
            <ol className="flex flex-col-reverse gap-2.5 p-1" aria-label="Palpites">
              {view.guesses.map((g, i) => (
                <GuessRow key={g.playerId} g={g} i={i} fresh={i >= base.current!} />
              ))}
            </ol>
          )}
        </div>
        {done && <HireStamp won={data.attempt.status === 'WON'} fresh={live.current} />}
      </section>

      {done ? (
        <div className="mx-auto w-full max-w-5xl">
          <LevelEnd data={data} {...resultCopy(data)} />
        </div>
      ) : (
        <form
          className="fixed inset-x-0 bottom-14 z-20 flex flex-col gap-2 border-t border-chalk/15 bg-pitch-deep/95 p-3 sm:relative sm:inset-x-auto sm:bottom-auto sm:mx-auto sm:w-full sm:max-w-5xl sm:shrink-0 sm:rounded-xl sm:border sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) guess(selected);
          }}
        >
          <p className="sr-only text-sm font-semibold text-chalk-soft sm:not-sr-only">
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
                dropUp
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
          <button
            type="button"
            className={`${btnSecondary} text-base`}
            disabled={!online || action.isPending}
            onClick={() =>
              action.mutate({ attemptId: data.attempt.id, input: { kind: 'give_up' } })
            }
          >
            Desistir e ver quem era
          </button>
        </form>
      )}
      {/* room for the guess form docked at the bottom on phones */}
      {!done && <div className="h-24 shrink-0 sm:hidden" aria-hidden="true" />}
    </div>
  );
}
