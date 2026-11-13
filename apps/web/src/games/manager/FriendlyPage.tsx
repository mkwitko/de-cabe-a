/**
 * Friendly match of corte 0,5 (TASKS MC-250, MC-262): pick two clubs, a plan,
 * watch on a night-match stage with a broadcast scoreboard, adjust the home
 * side live, read the report. The server simulates; this page only draws
 * (ADR-015). Frames never enter React state: the draw loop reads a ref.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { motionReduced } from '../../lib/settings';
import { btnPrimary, btnSecondary, GameHeader, Notice } from '../../components/ui';
import { t, tMessage, type MessageKey } from './i18n';
import { drawPlayers, LENGTH, pitchLayer, WIDTH, type Kit } from './pitch';

interface Club {
  id: string;
  name: string;
  shortName: string;
  colours: [string, string];
}
interface Instructions {
  block: 'low' | 'mid' | 'high';
  pressIntensity: number;
  tempo: number;
  width: number;
  risk: number;
}
interface Side {
  clubId: string;
  formation: string;
  instructions: Instructions;
}
interface MatchEvent {
  id: number;
  kind: string;
  atMs: number;
  team: 0 | 1 | null;
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
interface Result {
  score: [number, number];
  stats: [TeamStats, TeamStats];
  explanation: { creation: number; conversion: number; factors: { message: Message }[] };
}
interface Chunk {
  frames: number[][];
  clocks: number[];
  events: MatchEvent[];
  finished: boolean;
  result: Result | null;
}
type Command = { atMs: number; team: 0; command: { kind: 'team'; set: Partial<Instructions> } };

const TPS = 4;
const CHUNK = 1200;
const SPEEDS = [2, 4, 8, 16] as const;
const PLAN: Instructions = { block: 'mid', pressIntensity: 3, tempo: 3, width: 3, risk: 3 };

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
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [error, setError] = useState<string | null>(null);

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
          onPlay={() => setStage('match')}
        />
      )}
      {stage !== 'setup' && home && away && (
        <Match
          key={seed}
          seed={seed}
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

function Crest({ club }: { club: Club }) {
  return (
    <span
      aria-hidden
      className="inline-block size-9 shrink-0 rounded-md border-2 border-chalk/30"
      style={{
        background: `linear-gradient(135deg, ${club.colours[0]} 50%, ${club.colours[1]} 50%)`,
      }}
    />
  );
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
        className="min-h-11 w-full accent-cover"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function PlanFields({
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
              className={`${btnSecondary} flex-1 ${value.block === b ? 'border-cover text-cover' : ''}`}
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
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-chalk/10 bg-pitch-deep/80 p-4 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.6)] sm:p-5"
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
          className="min-h-11 min-w-0 flex-1 truncate rounded-lg border border-chalk/20 bg-pitch px-3 font-condensed text-lg font-extrabold uppercase sm:text-xl"
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
        <div className="flex gap-2">
          {props.formations.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={side.formation === f}
              className={`${btnSecondary} flex-1 tabular-nums ${side.formation === f ? 'border-cover text-cover' : ''}`}
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
  onPlay: () => void;
}) {
  const same = props.home.clubId === props.away.clubId;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-condensed text-sm font-extrabold tracking-widest text-gold uppercase">
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

// ── Match ───────────────────────────────────────────────────────────────────

function Match(props: {
  seed: number;
  clubs: Club[];
  home: Side;
  away: Side;
  onAgain: () => void;
  onChange: () => void;
}) {
  const clubOf = (s: Side) => props.clubs.find((c) => c.id === s.clubId)!;
  const hc = clubOf(props.home);
  const ac = clubOf(props.away);
  const kits = useMemo<[Kit, Kit]>(
    () => [
      { fill: hc.colours[0], edge: hc.colours[1] },
      { fill: ac.colours[0], edge: ac.colours[1] },
    ],
    [hc, ac],
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef({
    frames: [] as number[][],
    clocks: [] as number[],
    events: [] as MatchEvent[],
    head: 0,
    speed: 8,
    paused: false,
    commands: [] as Command[],
    generation: 0,
    loading: false,
    finished: false,
    result: null as Result | null,
    skip: false,
  });
  const [plan, setPlan] = useState<Instructions>(props.home.instructions);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [board, setBoard] = useState({
    score: [0, 0] as [number, number],
    minute: 1,
    feed: [] as string[],
  });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const names: [string, string] = [hc.shortName, ac.shortName];

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = sim.current;
    const still = motionReduced();
    let layer: HTMLCanvasElement | null = null;
    let raf = 0;
    let last = performance.now();
    let shown = '';

    const body = (from: number, count: number) => ({
      seed: props.seed,
      home: props.home,
      away: props.away,
      from,
      count,
      commands: s.commands,
    });
    const load = () => {
      if (s.loading || s.finished) return;
      s.loading = true;
      const generation = s.generation;
      const from = s.skip ? 40000 : (s.frames.at(-1)?.[0] ?? -1) + 1;
      api<Chunk>('/v1/manager/friendly/advance', {
        method: 'POST',
        json: body(from, s.skip ? 1 : CHUNK),
      })
        .then((c) => {
          if (generation !== s.generation) return;
          if (!s.skip) {
            s.frames.push(...c.frames);
            s.clocks.push(...c.clocks);
          }
          s.events = c.events;
          s.finished = c.finished;
          s.result = c.result;
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => {
          s.loading = false;
        });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const seconds = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!s.finished && s.frames.length - s.head < 600) load();
      if (s.skip && s.result) {
        setResult(s.result);
        cancelAnimationFrame(raf);
        return;
      }
      if (s.frames.length < 2) return;
      if (!s.paused) s.head = Math.min(s.frames.length - 1, s.head + seconds * TPS * s.speed);
      if (s.finished && s.head >= s.frames.length - 1 && s.result) {
        setResult(s.result);
        cancelAnimationFrame(raf);
      }

      const width = canvas.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(width * dpr) || !layer) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(((width * WIDTH) / LENGTH) * dpr);
        layer = pitchLayer(canvas.width, canvas.height);
      }
      const k = canvas.width / LENGTH;
      const head = still ? Math.floor(s.head / TPS) * TPS : s.head;
      const i = Math.floor(head);
      ctx.drawImage(layer, 0, 0);
      drawPlayers(
        ctx,
        k,
        s.frames[i]!,
        s.frames[Math.min(i + 1, s.frames.length - 1)]!,
        head - i,
        kits,
      );

      // Scoreboard and feed: only what has happened by the frame on screen.
      const clock = s.clocks[i]!;
      const past = s.events.filter((e) => e.atMs <= clock);
      const score: [number, number] = [0, 0];
      for (const e of past) if (e.kind === 'goal' && e.team !== null) score[e.team]++;
      const minute = minuteOf(clock, s.events);
      const feed = past
        .filter((e) => ['goal', 'card', 'substitution', 'injury', 'command'].includes(e.kind))
        .slice(-4)
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
      const key = `${score.join()}|${minute}|${feed.join()}`;
      if (key !== shown) {
        shown = key;
        setBoard({ score, minute, feed });
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
      { atMs, team: 0 as const, command: { kind: 'team' as const, set: next } },
    ].slice(-60);
    s.frames.length = keep;
    s.clocks.length = keep;
    s.generation++;
    s.loading = false;
    s.finished = false;
    s.result = null;
  }

  if (result)
    return (
      <Report result={result} clubs={[hc, ac]} onAgain={props.onAgain} onChange={props.onChange} />
    );

  return (
    <div className="flex flex-col gap-3">
      {error && <Notice title={t('friendly.loadError')}>{error}</Notice>}
      <div className="relative overflow-hidden rounded-2xl bg-pitch-deep shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] ring-1 ring-chalk/10">
        <canvas
          ref={canvasRef}
          className="block aspect-[105/68] w-full"
          role="img"
          aria-label={t('friendly.pitchLabel', { home: hc.shortName, away: ac.shortName })}
        />
        <Scoreboard clubs={[hc, ac]} score={board.score} minute={board.minute} />
      </div>
      <ol
        aria-live="polite"
        aria-label={t('friendly.feed')}
        className="flex min-h-6 flex-wrap gap-x-4 gap-y-1 text-sm text-chalk-soft"
      >
        {board.feed.map((f, i) => (
          <li key={f + i} className={i === 0 ? 'font-bold text-chalk' : ''}>
            {f}
          </li>
        ))}
      </ol>
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
              className={`${btnSecondary} tabular-nums ${speed === v ? 'border-cover text-cover' : ''}`}
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
      <details className="rounded-2xl border border-chalk/10 bg-pitch-deep/70 p-4" open>
        <summary className="min-h-11 cursor-pointer font-condensed text-xl font-extrabold uppercase">
          {t('friendly.tactics')}{' '}
          <span className="font-sans text-sm font-normal normal-case text-chalk-soft">
            · {t('friendly.tacticsHint')}
          </span>
        </summary>
        <div className="pt-3">
          <PlanFields value={plan} onChange={change} />
        </div>
      </details>
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
    <div className="pointer-events-none absolute top-2 left-2 flex items-stretch overflow-hidden rounded-lg bg-[oklch(0.15_0.03_155/0.88)] font-condensed text-base font-extrabold uppercase shadow-lg sm:top-4 sm:left-4 sm:text-xl">
      {clubs.map((c, i) => (
        <span
          key={c.id}
          className={`flex items-center gap-2 px-2 sm:px-3 ${i === 1 ? 'order-3' : ''}`}
        >
          <span aria-hidden className="h-5 w-1.5 rounded-sm" style={{ background: c.colours[0] }} />
          {c.shortName}
        </span>
      ))}
      <span className="order-2 flex items-center bg-cover px-2 text-ink tabular-nums sm:px-3">
        {score[0]}–{score[1]}
      </span>
      <span className="order-4 flex items-center bg-chalk/10 px-2 tabular-nums sm:px-3">
        {t('friendly.clock', { minute })}
      </span>
    </div>
  );
}

// ── Report ──────────────────────────────────────────────────────────────────

function Report(props: {
  result: Result;
  clubs: [Club, Club];
  onAgain: () => void;
  onChange: () => void;
}) {
  const { result, clubs } = props;
  const [a, b] = result.stats;
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
    { key: 'friendly.stat.xg', v: [a.xg.toFixed(2), b.xg.toFixed(2)], n: [a.xg, b.xg] },
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
    <div className="flex flex-col gap-5">
      <section className="flex flex-col items-center gap-2 rounded-2xl bg-pitch-deep/80 p-6 ring-1 ring-chalk/10">
        <p className="font-condensed text-sm font-extrabold tracking-widest text-gold uppercase">
          {t('friendly.fullTime')}
        </p>
        <p className="flex items-center gap-2 font-condensed text-2xl font-extrabold whitespace-nowrap uppercase sm:gap-4 sm:text-5xl">
          <Crest club={clubs[0]} /> {clubs[0].shortName}
          <span className="rounded-lg bg-cover px-3 text-ink tabular-nums">
            {result.score[0]}–{result.score[1]}
          </span>
          {clubs[1].shortName} <Crest club={clubs[1]} />
        </p>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-2xl bg-pitch-deep/70 p-4 ring-1 ring-chalk/10">
          <h2 className="font-condensed text-xl font-extrabold uppercase">
            {t('friendly.report')}
          </h2>
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
                    <dt className="text-center text-chalk-soft">{t(r.key)}</dt>
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
        <section className="flex flex-col gap-3 rounded-2xl bg-pitch-deep/70 p-4 ring-1 ring-chalk/10">
          <h2 className="font-condensed text-xl font-extrabold uppercase">{t('friendly.why')}</h2>
          {result.explanation.factors.length === 0 ? (
            <p className="text-chalk-soft">{t('friendly.noFactor')}</p>
          ) : (
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {result.explanation.factors.slice(0, 4).map((f, i) => (
                <li key={i}>{tMessage(f.message)}</li>
              ))}
            </ol>
          )}
          <p className="text-sm text-chalk-soft">
            {t('friendly.creation', { v: result.explanation.creation })}
          </p>
          <p className="text-sm text-chalk-soft">
            {t('friendly.conversion', { v: result.explanation.conversion })}
          </p>
        </section>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className={btnPrimary} onClick={props.onAgain}>
          {t('friendly.again')}
        </button>
        <button type="button" className={btnSecondary} onClick={props.onChange}>
          {t('friendly.change')}
        </button>
      </div>
    </div>
  );
}
