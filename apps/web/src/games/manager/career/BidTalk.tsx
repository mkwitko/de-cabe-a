/**
 * A bid for one of the person's players, opened from the inbox or the market as its own talk
 * (FM's negotiation screen): who wants him and how big a step it is for him, what he makes of
 * it, the talk so far, and the answer, with a sell-on share or a buy-back. A native dialog like
 * the player's sheet: Esc and the backdrop close it, focus goes back to what opened it.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clausedFee, counterAsk } from '@decabeca/club-domain';
import { ClubBadge } from '../../../components/ClubBadge';
import { btnPrimary, btnSecondary } from '../../../components/ui';
import { t } from '../i18n';
import type { BidView, SimReply, SimRequest } from './sim.worker';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Ask = (req: DistributiveOmit<SimRequest, 'id'>) => Promise<SimReply>;

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
const FIELD =
  'min-h-11 w-full min-w-0 rounded-lg border border-chalk/25 bg-club-night px-3 font-semibold tabular-nums';
const money = (value: number) => t('career.cash', { value });
/** The player's stance when he has nothing against the move. */
const NO_OBJECTION = 'none';

/** Opens a bid's talk; `onDone` gets the market's reply after each answer (the page updates). */
export function useBidTalk(ask: Ask, onError: (m: string) => void, onDone: (r: SimReply) => void) {
  const [bid, setBid] = useState<BidView | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if ((bid || said) && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [bid, said]);

  const load = (bidId: string) =>
    ask({ type: 'bid', bidId })
      .then((r) => {
        setBid(r.bid ?? null);
        // Answered, dropped or sold since the note: say so rather than open nothing.
        if (!r.bid) setSaid(t('bidTalk.gone'));
      })
      .catch((e: Error) => onError(e.message));

  const open = (bidId: string, from: HTMLElement) => {
    opener.current = from;
    setSaid(null);
    void load(bidId);
  };

  const answer = (act: Act) => {
    if (!bid) return;
    ask({ type: 'market', position: null, act: { do: 'bid', bidId: bid.id, ...act } })
      .then((r) => {
        onDone(r);
        const s = r.market?.said;
        if (s?.at === 'bid') {
          setSaid(
            t('market.saidBid', {
              k: s.answer.kind === 'withdrawn' ? s.answer.reason : s.answer.kind,
              name: s.name,
            }),
          );
          // A raised bid stays on the table: its talk goes on.
          if (s.answer.kind === 'raised') return load(bid.id);
          setBid(null);
        } else if (s?.at === 'no') setSaid(t('market.saidNo', { r: s.reason }));
      })
      .catch((e: Error) => onError(e.message));
  };

  const node: ReactNode = (bid || said) && (
    <dialog
      ref={dialog}
      aria-labelledby="bid-title"
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-chalk backdrop:bg-black/65 lg:w-[32rem]"
      onClose={() => {
        setBid(null);
        setSaid(null);
        if (opener.current?.isConnected) opener.current.focus();
      }}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="sala-slab flex h-full flex-col gap-5 overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="bid-title" className={LABEL}>
            {t('bidTalk.title')}
          </h2>
          <button
            type="button"
            className={`${btnSecondary} min-h-11 px-3 text-base`}
            onClick={() => dialog.current?.close()}
          >
            {t('bidTalk.close')}
          </button>
        </div>
        {said && (
          <p role="status" className="rounded-lg bg-club-gold/15 p-3 font-bold text-club-gold">
            {said}
          </p>
        )}
        {bid && <Body bid={bid} onAnswer={answer} />}
      </div>
    </dialog>
  );
  return { open, talk: node };
}

type Act =
  | { answer: 'accept'; clauses?: Clauses }
  | { answer: 'refuse' }
  | { answer: 'counter'; fee: number; clauses?: Clauses };
type Clauses = { sellOn?: number; buyBack?: { price: number; seasons: number } };

function Body({ bid, onAnswer }: { bid: BidView; onAnswer: (a: Act) => void }) {
  const [fee, setFee] = useState(String(counterAsk(bid.fee, bid.player.value)));
  const [sellOn, setSellOn] = useState('0');
  const [back, setBack] = useState('');
  const [seasons, setSeasons] = useState('2');
  const pct = Math.min(30, Math.max(0, Math.round(Number(sellOn)) || 0));
  const price = back.trim() ? Math.min(200, Math.max(100, Math.round(Number(back)) || 100)) : 0;
  const clauses: Clauses = {
    ...(pct > 0 && { sellOn: pct }),
    ...(price > 0 && {
      buyBack: { price, seasons: Math.min(3, Math.max(1, Math.round(Number(seasons)) || 1)) },
    }),
  };
  const asked = Math.round(Number(fee)) || 0;
  // An ask at or under the bid is no counter: only accepting is left.
  const under = asked <= bid.fee;
  const share = bid.player.value > 0 ? Math.round((bid.fee * 100) / bid.player.value) : 0;
  const p = bid.player;
  return (
    <>
      <section className="flex items-center gap-3">
        <ClubBadge
          name={bid.from.shortName}
          size="lg"
          colours={bid.from.colours}
          pattern={bid.from.kits?.home.pattern}
        />
        <div className="min-w-0">
          <p className="font-condensed text-2xl leading-tight font-black uppercase">
            {bid.from.name}
          </p>
          <p className="text-sm text-chalk-soft">
            {t('bidTalk.club', {
              division: bid.from.division ?? '',
              rep: bid.from.reputation ?? 0,
              known: String(bid.from.division !== null),
            })}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 rounded-lg bg-chalk/5 p-3">
        <p className="col-span-2 font-semibold">
          {t('bidTalk.player', {
            name: p.name,
            pos: t('squad.position', { p: p.position }),
            age: p.age,
          })}
        </p>
        <Fact label={t('bidTalk.rating')} value={String(p.rating)} />
        <Fact label={t('bidTalk.value')} value={money(p.value)} />
        <Fact label={t('bidTalk.wage')} value={money(p.wage)} />
        <Fact
          label={t('bidTalk.until')}
          value={p.until === null ? t('bidTalk.noContract') : String(p.until)}
        />
        <p className="col-span-2 text-sm text-chalk-soft">
          {t('bidTalk.role', { starter: String(p.starter) })}
        </p>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className={LABEL}>{t('bidTalk.offer')}</h3>
        <p className="font-condensed text-4xl leading-none font-black tabular-nums">
          {money(bid.fee)}
        </p>
        <p className="text-sm text-chalk-soft">
          {t('bidTalk.offerText', {
            share,
            round: bid.round,
            rounds: bid.maxRounds,
            days: bid.daysLeft,
          })}
        </p>
      </section>

      {bid.stance && (
        <section className="flex flex-col gap-1">
          <h3 className={LABEL}>{t('bidTalk.him')}</h3>
          <p>
            {t('bidTalk.stance', {
              no: bid.stance.no ?? NO_OBJECTION,
              wage: money(bid.stance.wage),
              years: bid.stance.years,
            })}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className={LABEL}>{t('bidTalk.history')}</h3>
        <ol className="flex flex-col gap-1.5">
          {bid.log.map((x, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 text-sm">
              <span className="text-xs text-chalk-soft tabular-nums">
                {t('career.date', { d: new Date(`${x.iso}T12:00:00Z`) })}
              </span>
              <span>{t('bidTalk.step', { by: x.by, kind: x.kind, club: bid.from.shortName })}</span>
              <span className="font-bold tabular-nums">{money(x.fee)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3 border-t border-chalk/10 pt-4">
        <h3 className={LABEL}>{t('bidTalk.answer')}</h3>
        <label className="flex flex-col gap-1 text-xs font-bold text-chalk-soft">
          {t('market.yourPrice')}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className={FIELD}
          />
          {under && asked > 0 && (
            <span role="alert" className="text-club-danger">
              {t('bidTalk.under')}
            </span>
          )}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-xs font-bold text-chalk-soft">
            {t('market.sellOnLabel')}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              value={sellOn}
              onChange={(e) => setSellOn(e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-chalk-soft">
            {t('market.buyBackLabel')}
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={200}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-chalk-soft">
            {t('market.buyBackSeasons')}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={3}
              value={seasons}
              onChange={(e) => setSeasons(e.target.value)}
              className={FIELD}
            />
          </label>
        </div>
        {(pct > 0 || price > 0) && (
          <p className="text-xs font-bold text-club-gold">
            {t('market.netFee', {
              fee: money(clausedFee(bid.fee, clauses)),
              ask: money(clausedFee(asked, clauses)),
            })}
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            className={`${btnPrimary} min-h-12 bg-club-gold px-3 text-base`}
            onClick={() => onAnswer({ answer: 'accept', clauses })}
          >
            {t('bidTalk.accept', { fee: money(bid.fee) })}
          </button>
          <button
            type="button"
            disabled={under}
            className={`${btnSecondary} min-h-12 px-3 text-base`}
            onClick={() => onAnswer({ answer: 'counter', fee: asked, clauses })}
          >
            {t('bidTalk.counter', { fee: money(asked) })}
          </button>
          <button
            type="button"
            className={`${btnSecondary} min-h-12 px-3 text-base`}
            onClick={() => onAnswer({ answer: 'refuse' })}
          >
            {t('market.refuse')}
          </button>
        </div>
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-col">
      <span className="text-xs font-bold text-chalk-soft uppercase">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </p>
  );
}
