/**
 * Friendly match of corte 0,5 (TASKS MC-250, MC-262): pick two clubs, a plan,
 * watch on a night-match stage with a broadcast scoreboard, adjust the home
 * side live, read the report. The server simulates; this page only draws
 * (ADR-015). Frames never enter React state: the draw loop reads a ref.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { motionReduced } from '../../lib/settings';
import { ClubBadge } from '../../components/ClubBadge';
import { btnPrimary, btnSecondary, GameHeader, Notice, Term } from '../../components/ui';
import { t, tMessage, type MessageKey } from './i18n';
import { headlineKind } from './headline';
import { drawPlayers, kitsFor, pitchLayer, view, type View } from './pitch';

export interface Club {
  id: string;
  name: string;
  shortName: string;
  colours: [string, string];
}
export interface Instructions {
  block: 'low' | 'mid' | 'high';
  pressIntensity: number;
  tempo: number;
  width: number;
  risk: number;
}
export interface Side {
  clubId: string;
  formation: string;
  instructions: Instructions;
}
interface MatchEvent {
  id: number;
  kind: string;
  atMs: number;
  team: 0 | 1 | null;
  playerId?: string;
  data: Record<string, number>;
}
interface Message {
  key: string;
  params: Record<string, number | string | boolean>;
}
interface TeamStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  possession: number;
  passes: number;
  passesCompleted: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  corners: number;
}
export interface Chunk {
  frames: number[][];
  clocks: number[];
  events: MatchEvent[];
  finished: boolean;
  result: Result | null;
}
export type Command = {
  atMs: number;
  team: 0 | 1;
  command: { kind: 'team'; set: Partial<Instructions> };
};

/**
 * Where a match's frames come from: the API for the friendly, the career's worker in the
 * browser for a career match (ADR-020). Same answers either way.
 */
export interface MatchSource {
  chunk(from: number, count: number, commands: Command[]): Promise<Chunk>;
  moment(
    from: number,
    commands: Command[],
    mode: Exclude<Watch, 'full' | 'result'>,
  ): Promise<Moment>;
}

const TPS = 4;
const CHUNK = 1200;
const SPEEDS = [1, 2, 4, 8, 16] as const;
/** How to watch: the whole match, three cuts of moments, or straight to the report. */
export const WATCH = ['full', 'extended', 'highlights', 'goals', 'result'] as const;
export type Watch = (typeof WATCH)[number];
/** The next moment from a tick on, in the moment modes (the server simulates up to it). */
export interface Moment {
  frames: number[][];
  clocks: number[];
  chunk: Omit<Chunk, 'frames' | 'clocks'>;
}
export const PLAN: Instructions = { block: 'mid', pressIntensity: 3, tempo: 3, width: 3, risk: 3 };

/** Match minute shown on the scoreboard: the second half restarts at 45. */
function minuteOf(clock: number, events: MatchEvent[]) {
  const second = events.find((e) => e.kind === 'periodStart' && e.data.period === 2);
  if (second && clock >= second.atMs) return 46 + Math.floor((clock - second.atMs) / 60000);
  return Math.min(45, 1 + Math.floor(clock / 60000));
}

export function FriendlyPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [formations, setFormations] = useState<string[]>([]);
  const [home, setHome] = useState<Side | null>(null);
  const [away, setAway] = useState<Side | null>(null);
  const [stage, setStage] = useState<'setup' | 'match' | 'report'>('setup');
  const [watch, setWatch] = useState<Watch>('full');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [error, setError] = useState<string | null>(null);

  // The mode's own stage: night ground under the whole page while it is open.
  useEffect(() => {
    document.documentElement.classList.add('club-stage');
    return () => document.documentElement.classList.remove('club-stage');
  }, []);

  useEffect(() => {
    api<{ clubs: Club[]; formations: string[] }>('/v1/manager/friendly/clubs')
      .then((r) => {
        setClubs(r.clubs);
        setFormations(r.formations);
        setHome({ clubId: r.clubs[0]!.id, formation: '4-3-3', instructions: PLAN });
        setAway({ clubId: r.clubs[1]!.id, formation: '4-4-2', instructions: PLAN });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <GameHeader title={t('friendly.title')} />
      {error && <Notice title={t('friendly.loadError')}>{error}</Notice>}
      {stage === 'setup' && home && away && (
        <Setup
          clubs={clubs}
          formations={formations}
          home={home}
          away={away}
          setHome={setHome}
          setAway={setAway}
          watch={watch}
          setWatch={setWatch}
          onPlay={() => setStage('match')}
        />
      )}
      {stage !== 'setup' && home && away && (
        <Match
          key={seed}
          seed={seed}
          watch={watch}
          clubs={clubs}
          home={home}
          away={away}
          onAgain={() => {
            setSeed(Math.floor(Math.random() * 1e9));
            setStage('match');
          }}
          onChange={() => setStage('setup')}
        />
      )}
    </div>
  );
}

// ── Setup ───────────────────────────────────────────────────────────────────

const CREST = { md: 'sm', lg: 'lg' } as const;

function Crest({ club, size = 'md' }: { club: Club; size?: keyof typeof CREST }) {
  return <ClubBadge name={club.shortName} size={CREST[size]} colours={club.colours} />;
}

function Range({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        className="min-h-11 w-full accent-club-gold"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function PlanFields({
  value,
  onChange,
}: {
  value: Instructions;
  onChange: (v: Instructions) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <fieldset className="flex flex-col gap-1 text-sm">
        <legend>{t('friendly.block')}</legend>
        <div className="flex gap-2">
          {(['low', 'mid', 'high'] as const).map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={value.block === b}
              className={`${btnSecondary} flex-1 ${value.block === b ? 'border-club-gold text-club-gold' : ''}`}
              onClick={() => onChange({ ...value, block: b })}
            >
              {t('friendly.blockValue', { v: b })}
            </button>
          ))}
        </div>
      </fieldset>
      <Range
        label={t('friendly.press', { v: value.pressIntensity })}
        value={value.pressIntensity}
        onChange={(v) => onChange({ ...value, pressIntensity: v })}
      />
      <Range
        label={t('friendly.tempo', { v: value.tempo })}
        value={value.tempo}
        onChange={(v) => onChange({ ...value, tempo: v })}
      />
      <Range
        label={t('friendly.width', { v: value.width })}
        value={value.width}
        onChange={(v) => onChange({ ...value, width: v })}
      />
      <Range
        label={t('friendly.risk', { v: value.risk })}
        value={value.risk}
        onChange={(v) => onChange({ ...value, risk: v })}
      />
    </div>
  );
}

function SideCard(props: {
  title: string;
  clubs: Club[];
  formations: string[];
  side: Side;
  set: (s: Side) => void;
  plan: boolean;
}) {
  const { side, set } = props;
  const club = props.clubs.find((c) => c.id === side.clubId)!;
  return (
    <section
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-chalk/10 bg-club-panel/80 p-4 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.6)] sm:p-5"
      style={{ borderTop: `4px solid ${club.colours[0]}` }}
    >
      <p className="font-condensed text-sm font-extrabold tracking-widest text-chalk-soft uppercase">
        {props.title}
      </p>
      <label className="flex items-center gap-3">
        <Crest club={club} />
        <span className="sr-only">{t('friendly.club')}</span>
        <select
          value={side.clubId}
          onChange={(e) => set({ ...side, clubId: e.target.value })}
          className="min-h-11 min-w-0 flex-1 truncate rounded-lg border border-chalk/20 bg-club-night px-3 font-condensed text-lg font-extrabold uppercase sm:text-xl"
        >
          {props.clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1 text-sm">
        <legend>{t('friendly.formation')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {props.formations.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={side.formation === f}
              className={`${btnSecondary} px-2 leading-tight tabular-nums ${side.formation === f ? 'border-club-gold text-club-gold' : ''}`}
              onClick={() => set({ ...side, formation: f })}
            >
              {f}
            </button>
          ))}
        </div>
      </fieldset>
      {props.plan && (
        <PlanFields value={side.instructions} onChange={(i) => set({ ...side, instructions: i })} />
      )}
    </section>
  );
}

function Setup(props: {
  clubs: Club[];
  formations: string[];
  home: Side;
  away: Side;
  setHome: (s: Side) => void;
  setAway: (s: Side) => void;
  watch: Watch;
  setWatch: (w: Watch) => void;
  onPlay: () => void;
}) {
  const same = props.home.clubId === props.away.clubId;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-condensed text-sm font-extrabold tracking-widest text-club-gold uppercase">
          {t('friendly.kicker')}
        </p>
        <p className="max-w-2xl text-chalk-soft">{t('friendly.intro')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SideCard
          title={t('friendly.home')}
          clubs={props.clubs}
          formations={props.formations}
          side={props.home}
          set={props.setHome}
          plan
        />
        <SideCard
          title={t('friendly.away')}
          clubs={props.clubs}
          formations={props.formations}
          side={props.away}
          set={props.setAway}
          plan={false}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 font-condensed text-sm font-extrabold tracking-widest text-chalk-soft uppercase">
          {t('friendly.watch')}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {WATCH.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={props.watch === w}
              className={`${btnSecondary} px-2 leading-tight ${props.watch === w ? 'border-club-gold text-club-gold' : ''}`}
              onClick={() => props.setWatch(w)}
            >
              {t('friendly.watchValue', { v: w })}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className={`${btnPrimary} self-center px-10`}
        disabled={same}
        onClick={props.onPlay}
      >
        {t('friendly.play')}
      </button>
    </div>
  );
}

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';

// ── Match ───────────────────────────────────────────────────────────────────

export function Match(props: {
  seed: number;
  watch: Watch;
  clubs: Club[];
  home: Side;
  away: Side;
  /** The person's side (0 home, 1 away): their plan, their commands. */
  mine?: 0 | 1;
  /** Their strength minus ours, and the players' names by id: the full-time headline and scorers. */
  gap?: number;
  names?: Record<string, string>;
  source?: MatchSource;
  /** Called once when the result is known, before the report shows. */
  onFinished?: (result: Result) => void;
  onAgain?: () => void;
  onChange?: () => void;
  onDone?: () => void;
}) {
  const mine = props.mine ?? 0;
  const clubOf = (s: Side) => props.clubs.find((c) => c.id === s.clubId)!;
  const hc = clubOf(props.home);
  const ac = clubOf(props.away);
  const kits = useMemo(() => kitsFor(hc, ac), [hc, ac]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef({
    frames: [] as number[][],
    clocks: [] as number[],
    events: [] as MatchEvent[],
    head: 0,
    speed: props.watch === 'full' ? 8 : 2,
    /** Frame indexes where a new moment starts: no gliding across a cut. */
    cuts: [] as number[],
    paused: false,
    commands: [] as Command[],
    generation: 0,
    loading: false,
    finished: false,
    result: null as Result | null,
    skip: props.watch === 'result',
  });
  const [plan, setPlan] = useState<Instructions>(
    (mine === 0 ? props.home : props.away).instructions,
  );
  // The friendly asks the API; a career match passes its own source.
  const source = useMemo<MatchSource>(
    () =>
      props.source ?? {
        chunk: (from, count, commands) =>
          api<Chunk>('/v1/manager/friendly/advance', {
            method: 'POST',
            json: { seed: props.seed, home: props.home, away: props.away, from, count, commands },
          }),
        moment: (from, commands, mode) =>
          api<Moment>('/v1/manager/friendly/moment', {
            method: 'POST',
            json: { seed: props.seed, home: props.home, away: props.away, from, commands, mode },
          }),
      },
    // Fixed for this mount (keyed by seed).
    [],
  );
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(props.watch === 'full' ? 8 : 2);
  const [moment, setMoment] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [board, setBoard] = useState({
    score: [0, 0] as [number, number],
    minute: 1,
    feed: [] as string[],
  });
  const [result, setResult] = useState<Result | null>(null);
  const finished = useRef(false);
  /** The report shows once; the career hears about the result first. */
  const finish = (r: Result) => {
    if (finished.current) return;
    finished.current = true;
    props.onFinished?.(r);
    setResult(r);
  };
  const [error, setError] = useState<string | null>(null);
  const names: [string, string] = [hc.shortName, ac.shortName];
  const moments = props.watch !== 'full' && props.watch !== 'result';

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = sim.current;
    const still = motionReduced();
    let layer: HTMLCanvasElement | null = null;
    let v: View | null = null;
    let raf = 0;
    let last = performance.now();
    let shown = '';
    let waitingNow = false;

    // Both modes ask from the tick after the last frame held, with the plan changes so far.
    const load = () => {
      if (s.loading || s.finished) return;
      s.loading = true;
      const generation = s.generation;
      const from = s.skip ? 40000 : (s.frames.at(-1)?.[0] ?? -1) + 1;
      const done = (c: Omit<Chunk, 'frames' | 'clocks'>, frames: number[][], clocks: number[]) => {
        if (generation !== s.generation) return;
        if (!s.skip && frames.length > 0) {
          if (moments) s.cuts.push(s.frames.length);
          s.frames.push(...frames);
          s.clocks.push(...clocks);
        }
        s.events = c.events;
        s.finished = c.finished;
        s.result = c.result;
        // Nothing to show in this cut (a goalless match in "goals"): straight to the report.
        if (s.finished && s.frames.length < 2) s.skip = true;
      };
      const request =
        moments && !s.skip
          ? source
              .moment(from, s.commands, props.watch as Exclude<Watch, 'full' | 'result'>)
              .then((m) => done(m.chunk, m.frames, m.clocks))
          : source
              .chunk(from, s.skip ? 1 : CHUNK, s.commands)
              .then((c) => done(c, c.frames, c.clocks));
      request
        .catch((e: Error) => setError(e.message))
        .finally(() => {
          if (generation === s.generation) s.loading = false;
        });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const seconds = Math.min(0.1, (now - last) / 1000);
      last = now;
      // A moment is ~80 frames: keep the next one ready while this one plays.
      if (!s.finished && s.frames.length - s.head < (moments ? 160 : 600)) load();
      if (s.skip && s.result) {
        finish(s.result);
        cancelAnimationFrame(raf);
        return;
      }
      const width = canvas.clientWidth;
      if (width === 0) return; // not laid out yet
      // ponytail: at most 2.000 device pixels across, the blit is the frame cost on a wide screen.
      const dpr = Math.min(2, window.devicePixelRatio || 1, 2000 / width);
      if (canvas.width !== Math.round(width * dpr) || !layer || !v) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        layer = pitchLayer(canvas.width, canvas.height, kits[0]);
        v = view(canvas.width, canvas.height);
      }
      const behind = !s.finished && s.head >= s.frames.length - 1;
      if (behind !== waitingNow) setWaiting((waitingNow = behind));
      if (s.frames.length < 2) {
        ctx.drawImage(layer, 0, 0);
        return;
      }
      if (!s.paused) s.head = Math.min(s.frames.length - 1, s.head + seconds * TPS * s.speed);
      if (s.finished && s.head >= s.frames.length - 1 && s.result) {
        finish(s.result);
        cancelAnimationFrame(raf);
      }
      const head = still ? Math.floor(s.head / TPS) * TPS : s.head;
      const i = Math.floor(head);
      ctx.drawImage(layer, 0, 0);
      drawPlayers(
        ctx,
        v,
        s.frames[i]!,
        s.frames[s.cuts.includes(i + 1) ? i : Math.min(i + 1, s.frames.length - 1)]!,
        head - i,
        kits,
        still ? 0 : now,
      );
      const at = s.cuts.findLastIndex((c) => c <= i);
      const shownMoment = at < 0 ? '' : String(at + 1);

      // Scoreboard and feed: only what has happened by the frame on screen.
      const clock = s.clocks[i]!;
      const past = s.events.filter((e) => e.atMs <= clock);
      const score: [number, number] = [0, 0];
      for (const e of past) if (e.kind === 'goal' && e.team !== null) score[e.team]++;
      const minute = minuteOf(clock, s.events);
      const feed = past
        .filter((e) => ['goal', 'card', 'substitution', 'injury', 'command'].includes(e.kind))
        .slice(-8)
        .reverse()
        .map((e) => {
          const m = minuteOf(e.atMs, s.events);
          const team = e.team === null ? '' : names[e.team];
          const key: MessageKey =
            e.kind === 'goal'
              ? 'friendly.event.goal'
              : e.kind === 'card'
                ? e.data.card === 2
                  ? 'friendly.event.red'
                  : 'friendly.event.yellow'
                : e.kind === 'substitution'
                  ? 'friendly.event.sub'
                  : e.kind === 'injury'
                    ? 'friendly.event.injury'
                    : 'friendly.event.command';
          return t(key, { minute: m, team });
        });
      const key = `${score.join()}|${minute}|${feed.join()}|${shownMoment}`;
      if (key !== shown) {
        shown = key;
        setBoard({ score, minute, feed });
        setMoment(at < 0 ? null : at + 1);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // The match props are fixed for this mount (keyed by seed); the loop reads them once.
  }, []);

  /** The change counts from the minute on screen; later frames are simulated again. */
  function change(next: Instructions) {
    setPlan(next);
    const s = sim.current;
    if (s.frames.length === 0) return;
    const keep = Math.floor(s.head) + 1;
    const atMs = s.clocks[keep - 1]!;
    s.commands = [
      ...s.commands.filter((c) => c.atMs < atMs),
      { atMs, team: mine, command: { kind: 'team' as const, set: next } },
    ].slice(-60);
    s.frames.length = keep;
    s.clocks.length = keep;
    s.cuts = s.cuts.filter((c) => c < keep);
    s.generation++;
    s.loading = false;
    s.finished = false;
    s.result = null;
  }

  if (result)
    return (
      <Report
        result={result}
        clubs={[hc, ac]}
        events={sim.current.events}
        mine={mine}
        {...(props.gap !== undefined && { gap: props.gap })}
        {...(props.names && { names: props.names })}
        {...(props.onAgain && { onAgain: props.onAgain })}
        {...(props.onChange && { onChange: props.onChange })}
        {...(props.onDone && { onDone: props.onDone })}
      />
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      {error && (
        <div className="lg:col-span-2">
          <Notice title={t('friendly.loadError')}>{error}</Notice>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-3">
        <Scoreboard clubs={[hc, ac]} score={board.score} minute={board.minute} />
        <div className="relative overflow-hidden rounded-2xl bg-club-panel shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] ring-1 ring-chalk/10">
          <canvas
            ref={canvasRef}
            className="block aspect-[4/3] w-full sm:aspect-[100/56]"
            role="img"
            aria-label={t('friendly.pitchLabel', { home: hc.shortName, away: ac.shortName })}
          />
          {moment && (
            <span className="pointer-events-none absolute top-2 right-2 rounded-lg bg-club-night/90 px-2 py-1 font-condensed text-base font-extrabold text-club-gold uppercase tabular-nums sm:top-4 sm:right-4 sm:text-xl">
              {t('friendly.moment', { n: moment })}
            </span>
          )}
          {waiting && (
            <span
              role="status"
              className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-lg bg-club-night/90 px-3 py-1 text-sm text-chalk"
            >
              {t(moments ? 'friendly.preparingMoment' : 'friendly.preparing')}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              sim.current.paused = !paused;
              setPaused(!paused);
            }}
          >
            {t(paused ? 'friendly.resume' : 'friendly.pause')}
          </button>
          <div role="group" aria-label={t('friendly.speed')} className="flex gap-2">
            {SPEEDS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={speed === v}
                className={`${btnSecondary} px-3 tabular-nums sm:px-4 ${speed === v ? 'border-club-gold text-club-gold' : ''}`}
                onClick={() => {
                  sim.current.speed = v;
                  setSpeed(v);
                }}
              >
                {t('friendly.speedValue', { speed: v })}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`${btnSecondary} ml-auto`}
            onClick={() => {
              const s = sim.current;
              s.skip = true;
              s.generation++;
              s.loading = false;
              s.finished = false;
            }}
          >
            {t('friendly.skip')}
          </button>
        </div>
      </div>
      <aside className="sala-slab flex min-w-0 flex-col">
        <section className="sala-pane flex flex-col gap-3 p-4 sm:p-5">
          <h2 className={LABEL}>{t('friendly.feed')}</h2>
          <ol
            aria-live="polite"
            aria-label={t('friendly.feed')}
            className="flex min-h-24 flex-col text-sm text-chalk-soft"
          >
            {board.feed.length === 0 && <li>{t('friendly.feedEmpty')}</li>}
            {board.feed.map((f, i) => (
              <li
                key={f + i}
                className={`border-t border-chalk/10 py-2 first:border-0 first:pt-0 ${i === 0 ? 'font-bold text-chalk' : ''}`}
              >
                {f}
              </li>
            ))}
          </ol>
        </section>
        {props.watch !== 'result' && (
          <details className="sala-pane p-4 sm:p-5" open>
            <summary className={`${LABEL} min-h-11 cursor-pointer`}>
              {t('friendly.tactics')}
              <span className="mt-1 block font-sans text-sm leading-snug font-normal tracking-normal text-chalk-soft normal-case [font-stretch:100%]">
                {t('friendly.tacticsHint')}
              </span>
            </summary>
            <div className="pt-3 [&>div]:sm:grid-cols-1">
              <PlanFields value={plan} onChange={change} />
            </div>
          </details>
        )}
      </aside>
    </div>
  );
}

function Scoreboard({
  clubs,
  score,
  minute,
}: {
  clubs: [Club, Club];
  score: [number, number];
  minute: number;
}) {
  return (
    <div className="sala-slab grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 py-2 sm:gap-5 sm:px-5 sm:py-3">
      {clubs.map((c, i) => (
        <span
          key={c.id}
          className={`flex min-w-0 items-center gap-2 font-condensed text-xl leading-[0.95] font-black text-balance uppercase sm:gap-3 sm:text-2xl xl:text-3xl ${i === 0 ? 'flex-row-reverse text-right' : 'order-3'}`}
        >
          <Crest club={c} />
          <span className="truncate sm:hidden">{c.shortName}</span>
          <span className="hidden sm:inline">{c.name}</span>
        </span>
      ))}
      <span className="order-2 flex flex-col items-center gap-1">
        <span className="rounded-lg bg-club-gold px-3 font-condensed text-3xl leading-tight font-black text-ink tabular-nums sm:px-4 sm:text-5xl">
          {score[0]}–{score[1]}
        </span>
        <span className="font-condensed text-base leading-none font-extrabold text-chalk-soft tabular-nums">
          {t('friendly.clock', { minute })}
        </span>
      </span>
    </div>
  );
}

// ── Report ──────────────────────────────────────────────────────────────────

/** The engine reports a keeper below expectation as negative goals saved; say it the other way. */
export function signed(m: Message): Message {
  const saved = Number(m.params.saved);
  if (m.key !== 'match.explain.keeper' || !(saved < 0)) return m;
  return { key: 'match.explain.keeperConceded', params: { ...m.params, conceded: -saved } };
}

export interface Result {
  score: [number, number];
  stats: [TeamStats, TeamStats];
  explanation: { creation: number; conversion: number; factors: { message: Message }[] };
}

function Report(props: {
  result: Result;
  clubs: [Club, Club];
  events: MatchEvent[];
  mine: 0 | 1;
  gap?: number;
  names?: Record<string, string>;
  onAgain?: () => void;
  onChange?: () => void;
  /** A career match: back to the career instead of playing again. */
  onDone?: () => void;
}) {
  const { result, clubs } = props;
  const [a, b] = result.stats;
  // Goals and red cards by side, with the minute; the headline reads the last goal.
  const goals = props.events.filter((e) => e.kind === 'goal' && e.team !== null);
  const lines: [string[], string[]] = [[], []];
  for (const e of props.events) {
    const isGoal = e.kind === 'goal';
    if (e.team === null || !(isGoal || (e.kind === 'card' && e.data.card === 2))) continue;
    const minute = minuteOf(e.atMs, props.events);
    const name =
      (e.playerId && props.names?.[e.playerId]) ||
      t(isGoal ? 'friendly.goalWord' : 'friendly.redWord');
    lines[e.team].push(
      t(isGoal ? (e.data.own ? 'friendly.ownGoalAt' : 'friendly.goalAt') : 'friendly.redAt', {
        name,
        minute,
      }),
    );
  }
  const [mineGoals, theirGoals] =
    props.mine === 0 ? result.score : [result.score[1], result.score[0]];
  const lastGoal = goals.at(-1);
  const kind = headlineKind({
    mine: mineGoals,
    theirs: theirGoals,
    ...(props.gap !== undefined && { gap: props.gap }),
    late:
      !!lastGoal &&
      minuteOf(lastGoal.atMs, props.events) >= 85 &&
      lastGoal.team === (mineGoals > theirGoals ? props.mine : 1 - props.mine),
  });
  const acc = (s: TeamStats) => (s.passes ? s.passesCompleted / s.passes : 0);
  const rows: { key: MessageKey; v: [string, string]; n: [number, number] }[] = [
    {
      key: 'friendly.stat.possession',
      v: [t('friendly.percent', { v: a.possession }), t('friendly.percent', { v: b.possession })],
      n: [a.possession, b.possession],
    },
    { key: 'friendly.stat.shots', v: [`${a.shots}`, `${b.shots}`], n: [a.shots, b.shots] },
    {
      key: 'friendly.stat.onTarget',
      v: [`${a.shotsOnTarget}`, `${b.shotsOnTarget}`],
      n: [a.shotsOnTarget, b.shotsOnTarget],
    },
    {
      key: 'friendly.stat.xg',
      v: [
        t('friendly.decimal', { v: Math.round(a.xg * 100) / 100 }),
        t('friendly.decimal', { v: Math.round(b.xg * 100) / 100 }),
      ],
      n: [a.xg, b.xg],
    },
    { key: 'friendly.stat.passes', v: [`${a.passes}`, `${b.passes}`], n: [a.passes, b.passes] },
    {
      key: 'friendly.stat.passAccuracy',
      v: [t('friendly.percent', { v: acc(a) }), t('friendly.percent', { v: acc(b) })],
      n: [acc(a), acc(b)],
    },
    { key: 'friendly.stat.fouls', v: [`${a.fouls}`, `${b.fouls}`], n: [a.fouls, b.fouls] },
    {
      key: 'friendly.stat.corners',
      v: [`${a.corners}`, `${b.corners}`],
      n: [a.corners, b.corners],
    },
    {
      key: 'friendly.stat.cards',
      v: [`${a.yellowCards}/${a.redCards}`, `${b.yellowCards}/${b.redCards}`],
      n: [a.yellowCards + 2 * a.redCards, b.yellowCards + 2 * b.redCards],
    },
  ];
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <section className="sala-slab flex flex-col items-center gap-5 px-4 py-7 text-center sm:py-10">
        <h2 className="font-condensed text-3xl leading-[0.95] font-black text-balance uppercase sm:text-5xl">
          {t(`headline.${kind}`, { team: clubs[1 - props.mine]!.shortName })}
        </h2>
        <p className={LABEL}>{t('friendly.fullTime')}</p>
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-8">
          <span className="order-2 rounded-xl bg-club-gold px-4 font-condensed text-5xl leading-tight font-black whitespace-nowrap text-ink tabular-nums sm:px-6 sm:text-7xl">
            {result.score[0]}–{result.score[1]}
          </span>
          {clubs.map((c, i) => (
            <span
              key={c.id}
              className={`flex min-w-0 flex-col items-center gap-3 ${i === 0 ? 'order-1' : 'order-3'}`}
            >
              <Crest club={c} size="lg" />
              <span className="font-condensed text-xl leading-[0.95] font-black text-balance uppercase sm:text-3xl">
                <span className="sm:hidden">{c.shortName}</span>
                <span className="hidden sm:inline">{c.name}</span>
              </span>
            </span>
          ))}
        </div>
        {(lines[0].length > 0 || lines[1].length > 0) && (
          <div
            role="group"
            aria-label={t('friendly.events')}
            className="grid w-full grid-cols-2 gap-x-6 text-sm tabular-nums sm:text-base"
          >
            {lines.map((ls, i) => (
              <ul key={i} className={`flex flex-col gap-1 ${i === 0 ? 'text-right' : 'text-left'}`}>
                {ls.map((l, j) => (
                  <li key={j}>{l}</li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </section>
      <div className="sala-desk grid md:grid-cols-2">
        <section className="flex flex-col gap-3 p-4 sm:p-5">
          <h3 className={LABEL}>{t('friendly.report')}</h3>
          <p className="grid grid-cols-2 gap-2 font-condensed text-base font-extrabold uppercase">
            {clubs.map((c, i) => (
              <span
                key={c.id}
                className={`flex items-center gap-2 ${i === 1 ? 'justify-end' : ''}`}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: c.colours[0] }}
                />
                {c.shortName}
              </span>
            ))}
          </p>
          <dl className="flex flex-col gap-2">
            {rows.map((r) => {
              const total = r.n[0] + r.n[1] || 1;
              return (
                <div
                  key={r.key}
                  className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-sm tabular-nums"
                >
                  <dd className="text-right font-bold">{r.v[0]}</dd>
                  <div>
                    <dt className="text-center text-chalk-soft">
                      {r.key === 'friendly.stat.xg' ? (
                        <Term label={t(r.key)} help={t('help.xg')} />
                      ) : (
                        t(r.key)
                      )}
                    </dt>
                    <div
                      aria-hidden
                      className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-chalk/10"
                    >
                      <span
                        style={{
                          width: `${(r.n[0] / total) * 100}%`,
                          background: clubs[0].colours[0],
                        }}
                      />
                      <span
                        style={{
                          width: `${(r.n[1] / total) * 100}%`,
                          background: clubs[1].colours[0],
                        }}
                        className="ml-auto"
                      />
                    </div>
                  </div>
                  <dd className="font-bold">{r.v[1]}</dd>
                </div>
              );
            })}
          </dl>
        </section>
        <details className="flex flex-col gap-3 p-4 sm:p-5">
          <summary className={`${LABEL} cursor-pointer`}>{t('friendly.why')}</summary>
          {result.explanation.factors.length === 0 ? (
            <p className="text-chalk-soft">{t('friendly.noFactor')}</p>
          ) : (
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {result.explanation.factors.slice(0, 4).map((f, i) => (
                <li key={i}>{tMessage(signed(f.message))}</li>
              ))}
            </ol>
          )}
          <p className="text-sm text-chalk-soft">
            {t('friendly.creation', { v: result.explanation.creation })}
          </p>
          <p className="text-sm text-chalk-soft">
            {t('friendly.conversion', { v: result.explanation.conversion })}
          </p>
        </details>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {props.onDone && (
          <button
            type="button"
            className={`${btnPrimary} min-h-13 bg-club-gold px-10`}
            onClick={props.onDone}
          >
            {t('friendly.continue')}
          </button>
        )}
        {props.onAgain && (
          <button type="button" className={btnPrimary} onClick={props.onAgain}>
            {t('friendly.again')}
          </button>
        )}
        {props.onChange && (
          <button type="button" className={btnSecondary} onClick={props.onChange}>
            {t('friendly.change')}
          </button>
        )}
      </div>
    </div>
  );
}
