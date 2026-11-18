/**
 * The boardroom: the season's goal against where the club stands, the board's confidence with
 * the facts that last moved it, and the ultimatum when one runs (club-domain career/board.ts).
 * `Fired` is the end of the job.
 */
import { btnPrimary } from '../../../components/ui';
import { t } from '../i18n';
import type { Front, WorkNo } from '@decabeca/club-domain';
import type { SimView } from './sim.worker';

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
const stateOf = (c: number) =>
  c >= 70 ? 'high' : c >= 45 ? 'steady' : c >= 25 ? 'pressed' : 'edge';
const BAR = {
  high: 'bg-club-turf',
  steady: 'bg-club-gold',
  pressed: 'bg-club-gold',
  edge: 'bg-club-danger',
} as const;

/** A work the person proposed and the board's answer: null when it signed. */
export type WorkSaid = { front: Front; no: WorkNo | null } | null;

export function Board({
  sim,
  busy = false,
  said = null,
  onWork,
}: {
  sim: SimView;
  busy?: boolean;
  said?: WorkSaid;
  onWork?: ((front: Front) => void) | undefined;
}) {
  const b = sim.board;
  const state = stateOf(b.confidence);
  const f = b.fairplay;
  const over = f.limit !== null && f.cost > f.limit;
  const overKey = over ? 'yes' : 'no';
  return (
    <section aria-labelledby="board-title" className="grid items-start gap-5 lg:grid-cols-2">
      <div className="sala-slab flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <h3 className={LABEL}>{t('board.goal')}</h3>
          <p className="font-condensed text-3xl leading-[0.95] font-black text-balance uppercase sm:text-4xl">
            {t('board.goalText', { division: sim.division, n: b.goal })}
          </p>
          <p className={b.position <= b.goal ? 'text-chalk' : 'font-semibold text-club-danger'}>
            {t('board.position', { n: b.position })}
          </p>
          <p className="text-chalk-soft">
            {t('board.directors', {
              h: b.directors.horizon,
              n: b.directors.competence,
            })}
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-chalk/10 pt-4">
          <h3 id="board-title" className={LABEL}>
            {t('board.confidence')}
          </h3>
          <p className="flex items-baseline gap-3">
            <span className="font-condensed text-6xl leading-none font-black tabular-nums">
              {b.confidence}
            </span>
            <span className="font-condensed text-2xl leading-none font-extrabold uppercase">
              {t('board.state', { s: state })}
            </span>
          </p>
          <div
            role="meter"
            aria-labelledby="board-title"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={b.confidence}
            className="h-2 overflow-hidden rounded-full bg-chalk/12"
          >
            <span
              className={`block h-full rounded-full ${BAR[state]}`}
              style={{ width: `${b.confidence}%` }}
            />
          </div>
        </div>
      </div>

      <div className="sala-slab flex min-w-0 flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <h3 className={LABEL}>{t('board.last')}</h3>
          {b.last.length === 0 ? (
            <p className="text-chalk-soft">{t('board.none')}</p>
          ) : (
            <ul>
              {b.last.map((r) => (
                <li
                  key={r.kind}
                  className="flex items-center justify-between gap-4 border-t border-chalk/10 py-2 first:border-0"
                >
                  <span className="font-semibold">
                    {r.kind === 'result'
                      ? t('board.result', { r: r.result, odds: r.odds })
                      : t('board.reason', { k: r.kind })}
                  </span>
                  <span
                    className={`font-condensed text-2xl leading-none font-black tabular-nums ${r.value < 0 ? 'text-club-danger' : 'text-club-gold'}`}
                  >
                    {r.value < 0 ? t('board.down', { n: -r.value }) : t('board.up', { n: r.value })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-chalk/10 pt-4">
          <h3 id="fairplay-title" className={`${LABEL} ${over ? 'text-club-danger' : ''}`}>
            {t('board.fairplay')}
          </h3>
          <p className="flex items-baseline gap-3">
            <span className="font-condensed text-4xl leading-none font-black tabular-nums">
              {t('board.fairplayCost', { n: f.cost })}
            </span>
            <span className="text-chalk-soft">
              {f.limit === null
                ? t('board.fairplayNoLimit')
                : t('board.fairplayLimit', { n: f.limit })}
            </span>
          </p>
          <div
            role="meter"
            aria-labelledby="fairplay-title"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, f.cost)}
            className="relative h-2 rounded-full bg-chalk/12"
          >
            <span
              className={`block h-full rounded-full ${over ? 'bg-club-danger' : 'bg-club-turf'}`}
              style={{ width: `${Math.min(100, f.cost)}%` }}
            />
            {f.limit !== null && (
              <span
                aria-hidden
                className="absolute -top-1 h-4 w-0.5 bg-chalk"
                style={{ left: `${f.limit}%` }}
              />
            )}
          </div>
          <p className={f.strikes > 0 ? 'font-semibold' : 'text-chalk-soft'}>
            {t('board.fairplayState', {
              s: Math.min(4, f.strikes),
              over: overKey,
              points: f.points,
            })}
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-chalk/10 pt-4">
          <h3 className={`${LABEL} ${b.ultimatum ? 'text-club-danger' : ''}`}>
            {t('board.ultimatum')}
          </h3>
          <p className={b.ultimatum ? 'text-lg font-semibold' : 'text-chalk-soft'}>
            {b.ultimatum
              ? t('board.ultimatumText', {
                  points: b.ultimatum.points,
                  matches: b.ultimatum.matches,
                })
              : t('board.calm')}
          </p>
        </div>
      </div>
      <div className="sala-slab flex flex-col gap-3 p-4 sm:p-5 lg:col-span-2">
        <h3 id="structure-title" className={LABEL}>
          {t('board.structure')}
        </h3>
        <p className="text-chalk-soft">
          {t('board.upkeep', { cost: t('career.cash', { value: b.upkeep }) })}
        </p>
        {said && (
          <p role="status" className={said.no ? 'font-semibold text-club-danger' : 'font-semibold'}>
            {said.no
              ? t('board.workNo', { r: said.no })
              : t('board.workYes', { f: t('board.front', { f: said.front }) })}
          </p>
        )}
        <ul aria-labelledby="structure-title" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {b.structure.map((x) => (
            <li key={x.front} className="flex flex-col gap-2 rounded-lg border border-chalk/10 p-3">
              <span className="font-condensed text-lg leading-tight font-extrabold uppercase">
                {t('board.front', { f: x.front })}
              </span>
              <span className="tabular-nums">
                {x.front === 'stadium'
                  ? t('board.seats', { n: x.level })
                  : t('board.level', { n: x.level })}
              </span>
              <span className="text-sm text-chalk-soft">
                {x.building
                  ? t('board.building')
                  : x.cost === null
                    ? t('board.top')
                    : t('board.workCost', { cost: t('career.cash', { value: x.cost }) })}
              </span>
              {onWork && !x.building && x.cost !== null && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label={t('board.proposeName', { f: t('board.front', { f: x.front }) })}
                  className="min-h-11 rounded-lg border border-chalk/20 px-3 font-condensed font-extrabold uppercase hover:bg-chalk/10 disabled:opacity-50"
                  onClick={() => onWork(x.front)}
                >
                  {t('board.propose')}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The board ended the job: the clubs that call, and the door to another career. */
export function Fired({
  club,
  offers,
  busy,
  onTake,
  onRestart,
}: {
  club: string;
  offers: SimView['board']['offers'];
  busy: boolean;
  onTake: (clubId: string) => void;
  onRestart: () => void;
}) {
  return (
    <div className="club-tunnel fixed inset-0 z-40 flex overflow-y-auto bg-club-night p-4 sm:p-6">
      <picture aria-hidden>
        <source media="(orientation: portrait)" srcSet="/img/clube/tunel-v.webp" />
        <img
          src="/img/clube/tunel-h.webp"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
      <div className="sala-glass relative m-auto flex w-full max-w-xl min-w-0 flex-col items-center gap-5 text-center">
        <h2 className="font-condensed text-3xl leading-[0.92] font-black text-balance uppercase sm:text-6xl">
          {t('board.fired')}
        </h2>
        <p className="text-lg text-balance">{t('board.firedText', { club })}</p>
        {offers.length > 0 && (
          <section aria-labelledby="job-offers" className="flex w-full flex-col gap-2">
            <h3 id="job-offers" className="font-condensed text-xl font-extrabold uppercase">
              {t('board.offers')}
            </h3>
            <ul className="flex flex-col gap-2">
              {offers.map((o) => (
                <li
                  key={o.clubId}
                  className="flex min-w-0 items-center gap-3 rounded-lg bg-club-night/60 p-3 text-left"
                >
                  <span
                    aria-hidden
                    className="size-8 shrink-0 rounded-full border-2"
                    style={{ background: o.colours[0], borderColor: o.colours[1] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-condensed text-lg leading-tight font-extrabold text-balance uppercase">
                      {o.name}
                    </span>
                    <span className="block truncate text-sm text-chalk-soft">{o.division}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={t('board.takeName', { club: o.name })}
                    className={`${btnPrimary} min-h-11 shrink-0 bg-club-gold`}
                    onClick={() => onTake(o.clubId)}
                  >
                    {t('board.take')}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <button
          type="button"
          className="min-h-11 px-3 font-semibold underline underline-offset-4"
          onClick={onRestart}
        >
          {t('board.restart')}
        </button>
      </div>
    </div>
  );
}
