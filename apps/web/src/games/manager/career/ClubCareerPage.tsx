/**
 * Modo Clube career (MC-176, MC-177): start by picking any club of the national divisions or
 * by one of three offers from the last one; then the career home. The world is built in the
 * browser by a worker (ADR-020); the server only keeps the record and the seed.
 */
import { SeasonReview } from './SeasonReview';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, apiFetch } from '../../../lib/api';
import { btnPrimary, btnSecondary, GameHeader, Notice } from '../../../components/ui';
import { t } from '../i18n';
import type { ClubFace, InboxItem, MatchClub, SimReply, SimRequest, SimView } from './sim.worker';
import { Squad } from './Squad';
import { Training } from './Training';
import { Market } from './Market';
import { Board, type WorkSaid, Fired } from './Board';
import {
  Match,
  PLAN,
  type Chunk,
  type Instructions,
  type MatchSource,
  type Moment,
  type Watch,
} from '../FriendlyPage';

interface ClubOption {
  id: string;
  name: string;
  shortName: string;
  colours: [string, string];
  reputation: number;
}
const AXES = ['budget', 'crowd', 'structure', 'staff', 'squad', 'ambition'] as const;
type Axis = (typeof AXES)[number];
const VENUE = ['away', 'home'] as const;
const ROOMS = ['sala', 'vestiario', 'treino', 'mercado', 'diretoria'] as const;
type Plate = Room | 'campo' | 'olheiro';
/** A room whose plate has another name: the market happens in the scouts' office. */
const PLATE: Partial<Record<string, Plate>> = { mercado: 'olheiro' };
/** Rooms whose portrait plate is not drawn yet use the landscape one on every screen. */
const NO_PORTRAIT: readonly string[] = [];
const STILL = '&still=1';
const DEFAULT_FORMATION = '4-3-3';
type Room = (typeof ROOMS)[number];
const COLS = ['pos', 'club', 'played', 'gd', 'points'] as const;
interface Options {
  packId: string;
  packVersion: string;
  divisions: { id: string; name: string; tier: number; clubs: ClubOption[] }[];
  offers: (ClubOption & { profile: Record<Axis, number> })[];
}
interface Career {
  id: string;
  clubId: string;
  startMode: 'free_choice' | 'job_offers';
  packId: string;
  packVersion: string;
  seed: number;
  season: number;
  day: number;
}

export function ClubCareerPage() {
  const [career, setCareer] = useState<Career | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('club-stage');
    return () => document.documentElement.classList.remove('club-stage');
  }, []);
  useEffect(() => {
    api<{ career: Career | null }>('/v1/manager/career')
      .then((r) => setCareer(r.career))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <GameHeader title={t('career.title')} />
      {error && <Notice title={t('career.loadError')}>{error}</Notice>}
      {career === null && <Start onStarted={setCareer} onError={setError} />}
      {career && <Home career={career} onEnded={() => setCareer(null)} />}
    </div>
  );
}

/** Text that reads on a club colour: ink on light colours, chalk on dark ones. */
function inkOn(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const y = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return y > 150 ? 'text-ink' : 'text-chalk';
}

const CREST = {
  sm: 'size-6 border-2 text-[0.55rem]',
  md: 'size-10 border-[3px] text-xs',
  lg: 'size-14 border-4 text-base',
  xl: 'size-16 border-4 text-lg sm:size-24 sm:border-[5px] sm:text-2xl',
} as const;

/** A club is a round colour badge with its initials, never a logo (DESIGN.md). */
function Crest({ club, size = 'md' }: { club: ClubFace; size?: keyof typeof CREST }) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-condensed leading-none font-black tracking-tight shadow-[0_4px_10px_-4px_rgb(0_0_0/0.7)] ${CREST[size]} ${inkOn(club.colours[0])}`}
      style={{ background: club.colours[0], borderColor: club.colours[1] }}
    >
      {club.shortName}
    </span>
  );
}

/** The two clubs' colours as hard kit slabs from each side, under a night veil. */
const slabs = (a: ClubFace, b: ClubFace) => ({
  background: `linear-gradient(105deg, ${a.colours[0]} 0 30%, ${a.colours[1]} 30% 32%, transparent 32% 68%, ${b.colours[1]} 68% 70%, ${b.colours[0]} 70%)`,
});

// ── Start ───────────────────────────────────────────────────────────────────

function Start(props: { onStarted: (c: Career) => void; onError: (m: string) => void }) {
  const [options, setOptions] = useState<Options | null>(null);
  const [mode, setMode] = useState<'job_offers' | 'free_choice'>('job_offers');
  const [division, setDivision] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Options>('/v1/manager/career/options')
      .then(setOptions)
      .catch((e: Error) => props.onError(e.message));
  }, [props]);

  const start = (clubId: string) => {
    setBusy(true);
    api<{ career: Career }>('/v1/manager/career', {
      method: 'POST',
      json: { startMode: mode, clubId },
    })
      .then((r) => props.onStarted(r.career))
      .catch((e: Error) => {
        props.onError(e.message);
        setBusy(false);
      });
  };

  if (!options) return null;
  const segment = (on: boolean) =>
    `min-h-11 flex-1 rounded-lg px-2 font-condensed text-sm leading-tight font-extrabold uppercase sm:px-3 sm:text-lg ${on ? 'bg-club-gold text-ink' : 'text-chalk-soft hover:text-chalk'}`;
  return (
    <section className="sala-glass flex flex-col gap-5">
      <Scene plate="campo" />
      <div className="flex flex-col gap-3 pt-[min(12svh,6rem)] md:flex-row md:items-end md:justify-between">
        <h2 className="font-condensed text-4xl leading-[0.9] font-black text-balance uppercase sm:text-6xl">
          {t('career.startTitle')}
        </h2>
        <div
          role="group"
          aria-label={t('career.startTitle')}
          className="flex gap-1 rounded-xl bg-club-night p-1 ring-1 ring-chalk/15 md:w-[28rem]"
        >
          {(['job_offers', 'free_choice'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              className={segment(mode === m)}
              onClick={() => setMode(m)}
            >
              {t('career.mode', { m })}
            </button>
          ))}
        </div>
      </div>
      <p className="max-w-[48ch] text-lg text-chalk">{t('career.modeHint', { m: mode })}</p>

      {mode === 'job_offers' && (
        <ul className="grid gap-4 md:grid-cols-3">
          {options.offers.map((o) => (
            <li key={o.id} className="sala-slab flex flex-col overflow-hidden [text-shadow:none]">
              <div className="relative h-20" style={slabs(o, o)}>
                <span className="absolute -bottom-7 left-4">
                  <Crest club={o} size="lg" />
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-9">
                <div>
                  <p className="font-condensed text-2xl leading-tight font-extrabold uppercase">
                    {o.name}
                  </p>
                  <p className="text-sm text-chalk-soft">
                    {t('career.reputation', { n: o.reputation })}
                  </p>
                </div>
                <dl className="grid grid-cols-[auto_1fr_3ch] items-center gap-x-3 gap-y-2 text-sm">
                  {AXES.map((a) => (
                    <div key={a} className="contents">
                      <dt className="text-chalk-soft">{t('career.axis', { a })}</dt>
                      <dd
                        role="meter"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={o.profile[a]}
                        aria-label={t('career.axisValue', { a, n: o.profile[a] })}
                        className="h-1.5 overflow-hidden rounded-full bg-chalk/12"
                      >
                        <span
                          className="block h-full rounded-full bg-club-gold"
                          style={{ width: `${o.profile[a]}%` }}
                        />
                      </dd>
                      <dd aria-hidden className="text-right font-bold tabular-nums">
                        {o.profile[a]}
                      </dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  disabled={busy}
                  className={`${btnPrimary} mt-auto`}
                  onClick={() => start(o.id)}
                >
                  {t('career.accept', { club: o.shortName })}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mode === 'free_choice' && (
        <div className="flex flex-col gap-4">
          <div
            role="group"
            aria-label={t('career.divisions')}
            className="flex gap-1 overflow-x-auto rounded-xl bg-club-night p-1 ring-1 ring-chalk/15"
          >
            {options.divisions.map((d, i) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={division === i}
                className={`${segment(division === i)} shrink-0 whitespace-nowrap`}
                onClick={() => setDivision(i)}
              >
                {d.name}
              </button>
            ))}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {options.divisions[division]!.clubs.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={busy}
                  className="sala-slab flex min-h-14 w-full items-center gap-3 p-2.5 text-left [text-shadow:none] hover:ring-2 hover:ring-club-gold focus-visible:ring-2 focus-visible:ring-club-gold"
                  onClick={() => start(c.id)}
                >
                  <Crest club={c} />
                  <span className="min-w-0 flex-1 truncate font-bold">{c.name}</span>
                  <span className="text-sm text-chalk-soft tabular-nums">
                    {t('career.reputation', { n: c.reputation })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Home ────────────────────────────────────────────────────────────────────

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Ask = (req: DistributiveOmit<SimRequest, 'id'>) => Promise<SimReply>;

function Home({ career, onEnded }: { career: Career; onEnded: () => void }) {
  const [sim, setSim] = useState<SimView | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [watching, setWatching] = useState<{
    watch: Watch;
    home: MatchClub;
    away: MatchClub;
    mine: 0 | 1;
    formation: string;
    plan: Instructions;
    key: number;
  } | null>(null);

  // What every step answers: the server keeps the day and the snapshot, then the screen moves.
  // Snapshots go to the server one at a time, in the order they were made: two sent at once
  // could land out of order and the older one would be what stays.
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const put = (save: NonNullable<SimReply['save']>, still: boolean) => {
    const sent = saving.current.then(() =>
      api(
        `/v1/manager/career/world?from=${save.from}&to=${save.to}&season=${save.season}${still ? STILL : ''}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/octet-stream' },
          body: save.bytes,
        },
      ),
    );
    saving.current = sent.catch(() => undefined);
    return sent;
  };
  const apply = async (reply: SimReply) => {
    if (reply.save) await put(reply.save, reply.save.still === true);
    if (reply.view) setSim(reply.view);
    setBusy(false);
  };

  useEffect(() => {
    const w = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
    const waiting = new Map<number, (r: SimReply) => void>();
    let seq = 0;
    w.onmessage = (e: MessageEvent<SimReply>) => {
      waiting.get(e.data.id)?.(e.data);
      waiting.delete(e.data.id);
    };
    const call: Ask = (req) =>
      new Promise((resolve, reject) => {
        const id = ++seq;
        waiting.set(id, (r) => (r.error !== undefined ? reject(new Error(r.error)) : resolve(r)));
        w.postMessage({ ...req, id }, req.type === 'open' ? [req.snapshot] : []);
      });
    setAsk(() => call);
    apiFetch('/v1/manager/career/world')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((snapshot) =>
        call({
          type: 'open',
          packId: career.packId,
          packVersion: career.packVersion,
          seed: career.seed,
          clubId: career.clubId,
          snapshot,
        }),
      )
      .then(apply)
      .catch((err: Error) => setError(err.message));
    return () => w.terminate();
  }, [career]);

  // A line-up pick: the same day's snapshot. A later step already carries it, so a pick that
  // arrives after the day moved is not an error.
  const keep = useCallback((reply: SimReply) => {
    if (reply.save) put(reply.save, true).catch(() => undefined);
  }, []);

  // A transfer: the snapshot is kept and the hub shows the new cash and squad.
  const deal = useCallback(
    (reply: SimReply) => {
      keep(reply);
      if (reply.view) setSim(reply.view);
    },
    [keep],
  );

  const step = (type: 'play' | 'nextSeason') => {
    if (!ask) return;
    setBusy(true);
    ask({ type })
      .then(apply)
      .catch((err: Error) => setError(err.message));
  };

  const [tunnel, setTunnel] = useState(false);
  const [workSaid, setWorkSaid] = useState<WorkSaid>(null);
  const [room, setRoom] = useState<Room>('sala');
  const watch = (mode: Watch) => {
    if (!ask) return;
    setBusy(true);
    setTunnel(true);
    // The walk out of the tunnel covers the worker getting the match ready; never shorter.
    const walk = new Promise((r) => setTimeout(r, reducedMotion() ? 300 : 1100));
    Promise.all([ask({ type: 'matchStart' }), walk])
      .then(([r]) => {
        if (!r.match) throw new Error('no match');
        setWatching({ watch: mode, ...r.match, key: Date.now() });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setTunnel(false));
  };

  // The club's colour lights the stage behind every panel.
  const colour = sim?.club.colours[0];
  useEffect(() => {
    if (!colour) return;
    const root = document.documentElement;
    root.style.setProperty('--club-a', colour);
    return () => {
      root.style.removeProperty('--club-a');
    };
  }, [colour]);

  const source = useMemo<MatchSource | null>(
    () =>
      ask && {
        chunk: (from, count, commands) =>
          ask({ type: 'matchChunk', from, count, commands }).then(
            (r) => r.chunk as unknown as Chunk,
          ),
        moment: (from, commands, mode) =>
          ask({ type: 'matchMoment', from, commands, mode }).then(
            (r) => r.moment as unknown as Moment,
          ),
      },
    [ask],
  );

  if (error) return <Notice title={t('career.loadError')}>{error}</Notice>;
  if (watching && source && ask)
    return (
      <Match
        key={watching.key}
        seed={0}
        watch={watching.watch}
        clubs={[watching.home, watching.away]}
        home={{
          clubId: watching.home.id,
          formation: watching.mine === 0 ? watching.formation : DEFAULT_FORMATION,
          instructions: watching.mine === 0 ? watching.plan : PLAN,
        }}
        away={{
          clubId: watching.away.id,
          formation: watching.mine === 1 ? watching.formation : DEFAULT_FORMATION,
          instructions: watching.mine === 1 ? watching.plan : PLAN,
        }}
        mine={watching.mine}
        source={source}
        onFinished={() => {
          ask({ type: 'matchFinish' })
            .then(apply)
            .catch((err: Error) => setError(err.message));
        }}
        onDone={() => setWatching(null)}
      />
    );
  if (!sim)
    return (
      <p role="status" className="text-chalk-soft">
        {t('career.computing')}
      </p>
    );
  if (sim.board.fired)
    return (
      <Fired
        club={sim.club.name}
        offers={sim.board.offers}
        busy={busy}
        onTake={(clubId) => {
          if (!ask) return;
          setBusy(true);
          ask({ type: 'takeJob', clubId })
            .then(apply)
            .catch((err: Error) => {
              setBusy(false);
              setError(err.message);
            });
        }}
        onRestart={() =>
          api('/v1/manager/career/end', { method: 'POST' })
            .then(onEnded)
            .catch((err: Error) => setError(err.message))
        }
      />
    );
  const net = sim.money.reduce((sum, m) => sum + m.amount, 0);
  const biggest = Math.max(1, ...sim.money.map((m) => Math.abs(m.amount)));
  return (
    <div className="flex flex-col gap-5">
      <Scene plate={PLATE[room] ?? room} />
      {tunnel && sim.next && <Tunnel home={sim.next.home} away={sim.next.away} />}
      <ClubBar sim={sim} />
      {sim.board.offers.map((o) => (
        <aside
          key={o.clubId}
          aria-label={t('career.approach', { club: o.name })}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-club-gold/40 p-3"
        >
          <p className="min-w-0 flex-1">
            {t('career.approachText', { club: o.name, division: o.division })}
          </p>
          <button
            type="button"
            disabled={busy || !ask}
            className="min-h-11 rounded-lg bg-club-gold px-4 font-bold text-ink"
            onClick={() => {
              if (!ask) return;
              setBusy(true);
              ask({ type: 'takeJob', clubId: o.clubId })
                .then(apply)
                .catch((err: Error) => {
                  setBusy(false);
                  setError(err.message);
                });
            }}
          >
            {t('career.approachTake', { club: o.name })}
          </button>
        </aside>
      ))}
      <nav
        aria-label={t('career.rooms')}
        className="sala-rooms flex max-w-full gap-1 self-start overflow-x-auto p-1"
      >
        {ROOMS.map((r) => (
          <button
            key={r}
            type="button"
            aria-current={room === r ? 'page' : undefined}
            className={`min-h-11 shrink-0 rounded-lg px-4 font-condensed text-lg font-extrabold whitespace-nowrap uppercase ${room === r ? 'bg-club-gold text-ink' : 'text-chalk hover:bg-chalk/10'}`}
            onClick={() => setRoom(r)}
          >
            {t('career.room', { r })}
          </button>
        ))}
      </nav>
      {room === 'diretoria' && (
        <Board
          sim={sim}
          busy={busy}
          said={workSaid}
          onWork={
            ask
              ? (front) => {
                  setBusy(true);
                  ask({ type: 'work', front })
                    .then((reply) => {
                      deal(reply);
                      if (reply.work) setWorkSaid(reply.work);
                    })
                    .catch((err: Error) => setError(err.message))
                    .finally(() => setBusy(false));
                }
              : undefined
          }
        />
      )}
      {room === 'mercado' && ask && <Market ask={ask} onError={setError} onDeal={deal} />}
      {room === 'treino' && ask && <Training ask={ask} onError={setError} onPicked={keep} />}
      {room === 'vestiario' && ask && <Squad ask={ask} onError={setError} onPicked={keep} />}
      {room === 'sala' && (
        <>
          {sim.turn && (
            <p
              aria-live="polite"
              className="mx-auto w-fit max-w-full rounded-lg bg-club-night/90 px-4 py-2 text-center text-lg"
            >
              {t('career.turn', {
                season: sim.turn.season,
                champion: sim.turn.champion,
                move: sim.turn.move,
              })}
            </p>
          )}
          <NextMatch
            sim={sim}
            busy={busy}
            onWatch={watch}
            onPlay={() => step('play')}
            onNextSeason={() => step('nextSeason')}
            onMarket={() => setRoom('mercado')}
          />
          <section className="sala-desk grid min-w-0 lg:grid-cols-[1.15fr_1fr_1fr]">
            <Table sim={sim} clubId={sim.clubId} />
            <div className="flex min-w-0 flex-col">
              <Form sim={sim} />
              <Fixtures sim={sim} />
              <Inbox sim={sim} />
            </div>
            <section className={PANEL}>
              <h3 className={LABEL}>{t('career.money', { season: sim.season })}</h3>
              <dl className="flex flex-col gap-2.5 tabular-nums">
                {sim.money.map((m) => (
                  <div key={m.kind} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                    <dt className="text-chalk-soft">{t('career.moneyKind', { k: m.kind })}</dt>
                    <dd className={m.amount < 0 ? 'text-club-danger' : ''}>
                      {t('career.cash', { value: m.amount })}
                    </dd>
                    <dd aria-hidden className="col-span-2 h-1 rounded-full bg-chalk/10">
                      <span
                        className={`block h-full rounded-full ${m.amount < 0 ? 'bg-club-danger' : 'bg-club-gold'}`}
                        style={{ width: `${(Math.abs(m.amount) / biggest) * 100}%` }}
                      />
                    </dd>
                  </div>
                ))}
                <div className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 border-t border-chalk/15 pt-3 font-condensed text-xl font-extrabold uppercase">
                  <dt>{t('career.net')}</dt>
                  <dd className={net < 0 ? 'text-club-danger' : 'text-club-gold'}>
                    {t('career.cash', { value: net })}
                  </dd>
                </div>
              </dl>
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-chalk/15 pt-3 text-sm tabular-nums">
                {sim.fx.map((x) => (
                  <Fragment key={x.currency}>
                    <dt className="text-chalk-soft">{t('career.fx', { c: x.currency })}</dt>
                    <dd>{t('career.fxRate', { rate: x.rate, change: x.change / 10 })}</dd>
                  </Fragment>
                ))}
              </dl>
            </section>
          </section>
        </>
      )}
      <p className="text-xs text-chalk-soft/80">{t('career.builtHere', { ms: sim.ms })}</p>
    </div>
  );
}

const PANEL = 'sala-pane flex min-w-0 flex-col gap-3 p-4 sm:p-5';
const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const RESULT_TONE = {
  W: 'bg-club-turf text-chalk',
  D: 'bg-club-slate text-ink',
  L: 'bg-club-danger text-chalk',
} as const;

/** One still plate behind the whole page: the coach's office (hub) or the pitch (start). */
function Scene({ plate }: { plate: Plate }) {
  return (
    <div aria-hidden className="sala-scene">
      <picture>
        {!NO_PORTRAIT.includes(plate) && (
          <source media="(orientation: portrait)" srcSet={`/img/clube/${plate}-v.webp`} />
        )}
        <img src={`/img/clube/${plate}-h.webp`} alt="" decoding="async" fetchPriority="high" />
      </picture>
    </div>
  );
}

/** Who and when, set on the office wall above the window: the club, the day, the cash. */
function ClubBar({ sim }: { sim: SimView }) {
  return (
    <header className="sala-bar flex flex-wrap items-center gap-x-4 gap-y-2">
      <Crest club={sim.club} size="lg" />
      <div className="min-w-0 flex-1">
        <h2 className="font-condensed text-3xl leading-[0.9] font-black text-balance uppercase sm:text-4xl">
          {sim.club.name}
        </h2>
        <p className="mt-1 text-sm font-semibold text-chalk/85">
          {t('career.where', { division: sim.division, season: sim.season })}
        </p>
      </div>
      <dl className="flex basis-full justify-between gap-5 sm:basis-auto sm:text-right">
        <div>
          <dt className="text-xs font-semibold text-chalk/75">{t('career.today')}</dt>
          <dd className="font-condensed text-xl leading-tight font-extrabold uppercase">
            {t('career.dateLong', { d: new Date(`${sim.today}T12:00:00Z`) })}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-chalk/75">{t('career.cashLabel')}</dt>
          <dd
            className={`font-condensed text-xl leading-tight font-extrabold tabular-nums ${sim.cash < 0 ? 'text-club-danger' : 'text-club-gold'}`}
          >
            {t('career.cash', { value: sim.cash })}
          </dd>
        </div>
      </dl>
    </header>
  );
}

/**
 * The next match, lettered on the office window over the lit pitch. The plate behind is still;
 * the two badges and the names arrive once per fixture.
 */
function NextMatch(props: {
  sim: SimView;
  busy: boolean;
  onWatch: (w: Watch) => void;
  onPlay: () => void;
  onNextSeason: () => void;
  onMarket: () => void;
}) {
  const { sim, busy } = props;
  const next = sim.next;
  if (sim.deadline)
    return (
      <section aria-labelledby="career-next" className="sala-window flex flex-col justify-end">
        <div className="sala-glass mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center">
          <h3
            id="career-next"
            className="font-condensed text-3xl leading-none font-black text-club-gold uppercase sm:text-5xl"
          >
            {t('career.deadline')}
          </h3>
          <p className="text-balance">
            {t('career.deadlineText', { d: new Date(`${sim.deadline}T12:00:00Z`) })}
          </p>
          <div className="grid w-full max-w-md grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              className={`${btnPrimary} min-h-13 bg-club-gold`}
              onClick={props.onMarket}
            >
              {t('career.deadlineMarket')}
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${btnSecondary} bg-club-night/80`}
              onClick={props.onPlay}
            >
              {t('career.deadlineGo')}
            </button>
          </div>
        </div>
      </section>
    );
  return (
    <section
      key={next?.iso ?? 'over'}
      aria-labelledby="career-next"
      className="sala-window flex flex-col justify-end"
    >
      <h3 id="career-next" className="sr-only">
        {t('career.next')}
      </h3>
      {next ? (
        <div className="sala-glass mx-auto flex w-full max-w-4xl flex-col items-center gap-5">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            {[next.home, next.away].map((c, k) => (
              <div
                key={c.shortName}
                className={`sala-side flex min-w-0 items-center gap-3 sm:gap-4 ${k === 0 ? 'order-1 flex-col sm:flex-row-reverse sm:text-right' : 'order-3 flex-col [animation-delay:140ms] sm:flex-row'}`}
              >
                <Crest club={c} size="xl" />
                <span className="font-condensed text-3xl leading-[0.9] font-black text-balance uppercase sm:text-5xl">
                  <span className="sm:hidden">{c.shortName}</span>
                  <span className="hidden sm:inline">{c.name}</span>
                </span>
              </div>
            ))}
            <span
              aria-hidden
              className="order-2 font-condensed text-4xl leading-none font-black text-club-gold sm:text-6xl"
            >
              ×
            </span>
          </div>
          <p className="text-center text-sm font-semibold text-balance text-chalk sm:text-base">
            {t('career.dateLong', { d: new Date(`${next.iso}T12:00:00Z`) })}
            <span className="mx-2 text-club-gold">/</span>
            {t('career.venue', { v: VENUE[Number(next.atHome)]! })}
            <span className="mx-2 text-club-gold">/</span>
            {next.competition}
          </p>
          {(next.banned.theirs.length > 0 || next.banned.ours.length > 0) && (
            <p className="text-center text-sm text-balance text-chalk-soft">
              {next.banned.ours.length > 0 && (
                <span className="block">
                  {t('career.bannedOurs', { names: next.banned.ours.join(', ') })}
                </span>
              )}
              {next.banned.theirs.length > 0 && (
                <span className="block">
                  {t('career.bannedTheirs', { names: next.banned.theirs.join(', ') })}
                </span>
              )}
            </p>
          )}
          <div className="grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-[1.2fr_1fr_1fr] sm:whitespace-nowrap">
            <button
              type="button"
              disabled={busy}
              className={`${btnPrimary} col-span-2 min-h-13 bg-club-gold sm:col-span-1`}
              onClick={() => props.onWatch('full')}
            >
              {t('career.watchFull')}
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${btnSecondary} bg-club-night/80 px-2 text-base sm:px-4 sm:text-lg`}
              onClick={() => props.onWatch('highlights')}
            >
              {t('career.watchHighlights')}
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${btnSecondary} bg-club-night/80 px-2 text-base sm:px-4 sm:text-lg`}
              onClick={props.onPlay}
            >
              {t('career.play')}
            </button>
          </div>
        </div>
      ) : (
        <div className="sala-glass mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center">
          <p className="font-condensed text-3xl leading-none font-black uppercase sm:text-5xl">
            {t('career.seasonOver')}
          </p>
          {sim.review && <SeasonReview review={sim.review} />}
          <button
            type="button"
            disabled={busy}
            className={`${btnPrimary} min-h-13 bg-club-gold`}
            onClick={props.onNextSeason}
          >
            {t('career.nextSeason', { season: sim.season + 1 })}
          </button>
        </div>
      )}
    </section>
  );
}

/** The walk out of the tunnel: the plate pushes toward the light, both badges wait at the mouth. */
function Tunnel({ home, away }: { home: ClubFace; away: ClubFace }) {
  return (
    <div
      role="status"
      className="club-tunnel fixed inset-0 z-50 grid place-items-center overflow-hidden bg-club-night"
    >
      <picture aria-hidden>
        <source media="(orientation: portrait)" srcSet="/img/clube/tunel-v.webp" />
        <img src="/img/clube/tunel-h.webp" alt="" className="club-tunnel-plate" />
      </picture>
      <div className="sala-glass relative flex flex-col items-center gap-5">
        <div className="flex items-center gap-4 sm:gap-8">
          <span className="club-tunnel-crest">
            <Crest club={home} size="xl" />
          </span>
          <span className="font-condensed text-5xl font-black text-club-gold">×</span>
          <span className="club-tunnel-crest [animation-delay:120ms]">
            <Crest club={away} size="xl" />
          </span>
        </div>
        <p className="font-condensed text-3xl leading-none font-black uppercase sm:text-5xl">
          {t('career.tunnel')}
        </p>
      </div>
    </div>
  );
}

function Form({ sim }: { sim: SimView }) {
  return (
    <section className={PANEL}>
      <h3 className={LABEL}>{t('career.form')}</h3>
      {sim.form.length === 0 ? (
        <p className="text-chalk-soft">{t('career.formEmpty')}</p>
      ) : (
        <ol className="flex gap-2">
          {sim.form.map((f, i) => (
            <li
              key={`${sim.today}-${i}`}
              className={`flex flex-1 flex-col items-center gap-1 ${i === sim.form.length - 1 ? 'club-flip' : ''}`}
              aria-label={t('career.formLabel', {
                r: f.result,
                a: f.goals[0],
                b: f.goals[1],
                opp: f.opponent.shortName,
              })}
            >
              <span
                className={`grid size-9 place-items-center rounded-lg font-condensed text-lg font-black ${RESULT_TONE[f.result]}`}
              >
                {t('career.formResult', { r: f.result })}
              </span>
              <span className="text-xs text-chalk-soft tabular-nums">
                {t('career.score', { a: f.goals[0], b: f.goals[1] })}
              </span>
              <Crest club={f.opponent} size="sm" />
            </li>
          ))}
        </ol>
      )}
      {sim.last && sim.last.why.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-chalk/10 pt-3">
          <h4 className={LABEL}>{t('career.why')}</h4>
          <ol className="flex flex-col gap-1.5">
            {sim.last.why.map((f) => (
              <li key={f.kind} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 text-xs font-bold uppercase ${f.side > 0 ? 'bg-club-gold/20 text-club-gold' : 'bg-club-danger/20 text-club-danger'}`}
                >
                  {t('career.whySide', { s: f.side > 0 ? 'for' : 'against' })}
                </span>
                <span>{t('career.whyFact', { k: f.kind, n: f.n })}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {sim.last && (
        <p className="sr-only" aria-live="polite">
          {t('career.lastResult', {
            home: sim.last.home.shortName,
            away: sim.last.away.shortName,
            a: sim.last.goals[0],
            b: sim.last.goals[1],
          })}
        </p>
      )}
    </section>
  );
}

function Fixtures({ sim }: { sim: SimView }) {
  if (sim.fixtures.length === 0) return null;
  return (
    <section className={PANEL}>
      <h3 className={LABEL}>{t('career.fixtures')}</h3>
      <ol className="flex flex-col">
        {sim.fixtures.slice(0, 4).map((f) => (
          <li
            key={f.iso + f.opponent.shortName}
            className="flex items-center gap-3 border-t border-chalk/10 py-1.5 first:border-0"
          >
            <span className="w-20 text-sm text-chalk-soft tabular-nums">
              {t('career.date', { d: new Date(`${f.iso}T12:00:00Z`) })}
            </span>
            <Crest club={f.opponent} size="sm" />
            <span className="min-w-0 flex-1 truncate font-semibold">{f.opponent.name}</span>
            <span className="text-xs font-bold text-chalk-soft uppercase">
              {t('career.venueShort', { v: VENUE[Number(f.atHome)]! })}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Who signs each kind of note. */
const FROM = {
  welcome: 'board',
  hired: 'board',
  result: 'press',
  ultimatum: 'board',
  ultimatumMet: 'board',
  goal: 'board',
  cashRed: 'finance',
  closedDoors: 'press',
  sponsor: 'finance',
  protest: 'press',
  press: 'press',
  coachSacked: 'press',
  approach: 'board',
  courtBan: 'press',
  tired: 'staff',
  bought: 'market',
  sold: 'market',
  window: 'market',
  bid: 'market',
  clausePaid: 'market',
  loanIn: 'market',
  loanOut: 'market',
  loanBack: 'market',
  contractEnded: 'staff',
  contractKept: 'staff',
  contractsEnding: 'staff',
  crop: 'staff',
  cameUp: 'staff',
  scouted: 'staff',
  agentOffer: 'market',
  homecoming: 'market',
  solidarity: 'finance',
  injury: 'staff',
  suspension: 'staff',
  prize: 'finance',
  arrears: 'staff',
  arrearsPaid: 'staff',
  walkout: 'press',
  imageClaim: 'finance',
  fx: 'finance',
  owners: 'board',
  fairplay: 'finance',
  fairplayRival: 'press',
  directors: 'board',
  election: 'board',
  electionYear: 'board',
  season: 'press',
} as const;
const FROM_TONE = {
  board: 'bg-club-gold',
  press: 'bg-club-blue',
  staff: 'bg-club-turf',
  market: 'bg-chalk',
  finance: 'bg-club-danger',
} as const;
const BOOL = ['false', 'true'] as const;
const NOTE_KEY = {
  clausePaid: 'inbox.clausePaid',
  loanIn: 'inbox.loanIn',
  loanOut: 'inbox.loanOut',
} as const;

/** One note in the person's language: the fact comes from the career, the sentence from here. */
function noteText(n: InboxItem, sim: SimView): string {
  switch (n.kind) {
    case 'welcome':
      return t('career.msgWelcome', { club: sim.club.name, division: sim.division });
    case 'result':
      return t(MSG_RESULT[n.goals[0] > n.goals[1] ? 'W' : n.goals[0] < n.goals[1] ? 'L' : 'D'], {
        a: n.goals[0],
        b: n.goals[1],
        opp: n.clubName,
      });
    case 'ultimatum':
      return t('inbox.ultimatum', { points: n.points, matches: n.matches });
    case 'ultimatumMet':
      return t('inbox.ultimatumMet');
    case 'goal':
      return t('inbox.goal', { met: BOOL[Number(n.met)]!, position: n.position, goal: n.goal });
    case 'cashRed':
      return t('career.msgCash');
    case 'closedDoors':
      return t('inbox.closedDoors');
    case 'sponsor':
      return t('inbox.sponsor', {
        name: n.name,
        value: t('career.cash', { value: n.annual }),
        years: n.years,
      });
    case 'protest':
      return t('inbox.protest');
    case 'press':
      return t('inbox.press', { n: n.matches });
    case 'coachSacked':
      return t('inbox.coachSacked', { club: n.clubName });
    case 'approach':
      return t('inbox.approach', { club: n.clubName });
    case 'courtBan':
      return t('inbox.courtBan', { n: n.matches });
    case 'tired':
      return t('inbox.tired', { n: n.players });
    case 'bought':
    case 'sold':
      return t(n.kind === 'bought' ? 'market.bought' : 'market.sold', {
        name: n.player,
        club: n.clubName,
        price: t('career.cash', { value: n.fee }),
      });
    case 'bid':
      return t('inbox.bid', {
        club: n.clubName,
        fee: t('career.cash', { value: n.fee }),
        name: n.player,
      });
    case 'clausePaid':
    case 'loanIn':
    case 'loanOut':
      return t(NOTE_KEY[n.kind], {
        club: n.clubName,
        fee: t('career.cash', { value: n.fee }),
        name: n.player,
      });
    case 'loanBack':
      return t('inbox.loanBack', { club: n.clubName, name: n.player });
    case 'contractEnded':
      return t('inbox.contractEnded', { name: n.player });
    case 'contractKept':
      return t('inbox.contractKept', { name: n.player });
    case 'crop':
      return t('inbox.crop', { n: n.players });
    case 'fairplay':
      return t('inbox.fairplay', {
        s: Math.min(4, n.strikes),
        cost: n.cost,
        points: n.points,
        fine: t('career.cash', { value: n.fine ?? 0 }),
      });
    case 'fairplayRival':
      return t('inbox.fairplayRival', { club: n.clubName, points: n.points });
    case 'directors':
      return t('inbox.directors', {
        club: n.clubName,
        why: n.why,
        h: n.horizon,
        mine: n.club === sim.clubId ? 'yes' : 'no',
      });
    case 'election':
      return t('inbox.election', {
        club: n.clubName,
        r: n.result,
        h: n.horizon,
        mine: n.club === sim.clubId ? 'yes' : 'no',
        out: n.coachOut ? 'yes' : 'no',
      });
    case 'electionYear':
      return t('inbox.electionYear');
    case 'hired':
      return t('inbox.hired', { club: n.clubName });
    case 'solidarity':
      return t('inbox.solidarity', { name: n.player, fee: t('career.cash', { value: n.fee }) });
    case 'agentOffer':
      return t('inbox.agentOffer', { agent: n.agent, name: n.player, club: n.clubName || 'none' });
    case 'homecoming':
      return t('inbox.homecoming', {
        agent: n.agent,
        name: n.player,
        wage: t('career.cash', { value: n.wage }),
      });
    case 'scouted':
      return n.area.startsWith('player:')
        ? t('inbox.watched', { name: n.clubName })
        : t('inbox.scouted', { area: n.clubName, n: n.players });
    case 'cameUp':
      return t('inbox.cameUp', { n: n.players });
    case 'injury':
      return t('inbox.injury', {
        name: n.player,
        kind: t('health.kind', { k: n.injury }),
        days: n.days,
      });
    case 'suspension':
      return t('inbox.suspension', { name: n.player, n: n.matches, why: n.why });
    case 'contractsEnding':
      return t('inbox.contractsEnding', { n: n.players });
    case 'window':
      return t('inbox.window', { open: BOOL[Number(n.open)]! });
    case 'owners':
      return t('inbox.owners', { value: t('career.cash', { value: n.amount }) });
    case 'fx':
      return t('inbox.fx', {
        c: n.currency,
        rate: n.rate / 10_000,
        change: Math.abs(n.change) / 10,
        up: String(n.change > 0),
      });
    case 'arrears':
      return t('inbox.arrears', { n: n.months });
    case 'arrearsPaid':
      return t('inbox.arrearsPaid');
    case 'imageClaim':
      return t('inbox.imageClaim', {
        name: n.player,
        value: t('career.cash', { value: n.amount }),
      });
    case 'walkout':
      return t('inbox.walkout', { name: n.player });
    case 'prize':
      return t('inbox.prize', {
        position: n.position,
        amount: t('career.cash', { value: n.amount }),
      });
    case 'season':
      return t('inbox.season', { season: n.season, champion: n.clubName, move: n.move });
  }
}

/** What the club was told, newest first: kept in the career, so it is there after a reload. */
function Inbox({ sim }: { sim: SimView }) {
  return (
    <section className={PANEL}>
      <h3 className={LABEL}>{t('career.inbox')}</h3>
      {sim.inbox.length === 0 ? (
        <p className="text-chalk-soft">{t('inbox.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sim.inbox.map((n, i) => (
            <li
              key={`${n.day}-${n.kind}-${i}`}
              className="flex gap-3 border-t border-chalk/10 pt-2 first:border-0 first:pt-0"
            >
              <span
                aria-hidden
                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${FROM_TONE[FROM[n.kind]]}`}
              />
              <p className="min-w-0">
                <span className="mr-2 font-condensed font-extrabold uppercase">
                  {t('career.from', { f: FROM[n.kind] })}
                </span>
                <span className="mr-2 text-xs text-chalk-soft tabular-nums">
                  {t('career.date', { d: new Date(`${n.iso}T12:00:00Z`) })}
                </span>
                {noteText(n, sim)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
const MSG_RESULT = { W: 'career.msgWin', D: 'career.msgDraw', L: 'career.msgLoss' } as const;

function Table({ sim, clubId }: { sim: SimView; clubId: string }) {
  return (
    <section className={PANEL}>
      <h3 className={LABEL}>{t('career.table')}</h3>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-chalk-soft">
          <tr>
            {COLS.map((c, k) => (
              <th
                key={c}
                scope="col"
                className={`pb-1 font-normal ${k < 2 ? 'text-left' : 'text-right'} ${k === 0 ? 'w-7' : ''}`}
              >
                {t('career.col', { c })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sim.table.map((r, i) => (
            <tr
              key={r.clubId}
              aria-current={r.clubId === clubId || undefined}
              className={
                r.clubId === clubId
                  ? 'bg-club-gold/15 font-bold text-club-gold'
                  : 'border-t border-chalk/10'
              }
            >
              <td className="py-1.5 pl-1">{i + 1}</td>
              <td>
                <span className="flex items-center gap-2">
                  <Crest club={r} size="sm" />
                  {r.shortName}
                </span>
              </td>
              <td className="text-right">{r.played}</td>
              <td className="text-right">{r.gd}</td>
              <td className="pr-1 text-right font-bold">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
