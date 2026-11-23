/**
 * The dressing room: the formation on a tactics board and the squad on the bench slab. Either
 * tap a slot then the player who takes it, or a player then his slot; two slots tapped in turn
 * swap their players, and on a desktop a player can be dragged onto a slot. A player already on
 * the board swaps places. Every change goes to the worker at once and counts from the next match
 * (club-domain career/squad.ts).
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { btnSecondary } from '../../../components/ui';
import { PlanFields } from '../FriendlyPage';
import { t } from '../i18n';
import { usePlayerSheet } from './PlayerSheet';
import type { SimReply, SimRequest, SquadView } from './sim.worker';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Ask = (req: DistributiveOmit<SimRequest, 'id'>) => Promise<SimReply>;

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
/**
 * Board placement: the team attacks up the screen; low y is the team's right. The engine's
 * in-possession shape is the start; magnets that would touch (a striker over the attacking
 * midfielder, two midfielders at the centre circle) are pushed apart until each has room for its
 * badge and name, in percent of the board so it holds at 360 and at 1280.
 */
const GAP = { x: 20, y: 19 };
function layout(slots: { x: number; y: number }[]) {
  const at = slots.map((s) => ({ left: (1 - s.y / 68) * 100, top: 94 - (s.x / 82) * 86 }));
  for (let pass = 0; pass < 80; pass++) {
    let moved = false;
    for (let i = 0; i < at.length; i++)
      for (let j = i + 1; j < at.length; j++) {
        const a = at[i]!;
        const b = at[j]!;
        const dx = b.left - a.left;
        const dy = b.top - a.top;
        const ox = GAP.x - Math.abs(dx);
        const oy = GAP.y - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (oy <= ox) {
          const h = (oy / 2) * (dy < 0 ? -1 : 1);
          a.top -= h;
          b.top += h;
        } else {
          const h = (ox / 2) * (dx < 0 ? -1 : 1);
          a.left -= h;
          b.left += h;
        }
      }
    for (const m of at) {
      m.left = Math.min(90, Math.max(10, m.left));
      m.top = Math.min(89, Math.max(11, m.top));
    }
    if (!moved) break;
  }
  return at.map((m) => ({ left: `${m.left}%`, top: `${m.top}%` }));
}
/** The name a magnet can hold whole: the surname, else the first name with the surname's initial. */
const WHOLE = 9;
export function surname(name: string) {
  const [first = '', ...rest] = name.split(' ');
  const last = rest.at(-1) ?? first;
  if (last.length <= WHOLE) return last;
  const short = `${first} ${last[0]}.`;
  return rest.length > 0 && short.length <= WHOLE + 1 ? short : last;
}

const COLS = ['pos', 'name', 'age', 'fresh', 'rating'] as const;
const ROW =
  'grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2.5rem] items-center gap-x-3 sm:grid-cols-[2.75rem_minmax(0,1fr)_3rem_8rem_3rem] sm:gap-x-4';
const toneOf = (out: boolean, fresh: number) =>
  out || fresh < 65 ? 'spent' : fresh < 85 ? 'tired' : 'ready';
const FRESH = { ready: 'bg-club-turf', tired: 'bg-club-gold', spent: 'bg-club-danger' } as const;

export function Squad(props: {
  ask: Ask;
  onError: (m: string) => void;
  onPicked: (r: SimReply) => void;
}) {
  const { ask, onError, onPicked } = props;
  const [squad, setSquad] = useState<SquadView | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const card = usePlayerSheet(ask, onError);
  /** A player picked first, waiting for his slot. */
  const [picked, setPicked] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ask({ type: 'squad' })
      .then((r) => setSquad(r.squad ?? null))
      .catch((e: Error) => onError(e.message));
  }, [ask, onError]);

  if (!squad) return null;
  const send = (formation: string, xi: string[] | null, plan = squad.plan) =>
    ask({ type: 'lineup', formation, xi, plan })
      .then((r) => {
        setSquad(r.squad ?? null);
        setSlot(null);
        setPicked(null);
        onPicked(r);
      })
      .catch((e: Error) => onError(e.message));
  const spots = layout(squad.slots);
  const byId = new Map(squad.players.map((p) => [p.id, p]));
  const isKeeperSlot = (i: number) => squad.slots[i]!.role.toLowerCase().includes('keeper');
  const keeperSlot = slot !== null && isKeeperSlot(slot);
  /** Whether this player may take that slot: goalkeepers in goal only, and nobody out. */
  const fits = (id: string, i: number) => {
    const p = byId.get(id)!;
    return p.keeper === isKeeperSlot(i) && p.out === null && !p.banned;
  };
  const put = (id: string, at: number) => {
    const xi = [...squad.xi];
    const from = xi.indexOf(id);
    if (from === at) return;
    if (from >= 0) xi[from] = xi[at]!;
    xi[at] = id;
    void send(squad.formation, xi);
  };
  const take = (id: string) => {
    if (slot !== null) return put(id, slot);
    // No slot yet: the player waits for one, on the board.
    setPicked(picked === id ? null : id);
    if (picked !== id) board.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const tapSlot = (i: number) => {
    if (picked !== null) return fits(picked, i) ? put(picked, i) : undefined;
    // A second slot: the two players swap places.
    if (slot !== null && slot !== i) {
      const other = squad.xi[i]!;
      if (fits(other, slot) && fits(squad.xi[slot]!, i)) return put(other, slot);
    }
    const next = slot === i ? null : i;
    setSlot(next);
    if (next !== null) list.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const rows = [...squad.players].sort((a, b) =>
    slot === null
      ? squad.xi.indexOf(a.id) >= 0 !== squad.xi.indexOf(b.id) >= 0
        ? squad.xi.indexOf(a.id) >= 0
          ? -1
          : 1
        : b.best.rating - a.best.rating
      : b.fit[slot]! - a.fit[slot]!,
  );

  return (
    <section
      aria-labelledby="squad-title"
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,27rem)_1fr] 2xl:grid-cols-[minmax(0,32rem)_1fr]"
    >
      <div className="sala-slab flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <h3 id="squad-title" className={LABEL}>
            {t('squad.title')}
          </h3>
          <p
            className={`text-sm ${squad.foreigners.named > squad.foreigners.limit ? 'font-bold text-club-danger' : 'text-chalk-soft'}`}
          >
            {t('squad.foreigners', {
              ...squad.foreigners,
              over: String(squad.foreigners.named > squad.foreigners.limit),
            })}
          </p>
          <p className="text-sm text-chalk-soft">
            {t('squad.strength')}
            <span className="ml-2 font-condensed text-2xl leading-none font-black text-chalk tabular-nums">
              {squad.strength}
            </span>
          </p>
        </div>
        <div
          role="group"
          aria-label={t('squad.formation')}
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 max-sm:pr-10 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]"
        >
          {squad.formations.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={squad.formation === f}
              className={`min-h-11 shrink-0 flex-1 rounded-lg px-3 font-condensed text-base font-extrabold whitespace-nowrap tabular-nums ${squad.formation === f ? 'bg-club-gold text-ink' : 'bg-chalk/8 text-chalk hover:bg-chalk/15'}`}
              onClick={() => void send(f, null)}
            >
              {f}
            </button>
          ))}
        </div>
        {picked !== null && (
          <p className="text-sm font-bold text-club-gold" aria-live="polite">
            {t('squad.placing', { name: byId.get(picked)!.name })}
          </p>
        )}
        <div ref={board} className="sala-board relative aspect-[68/80] w-full">
          {squad.slots.map((s, i) => {
            const p = byId.get(squad.xi[i]!)!;
            const role = t('squad.role', { r: s.role });
            return (
              <button
                key={`${squad.formation}-${i}`}
                type="button"
                aria-pressed={slot === i}
                aria-label={t('squad.slot', {
                  role,
                  name: p.name,
                  n: p.fit[i]!,
                  known: t('squad.known', { l: p.known[i]! }),
                })}
                className="sala-magnet absolute flex w-[3.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                style={spots[i]}
                onClick={() => tapSlot(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain');
                  if (byId.has(id) && fits(id, i)) put(id, i);
                }}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full border-2 font-condensed text-lg leading-none font-black tabular-nums shadow-[0_6px_10px_-4px_rgb(0_0_0/0.8)] ${slot === i ? 'border-ink bg-club-gold text-ink' : picked !== null && fits(picked, i) ? 'animate-pulse border-club-gold bg-club-night text-chalk' : p.known[i]! < 2 ? 'border-dashed border-club-danger bg-club-night text-chalk' : 'border-chalk bg-[var(--club-a,#1c3a2a)] text-chalk'}`}
                >
                  {p.fit[i]}
                </span>
                <span className="rounded bg-club-night/85 px-1 text-xs leading-5 font-bold whitespace-nowrap">
                  {surname(p.name)}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={`${btnSecondary} text-base`}
          onClick={() => void send(squad.formation, null)}
        >
          {t('squad.auto')}
        </button>
        <div className="flex flex-col gap-3 border-t border-chalk/10 pt-4 sm:[&>div]:grid-cols-1">
          <h3 className={LABEL}>{t('squad.plan')}</h3>
          <PlanFields
            value={squad.plan}
            onChange={(plan) => void send(squad.formation, squad.xi, plan)}
          />
          <p className="text-sm text-chalk-soft">{t('squad.planHint')}</p>
        </div>
      </div>

      <div ref={list} className="sala-slab flex min-w-0 scroll-mt-4 flex-col gap-3 p-4 sm:p-5">
        <h3 className={LABEL}>
          {slot === null
            ? t('squad.list')
            : t('squad.pick', { role: t('squad.role', { r: squad.slots[slot]!.role }) })}
        </h3>
        {slot === null && <p className="text-chalk-soft">{t('squad.hint')}</p>}
        <div
          aria-hidden
          className={`${ROW} border-b border-chalk/15 pr-11 pb-2 text-xs font-semibold text-chalk-soft`}
        >
          {COLS.map((c, k) => (
            <span
              key={c}
              className={`${k > 1 ? 'text-right' : ''} ${c === 'age' ? 'max-sm:hidden' : ''}`}
            >
              {t('squad.col', { c })}
            </span>
          ))}
        </div>
        <ul className="-mt-3 flex flex-col">
          {rows.map((p, k) => {
            const at = squad.xi.indexOf(p.id);
            const n = slot === null ? p.best.rating : p.fit[slot]!;
            const able =
              slot === null
                ? p.out === null && !p.banned
                : p.keeper === keeperSlot && at !== slot && p.out === null && !p.banned;
            const tone = toneOf(p.out !== null, p.fresh);
            // The bench starts where the eleven ends (the list is sorted starters first).
            const bench = slot === null && at < 0 && k > 0 && squad.xi.includes(rows[k - 1]!.id);
            return (
              <li
                key={p.id}
                className={`flex items-center border-t ${bench ? 'mt-3 border-chalk/35' : 'border-chalk/10'} first:border-0`}
              >
                <button
                  type="button"
                  disabled={!able}
                  draggable={able}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                  aria-pressed={picked === p.id}
                  aria-label={t('squad.choose', {
                    name: p.name,
                    age: p.age,
                    n,
                    known: t('squad.known', { l: slot === null ? 3 : p.known[slot]! }),
                  })}
                  className={`${ROW} min-h-12 min-w-0 flex-1 py-1.5 text-left enabled:hover:bg-chalk/6 disabled:cursor-default ${picked === p.id ? 'bg-club-gold/15' : ''}`}
                  onClick={() => take(p.id)}
                >
                  <span
                    className={`grid h-6 place-items-center rounded font-condensed text-sm font-extrabold ${at >= 0 ? 'bg-club-gold text-ink' : 'bg-chalk/10 text-chalk'}`}
                  >
                    {t('squad.position', { p: p.positions[0]! })}
                    {at >= 0 && <span className="sr-only">{t('squad.starter')}</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.name}</span>
                    {(p.out !== null ||
                      p.banned ||
                      p.goals > 0 ||
                      p.assists > 0 ||
                      slot !== null) && (
                      <span className="block text-xs">
                        {(p.goals > 0 || p.assists > 0) && (
                          <span className="mr-2 text-chalk-soft">
                            {t('squad.scored', { g: p.goals, a: p.assists })}
                          </span>
                        )}
                        {p.banned && (
                          <span className="mr-2 font-bold text-club-danger">
                            {t('squad.banned')}
                          </span>
                        )}
                        {p.out !== null && (
                          <span className="mr-2 font-bold text-club-danger">
                            {t('health.out', { n: p.out })}
                          </span>
                        )}
                        {slot !== null && (
                          <span
                            className={`font-bold ${p.known[slot]! < 2 ? 'text-club-danger' : 'text-chalk-soft'}`}
                          >
                            {t('squad.known', { l: p.known[slot]! })}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="text-right text-sm text-chalk-soft tabular-nums max-sm:hidden">
                    {p.age}
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-chalk/12 sm:block">
                      <span
                        className={`block h-full rounded-full ${FRESH[tone]}`}
                        style={{ width: `${p.fresh}%` }}
                      />
                    </span>
                    <span
                      className={`w-8 text-right text-sm font-bold tabular-nums ${tone === 'ready' ? 'text-chalk' : tone === 'tired' ? 'text-club-gold' : 'text-club-danger'}`}
                    >
                      {p.fresh}
                    </span>
                  </span>
                  <span
                    className={`text-right font-condensed text-2xl leading-none font-black tabular-nums ${slot !== null && !able ? 'text-chalk-soft/50' : ''}`}
                  >
                    {n}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t('player.open', { name: p.name })}
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-chalk-soft hover:bg-chalk/10 hover:text-chalk"
                  onClick={(e) => card.open(p.id, e.currentTarget)}
                >
                  <Icon name="info" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {card.sheet}
    </section>
  );
}
