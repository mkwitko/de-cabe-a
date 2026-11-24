/**
 * Modo Clube career (MC-176, MC-177): start by picking any club of the national divisions or
 * by one of three offers from the last one; then the career home. The world is built in the
 * browser by a worker (ADR-020); the server only keeps the record and the seed.
 */
import { SeasonReview } from './SeasonReview';
import { SeasonBridge } from './SeasonBridge';
import { ResultCard, type Played } from './ResultCard';
import { trackDecision, trackSeen, trackTiming } from './telemetry';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, apiFetch } from '../../../lib/api';
import { Link } from 'react-router';
import { btnPrimary, btnSecondary, GameHeader, Notice } from '../../../components/ui';
import { Icon } from '../../../components/Icon';
import { ClubBadge } from '../../../components/ClubBadge';
import { kitUri } from '../../../components/clubArt';
import { t } from '../i18n';
import type {
  ClubFace,
  ClubKits,
  InboxItem,
  MatchClub,
  SimReply,
  SimRequest,
  SimView,
  Stage,
} from './sim.worker';
import { Squad } from './Squad';
import { Training } from './Training';
import { Cup } from './Cup';
import { Market } from './Market';
import { useBidTalk } from './BidTalk';
import { Board, type WorkSaid, Fired } from './Board';
import { Backup } from './Backup';
import {
  Match,
  PLAN,
  type Chunk,
  type Instructions,
  type MatchSource,
  type Moment,
  type Watch,
} from '../FriendlyPage';

/** A 0-100 attribute in a word, for the offer cards. */
const bandOf = (n: number) => (n < 34 ? 'low' : n < 67 ? 'mid' : 'high');

interface ClubOption {
  id: string;
  name: string;
  shortName: string;
  colours: [string, string];
  kits?: ClubKits | undefined;
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
const STAGE_TEXT = {
  pack: 'career.stage.pack',
  open: 'career.stage.open',
  market: 'career.stage.market',
  turn: 'career.stage.turn',
  save: 'career.stage.save',
} as const satisfies Record<Stage, string>;
const DEFAULT_FORMATION = '4-3-3';
type Room = (typeof ROOMS)[number];
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

  // A running career owns the whole viewport (rail, bar, room); the rest is a plain page.
  if (career && !error) return <Home career={career} onEnded={() => setCareer(null)} />;
  return (
    <div className={PAGE}>
      <GameHeader title={t('career.title')} />
      {error && <Notice title={t('career.loadError')}>{error}</Notice>}
      {career === null && <Start onStarted={setCareer} onError={setError} />}
    </div>
  );
}

const CREST = { sm: 'xs', md: 'md', lg: 'lg', xl: 'xl' } as const;

/** A club's crest: our own drawing from its colours and kit pattern, never a logo (DESIGN.md). */
function Crest({ club, size = 'md' }: { club: ClubFace; size?: keyof typeof CREST }) {
  return (
    <ClubBadge
      name={club.shortName}
      size={CREST[size]}
      colours={club.colours}
      pattern={club.kits?.home.pattern}
    />
  );
}

/** A club's home kit, and its away kit when it has one; nothing without kit data. */
function Kits({
  club,
  away = false,
  both = false,
}: {
  club: ClubFace;
  away?: boolean;
  both?: boolean;
}) {
  if (!club.kits) return null;
  const list = both
    ? [club.kits.home, club.kits.away].filter((k) => k !== undefined)
    : [(away && club.kits.away) || club.kits.home];
  return (
    <span aria-hidden className="flex items-end gap-1">
      {list.map((k) => (
        <img
          key={kitUri(k)}
          alt=""
          draggable={false}
          src={kitUri(k)}
          className="h-14 w-auto sm:h-20"
        />
      ))}
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
                <dl className="grid grid-cols-[auto_1fr_8ch] items-center gap-x-3 gap-y-2 text-sm">
                  {AXES.map((a) => {
                    const n = o.profile[a];
                    const band = t('career.band', { b: bandOf(n) });
                    return (
                      <div key={a} className="contents">
                        <dt className="text-chalk-soft">{t('career.axis', { a })}</dt>
                        <dd
                          role="meter"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={o.profile[a]}
                          aria-label={t('career.axisValue', { a, n, b: band })}
                          className="h-1.5 overflow-hidden rounded-full bg-chalk/12"
                        >
                          <span
                            className="block h-full rounded-full bg-club-gold"
                            style={{ width: `${o.profile[a]}%` }}
                          />
                        </dd>
                        <dd aria-hidden className="text-right font-bold tabular-nums">
                          {n} <span className="font-normal text-chalk-soft">{band}</span>
                        </dd>
                      </div>
                    );
                  })}
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

/** Back in the office on a wide screen: the room starts from its top. */
const toTop = () => {
  if (window.matchMedia('(min-width: 1024px)').matches) window.scrollTo(0, 0);
};

function Home({ career, onEnded }: { career: Career; onEnded: () => void }) {
  const [sim, setSim] = useState<SimView | null>(null);
  const [busy, setBusy] = useState(true);
  // The long step the worker is on (opening, the turn of the season), when it said so.
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [watching, setWatching] = useState<{
    watch: Watch;
    home: MatchClub;
    away: MatchClub;
    mine: 0 | 1;
    formation: string;
    plan: Instructions;
    gap: number;
    names: Record<string, string>;
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
    setStage(null);
    setBusy(false);
  };

  useEffect(() => {
    const w = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
    const waiting = new Map<number, (r: SimReply) => void>();
    let seq = 0;
    w.onmessage = (e: MessageEvent<SimReply>) => {
      if (e.data.stage) {
        setStage(e.data.stage);
        return;
      }
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
    const opened = performance.now();
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
      .then((r) => {
        trackTiming('open', performance.now() - opened);
        return apply(r);
      })
      .catch((err: Error) => setError(err.message));
    return () => w.terminate();
  }, [career]);

  // A line-up pick: the same day's snapshot. A later step already carries it, so a pick that
  // arrives after the day moved is not an error.
  const keep = useCallback((reply: SimReply) => {
    if (reply.save) put(reply.save, true).catch(() => undefined);
  }, []);
  const pickedLineup = useCallback(
    (reply: SimReply) => {
      keep(reply);
      trackDecision(career.id, 'lineup');
    },
    [keep, career.id],
  );

  // A transfer: the snapshot is kept and the hub shows the new cash and squad.
  const deal = useCallback(
    (reply: SimReply) => {
      keep(reply);
      trackDecision(career.id, 'signing');
      if (reply.view) setSim(reply.view);
    },
    [keep, career.id],
  );

  // A bid's talk, opened from the inbox (BidTalk.tsx); its answers update the hub like a deal.
  const askAny = useCallback<Ask>(
    (req) => (ask ? ask(req) : Promise.reject(new Error('worker'))),
    [ask],
  );
  const bidTalk = useBidTalk(askAny, setError, deal);

  // After a match nobody watched: the result moment before the office.
  const [played, setPlayed] = useState<Played | null>(null);
  const step = (type: 'play' | 'nextSeason' | 'skipPreseason') => {
    if (!ask) return;
    setBusy(true);
    const t0 = performance.now();
    const before = sim;
    // The table of the competition just played: the league's or the estadual's; a cup has none.
    const comp = before?.next?.competition;
    const place = (s: SimView | null | undefined) => {
      if (!s || !comp) return 0;
      const rows =
        comp === s.division ? s.table : comp === s.estadual?.name ? s.estadual.table : [];
      return rows.findIndex((r) => r.clubId === s.clubId) + 1;
    };
    ask({ type })
      .then((r) => {
        if (type === 'nextSeason') trackTiming('seasonTurn', performance.now() - t0);
        const last = r.view?.last;
        if (type === 'play' && last && before?.next && !before.preseason && !before.deadline)
          setPlayed({ last, places: [place(before), place(r.view)] });
        return apply(r);
      })
      .catch((err: Error) => setError(err.message));
  };

  // The funnel milestones the view shows (telemetry.ts); each goes out once per career.
  useEffect(() => {
    if (!sim) return;
    trackSeen(career.id, {
      fresh: sim.fresh,
      tier: sim.tier,
      n: sim.history.length + 1,
      fired: sim.board.fired,
      over: sim.review ? (sim.review.fired ? 'fired' : sim.review.met ? 'met' : 'missed') : null,
    });
  }, [sim, career.id]);
  const [bridgeSeen, setBridgeSeen] = useState<number | null>(null);

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

  if (error)
    return (
      <div className={PAGE}>
        <GameHeader title={t('career.title')} />
        <Notice title={t('career.loadError')}>{error}</Notice>
      </div>
    );
  if (played)
    return (
      <div className={PAGE}>
        <ResultCard
          played={played}
          onDone={() => {
            setPlayed(null);
            toTop();
          }}
        />
      </div>
    );
  if (watching && source && ask)
    return (
      <div className={PAGE}>
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
          gap={watching.gap}
          names={watching.names}
          source={source}
          onFinished={() => {
            ask({ type: 'matchFinish' })
              .then(apply)
              .catch((err: Error) => setError(err.message));
          }}
          onDone={() => {
            setWatching(null);
            toTop();
          }}
        />
      </div>
    );
  if (!sim)
    return (
      <p role="status" className={`${PAGE} text-chalk-soft`}>
        {t(stage ? STAGE_TEXT[stage] : 'career.computing')}
      </p>
    );
  if (sim.board.fired)
    return (
      <div className={PAGE}>
        <Fired
          club={sim.club.name}
          history={sim.history}
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
      </div>
    );
  const net = sim.money.reduce((sum, m) => sum + m.amount, 0);
  // Before any income is booked a negative balance is just the season's opening state, not an alarm.
  const earned = sim.money.some((m) => m.amount > 0);
  const biggest = Math.max(1, ...sim.money.map((m) => Math.abs(m.amount)));
  const go = (r: Room) => {
    setRoom(r);
    scrollTo({ top: 0 });
  };
  return (
    <div className="club-shell">
      <Scene plate={PLATE[room] ?? room} />
      {tunnel && sim.next && <Tunnel home={sim.next.home} away={sim.next.away} />}
      {sim.turn && sim.turn.move !== 'stay' && (
        <SeasonMoment careerId={career.id} turn={sim.turn} club={sim.club} />
      )}
      <aside className="club-rail">
        <div className="hidden items-center gap-3 px-4 pt-5 pb-4 lg:flex">
          <Crest club={sim.club} size="lg" />
          <div className="min-w-0">
            <p className="font-condensed text-xl leading-[0.95] font-black text-balance uppercase">
              {sim.club.shortName}
            </p>
            <p className="mt-1 text-xs font-semibold text-chalk-soft">
              {t('career.where', { division: sim.division, season: sim.season })}
            </p>
            <span className="mt-2 block">
              <Kits club={sim.club} both />
            </span>
          </div>
        </div>
        <nav aria-label={t('career.rooms')} className="sala-rooms">
          {ROOMS.map((r) => (
            <button
              key={r}
              type="button"
              aria-label={t('career.room', { r })}
              aria-current={room === r ? 'page' : undefined}
              className="club-room"
              onClick={() => go(r)}
            >
              <Icon name={ROOM_ICON[r]} className="size-[22px] shrink-0" />
              <span className="lg:hidden">{t('career.roomShort', { r })}</span>
              <span className="hidden lg:inline">{t('career.room', { r })}</span>
            </button>
          ))}
        </nav>
        <Link to="/" className="club-leave hidden lg:flex">
          <Icon name="exit" className="size-5" />
          {t('career.leave')}
        </Link>
      </aside>
      <div className="club-main">
        <header className="club-top">
          <Link
            to="/"
            aria-label={t('career.leave')}
            className="-ml-2 grid size-11 shrink-0 place-items-center rounded-lg hover:bg-chalk/10 lg:hidden"
          >
            <Icon name="back" />
          </Link>
          <span className="lg:hidden">
            <Crest club={sim.club} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 font-condensed text-xl leading-none font-black text-balance uppercase lg:truncate lg:text-3xl">
              <span className="lg:hidden">{sim.club.shortName}</span>
              <span className="hidden lg:inline">{t('career.room', { r: room })}</span>
            </h1>
            <p className="mt-1 truncate text-xs font-semibold text-chalk-soft lg:hidden">
              {t('career.dateLong', {
                d: new Date(`${sim.preseason?.iso ?? sim.deadline ?? sim.today}T12:00:00Z`),
              })}
            </p>
          </div>
          <dl className="flex shrink-0 items-center gap-6 text-right">
            <div className="hidden lg:block">
              <dt className="text-xs font-semibold text-chalk-soft">{t('career.today')}</dt>
              <dd className="font-condensed text-xl leading-tight font-extrabold uppercase">
                {t('career.dateLong', {
                  d: new Date(`${sim.preseason?.iso ?? sim.deadline ?? sim.today}T12:00:00Z`),
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-chalk-soft">{t('career.cashLabel')}</dt>
              <dd
                className={`font-condensed text-lg leading-tight font-extrabold tabular-nums lg:text-xl ${sim.cash < 0 ? 'text-club-danger' : 'text-club-gold'}`}
              >
                {t('career.cash', { value: sim.cash })}
              </dd>
            </div>
          </dl>
          {room !== 'sala' && (
            <button type="button" className="club-go" onClick={() => go('sala')}>
              <span className="min-w-0">
                <span className="block font-condensed text-lg leading-none font-extrabold uppercase">
                  {sim.deadline
                    ? t('career.goDeadline')
                    : sim.next
                      ? t('career.goMatch')
                      : t('career.goSeason')}
                </span>
                {sim.next && !sim.deadline && (
                  <span className="mt-0.5 block truncate text-xs font-bold">
                    {t('career.fixtureShort', {
                      home: sim.next.home.shortName,
                      away: sim.next.away.shortName,
                    })}
                    {' · '}
                    {t('career.date', { d: new Date(`${sim.next.iso}T12:00:00Z`) })}
                  </span>
                )}
              </span>
              <Icon name="forward" className="size-5 shrink-0" />
            </button>
          )}
        </header>
        <div className="club-room-body">
          {sim.board.offers.map((o) => (
            <aside
              key={o.clubId}
              id={`convite-${o.clubId}`}
              aria-label={t('career.approach', { club: o.name })}
              className="sala-slab flex flex-wrap items-center gap-3 p-4"
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
          {sim.fresh && <Guide careerId={career.id} room={room} onRoom={go} />}
          {room === 'diretoria' && (
            <>
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
              <Backup onError={setError} />
            </>
          )}
          {room === 'mercado' && ask && <Market ask={ask} onError={setError} onDeal={deal} />}
          {room === 'treino' && ask && <Training ask={ask} onError={setError} onPicked={keep} />}
          {room === 'vestiario' && ask && (
            <Squad ask={ask} onError={setError} onPicked={pickedLineup} />
          )}
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
              {sim.bridge && sim.turn && bridgeSeen !== sim.turn.season && (
                <SeasonBridge
                  bridge={sim.bridge}
                  season={sim.turn.season + 1}
                  onClose={() => setBridgeSeen(sim.turn!.season)}
                />
              )}
              <NextMatch
                sim={sim}
                busy={busy}
                stage={stage}
                onWatch={watch}
                onPlay={() => step('play')}
                onNextSeason={() => step('nextSeason')}
                onSkip={() => step('skipPreseason')}
                onMarket={() => go('mercado')}
                onTraining={() => go('treino')}
              />
              <section className="sala-desk grid min-w-0 lg:grid-cols-[1.4fr_1fr]">
                <Inbox sim={sim} onGo={go} onBid={bidTalk.open} />
                {bidTalk.talk}
                <div className="flex min-w-0 flex-col">
                  <Table
                    rows={sim.table}
                    title={t('career.table')}
                    clubId={sim.clubId}
                    zones={sim.zones}
                  />
                  {sim.estadual && <Estadual e={sim.estadual} clubId={sim.clubId} />}
                  <Form sim={sim} />
                  <Fixtures sim={sim} />
                  <section className={PANEL}>
                    <h3 className={LABEL}>{t('career.money', { season: sim.season })}</h3>
                    <dl className="flex items-baseline justify-between gap-4 font-condensed text-xl font-extrabold uppercase tabular-nums">
                      <dt>{t('career.net')}</dt>
                      <dd className={net < 0 && earned ? 'text-club-danger' : 'text-club-gold'}>
                        {t('career.cash', { value: net })}
                      </dd>
                    </dl>
                    {net < 0 && !earned && (
                      <p className="text-sm text-chalk-soft">{t('career.netOpening')}</p>
                    )}
                    <details className="group">
                      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-chalk-soft">
                        {t('career.ledger')}
                      </summary>
                      <dl className="flex flex-col gap-2.5 tabular-nums">
                        {sim.money.map((m) => (
                          <div key={m.kind} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                            <dt className="text-chalk-soft">
                              {t('career.moneyKind', { k: m.kind })}
                            </dt>
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
                      </dl>
                      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-chalk/15 pt-3 text-sm tabular-nums">
                        {sim.fx.map((x) => (
                          <Fragment key={x.currency}>
                            <dt className="text-chalk-soft">{t('career.fx', { c: x.currency })}</dt>
                            <dd>{t('career.fxRate', { rate: x.rate, change: x.change / 10 })}</dd>
                          </Fragment>
                        ))}
                      </dl>
                    </details>
                  </section>
                </div>
              </section>
              <div className="sala-slab empty:hidden">
                <Cup sim={sim} />
              </div>
            </>
          )}
          {import.meta.env.DEV && (
            <p className="text-xs text-chalk-soft/80">{t('career.builtHere', { ms: sim.ms })}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Seasons whose closing scene this browser has already shown (the turn stays in the view). */
const SEEN_TURN = 'dc_club_turn';

/**
 * The season's verdict as a scene, once: the cup on the pitch when the club goes up (or wins the
 * division), the street outside the stadium when it goes down. A season that changes nothing
 * stays a line in the office.
 */
function SeasonMoment(props: {
  careerId: string;
  turn: NonNullable<SimView['turn']>;
  club: ClubFace;
}) {
  const { turn, club } = props;
  // Every career starts in the same year: the mark is the career and its season.
  const mark = `${props.careerId}:${turn.season}`;
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_TURN) !== mark;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(SEEN_TURN, mark);
    } catch {
      // Private mode: the scene may show again after a reload; nothing is lost.
    }
  }, [open, mark]);
  if (!open) return null;
  const up = turn.move === 'promotion';
  const plate = up ? 'gloria' : 'estadio';
  const title = up && turn.champion === club.shortName ? 'champion' : turn.move;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="season-moment"
      className="fixed inset-0 z-50 flex overflow-y-auto bg-club-night p-5 sm:p-10"
    >
      <picture aria-hidden className="club-moment-plate">
        <source media="(orientation: portrait)" srcSet={`/img/clube/${plate}-v.webp`} />
        <img
          src={`/img/clube/${plate}-h.webp`}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
      <span
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-[rgb(3_6_5/0.95)] via-[rgb(3_6_5/0.45)] to-[rgb(3_6_5/0.2)]"
      />
      <div className="sala-glass club-moment-copy relative mt-auto flex w-full max-w-4xl flex-col items-start gap-5">
        <Crest club={club} size="xl" />
        <h2
          id="season-moment"
          className={`font-condensed text-[clamp(3.5rem,13vw,9rem)] leading-[0.84] font-black text-balance uppercase ${up ? 'text-club-gold' : ''}`}
        >
          {t('career.momentTitle', { m: title })}
        </h2>
        <p className="max-w-[46ch] text-xl leading-snug font-medium text-pretty">
          {t('career.momentText', {
            m: title,
            club: club.name,
            season: turn.season,
            champion: turn.champion,
          })}
        </p>
        <button
          type="button"
          autoFocus
          className={`${btnPrimary} min-h-14 bg-club-gold px-8 text-xl`}
          onClick={() => setOpen(false)}
        >
          {t('career.momentGo', { season: turn.season + 1 })}
        </button>
      </div>
    </div>
  );
}

const PAGE = 'mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-8';
const ROOM_ICON = {
  sala: 'desk',
  vestiario: 'shirt',
  treino: 'cone',
  mercado: 'transfer',
  diretoria: 'trophy',
} as const;

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

/**
 * The next match, lettered on the office window over the lit pitch. The plate behind is still;
 * the two badges and the names arrive once per fixture.
 */
function NextMatch(props: {
  sim: SimView;
  busy: boolean;
  stage: Stage | null;
  onWatch: (w: Watch) => void;
  onPlay: () => void;
  onNextSeason: () => void;
  onSkip: () => void;
  onMarket: () => void;
  onTraining: () => void;
}) {
  const { sim, busy, stage } = props;
  const next = sim.next;
  if (sim.preseason)
    return (
      <section aria-labelledby="career-next" className="sala-window flex flex-col justify-end">
        <div className="sala-glass mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center">
          <p className="font-condensed text-sm font-extrabold tracking-wide text-chalk-soft uppercase">
            {t('career.dateLong', { d: new Date(`${sim.preseason.iso}T12:00:00Z`) })}
          </p>
          <h3
            id="career-next"
            className="font-condensed text-3xl leading-none font-black text-club-gold uppercase sm:text-5xl"
          >
            {t('career.preseason')}
          </h3>
          <p className="text-balance">
            {t('career.preseasonText', {
              n: sim.preseason.days,
              d: new Date(`${sim.preseason.debut}T12:00:00Z`),
            })}
          </p>
          {next && (
            <div className="flex w-full flex-col items-center gap-2 border-t border-chalk/15 pt-3">
              <p className="font-condensed text-lg font-extrabold text-club-gold uppercase">
                {t('career.preseasonDebut')}
              </p>
              <div className="flex items-center gap-3">
                <Crest club={next.home} size="lg" />
                <span className="font-condensed text-2xl font-black text-club-gold">×</span>
                <Crest club={next.away} size="lg" />
              </div>
              <p className="text-sm font-semibold text-balance">
                {next.home.shortName} × {next.away.shortName}
                <span className="mx-2 text-club-gold">/</span>
                {competitionLabel(next)}
              </p>
            </div>
          )}
          <p className="text-sm text-balance text-chalk-soft">{t('career.preseasonWhy')}</p>
          <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              disabled={busy}
              className={`${btnSecondary} bg-club-night/80`}
              onClick={props.onTraining}
            >
              {t('career.preseasonTraining')}
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${btnSecondary} bg-club-night/80`}
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
              {t('career.preseasonDay')}
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${btnPrimary} min-h-13 bg-club-gold`}
              onClick={props.onSkip}
            >
              {t('career.preseasonSkip')}
            </button>
          </div>
        </div>
      </section>
    );
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
          {next && (
            <div className="flex w-full flex-col items-center gap-2 border-t border-chalk/15 pt-3">
              <p className="font-condensed text-lg font-extrabold text-club-gold uppercase">
                {t('career.next')}
              </p>
              <div className="flex items-center gap-3">
                <Crest club={next.home} size="lg" />
                <span className="font-condensed text-2xl font-black text-club-gold">×</span>
                <Crest club={next.away} size="lg" />
              </div>
              <p className="text-sm font-semibold text-balance">
                {next.home.shortName} × {next.away.shortName}
                <span className="mx-2 text-club-gold">/</span>
                {t('career.dateLong', { d: new Date(`${next.iso}T12:00:00Z`) })}
                <span className="mx-2 text-club-gold">/</span>
                {competitionLabel(next)}
              </p>
            </div>
          )}
          <p className="text-sm text-balance text-chalk-soft">{t('career.deadlineWhy')}</p>
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
                <Kits club={c} away={k === 1} />
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
            {competitionLabel(next)}
          </p>
          {next.rest !== null && next.rest <= CONGESTED && (
            <p className="text-center text-sm text-balance text-club-gold">
              {t('copa.congested', { n: next.rest })}
            </p>
          )}
          {next.coach && (
            <p className="text-center text-sm text-balance text-chalk-soft">
              {t('career.rivalCoach', { coach: next.coach.name, style: next.coach.style })}
            </p>
          )}
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
          {next.quickOnly && <p className="text-sm text-chalk-soft">{t('career.quickOnly')}</p>}
          <div className="grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-[1.2fr_1fr_1fr] sm:whitespace-nowrap">
            {!next.quickOnly && (
              <>
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
                  className={`${btnSecondary} bg-club-night/80 px-1 text-sm whitespace-nowrap min-[25rem]:text-base sm:px-4 sm:text-lg`}
                  onClick={() => props.onWatch('highlights')}
                >
                  {t('career.watchHighlights')}
                </button>
              </>
            )}
            <button
              type="button"
              disabled={busy}
              className={`${btnSecondary} bg-club-night/80 px-1 text-sm whitespace-nowrap min-[25rem]:text-base sm:px-4 sm:text-lg`}
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
          {sim.review && <SeasonReview review={sim.review} club={sim.club} />}
          <button
            type="button"
            disabled={busy}
            className={`${btnPrimary} min-h-13 bg-club-gold`}
            onClick={props.onNextSeason}
          >
            {t('career.nextSeason', { season: sim.season + 1 })}
          </button>
          {busy && stage && (
            <p role="status" className="text-chalk-soft">
              {t(STAGE_TEXT[stage])}
            </p>
          )}
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
                  {t('career.whySide', { s: sideOf(f.side) })}
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

const FIXTURES_SHORT = 4;

/** The next four matches; the whole calendar of the season opens in place. */
function Fixtures({ sim }: { sim: SimView }) {
  const [all, setAll] = useState(false);
  if (sim.fixtures.length === 0) return null;
  return (
    <section className={PANEL}>
      <h3 className={LABEL}>{t('career.fixtures')}</h3>
      <ol className="flex flex-col">
        {(all ? sim.fixtures : sim.fixtures.slice(0, FIXTURES_SHORT)).map((f) => (
          <li
            key={f.iso + f.opponent.shortName}
            className="flex items-center gap-3 border-t border-chalk/10 py-1.5 first:border-0"
          >
            <span className="w-20 text-sm text-chalk-soft tabular-nums">
              {t('career.date', { d: new Date(`${f.iso}T12:00:00Z`) })}
            </span>
            <Crest club={f.opponent} size="sm" />
            <span className="min-w-0 flex-1 truncate font-semibold">
              <span className="sm:hidden">{f.opponent.shortName}</span>
              <span className="max-sm:hidden">{f.opponent.name}</span>
              <span className="ml-2 text-xs font-normal text-chalk-soft">
                {competitionLabel(f)}
              </span>
            </span>
            {f.rest !== null && f.rest <= CONGESTED && (
              <span className="text-xs font-bold text-club-gold tabular-nums">
                {t('copa.rest', { n: f.rest })}
              </span>
            )}
            <span className="text-xs font-bold text-chalk-soft uppercase">
              {t('career.venueShort', { v: VENUE[Number(f.atHome)]! })}
            </span>
          </li>
        ))}
      </ol>
      {sim.fixtures.length > FIXTURES_SHORT && (
        <button
          type="button"
          aria-expanded={all}
          className="-ml-2 flex min-h-11 w-fit items-center gap-1.5 rounded-md px-2 text-sm font-bold text-club-gold hover:bg-club-gold/10"
          onClick={() => setAll(!all)}
        >
          {all ? t('career.fixturesLess') : t('career.fixturesAll', { n: sim.fixtures.length })}
        </button>
      )}
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
  coachHired: 'press',
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
  sellOn: 'finance',
  optionBought: 'market',
  optionSold: 'market',
  unhappy: 'staff',
  leaveRequest: 'staff',
  promiseKept: 'staff',
  promiseBroken: 'staff',
  injury: 'staff',
  suspension: 'staff',
  calledUp: 'staff',
  quota: 'finance',
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
  copaDraw: 'board',
  copaOut: 'board',
  copaTitle: 'board',
  estadual: 'press',
  regional: 'press',
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
    case 'coachHired':
      return t('inbox.coachHired', { club: n.clubName, coach: n.coach, style: n.style });
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
    case 'sellOn':
      return t('inbox.sellOn', { name: n.player, fee: t('career.cash', { value: n.fee }) });
    case 'optionBought':
    case 'optionSold':
      return t(`inbox.${n.kind}`, {
        club: n.clubName,
        name: n.player,
        fee: t('career.cash', { value: n.fee }),
      });
    case 'unhappy':
    case 'leaveRequest':
    case 'promiseKept':
    case 'promiseBroken':
      return t(`inbox.${n.kind}`, { name: n.player });
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
    case 'calledUp':
      return t('inbox.calledUp', { name: n.player });
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
    case 'quota':
      return t('inbox.quota', {
        line: n.line,
        source: n.source,
        phase: n.phase,
        amount: t('career.cash', { value: n.amount }),
      });
    case 'copaDraw':
      return t('inbox.copaDraw', {
        phase: t('copa.phase', { p: n.phase }),
        legs: n.legs,
        opp: n.clubName,
        home: BOOL[Number(n.atHome)]!,
      });
    case 'copaOut':
      return t('inbox.copaOut', {
        phase: t('copa.phaseIn', { p: n.phase }),
        by: n.by,
      });
    case 'copaTitle':
      return t('inbox.copaTitle');
    case 'estadual':
      return t('inbox.estadual', {
        name: n.name,
        champion: n.clubName,
        position: n.position,
        prize: t('career.cash', { value: n.prize }),
        paid: String(n.prize > 0),
      });
    case 'regional':
      return t('inbox.regional', {
        name: n.name,
        champion: n.clubName,
        position: n.position,
        prize: t('career.cash', { value: n.prize }),
        paid: String(n.prize > 0),
      });
    case 'season':
      return t('inbox.season', { season: n.season, champion: n.clubName, move: n.move });
  }
}

/** Where each kind of request is answered. */
const TODO_ROOM = {
  bid: 'mercado',
  agentOffer: 'mercado',
  contractsEnding: 'mercado',
  leaveRequest: 'mercado',
} as const;

/** Where a note is acted on, when it asks for anything. */
const NOTE_ROOM: Partial<Record<InboxItem['kind'], Room>> = {
  agentOffer: 'mercado',
  homecoming: 'mercado',
  bid: 'mercado',
  contractsEnding: 'mercado',
  scouted: 'mercado',
  tired: 'treino',
  injury: 'vestiario',
  cameUp: 'treino',
  crop: 'treino',
  ultimatum: 'diretoria',
  goal: 'diretoria',
  fairplay: 'diretoria',
  cashRed: 'diretoria',
};
const INBOX_SHORT = 6;

/**
 * What the club was told, newest first: kept in the career, so it is there after a reload.
 * The agents' offers of one day read as one note, and a note that asks for something says where.
 */
function Inbox({
  sim,
  onGo,
  onBid,
}: {
  sim: SimView;
  onGo: (r: Room) => void;
  /** Opens a bid's talk (BidTalk.tsx). */
  onBid: (bidId: string, from: HTMLElement) => void;
}) {
  const [all, setAll] = useState(false);
  const notes = useMemo(() => {
    const out: { n: InboxItem; text: string }[] = [];
    let run: { day: InboxItem['day']; names: string[]; at: number } | null = null;
    for (const n of sim.inbox) {
      if (n.kind === 'agentOffer') {
        if (run && run.day === n.day) {
          run.names.push(n.player);
          out[run.at]!.text = t('inbox.agentOffers', {
            n: run.names.length,
            names: run.names.join(', '),
          });
          continue;
        }
        run = { day: n.day, names: [n.player], at: out.length };
      } else run = null;
      out.push({ n, text: noteText(n, sim) });
    }
    return out;
  }, [sim]);
  const shown = all ? notes : notes.slice(0, INBOX_SHORT);
  return (
    <section className={PANEL}>
      <h3 className={LABEL}>{t('career.inbox')}</h3>
      <h4 className="font-condensed text-base font-extrabold uppercase">{t('career.todo')}</h4>
      {sim.todo.length === 0 ? (
        <p className="text-chalk-soft">{t('career.todoEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sim.todo.map((x, i) => (
            <li
              key={`${x.kind}-${i}`}
              className="flex flex-wrap items-center gap-2 border-t border-chalk/10 pt-2 first:border-0 first:pt-0"
            >
              <p className="min-w-[14rem] flex-1">
                {t('career.todoText', {
                  k: x.kind,
                  club: x.clubName,
                  where: x.clubName ? ` (${x.clubName})` : '',
                  name: x.playerName,
                  fee: x.kind === 'bid' ? t('career.cash', { value: x.fee }) : '',
                  n: x.kind === 'contractsEnding' ? x.players : 0,
                })}
              </p>
              <button
                type="button"
                className={`${btnSecondary} min-h-11 px-3 text-base`}
                onClick={(e) =>
                  x.kind === 'approach'
                    ? document
                        .getElementById(`convite-${x.club}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    : x.kind === 'bid'
                      ? onBid(x.id, e.currentTarget)
                      : onGo(TODO_ROOM[x.kind])
                }
              >
                {t('career.todoGo', { k: x.kind })}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h4 className="mt-2 font-condensed text-base font-extrabold uppercase">{t('career.news')}</h4>
      {notes.length === 0 ? (
        <p className="text-chalk-soft">{t('inbox.empty')}</p>
      ) : (
        <ul className="flex flex-col">
          {shown.map(({ n, text }, i) => {
            const room = NOTE_ROOM[n.kind];
            return (
              <li
                key={`${n.day}-${n.kind}-${i}`}
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-1 border-t border-chalk/10 py-3 first:border-0 first:pt-0"
              >
                <span
                  aria-hidden
                  className={`size-2.5 translate-y-[1px] rounded-full ${FROM_TONE[FROM[n.kind]]}`}
                />
                <span className="font-condensed text-lg leading-none font-extrabold uppercase">
                  {t('career.from', { f: FROM[n.kind] })}
                </span>
                <span className="text-xs text-chalk-soft tabular-nums">
                  {t('career.date', { d: new Date(`${n.iso}T12:00:00Z`) })}
                </span>
                <p className="col-span-2 col-start-2 max-w-[70ch] text-pretty text-chalk/90">
                  {text}
                </p>
                {n.kind === 'bid' && n.id !== undefined ? (
                  <button
                    type="button"
                    className="col-span-2 col-start-2 -ml-2 flex min-h-9 w-fit items-center gap-1.5 rounded-md px-2 text-sm font-bold text-club-gold hover:bg-club-gold/10"
                    onClick={(e) => onBid(n.id!, e.currentTarget)}
                  >
                    {t('bidTalk.open')}
                    <Icon name="forward" className="size-4" />
                  </button>
                ) : (
                  room && (
                    <button
                      type="button"
                      className="col-span-2 col-start-2 -ml-2 flex min-h-9 w-fit items-center gap-1.5 rounded-md px-2 text-sm font-bold text-club-gold hover:bg-club-gold/10"
                      onClick={() => onGo(room)}
                    >
                      {t('inbox.open', { r: room })}
                      <Icon name="forward" className="size-4" />
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
      {notes.length > INBOX_SHORT && (
        <button
          type="button"
          className={`${btnSecondary} min-h-11 self-start px-4 text-base`}
          onClick={() => setAll(!all)}
        >
          {all ? t('inbox.less') : t('inbox.more', { n: notes.length })}
        </button>
      )}
    </section>
  );
}

const GUIDE = ['vestiario', 'mercado', 'diretoria', 'jogar'] as const;
/** '1' once the guide is done (the key older careers already have). */
const guideKey = (id: string) => `clube-guia:${id}`;
/** The step reached, while the guide is still open. */
const guideStepKey = (id: string) => `clube-guia-passo:${id}`;

/**
 * The first week's guide: one card per step, each linking to its room. It shows in the Sala only;
 * visiting a step's room, by the guide or the room bar, ticks the step. Remembered per career.
 */
function Guide({
  careerId,
  room,
  onRoom,
}: {
  careerId: string;
  room: Room;
  onRoom: (r: Room) => void;
}) {
  const [step, setStepState] = useState(() => {
    try {
      if (localStorage.getItem(guideKey(careerId)) === '1') return GUIDE.length;
      return Number(localStorage.getItem(guideStepKey(careerId))) || 0;
    } catch {
      return 0;
    }
  });
  const setStep = (n: number) => {
    setStepState(n);
    try {
      if (n >= GUIDE.length) localStorage.setItem(guideKey(careerId), '1');
      else localStorage.setItem(guideStepKey(careerId), String(n));
    } catch {
      // Private mode: the guide starts over on the next visit.
    }
  };
  useEffect(() => {
    if (GUIDE[step] === room) setStep(step + 1);
  }, [room]);
  if (step >= GUIDE.length || room !== 'sala') return null;
  const finish = () => setStep(GUIDE.length);
  const key = GUIDE[step]!;
  const last = step === GUIDE.length - 1;
  return (
    <section aria-label={t('guide.title')} className={`${PANEL} sala-slab`}>
      <h3 className={LABEL}>{t('guide.step', { n: step + 1, total: GUIDE.length })}</h3>
      <p className="text-balance">{t('guide.text', { k: key })}</p>
      <div className="flex flex-wrap gap-2">
        {!last && (
          <button
            type="button"
            className={`${btnPrimary} min-h-11 bg-club-gold px-4 text-base`}
            onClick={() => onRoom(key as Room)}
          >
            {t('guide.go', { k: key })}
          </button>
        )}
        <button
          type="button"
          className={`${btnSecondary} min-h-11 px-4 text-base`}
          onClick={last ? finish : () => setStep(step + 1)}
        >
          {last ? t('guide.done') : t('guide.next')}
        </button>
        {!last && (
          <button
            type="button"
            className="min-h-11 px-3 text-chalk-soft underline"
            onClick={finish}
          >
            {t('guide.skip')}
          </button>
        )}
      </div>
    </section>
  );
}
/** Three days or less between two matches: a congested week, the squad needs rotating. */
const CONGESTED = 3;
/** A match's competition, with the phase and the leg in the cup. */
const competitionLabel = (m: {
  competition: string;
  stage: SimView['fixtures'][number]['stage'];
}) =>
  m.stage
    ? t('copa.label', {
        name: m.competition,
        phase: t('copa.phase', { p: m.stage.phase }),
        leg: t('copa.leg', { legs: m.stage.legs, leg: m.stage.leg }),
      })
    : m.competition;
const MSG_RESULT = { W: 'career.msgWin', D: 'career.msgDraw', L: 'career.msgLoss' } as const;

const HEAD = ['pos', 'club', 'played', 'won', 'drawn', 'lost', 'gd', 'points'] as const;

function Table(props: {
  rows: SimView['table'];
  title: string;
  clubId: string;
  /** Places that go up and down; a table without them (a state group) draws no zone. */
  zones?: SimView['zones'];
}) {
  const { rows, title, clubId } = props;
  const { up, down } = props.zones ?? { up: 0, down: 0 };
  const size = rows.length;
  // A phone starts on five rows around the club; "Ver tabela" opens the rest.
  const [all, setAll] = useState(false);
  const mine = Math.max(
    0,
    rows.findIndex((r) => r.clubId === clubId),
  );
  const from = all || size <= 5 ? 0 : Math.min(Math.max(0, mine - 2), size - 5);
  const to = all || size <= 5 ? size : from + 5;
  // A hairline closes each zone: after the last place that goes up, before the first that falls.
  const edge = (i: number) =>
    up > 0 && i === up
      ? 'border-t border-chalk/50'
      : down > 0 && i === size - down
        ? 'border-t border-chalk/50'
        : 'border-t border-chalk/10';
  return (
    <section className={PANEL}>
      <h3 className={LABEL}>{title}</h3>
      <table className="w-full table-fixed text-sm tabular-nums">
        <thead className="text-chalk-soft">
          <tr>
            {HEAD.map((c) => (
              <th
                key={c}
                scope="col"
                className={`pb-1 font-normal ${c === 'pos' || c === 'club' ? 'text-left' : 'text-right'} ${c === 'pos' ? 'w-7' : c === 'club' ? '' : c === 'won' || c === 'drawn' || c === 'lost' ? 'w-7 max-sm:hidden' : c === 'played' ? 'w-7' : 'w-9'}`}
              >
                {c === 'won' || c === 'drawn' || c === 'lost'
                  ? t('career.colRecord', { c })
                  : t('career.col', { c })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(from, to).map((row, k) => {
            const i = from + k;
            const r = row;
            return (
              <tr
                key={r.clubId}
                aria-current={r.clubId === clubId || undefined}
                className={
                  r.clubId === clubId
                    ? `bg-club-gold/15 font-bold text-club-gold ${edge(i)}`
                    : edge(i)
                }
              >
                <td className="py-1.5 pl-1">{i + 1}</td>
                <td>
                  <span className="flex min-w-0 items-center gap-2">
                    <Crest club={r} size="sm" />
                    <span className="leading-tight text-pretty" title={r.name}>
                      <span className="sm:hidden">{r.shortName}</span>
                      <span className="max-sm:hidden">{r.name}</span>
                    </span>
                  </span>
                </td>
                <td className="text-right">{r.played}</td>
                <td className="text-right max-sm:hidden">{r.won}</td>
                <td className="text-right max-sm:hidden">{r.drawn}</td>
                <td className="text-right max-sm:hidden">{r.lost}</td>
                <td className="text-right">{r.gd}</td>
                <td className="pr-1 text-right font-bold">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {size > 5 && (
        <button
          type="button"
          aria-expanded={all}
          className="min-h-11 self-start font-semibold text-club-gold underline-offset-4 hover:underline"
          onClick={() => setAll(!all)}
        >
          {all ? t('career.tableFewer') : t('career.tableMore', { n: size })}
        </button>
      )}
      {(up > 0 || down > 0) && (
        <p className="flex gap-x-4 text-xs text-chalk-soft">
          {up > 0 && <span>{t('career.zoneUp', { n: up })}</span>}
          {down > 0 && <span>{t('career.zoneDown', { n: down })}</span>}
        </p>
      )}
    </section>
  );
}

/** The state championship: the club's group table, then the knockout ties as they were played. */
function Estadual({ e, clubId }: { e: NonNullable<SimView['estadual']>; clubId: string }) {
  return (
    <>
      <Table rows={e.table} title={e.name} clubId={clubId} />
      {e.ties.length > 0 && (
        <section className={PANEL}>
          <h3 className={LABEL}>{t('career.estadualKnockout')}</h3>
          <ul className="flex flex-col gap-1 text-sm tabular-nums">
            {e.ties.map((x, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-chalk-soft">{t('career.estadualStage', { s: x.stage })}</span>
                <span>
                  {t('career.estadualTie', {
                    home: x.home.shortName,
                    away: x.away.shortName,
                    played: String(x.goals !== null),
                    a: x.goals?.[0] ?? 0,
                    b: x.goals?.[1] ?? 0,
                  })}
                </span>
              </li>
            ))}
          </ul>
          {e.champion && (
            <p className="font-bold">{t('career.estadualChampion', { name: e.champion })}</p>
          )}
        </section>
      )}
    </>
  );
}

/** A fact's side as the report's select reads it. */
const sideOf = (side: number) => (side > 0 ? 'for' : 'against');
