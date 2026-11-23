/** "Só o resultado": the moment after a match nobody watched, before the office. */
import { btnPrimary } from '../../../components/ui';
import { headlineKind } from '../headline';
import { t } from '../i18n';
import type { SimView } from './sim.worker';

type Last = NonNullable<SimView['last']>;

export interface Played {
  last: Last;
  /** The club's place in the table before and after; 0 when it is not in one. */
  places: [number, number];
}

export function ResultCard({ played, onDone }: { played: Played; onDone: () => void }) {
  const { last, places } = played;
  const mine = last.mine;
  const rival = last[mine === 0 ? 'away' : 'home'];
  const kind = headlineKind({
    mine: last.goals[mine]!,
    theirs: last.goals[1 - mine]!,
    gap: last.gap,
  });
  const [from, to] = places;
  const move = to < from ? 'result.up' : to > from ? 'result.down' : 'result.same';
  return (
    <section
      aria-labelledby="result-title"
      data-testid="result-card"
      className="sala-slab mx-auto flex w-full max-w-xl flex-col items-center gap-4 p-5 text-center sm:p-8"
    >
      <h2
        id="result-title"
        className="font-condensed text-3xl leading-[0.95] font-black text-balance uppercase sm:text-5xl"
      >
        {t(`headline.${kind}`, { team: rival.shortName })}
      </h2>
      <p className="flex items-center gap-3 font-condensed text-lg font-extrabold uppercase">
        <span>{last.home.shortName}</span>
        <span className="rounded-lg bg-club-gold px-3 text-3xl text-ink tabular-nums">
          {t('career.score', { a: last.goals[0], b: last.goals[1] })}
        </span>
        <span>{last.away.shortName}</span>
      </p>
      {from > 0 && to > 0 && <p className="text-chalk-soft">{t(move, { n: to })}</p>}
      {last.why.length > 0 && (
        <ul className="flex flex-col gap-1 text-left text-sm text-pretty">
          {last.why.slice(0, 2).map((f) => (
            <li key={f.kind}>{t('career.whyFact', { k: f.kind, n: f.n })}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={`${btnPrimary} min-h-13 bg-club-gold px-10`}
        onClick={onDone}
      >
        {t('friendly.continue')}
      </button>
    </section>
  );
}
