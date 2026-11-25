import { useEffect, useState } from 'react';
import { PitchLoader } from '../../../components/PitchLoader';
import { t } from '../i18n';
import type { Stage } from './sim.worker';

const STAGE_TEXT = {
  pack: 'career.stage.pack',
  open: 'career.stage.open',
  market: 'career.stage.market',
  turn: 'career.stage.turn',
  save: 'career.stage.save',
} as const satisfies Record<Stage, string>;
const TIPS = [
  'career.tip.1',
  'career.tip.2',
  'career.tip.3',
  'career.tip.4',
  'career.tip.5',
] as const;
/** Seconds before the screen says a first opening takes longer. PARAMETER. */
const SLOW_AFTER = 6;

/** Done, now and still to come, for a step of `steps` while the worker is on `now`. */
const stateOf = (steps: readonly Stage[], now: Stage | null, s: Stage) => {
  const at = now ? steps.indexOf(now) : -1;
  const i = steps.indexOf(s);
  return i < at ? 'done' : i === at ? 'now' : 'next';
};

/** A tip every few seconds, and the seconds since the wait began. */
function useWait() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return secs;
}

/**
 * The long waits of the career (opening, turn of the season): a stage of its own over the
 * stadium at night, the steps the worker goes through, and a tip to read meanwhile.
 */
export function CareerLoading({
  steps,
  stage,
  overlay = false,
}: {
  steps: readonly Stage[];
  stage: Stage | null;
  /** Over the room (turn of the season) instead of in place of it (opening). */
  overlay?: boolean;
}) {
  const secs = useWait();
  const at = stage ? steps.indexOf(stage) : 0;
  const share = (Math.max(0, at) + 0.5) / steps.length;
  const tip = TIPS[Math.floor(secs / 5) % TIPS.length]!;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${overlay ? 'fixed z-50' : 'fixed z-40'} inset-0 grid place-items-center overflow-hidden bg-club-night px-4`}
    >
      <picture aria-hidden>
        <source media="(orientation: portrait)" srcSet="/img/clube/estadio-v.webp" />
        <img
          src="/img/clube/estadio-h.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
      </picture>
      <div className="sala-slab relative flex w-full max-w-md flex-col items-center gap-5 px-6 py-7 text-center">
        <PitchLoader size="lg" />
        <p className="font-condensed text-2xl leading-tight font-black text-chalk uppercase sm:text-3xl">
          {t(stage ? STAGE_TEXT[stage] : 'career.computing')}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-chalk/15" aria-hidden>
          <div
            className="load-bar h-full rounded-full bg-club-gold"
            style={{ transform: `scaleX(${share})` }}
          />
        </div>
        <ol className="flex w-full flex-col gap-1.5 text-left text-sm">
          {steps.map((s) => {
            const st = stateOf(steps, stage, s);
            return (
              <li
                key={s}
                className={`flex items-center gap-2 ${st === 'done' ? 'text-club-gold' : st === 'now' ? 'load-step-now text-chalk' : 'text-chalk-soft/80'}`}
              >
                <span
                  aria-hidden
                  className={`grid size-4 shrink-0 place-items-center rounded-full border ${st === 'done' ? 'border-club-gold bg-club-gold' : st === 'now' ? 'border-club-gold' : 'border-chalk-soft/40'}`}
                >
                  {st === 'done' && <span className="size-1.5 rounded-full bg-club-night" />}
                </span>
                {t(STAGE_TEXT[s])}
              </li>
            );
          })}
        </ol>
        <p className="min-h-10 text-sm text-chalk-soft">{t(tip)}</p>
        {secs >= SLOW_AFTER && (
          <p className="text-xs text-chalk-soft/80">{t('career.load.slow')}</p>
        )}
      </div>
    </div>
  );
}

/** Milliseconds before a short wait shows itself: quicker steps never flash. PARAMETER. */
const SHOW_AFTER = 300;

/** A short wait (a day played, a match finished out of sight): a chip at the foot of the room. */
export function BusyChip() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), SHOW_AFTER);
    return () => window.clearTimeout(id);
  }, []);
  if (!shown) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 mx-auto flex w-fit items-center gap-3 rounded-full bg-club-night/95 py-2 pr-5 pl-2 text-sm font-bold text-chalk shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)] ring-1 ring-club-gold/40"
    >
      <PitchLoader size="sm" />
      {t('career.busy')}
    </div>
  );
}
