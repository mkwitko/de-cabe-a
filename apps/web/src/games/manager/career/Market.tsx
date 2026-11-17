/**
 * The market: the person's squad to sell on one slab, the best players of the other clubs on the
 * other, by position. A deal takes two taps (the button states the money, then confirms) since
 * it cannot be undone (club-domain career/market.ts).
 */
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import type { MarketPlayer, MarketView, SimReply, SimRequest } from './sim.worker';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Ask = (req: DistributiveOmit<SimRequest, 'id'>) => Promise<SimReply>;

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
const POSITIONS = ['GK', 'CB', 'RB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST'] as const;
const money = (value: number) => t('career.cash', { value });
const chip = (on: boolean) =>
  `min-h-11 shrink-0 rounded-lg px-3 font-condensed text-base font-extrabold whitespace-nowrap ${on ? 'bg-club-gold text-ink' : 'bg-chalk/8 text-chalk hover:bg-chalk/15'}`;

export function Market(props: {
  ask: Ask;
  onError: (m: string) => void;
  onDeal: (r: SimReply) => void;
}) {
  const { ask, onError, onDeal } = props;
  const [view, setView] = useState<MarketView | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  /** The player whose deal waits for the second tap. */
  const [armed, setArmed] = useState<string | null>(null);

  useEffect(() => {
    ask({ type: 'market', position })
      .then((r) => setView(r.market ?? null))
      .catch((e: Error) => onError(e.message));
  }, [ask, onError, position]);

  if (!view) return null;
  // Another position is another list: a deal waiting for its second tap is dropped.
  const pick = (p: string | null) => {
    setArmed(null);
    setPosition(p);
  };
  const close = (type: 'buy' | 'sell', playerId: string) =>
    ask({ type, playerId, position })
      .then((r) => {
        setView(r.market ?? null);
        setArmed(null);
        onDeal(r);
      })
      .catch((e: Error) => onError(e.message));

  const row = (p: MarketPlayer, type: 'buy' | 'sell') => (
    <li key={p.id} className="flex min-h-14 items-center gap-3 border-t border-chalk/10 py-2">
      <span className="w-9 shrink-0 font-condensed text-sm font-extrabold text-club-gold">
        {t('squad.position', { p: p.position })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{p.name}</span>
        <span className="flex items-center gap-2 text-xs text-chalk-soft">
          {type === 'buy' && (
            <>
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full border"
                style={{ background: p.club.colours[0], borderColor: p.club.colours[1] }}
              />
              <span className="font-bold text-chalk">{p.club.shortName}</span>
            </>
          )}
          <span>{t('squad.age', { n: p.age })}</span>
          <span className="truncate">{t('market.wage', { wage: money(p.wage) })}</span>
        </span>
      </span>
      <span className="font-condensed text-2xl leading-none font-black tabular-nums">
        {p.rating}
      </span>
      <button
        type="button"
        disabled={p.no !== null}
        aria-label={t('market.player', {
          name: p.name,
          age: p.age,
          n: p.rating,
          price: money(p.price),
        })}
        className={`min-h-11 w-36 shrink-0 rounded-lg px-2 text-sm leading-tight font-bold tabular-nums disabled:bg-transparent disabled:text-chalk-soft ${armed === p.id ? 'bg-club-gold text-ink' : 'bg-chalk/10 text-chalk enabled:hover:bg-chalk/20'}`}
        onClick={() => (armed === p.id ? void close(type, p.id) : setArmed(p.id))}
      >
        {p.no !== null ? (
          t('market.no', { r: p.no })
        ) : armed === p.id ? (
          t(type === 'buy' ? 'market.pay' : 'market.take', { price: money(p.price) })
        ) : (
          <>
            <span className="block font-condensed text-base font-extrabold uppercase">
              {t(type === 'buy' ? 'market.buy' : 'market.sell')}
            </span>
            {money(p.price)}
          </>
        )}
      </button>
    </li>
  );

  return (
    <section aria-labelledby="market-title" className="flex flex-col gap-5">
      <div className="sala-slab flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-5">
        <p
          className={`font-condensed text-xl leading-none font-black uppercase ${view.open ? 'text-club-gold' : 'text-club-danger'}`}
        >
          {view.open ? t('market.open') : t('market.closed')}
        </p>
        <p className="min-w-0 basis-full text-sm text-chalk-soft sm:flex-1 sm:basis-0">
          {t('market.hint')}
        </p>
        <p aria-live="polite" className="basis-full font-semibold empty:hidden">
          {view.deal &&
            t(view.deal.kind === 'buy' ? 'market.bought' : 'market.sold', {
              name: view.deal.name,
              club: view.deal.club,
              price: money(view.deal.fee),
            })}
        </p>
      </div>
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
              onClick={() => pick(null)}
            >
              {t('market.all')}
            </button>
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={position === p}
                className={chip(position === p)}
                onClick={() => pick(p)}
              >
                {t('squad.position', { p })}
              </button>
            ))}
          </div>
          <ul>{view.targets.map((p) => row(p, 'buy'))}</ul>
        </div>
        <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
          <h3 className={LABEL}>{t('market.mine')}</h3>
          <ul>{view.mine.map((p) => row(p, 'sell'))}</ul>
        </div>
      </div>
    </section>
  );
}
