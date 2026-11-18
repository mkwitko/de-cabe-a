/**
 * The market: bids other clubs made for the person's players, the talks the person opened (the
 * fee with the selling club, then the contract with the player), the players to go after, the
 * person's squad and its for-sale list, the club's scouts (only players they know are listed),
 * and the deals between the other clubs with each
 * buyer's reasons (club-domain market/). A deal closes only when both tables agree.
 */
import { useEffect, useState } from 'react';
import { btnPrimary, btnSecondary } from '../../../components/ui';
import { t } from '../i18n';
import type { MarketAct, MarketPlayer, MarketView, SimReply, SimRequest } from './sim.worker';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Ask = (req: DistributiveOmit<SimRequest, 'id'>) => Promise<SimReply>;
type Do = (act: MarketAct) => void;

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
const POSITIONS = ['GK', 'CB', 'RB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST'] as const;
const ROLES = ['starter', 'rotation', 'backup', 'prospect'] as const;
const YEARS = [1, 2, 3, 4, 5] as const;
const BOOL = ['false', 'true'] as const;
const money = (value: number) => t('career.cash', { value });
const chip = (on: boolean) =>
  `min-h-11 shrink-0 rounded-lg px-3 font-condensed text-base font-extrabold whitespace-nowrap ${on ? 'bg-club-gold text-ink' : 'bg-chalk/8 text-chalk hover:bg-chalk/15'}`;
const FIELD =
  'min-h-11 w-full min-w-0 rounded-lg border border-chalk/25 bg-club-night px-3 font-semibold tabular-nums';
const SMALL = `${btnSecondary} px-3 text-base`;
const GO = `${btnPrimary} bg-club-gold px-3 text-base`;

/** Who he is, in one line under his name. */
function Who({ p, club = true }: { p: MarketPlayer; club?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-xs text-chalk-soft">
      {club && (
        <>
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full border"
            style={{ background: p.club.colours[0], borderColor: p.club.colours[1] }}
          />
          <span className="font-bold text-chalk">
            {p.free ? t('market.noClub') : p.club.shortName}
          </span>
        </>
      )}
      <span>{t('squad.age', { n: p.age })}</span>
      <span>{t('market.wage', { wage: money(p.wage) })}</span>
      <span>{t('market.value', { value: money(p.value) })}</span>
      {p.until !== null && <span>{t('market.until', { year: p.until })}</span>}
      <span>{t('market.potential', { lo: p.potential[0], hi: p.potential[1] })}</span>
      {p.release !== null && <span>{t('market.clause', { fee: money(p.release) })}</span>}
      {p.knowledge !== null && (
        <span className="font-bold text-club-gold">
          {t('market.knowledge', { k: p.knowledge })}
          {p.seenMonths !== null && ` · ${t('market.seenAgo', { n: p.seenMonths })}`}
        </span>
      )}
    </span>
  );
}

function Head({ p, club }: { p: MarketPlayer; club?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 shrink-0 font-condensed text-sm font-extrabold text-club-gold">
        {t('squad.position', { p: p.position })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{p.name}</span>
        <Who p={p} club={club ?? true} />
      </span>
      <span className="font-condensed text-2xl leading-none font-black whitespace-nowrap tabular-nums">
        {p.range[0] === p.range[1]
          ? p.rating
          : t('market.band', { lo: p.range[0], hi: p.range[1] })}
      </span>
    </div>
  );
}

/** One talk: the fee against the club's asking price, then the contract against the player's. */
function Talk({ talk, act }: { talk: MarketView['talks'][number]; act: Do }) {
  const p = talk.player;
  const [fee, setFee] = useState(String(p.value));
  const [wage, setWage] = useState(String(talk.wants?.wage ?? p.wage));
  const [years, setYears] = useState(talk.wants?.years ?? 3);
  const [role, setRole] = useState(talk.wants?.role ?? 'rotation');
  const [clause, setClause] = useState('');
  const playerId = p.id;
  return (
    <li className="flex flex-col gap-3 border-t border-chalk/10 py-4 first:border-0 first:pt-0">
      <Head p={p} />
      {talk.stage === 'fee' ? (
        <>
          <p>
            <span className="font-semibold">
              {t('market.asks', { club: p.club.shortName, fee: money(talk.asking) })}
            </span>{' '}
            <span className="text-chalk-soft">
              {t('market.mood', { m: talk.mood })} {t('market.left', { n: talk.left })}
            </span>
          </p>
          <div className="flex flex-wrap gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
            <label className="min-w-40 flex-1 basis-full sm:basis-0">
              <span className="sr-only">{t('market.yourFee')}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className={FIELD}
              />
            </label>
            <button
              type="button"
              className={GO}
              onClick={() => act({ do: 'fee', playerId, fee: Math.round(Number(fee)) || 0 })}
            >
              {t('market.offer')}
            </button>
            <button
              type="button"
              className={SMALL}
              onClick={() => act({ do: 'fee', playerId, fee: talk.asking })}
            >
              {t('market.payAsk')}
            </button>
            {talk.release !== null && (
              <button
                type="button"
                className={SMALL}
                onClick={() => act({ do: 'fee', playerId, fee: talk.release ?? 0 })}
              >
                {t('market.payClause')}
              </button>
            )}
            <button type="button" className={SMALL} onClick={() => act({ do: 'drop', playerId })}>
              {t('market.drop')}
            </button>
          </div>
        </>
      ) : (
        talk.wants && (
          <>
            <p>
              <span className="font-semibold">
                {talk.kind === 'buy'
                  ? t('market.agreed', { club: p.club.shortName, fee: money(talk.fee ?? 0) })
                  : t(talk.kind === 'free' ? 'market.freeTalk' : 'market.renewTalk')}
              </span>{' '}
              {t('market.wants', {
                name: p.name,
                wage: money(talk.wants.wage),
                years: talk.wants.years,
                role: t('market.role', { r: talk.wants.role }),
              })}{' '}
              <span className="text-chalk-soft">{t('market.left', { n: talk.left })}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-1">
                {t('market.yourWage')}
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={wage}
                  onChange={(e) => setWage(e.target.value)}
                  className={FIELD}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t('market.years')}
                <select
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className={FIELD}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t('market.roleLabel')}
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                  className={FIELD}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t('market.role', { r })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              {t('market.yourClause')}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={clause}
                onChange={(e) => setClause(e.target.value)}
                className={FIELD}
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                className={`${GO} col-span-2 sm:col-span-1`}
                onClick={() =>
                  act({
                    do: 'terms',
                    playerId,
                    terms: {
                      wage: Math.round(Number(wage)) || 0,
                      years,
                      role,
                      release: clause.trim() ? Math.round(Number(clause)) || null : null,
                    },
                  })
                }
              >
                {t('market.propose')}
              </button>
              <button
                type="button"
                className={SMALL}
                onClick={() => talk.wants && act({ do: 'terms', playerId, terms: talk.wants })}
              >
                {t('market.takeAsk')}
              </button>
              <button type="button" className={SMALL} onClick={() => act({ do: 'drop', playerId })}>
                {t('market.drop')}
              </button>
            </div>
          </>
        )
      )}
    </li>
  );
}

/** A bid for one of the person's players: yes, no, or a price. */
function BidRow({ bid, act }: { bid: MarketView['bids'][number]; act: Do }) {
  const [fee, setFee] = useState(String(bid.fee));
  const bidId = bid.id;
  return (
    <li className="flex flex-col gap-3 border-t border-chalk/10 py-4 first:border-0 first:pt-0">
      <Head p={bid.player} club={false} />
      <p className="font-semibold">
        {t('market.bidText', {
          club: bid.from.shortName,
          fee: money(bid.fee),
          name: bid.player.name,
        })}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[auto_auto_1fr_auto]">
        <button
          type="button"
          className={GO}
          onClick={() => act({ do: 'bid', bidId, answer: 'accept' })}
        >
          {t('market.accept')}
        </button>
        <button
          type="button"
          className={SMALL}
          onClick={() => act({ do: 'bid', bidId, answer: 'refuse' })}
        >
          {t('market.refuse')}
        </button>
        <label>
          <span className="sr-only">{t('market.yourPrice')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className={FIELD}
          />
        </label>
        <button
          type="button"
          className={SMALL}
          onClick={() =>
            act({ do: 'bid', bidId, answer: 'counter', fee: Math.round(Number(fee)) || 0 })
          }
        >
          {t('market.counter')}
        </button>
      </div>
    </li>
  );
}

/** Another club as an institution: its money, who runs it, what it has built. */
function Office({ office }: { office: NonNullable<MarketView['other']>['office'] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 border-t border-chalk/10 pt-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-chalk-soft">{t('market.officeCash')}</dt>
        <dd
          className={`font-condensed text-xl font-extrabold tabular-nums ${office.cash < 0 ? 'text-club-danger' : ''}`}
        >
          {t('career.cash', { value: office.cash })}
        </dd>
      </div>
      <div>
        <dt className="text-chalk-soft">{t('market.officeBoard')}</dt>
        <dd className="font-semibold">
          {t('market.officeBoardText', { h: office.horizon, c: office.competence })}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-chalk-soft">{t('board.structure')}</dt>
        <dd className="flex flex-wrap gap-x-3 gap-y-1">
          {office.structure.map((x) => (
            <span key={x.front} className="whitespace-nowrap">
              {t('board.front', { f: x.front })}{' '}
              <span className="font-semibold tabular-nums">
                {x.front === 'stadium' ? t('board.seats', { n: x.level }) : x.level}
              </span>
              {office.works.includes(x.front) && (
                <span className="text-club-gold"> {t('market.officeWork')}</span>
              )}
            </span>
          ))}
        </dd>
      </div>
    </dl>
  );
}

/** The other side's answer, in a sentence. */
/**
 * Another club's squad: every name, the numbers only for players the club knows, and a scout
 * to send on any one of them.
 */
function Squads(props: {
  view: MarketView;
  club: string | null;
  pick: (id: string | null) => void;
  act: Do;
}) {
  const { view, club, pick, act } = props;
  const busy = view.scouting.away.length >= view.scouting.scouts;
  return (
    <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
      <h3 className={LABEL}>{t('market.squads')}</h3>
      <p className="text-sm text-chalk-soft">
        {t('market.squadsInfo', { cost: money(view.scouting.watchCost) })}
      </p>
      <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold">
        {t('market.squadsPick')}
        <select className={FIELD} value={club ?? ''} onChange={(e) => pick(e.target.value || null)}>
          <option value="">{t('market.squadsNone')}</option>
          {view.clubList.map((d) => (
            <optgroup key={d.division} label={d.division}>
              {d.clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {view.other && <Office office={view.other.office} />}
      {view.other && (
        <ul>
          {view.other.players.map((p) => {
            const known = (p.knowledge ?? 0) > 0;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-chalk/10 py-2"
              >
                <span className="flex min-w-0 flex-1 basis-48 items-center gap-3">
                  <span className="w-9 shrink-0 font-condensed text-sm font-extrabold text-club-gold">
                    {t('squad.position', { p: p.position })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="text-xs text-chalk-soft">
                      {t('squad.age', { n: p.age })}
                      {' · '}
                      {known ? t('market.knowledge', { k: p.knowledge ?? 0 }) : t('market.unknown')}
                      {p.seenMonths !== null && ` · ${t('market.seenAgo', { n: p.seenMonths })}`}
                    </span>
                  </span>
                  <span className="font-condensed text-xl leading-none font-black whitespace-nowrap tabular-nums">
                    {!known
                      ? '?'
                      : p.range[0] === p.range[1]
                        ? p.rating
                        : t('market.band', { lo: p.range[0], hi: p.range[1] })}
                  </span>
                </span>
                <button
                  type="button"
                  className={SMALL}
                  disabled={p.watching || busy}
                  aria-label={p.watching ? undefined : t('market.watchFor', { name: p.name })}
                  onClick={() => act({ do: 'scout', area: `player:${p.id}` })}
                >
                  {p.watching ? t('market.watching') : t('market.watch')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The club's scouts: who is away, and a trip to send one on. */
function Scouts({ s, act }: { s: MarketView['scouting']; act: Do }) {
  const free = s.areas.filter((a) => !s.away.some((m) => m.area === a.area));
  const [area, setArea] = useState(free[0]?.area ?? '');
  const busy = s.away.length >= s.scouts;
  return (
    <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
      <h3 className={LABEL}>{t('market.scouts')}</h3>
      <p className="text-sm text-chalk-soft">{t('market.scoutsInfo', { n: s.scouts })}</p>
      <p className="font-semibold">{t('market.scoutsKnown', { n: s.known })}</p>
      {s.away.length > 0 && (
        <ul>
          {s.away.map((m) => (
            <li key={m.area} className="border-t border-chalk/10 py-2 first:border-0">
              {t('market.scoutAway', {
                area: m.label,
                date: `${m.back.slice(8, 10)}/${m.back.slice(5, 7)}`,
              })}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 basis-40 flex-col gap-1 text-sm font-semibold">
          {t('market.scoutArea')}
          <select
            className={FIELD}
            value={area}
            disabled={busy || free.length === 0}
            onChange={(e) => setArea(e.target.value)}
          >
            {free.map((a) => (
              <option key={a.area} value={a.area}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={GO}
          disabled={busy || !free.some((a) => a.area === area)}
          onClick={() => act({ do: 'scout', area })}
        >
          {t('market.scoutSend')}
        </button>
      </div>
      {free.some((a) => a.area === area) && (
        <p className="text-sm text-chalk-soft tabular-nums">
          {t('market.scoutCost', { cost: money(free.find((a) => a.area === area)!.cost) })}
        </p>
      )}
    </div>
  );
}

function saidText(said: NonNullable<MarketView['said']>): string {
  if (said.at === 'no') return t('market.saidNo', { r: said.reason });
  if (said.at === 'scout') return t('market.saidScout', { area: said.area });
  if (said.at === 'fee')
    return t('market.saidFee', {
      k: said.answer.kind === 'refuse' ? said.answer.reason : said.answer.kind,
    });
  if (said.at === 'terms')
    return t('market.saidTerms', {
      k: said.answer.kind === 'refuse' ? said.answer.reason : said.answer.kind,
      name: said.name,
    });
  return t('market.saidBid', {
    k: said.answer.kind === 'withdrawn' ? said.answer.reason : said.answer.kind,
    name: said.name,
  });
}

export function Market(props: {
  ask: Ask;
  onError: (m: string) => void;
  onDeal: (r: SimReply) => void;
}) {
  const { ask, onError, onDeal } = props;
  const [view, setView] = useState<MarketView | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [club, setClub] = useState<string | null>(null);

  useEffect(() => {
    ask({ type: 'market', position, club })
      .then((r) => setView(r.market ?? null))
      .catch((e: Error) => onError(e.message));
  }, [ask, onError, position, club]);

  if (!view) return null;
  const act: Do = (a) => {
    ask({ type: 'market', position, club, act: a })
      .then((r) => {
        setView(r.market ?? null);
        onDeal(r);
      })
      .catch((e: Error) => onError(e.message));
  };

  return (
    <section aria-labelledby="market-title" className="flex flex-col gap-5">
      <div className="sala-slab flex flex-wrap items-baseline gap-x-5 gap-y-2 px-4 py-3 sm:px-5">
        <p
          className={`font-condensed text-xl leading-none font-black uppercase ${view.open ? 'text-club-gold' : 'text-club-danger'}`}
        >
          {view.open ? t('market.open') : t('market.closed')}
        </p>
        <p className="font-semibold tabular-nums">{t('market.cash', { cash: money(view.cash) })}</p>
        <p className="font-semibold tabular-nums">
          {t('market.wageRoom', { room: money(Math.max(0, view.wageRoom)) })}
        </p>
        <p aria-live="polite" className="basis-full font-semibold empty:hidden">
          {view.said && saidText(view.said)}
        </p>
      </div>

      {view.bids.length > 0 && (
        <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
          <h3 className={LABEL}>{t('market.bids')}</h3>
          <ul>
            {view.bids.map((b) => (
              <BidRow key={`${b.id}-${b.fee}`} bid={b} act={act} />
            ))}
          </ul>
        </div>
      )}

      {view.talks.length > 0 && (
        <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
          <h3 className={LABEL}>{t('market.talks')}</h3>
          <ul>
            {view.talks.map((k) => (
              <Talk
                key={`${k.player.id}-${k.stage}-${k.asking}-${k.wants?.wage ?? 0}`}
                talk={k}
                act={act}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
          <h3 id="market-title" className={LABEL}>
            {t('market.targets')}
          </h3>
          <div
            role="group"
            aria-label={t('market.position')}
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
          >
            <button
              type="button"
              aria-pressed={position === null}
              className={chip(position === null)}
              onClick={() => setPosition(null)}
            >
              {t('market.all')}
            </button>
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={position === p}
                className={chip(position === p)}
                onClick={() => setPosition(p)}
              >
                {t('squad.position', { p })}
              </button>
            ))}
          </div>
          <ul>
            {view.targets.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-chalk/10 py-2"
              >
                <span className="min-w-0 flex-1 basis-56">
                  <Head p={p} />
                </span>
                <button
                  type="button"
                  disabled={p.no !== null}
                  aria-label={t('market.talkFor', {
                    name: p.name,
                    age: p.age,
                    n: p.rating,
                    value: money(p.value),
                  })}
                  className="min-h-11 w-28 shrink-0 rounded-lg bg-chalk/10 px-2 font-condensed text-base leading-tight font-extrabold uppercase enabled:hover:bg-chalk/20 disabled:bg-transparent disabled:font-sans disabled:text-xs disabled:font-bold disabled:text-chalk-soft disabled:normal-case"
                  onClick={() => act({ do: 'open', playerId: p.id })}
                >
                  {p.no === null ? t('market.talk') : t('market.no', { r: p.no })}
                </button>
                {p.loan !== null && (
                  <button
                    type="button"
                    aria-label={t('market.borrowFor', { name: p.name, fee: money(p.loan) })}
                    className="min-h-11 shrink-0 rounded-lg bg-chalk/10 px-2 text-xs leading-tight font-bold tabular-nums hover:bg-chalk/20"
                    onClick={() => act({ do: 'borrow', playerId: p.id })}
                  >
                    <span className="block font-condensed text-base font-extrabold uppercase">
                      {t('market.borrow')}
                    </span>
                    {money(p.loan)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
            <h3 className={LABEL}>{t('market.mine')}</h3>
            <ul>
              {view.mine.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-chalk/10 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <Head p={p} club={false} />
                    <span className="ml-12 block text-xs font-bold text-chalk">
                      {t('market.part', { p: p.part })}
                      {p.listed && (
                        <span className="ml-2 text-club-gold">{t('market.listed')}</span>
                      )}
                      {p.forLoan && (
                        <span className="ml-2 text-club-gold">{t('market.forLoan')}</span>
                      )}
                      {p.owner !== null && (
                        <span className="ml-2 text-chalk-soft">
                          {t('market.onLoan', { club: p.owner })}
                        </span>
                      )}
                    </span>
                  </span>
                  {p.owner === null && (
                    <span className="flex basis-full gap-2">
                      <button
                        type="button"
                        aria-label={t('market.renewFor', { name: p.name })}
                        className="min-h-11 flex-1 rounded-lg bg-chalk/10 px-3 font-condensed text-base leading-tight font-extrabold text-chalk uppercase hover:bg-chalk/20"
                        onClick={() => act({ do: 'renew', playerId: p.id })}
                      >
                        {t('market.renew')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={p.listed}
                        aria-label={t('market.listFor', {
                          on: BOOL[Number(p.listed)]!,
                          name: p.name,
                        })}
                        className={`min-h-11 flex-1 rounded-lg px-3 font-condensed whitespace-nowrap text-base leading-tight font-extrabold uppercase ${p.listed ? 'bg-club-gold text-ink' : 'bg-chalk/10 text-chalk hover:bg-chalk/20'}`}
                        onClick={() => act({ do: 'list', playerId: p.id, on: !p.listed })}
                      >
                        {p.listed ? t('market.unlist') : t('market.list')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={p.forLoan}
                        aria-label={t('market.lendFor', {
                          on: BOOL[Number(p.forLoan)]!,
                          name: p.name,
                        })}
                        className={`min-h-11 flex-1 rounded-lg px-3 font-condensed text-base leading-tight font-extrabold whitespace-nowrap uppercase ${p.forLoan ? 'bg-club-gold text-ink' : 'bg-chalk/10 text-chalk hover:bg-chalk/20'}`}
                        onClick={() => act({ do: 'lend', playerId: p.id, on: !p.forLoan })}
                      >
                        {p.forLoan ? t('market.unlend') : t('market.lend')}
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <Scouts key={view.scouting.away.map((m) => m.area).join()} s={view.scouting} act={act} />

          <Squads view={view} club={club} pick={setClub} act={act} />

          <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
            <h3 className={LABEL}>{t('market.news')}</h3>
            {view.news.length === 0 ? (
              <p className="text-chalk-soft">{t('market.noNews')}</p>
            ) : (
              <ul>
                {view.news.map((d) => (
                  <li
                    key={`${d.iso}-${d.name}-${d.to}`}
                    className="border-t border-chalk/10 py-2 first:border-0"
                  >
                    <p className="font-semibold">
                      {t('market.deal', {
                        to: d.to,
                        name: d.name,
                        from: d.from,
                        fee: money(d.fee),
                        for: d.for,
                      })}
                    </p>
                    <p className="text-sm text-chalk-soft tabular-nums">
                      {t('market.judged', { seen: d.seen, office: d.office })}{' '}
                      {t('market.why', { ...d.why })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
