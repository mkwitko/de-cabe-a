import { useEffect, useRef } from 'react';
import { TITLE_LADDER } from '../lib/format';
import { TitleBadge } from './TitleBadge';
import { LockIcon } from './Icons';
import { StarIcon } from './Stars';

/**
 * Trophy rail: the 10 titles as plaques on one brass rail, Peneira on the left, Rei da Bola on
 * the right. Reached ones are lit, the current one is bigger under the lamp, the next one carries
 * its progress; later ones are faded with their price. Under the rail: what is missing and the
 * reward. Phones scroll the rail sideways, opened on the current plaque.
 */
export function TitleLadder({ total }: { total: number }) {
  const cur = Math.max(
    0,
    TITLE_LADDER.findLastIndex((t) => total >= t.min),
  );
  const here = TITLE_LADDER[cur]!;
  const next = TITLE_LADDER[cur + 1];
  const pct = next ? ((total - here.min) / (next.min - here.min)) * 100 : 100;
  const rail = useRef<HTMLOListElement>(null);
  // Open the rail on the current plaque (only the rail scrolls, never the page).
  useEffect(() => {
    const ol = rail.current;
    const li = ol?.children[cur] as HTMLElement | undefined;
    if (ol && li) ol.scrollLeft = li.offsetLeft - ol.clientWidth / 2 + li.clientWidth / 2;
  }, [cur]);

  return (
    <section aria-labelledby="escada" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="escada" className="font-condensed text-3xl font-extrabold uppercase">
          Escada de títulos
        </h2>
        <span className="font-condensed tabular text-lg font-black text-chalk-soft">
          {cur + 1} de {TITLE_LADDER.length}
        </span>
      </div>
      <div className="trophy-shelf -mx-4 sm:mx-0">
        <ol
          ref={rail}
          className="trophy-rail flex snap-x snap-proximity overflow-x-auto px-4 pt-3 pb-2 sm:justify-between sm:px-3"
        >
          {TITLE_LADDER.map((t, i) => {
            const isHere = i === cur;
            const isNext = i === cur + 1;
            const locked = i > cur;
            return (
              <li
                key={t.name}
                aria-current={isHere ? 'step' : undefined}
                aria-label={`${t.name}: ${isHere ? 'seu título' : locked ? `${t.min} estrelas` : 'conquistado'}`}
                className={`relative flex w-[4.25rem] shrink-0 snap-center flex-col items-center gap-1.5 ${isHere ? 'trophy-lit' : ''}`}
              >
                <span className="grid h-[4.5rem] place-items-center">
                  <span
                    className={`trophy-plaque grid place-items-center ${isHere ? 'size-[4.25rem]' : 'size-12'} ${locked ? 'brightness-[0.5] saturate-50' : ''}`}
                    style={{ background: t.frame }}
                  >
                    <TitleBadge
                      name={t.name}
                      locked={locked}
                      className={isHere ? 'size-11' : 'size-8'}
                    />
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`font-condensed text-center text-[0.8rem] leading-none font-extrabold uppercase ${isHere ? 'text-gold' : locked ? 'text-chalk-soft/70' : 'text-chalk'}`}
                >
                  {t.name}
                </span>
                <span
                  aria-hidden="true"
                  className="tabular flex h-4 items-center gap-0.5 text-xs font-semibold text-chalk-soft"
                >
                  {isNext ? (
                    <span className="block h-1.5 w-12 overflow-hidden rounded-full bg-chalk/15">
                      <span
                        className="block h-full rounded-full bg-cover"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  ) : locked ? (
                    <>
                      <LockIcon className="size-3" />
                      {t.min}
                      <StarIcon className="size-3" />
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-semibold">
          {next ? (
            <>
              Faltam <span className="tabular text-gold">{next.min - total}</span> estrelas para{' '}
              {next.name}.
            </>
          ) : (
            'Topo da escada. Não tem título acima.'
          )}
        </p>
        {next && (
          <div
            role="progressbar"
            aria-label={`Estrelas até ${next.name}`}
            aria-valuemin={here.min}
            aria-valuemax={next.min}
            aria-valuenow={total}
            className="h-2 overflow-hidden rounded-full bg-chalk/15"
          >
            <span
              className="block h-full rounded-full bg-cover transition-[width] duration-700 ease-out-expo"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <p className="text-sm text-chalk-soft">
          {next ? `Em ${next.name} você ganha: ${next.perk}.` : `Sua recompensa: ${here.perk}.`}
        </p>
      </div>
    </section>
  );
}
