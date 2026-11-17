/**
 * Modo Clube career (MC-176, MC-177): start by picking any club of the national divisions or
 * by one of three offers from the last one; then the career home. The world is built in the
 * browser by a worker (ADR-020); the server only keeps the record and the seed.
 */
import { useEffect, useMemo, useState } from 'react';
import { api, apiFetch } from '../../../lib/api';
import { btnPrimary, btnSecondary, GameHeader, Notice } from '../../../components/ui';
import { t } from '../i18n';
import type { ClubFace, MatchClub, SimReply, SimRequest, SimView } from './sim.worker';
import {
  Match,
  PLAN,
  type Chunk,
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
      {career && <Home career={career} />}
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
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h2 className="font-condensed text-3xl font-extrabold uppercase sm:text-4xl">
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
      <p className="max-w-[48ch] text-chalk-soft">{t('career.modeHint', { m: mode })}</p>

      {mode === 'job_offers' && (
        <ul className="grid gap-4 md:grid-cols-3">
          {options.offers.map((o) => (
            <li
              key={o.id}
              className="flex flex-col overflow-hidden rounded-2xl bg-club-panel ring-1 ring-chalk/10"
            >
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
                        className="h-1.5 overflow-hidden rounded-full bg-club-night"
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
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-club-panel p-2.5 text-left ring-1 ring-chalk/10 hover:ring-club-gold focus-visible:ring-club-gold"
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

function Home({ career }: { career: Career }) {
  const [sim, setSim] = useState<SimView | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [watching, setWatching] = useState<{
    watch: Watch;
    home: MatchClub;
    away: MatchClub;
    mine: 0 | 1;
    key: number;
  } | null>(null);

  // What every step answers: the server keeps the day and the snapshot, then the screen moves.
  const apply = async (reply: SimReply) => {
    const save = reply.save;
    if (save)
      await api(`/v1/manager/career/world?from=${save.from}&to=${save.to}&season=${save.season}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/octet-stream' },
        body: save.bytes,
      });
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

  const step = (type: 'play' | 'nextSeason') => {
    if (!ask) return;
    setBusy(true);
    ask({ type })
      .then(apply)
      .catch((err: Error) => setError(err.message));
  };

  const watch = (mode: Watch) => {
    if (!ask) return;
    setBusy(true);
    ask({ type: 'matchStart' })
      .then((r) => {
        if (!r.match) throw new Error('no match');
        setWatching({ watch: mode, ...r.match, key: Date.now() });
      })
      .catch((err: Error) => setError(err.message));
  };

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
        home={{ clubId: watching.home.id, formation: '4-3-3', instructions: PLAN }}
        away={{ clubId: watching.away.id, formation: '4-3-3', instructions: PLAN }}
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
  const net = sim.money.reduce((sum, m) => sum + m.amount, 0);
  const biggest = Math.max(1, ...sim.money.map((m) => Math.abs(m.amount)));
  const label = 'font-condensed text-sm font-extrabold tracking-wide text-club-gold uppercase';
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Crest club={sim.club} size="xl" />
          <div className="min-w-0 flex-1">
            <h2 className="font-condensed text-3xl leading-[0.9] font-black uppercase sm:text-5xl">
              {sim.club.name}
            </h2>
            <p className="mt-1 text-chalk-soft">
              {t('career.where', { division: sim.division, season: sim.season })}
            </p>
          </div>
          <p className="flex basis-full flex-col sm:basis-auto sm:items-end">
            <span className={label}>{t('career.cashLabel')}</span>
            <span
              className={`font-condensed text-3xl font-extrabold tabular-nums ${sim.cash < 0 ? 'text-club-danger' : ''}`}
            >
              {t('career.cash', { value: sim.cash })}
            </span>
          </p>
        </header>

        {sim.turn && (
          <p
            aria-live="polite"
            className="rounded-2xl border-l-4 border-club-gold bg-club-panel p-4 text-lg"
          >
            {t('career.turn', {
              season: sim.turn.season,
              champion: sim.turn.champion,
              move: sim.turn.move,
            })}
          </p>
        )}

        <section
          aria-labelledby="career-next"
          className="relative overflow-hidden rounded-2xl bg-club-panel shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] ring-1 ring-chalk/10"
        >
          {sim.next && (
            <div
              aria-hidden
              className="absolute inset-0 opacity-90"
              style={slabs(sim.next.home, sim.next.away)}
            />
          )}
          <div className="relative flex flex-col gap-5 bg-club-night/55 p-4 sm:p-6">
            <h3 id="career-next" className={label}>
              {t('career.next')}
            </h3>
            {sim.next ? (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                  {[sim.next.home, sim.next.away].map((c, k) => (
                    <div
                      key={k}
                      className={`flex flex-col items-center gap-2 text-center ${k === 0 ? 'order-1' : 'order-3'}`}
                    >
                      <Crest club={c} size="xl" />
                      <span className="font-condensed text-lg leading-tight font-extrabold uppercase sm:text-2xl">
                        <span className="sm:hidden">{c.shortName}</span>
                        <span className="hidden sm:inline">{c.name}</span>
                      </span>
                    </div>
                  ))}
                  <div className="order-2 flex flex-col items-center gap-1 rounded-xl bg-club-night/90 px-3 py-2 text-center">
                    <span className="font-condensed text-3xl font-black text-club-gold">×</span>
                    <span className="text-sm font-bold">
                      {t('career.dateLong', { d: new Date(`${sim.next.iso}T12:00:00Z`) })}
                    </span>
                    <span className="text-xs text-chalk-soft">
                      {t('career.venue', { v: VENUE[Number(sim.next.atHome)]! })}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    disabled={busy}
                    className={btnPrimary}
                    onClick={() => watch('full')}
                  >
                    {t('career.watchFull')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={`${btnSecondary} bg-club-night/80`}
                    onClick={() => watch('highlights')}
                  >
                    {t('career.watchHighlights')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={`${btnSecondary} bg-club-night/80`}
                    onClick={() => step('play')}
                  >
                    {t('career.play')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-lg">{t('career.seasonOver')}</p>
                <button
                  type="button"
                  disabled={busy}
                  className={`${btnPrimary} sm:w-fit`}
                  onClick={() => step('nextSeason')}
                >
                  {t('career.nextSeason', { season: sim.season + 1 })}
                </button>
              </>
            )}
          </div>
        </section>

        <div className="grid items-start gap-4 md:grid-cols-2">
          {sim.last && (
            <section className="flex flex-col gap-3 rounded-2xl bg-club-panel p-4 ring-1 ring-chalk/10">
              <h3 className={label}>{t('career.last')}</h3>
              <p
                aria-live="polite"
                aria-label={t('career.lastResult', {
                  home: sim.last.home.shortName,
                  away: sim.last.away.shortName,
                  a: sim.last.goals[0],
                  b: sim.last.goals[1],
                })}
                className="flex items-center justify-center gap-3 font-condensed text-2xl font-extrabold uppercase"
              >
                <Crest club={sim.last.home} />
                <span>{sim.last.home.shortName}</span>
                <span className="rounded-lg bg-club-gold px-3 text-ink tabular-nums">
                  {t('career.score', { a: sim.last.goals[0], b: sim.last.goals[1] })}
                </span>
                <span>{sim.last.away.shortName}</span>
                <Crest club={sim.last.away} />
              </p>
            </section>
          )}
          <section
            className={`flex flex-col gap-3 rounded-2xl bg-club-panel p-4 ring-1 ring-chalk/10 ${sim.last ? '' : 'md:col-span-2'}`}
          >
            <h3 className={label}>{t('career.money', { season: sim.season })}</h3>
            <dl className="flex flex-col gap-2 tabular-nums">
              {sim.money.map((m) => (
                <div key={m.kind} className="grid grid-cols-[1fr_auto] gap-x-4">
                  <dt className="text-chalk-soft">{t('career.moneyKind', { k: m.kind })}</dt>
                  <dd className={m.amount < 0 ? 'text-club-danger' : ''}>
                    {t('career.cash', { value: m.amount })}
                  </dd>
                  <dd aria-hidden className="col-span-2 h-1 rounded-full bg-club-night">
                    <span
                      className={`block h-full rounded-full ${m.amount < 0 ? 'bg-club-danger' : 'bg-club-turf'}`}
                      style={{ width: `${(Math.abs(m.amount) / biggest) * 100}%` }}
                    />
                  </dd>
                </div>
              ))}
              <div className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 border-t border-chalk/15 pt-2 font-bold">
                <dt>{t('career.net')}</dt>
                <dd className={net < 0 ? 'text-club-danger' : 'text-club-gold'}>
                  {t('career.cash', { value: net })}
                </dd>
              </div>
            </dl>
          </section>
        </div>
        <p className="text-xs text-chalk-soft">{t('career.builtHere', { ms: sim.ms })}</p>
      </div>

      <section className="self-start rounded-2xl bg-club-panel p-4 ring-1 ring-chalk/10">
        <h3 className={`${label} mb-1`}>{t('career.table')}</h3>
        <p className="mb-3 font-condensed text-xl font-extrabold uppercase">{sim.division}</p>
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
                aria-current={r.clubId === career.clubId || undefined}
                className={
                  r.clubId === career.clubId
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
    </section>
  );
}
