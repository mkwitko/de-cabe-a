/**
 * The dressing room: the formation on a tactics board and the squad on the bench slab. Tap a
 * slot, then the player who takes it; a player already on the board swaps places. Every change
 * goes to the worker at once and counts from the next match (club-domain career/squad.ts).
 */
import { useEffect, useState } from 'react';
import { btnSecondary } from '../../../components/ui';
import { PlanFields } from '../FriendlyPage';
import { t } from '../i18n';
import type { SimReply, SimRequest, SquadView } from './sim.worker';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Ask = (req: DistributiveOmit<SimRequest, 'id'>) => Promise<SimReply>;

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
/** Board placement: the team attacks up the screen; low y is the team's right. */
const place = (s: { x: number; y: number }) => ({
  left: `${(1 - s.y / 68) * 100}%`,
  top: `${94 - (s.x / 82) * 86}%`,
});
const surname = (name: string) => name.split(' ').at(-1)!;

export function Squad(props: {
  ask: Ask;
  onError: (m: string) => void;
  onPicked: (r: SimReply) => void;
}) {
  const { ask, onError, onPicked } = props;
  const [squad, setSquad] = useState<SquadView | null>(null);
  const [slot, setSlot] = useState<number | null>(null);

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
        onPicked(r);
      })
      .catch((e: Error) => onError(e.message));
  const byId = new Map(squad.players.map((p) => [p.id, p]));
  const keeperSlot = slot !== null && squad.slots[slot]!.role.toLowerCase().includes('keeper');
  const take = (id: string) => {
    if (slot === null) return;
    const xi = [...squad.xi];
    const from = xi.indexOf(id);
    if (from >= 0) xi[from] = xi[slot]!;
    xi[slot] = id;
    void send(squad.formation, xi);
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
      className="grid items-start gap-5 lg:grid-cols-[minmax(0,27rem)_1fr]"
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
        <div role="group" aria-label={t('squad.formation')} className="flex flex-wrap gap-1.5">
          {squad.formations.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={squad.formation === f}
              className={`min-h-11 flex-1 rounded-lg px-2 font-condensed text-base font-extrabold whitespace-nowrap tabular-nums ${squad.formation === f ? 'bg-club-gold text-ink' : 'bg-chalk/8 text-chalk hover:bg-chalk/15'}`}
              onClick={() => void send(f, null)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="sala-board relative aspect-[68/80] w-full">
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
                className="sala-magnet absolute flex w-[4.6rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                style={place(s)}
                onClick={() => setSlot(slot === i ? null : i)}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full border-2 font-condensed text-lg leading-none font-black tabular-nums shadow-[0_6px_10px_-4px_rgb(0_0_0/0.8)] ${slot === i ? 'border-ink bg-club-gold text-ink' : p.known[i]! < 2 ? 'border-dashed border-club-danger bg-club-night text-chalk' : 'border-chalk bg-[var(--club-a,#1c3a2a)] text-chalk'}`}
                >
                  {p.fit[i]}
                </span>
                <span className="max-w-full truncate rounded bg-club-night/85 px-1.5 text-xs leading-5 font-bold">
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

      <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        <h3 className={LABEL}>
          {slot === null
            ? t('squad.list')
            : t('squad.pick', { role: t('squad.role', { r: squad.slots[slot]!.role }) })}
        </h3>
        {slot === null && <p className="text-chalk-soft">{t('squad.hint')}</p>}
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {rows.map((p) => {
            const at = squad.xi.indexOf(p.id);
            const n = slot === null ? p.best.rating : p.fit[slot]!;
            const able =
              slot !== null &&
              p.keeper === keeperSlot &&
              at !== slot &&
              p.out === null &&
              !p.banned;
            return (
              <li key={p.id} className="border-t border-chalk/10">
                <button
                  type="button"
                  disabled={!able}
                  aria-label={t('squad.choose', {
                    name: p.name,
                    age: p.age,
                    n,
                    known: t('squad.known', { l: slot === null ? 3 : p.known[slot]! }),
                  })}
                  className="flex min-h-12 w-full items-center gap-3 py-1.5 text-left enabled:hover:bg-chalk/6 disabled:cursor-default"
                  onClick={() => take(p.id)}
                >
                  <span className="w-9 shrink-0 font-condensed text-sm font-extrabold text-club-gold">
                    {t('squad.position', { p: p.positions[0]! })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-xs text-chalk-soft">
                      {t('squad.age', { n: p.age })}
                      {at >= 0 && (
                        <span className="ml-2 font-bold text-club-gold">{t('squad.starter')}</span>
                      )}
                      {p.out !== null && (
                        <span className="ml-2 font-bold text-club-danger">
                          {t('health.out', { n: p.out })}
                        </span>
                      )}
                      {(p.goals > 0 || p.assists > 0) && (
                        <span className="ml-2">
                          {t('squad.scored', { g: p.goals, a: p.assists })}
                        </span>
                      )}
                      {p.banned && (
                        <span className="ml-2 font-bold text-club-danger">{t('squad.banned')}</span>
                      )}
                      {p.fresh < 85 && (
                        <span className="ml-2 font-bold text-club-danger">
                          {t('squad.fresh', { n: p.fresh })}
                        </span>
                      )}
                      {slot !== null && (
                        <span
                          className={`ml-2 font-bold ${p.known[slot]! < 2 ? 'text-club-danger' : 'text-chalk'}`}
                        >
                          {t('squad.known', { l: p.known[slot]! })}
                        </span>
                      )}
                    </span>
                  </span>
                  <span
                    className={`font-condensed text-2xl leading-none font-black tabular-nums ${slot !== null && !able ? 'text-chalk-soft/50' : ''}`}
                  >
                    {n}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
