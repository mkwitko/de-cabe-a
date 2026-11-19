/**
 * The season read back at its end, and the club's history across seasons
 * (club-domain career/history.ts).
 */
import { t } from '../i18n';
import type { SimView } from './sim.worker';

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
const score = (g: [number, number]) => `${g[0]} × ${g[1]}`;

/** Shown in the season-end window, above the button that starts the next season. */
export function SeasonReview({ review: r }: { review: NonNullable<SimView['review']> }) {
  const verdict = r.fired ? 'fired' : r.met ? 'met' : 'missed';
  return (
    <div className="flex w-full flex-col gap-3 text-left" data-testid="season-review">
      <h3 className={LABEL}>{t('review.title', { season: r.season })}</h3>
      <p className="font-condensed text-3xl leading-[0.95] font-black text-balance uppercase sm:text-4xl">
        {t('review.position', { n: r.position, places: r.places, division: r.division })}
      </p>
      <p className={r.met ? 'font-semibold' : 'font-semibold text-club-danger'}>
        {t('review.verdict', { v: verdict, goal: r.goal })}
        {!r.fired && (
          <span className="font-normal text-chalk-soft">
            {' '}
            {t('review.confidence', { from: r.confidence.from, to: r.confidence.to })}
          </span>
        )}
      </p>
      {r.reasons.length > 0 && (
        <ul className="text-chalk-soft">
          {r.reasons.map((x) => (
            <li key={x.kind} className="flex justify-between gap-4">
              <span>{t('board.reason', { k: x.kind })}</span>
              <span className="tabular-nums">
                {x.value < 0 ? t('board.down', { n: -x.value }) : t('board.up', { n: x.value })}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="font-semibold">
        {r.champion
          ? t('review.champion', { division: r.division })
          : t('review.championOther', { name: r.championName })}
        {r.move !== 'stay' && ` ${t('review.move', { m: r.move })}`}
        {r.cups.map((c) => ` ${t('review.cup', { name: c })}`)}
      </p>
      <p>
        {t('review.record', {
          w: r.record.won,
          d: r.record.drawn,
          l: r.record.lost,
          gf: r.record.for,
          ga: r.record.against,
        })}
      </p>
      {(r.biggestWin || r.worstDefeat) && (
        <ul className="text-chalk-soft">
          {r.biggestWin && (
            <li>
              {t('review.bestWin', {
                score: score(r.biggestWin.goals),
                opponent: r.biggestWin.opponent,
              })}
            </li>
          )}
          {r.worstDefeat && (
            <li>
              {t('review.worstLoss', {
                score: score(r.worstDefeat.goals),
                opponent: r.worstDefeat.opponent,
              })}
            </li>
          )}
        </ul>
      )}
      {r.used.length > 0 && (
        <div>
          <p className="font-semibold">{t('review.used')}</p>
          <ul className="text-chalk-soft">
            {r.used.map((p) => (
              <li key={p.name}>{t('review.usedRow', { name: p.name, n: p.starts })}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The seasons so far, newest first; titles and promotions stand out. */
export function History({ history }: { history: SimView['history'] }) {
  const rows = [...history].reverse();
  return (
    <div className="sala-slab flex flex-col gap-3 p-4 sm:p-5 lg:col-span-2">
      <h3 id="history-title" className={LABEL}>
        {t('history.title')}
      </h3>
      {rows.length === 0 ? (
        <p className="text-chalk-soft">{t('history.none')}</p>
      ) : (
        <ul aria-labelledby="history-title">
          {rows.map((h) => {
            const star = h.champion || h.move === 'promotion' || h.cups.length > 0;
            return (
              <li
                key={h.season}
                className={`flex flex-wrap items-baseline justify-between gap-x-4 border-t border-chalk/10 py-2 first:border-0 ${star ? 'font-semibold' : ''}`}
              >
                <span className="font-condensed text-xl font-extrabold tabular-nums">
                  {h.season}
                </span>
                <span className="min-w-0 flex-1">
                  {t('history.row', {
                    club: h.club,
                    division: h.division,
                    n: h.position,
                    goal: h.goal,
                    met: h.fired ? 'fired' : h.met ? 'met' : 'missed',
                  })}
                </span>
                {star && (
                  <span className="font-condensed text-club-gold uppercase">
                    {[
                      h.champion && t('history.title1'),
                      h.move === 'promotion' && t('history.promoted'),
                      ...h.cups,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
                {h.move === 'relegation' && (
                  <span className="text-club-danger">{t('history.relegated')}</span>
                )}
                {h.top && (
                  <span className="basis-full text-sm text-chalk-soft">
                    {t('history.top', { name: h.top.name, n: h.top.starts })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
