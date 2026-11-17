/**
 * Modo Clube career (MC-176, MC-177): start by picking any club of the national divisions or
 * by one of three offers from the last one; then the career home. The world is built in the
 * browser by a worker (ADR-020); the server only keeps the record and the seed.
 */
import { useEffect, useMemo, useState } from 'react';
import { api, apiFetch } from '../../../lib/api';
import { btnPrimary, btnSecondary, GameHeader, Notice } from '../../../components/ui';
import { t } from '../i18n';
import type { MatchClub, SimReply, SimRequest, SimView } from './sim.worker';
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

function Crest({ colours }: { colours: [string, string] }) {
  return (
    <span
      aria-hidden
      className="inline-block size-9 shrink-0 rounded-md border-2 border-chalk/30"
      style={{ background: `linear-gradient(135deg, ${colours[0]} 50%, ${colours[1]} 50%)` }}
    />
  );
}

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
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-condensed text-3xl font-extrabold uppercase">{t('career.startTitle')}</h2>
      <div role="group" aria-label={t('career.startTitle')} className="grid gap-3 sm:grid-cols-2">
        {(['job_offers', 'free_choice'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            className={`rounded-2xl border-2 bg-club-panel p-4 text-left ${mode === m ? 'border-club-gold' : 'border-chalk/10'}`}
            onClick={() => setMode(m)}
          >
            <span className="block font-condensed text-xl font-extrabold uppercase">
              {t('career.mode', { m })}
            </span>
            <span className="text-sm text-chalk-soft">{t('career.modeHint', { m })}</span>
          </button>
        ))}
      </div>

      {mode === 'job_offers' && (
        <ul className="grid gap-3 md:grid-cols-3">
          {options.offers.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-3 rounded-2xl bg-club-panel p-4 ring-1 ring-chalk/10"
            >
              <div className="flex items-center gap-3">
                <Crest colours={o.colours} />
                <div>
                  <p className="font-condensed text-xl font-extrabold uppercase">{o.name}</p>
                  <p className="text-sm text-chalk-soft">
                    {t('career.reputation', { n: o.reputation })}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-sm">
                {AXES.map((a) => (
                  <div key={a} className="contents">
                    <dt className="text-chalk-soft">{t('career.axis', { a })}</dt>
                    <dd>
                      <meter
                        min={0}
                        max={100}
                        value={o.profile[a]}
                        aria-label={t('career.axisValue', { a, n: o.profile[a] })}
                        className="h-2 w-full accent-club-gold"
                      />
                    </dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                disabled={busy}
                className={btnPrimary}
                onClick={() => start(o.id)}
              >
                {t('career.accept', { club: o.shortName })}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === 'free_choice' && (
        <div className="flex flex-col gap-3">
          <div role="group" aria-label={t('career.divisions')} className="flex flex-wrap gap-2">
            {options.divisions.map((d, i) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={division === i}
                className={`${btnSecondary} ${division === i ? 'border-club-gold text-club-gold' : ''}`}
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
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-club-panel p-3 text-left ring-1 ring-chalk/10 hover:ring-club-gold"
                  onClick={() => start(c.id)}
                >
                  <Crest colours={c.colours} />
                  <span className="flex-1 font-bold">{c.name}</span>
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
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-club-panel p-4 ring-1 ring-chalk/10">
          <Crest colours={sim.club.colours} />
          <div className="min-w-0 flex-1">
            <h2 className="font-condensed text-3xl font-extrabold uppercase">{sim.club.name}</h2>
            <p className="text-chalk-soft">
              {t('career.where', { division: sim.division, season: sim.season })}
            </p>
          </div>
          <p className="w-full font-condensed text-2xl font-extrabold text-club-gold tabular-nums sm:w-auto">
            {t('career.cash', { value: sim.cash })}
          </p>
        </div>

        {sim.turn && (
          <p aria-live="polite" className="rounded-2xl border-2 border-club-gold bg-club-panel p-4">
            {t('career.turn', {
              season: sim.turn.season,
              champion: sim.turn.champion,
              move: sim.turn.move,
            })}
          </p>
        )}
        {sim.last && (
          <p
            aria-live="polite"
            className="rounded-2xl bg-club-panel/70 p-4 font-condensed text-2xl font-extrabold uppercase ring-1 ring-chalk/10"
          >
            {t('career.lastResult', {
              home: sim.last.home,
              away: sim.last.away,
              a: sim.last.goals[0],
              b: sim.last.goals[1],
            })}
          </p>
        )}

        <div className="flex flex-col gap-3 rounded-2xl bg-club-panel p-4 ring-1 ring-chalk/10">
          <h3 className="font-condensed text-xl font-extrabold uppercase">{t('career.next')}</h3>
          {sim.next ? (
            <>
              <p className="flex flex-wrap items-baseline gap-x-3 text-lg">
                <span className="text-sm text-chalk-soft tabular-nums">
                  {t('career.date', { d: new Date(`${sim.next.iso}T12:00:00Z`) })}
                </span>
                <span className={sim.next.atHome ? 'font-bold' : ''}>{sim.next.home}</span>
                <span className="text-chalk-soft">×</span>
                <span className={sim.next.atHome ? '' : 'font-bold'}>{sim.next.away}</span>
              </p>
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
                  className={btnSecondary}
                  onClick={() => watch('highlights')}
                >
                  {t('career.watchHighlights')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={btnSecondary}
                  onClick={() => step('play')}
                >
                  {t('career.play')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{t('career.seasonOver')}</p>
              <button
                type="button"
                disabled={busy}
                className={btnPrimary}
                onClick={() => step('nextSeason')}
              >
                {t('career.nextSeason', { season: sim.season + 1 })}
              </button>
            </>
          )}
        </div>
        <div className="rounded-2xl bg-club-panel p-4 ring-1 ring-chalk/10">
          <h3 className="mb-2 font-condensed text-xl font-extrabold uppercase">
            {t('career.money', { season: sim.season })}
          </h3>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
            {sim.money.map((m) => (
              <div key={m.kind} className="contents">
                <dt className="text-chalk-soft">{t('career.moneyKind', { k: m.kind })}</dt>
                <dd className={`text-right ${m.amount < 0 ? 'text-club-danger' : ''}`}>
                  {t('career.cash', { value: m.amount })}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs text-chalk-soft">{t('career.builtHere', { ms: sim.ms })}</p>
      </div>

      <div className="rounded-2xl bg-club-panel p-4 ring-1 ring-chalk/10">
        <h3 className="mb-2 font-condensed text-xl font-extrabold uppercase">
          {t('career.table')}
        </h3>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-chalk-soft">
            <tr>
              {COLS.map((c, k) => (
                <th key={c} scope="col" className={`py-1 ${k < 2 ? 'text-left' : 'text-right'}`}>
                  {t('career.col', { c })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sim.table.map((r, i) => (
              <tr
                key={r.clubId}
                className={`border-t border-chalk/10 ${r.clubId === career.clubId ? 'font-bold text-club-gold' : ''}`}
              >
                <td className="py-1">{i + 1}</td>
                <td>{r.name}</td>
                <td className="text-right">{r.played}</td>
                <td className="text-right">{r.gd}</td>
                <td className="text-right">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
