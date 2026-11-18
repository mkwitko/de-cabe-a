/**
 * The training ground: one choice, the week's intensity, and what it costs. A light week gives
 * legs back faster and lets the drill slip; a hard one does the opposite (club-domain
 * career/training.ts). The list shows each player's freshness on the day of the next match.
 */
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import type { SimReply, SimRequest, TrainingView } from './sim.worker';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Ask = (req: DistributiveOmit<SimRequest, 'id'>) => Promise<SimReply>;

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
const stateOf = (fresh: number) => (fresh >= 85 ? 'ready' : fresh >= 65 ? 'tired' : 'spent');
/** An injured player reads as spent whatever his freshness. */
const OUT = 'spent' as const;
const TONE = {
  ready: 'bg-club-turf text-chalk',
  tired: 'bg-club-gold text-ink',
  spent: 'bg-club-danger text-chalk',
} as const;
const BAR = { ready: 'bg-club-turf', tired: 'bg-club-gold', spent: 'bg-club-danger' } as const;

export function Training(props: {
  ask: Ask;
  onError: (m: string) => void;
  onPicked: (r: SimReply) => void;
}) {
  const { ask, onError, onPicked } = props;
  const [view, setView] = useState<TrainingView | null>(null);

  useEffect(() => {
    ask({ type: 'training' })
      .then((r) => setView(r.training ?? null))
      .catch((e: Error) => onError(e.message));
  }, [ask, onError]);

  if (!view) return null;
  return (
    <section
      aria-labelledby="training-title"
      className="grid items-start gap-5 lg:grid-cols-[minmax(0,27rem)_1fr]"
    >
      <div className="sala-slab flex flex-col gap-4 p-4 sm:p-5">
        <h3 id="training-title" className={LABEL}>
          {t('training.week')}
        </h3>
        <div role="group" aria-labelledby="training-title" className="flex flex-col gap-2">
          {view.options.map((o) => (
            <button
              key={o.intensity}
              type="button"
              aria-pressed={view.intensity === o.intensity}
              className={`flex min-h-16 items-center gap-4 rounded-lg px-4 py-2 text-left ${view.intensity === o.intensity ? 'bg-club-gold text-ink' : 'bg-chalk/8 text-chalk hover:bg-chalk/15'}`}
              onClick={() =>
                ask({ type: 'train', intensity: o.intensity })
                  .then((r) => {
                    setView(r.training ?? null);
                    onPicked(r);
                  })
                  .catch((e: Error) => onError(e.message))
              }
            >
              <span className="w-20 shrink-0 font-condensed text-2xl leading-none font-black uppercase">
                {t('training.intensity', { i: o.intensity })}
              </span>
              <span className="text-sm leading-snug font-semibold">
                <span className="block">{t('training.recovery', { n: o.recovery })}</span>
                <span className="block">{t('training.target', { n: o.target })}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-chalk/10 pt-4">
          <p className="flex items-baseline justify-between gap-3">
            <span id="training-drill" className="font-semibold">
              {t('training.drill')}
            </span>
            <span className="font-condensed text-3xl leading-none font-black tabular-nums">
              {t('common.percent', { n: view.drill })}
            </span>
          </p>
          <div
            role="meter"
            aria-labelledby="training-drill"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.drill}
            className="h-2 overflow-hidden rounded-full bg-chalk/12"
          >
            <span
              className="block h-full rounded-full bg-club-gold"
              style={{ width: `${view.drill}%` }}
            />
          </div>
          <p className="text-sm text-chalk-soft">{t('training.drillHint')}</p>
        </div>
        <p className="border-t border-chalk/10 pt-4 font-semibold">
          {view.nextIn === null ? t('training.noMatch') : t('training.next', { n: view.nextIn })}{' '}
          <span className="font-normal text-chalk-soft">
            {t('training.cost', { n: view.matchCost })}
          </span>
        </p>
      </div>

      <div className="sala-slab flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        <h3 className={LABEL}>{t('training.fresh')}</h3>
        <p className="text-chalk-soft">{t('training.freshHint')}</p>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {view.players.map((p) => {
            const state = p.out ? OUT : stateOf(p.fresh);
            return (
              <li
                key={p.id}
                aria-label={t('training.player', {
                  name: p.name,
                  n: p.fresh,
                  state: t('training.state', { s: state }),
                })}
                className="flex min-h-12 items-center gap-3 border-t border-chalk/10 py-1.5"
              >
                <span className="w-9 shrink-0 font-condensed text-sm font-extrabold text-club-gold">
                  {t('squad.position', { p: p.position })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {p.name}
                    {p.out && (
                      <span className="ml-2 text-xs font-bold text-club-danger">
                        {t('health.out', { n: p.out.days })}
                      </span>
                    )}
                    {p.starter && (
                      <span className="ml-2 text-xs font-bold text-club-gold">
                        {t('squad.starter')}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="mt-1 block h-1 rounded-full bg-chalk/12">
                    <span
                      className={`block h-full rounded-full ${BAR[state]}`}
                      style={{ width: `${p.fresh}%` }}
                    />
                  </span>
                </span>
                <span className="w-10 text-right font-condensed text-xl leading-none font-black tabular-nums">
                  {p.fresh}
                </span>
                <span
                  className={`w-20 rounded px-1.5 text-center text-xs leading-5 font-bold ${TONE[state]}`}
                >
                  {p.out ? t('health.outLabel') : t('training.state', { s: state })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
