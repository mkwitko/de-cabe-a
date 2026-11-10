import { TITLE_LADDER } from '../lib/format';
import { TitleBadge } from './TitleBadge';
import { CheckIcon, LockIcon } from './Icons';
import { StarIcon } from './Stars';

/**
 * Trophy rail: the 10 titles climbing a brass rail, Rei da Bola on top. Each title is its own
 * shield on a plaque in its frame metal; reached ones are lit, future ones faded with a lock and
 * their price. The current one is lit under the lamp, bigger, with the stars to the next. The
 * title's name itself lives on the member card; here it is one rung among the others.
 */
export function TitleLadder({ total }: { total: number }) {
  const cur = TITLE_LADDER.findLastIndex((t) => total >= t.min);
  return (
    <section aria-labelledby="escada" className="flex flex-col gap-3">
      <h2 id="escada" className="font-condensed text-3xl font-extrabold uppercase">
        Escada de títulos
      </h2>
      <ol className="trophy-rail flex flex-col-reverse">
        {TITLE_LADDER.map((t, i) => {
          const reached = i < cur;
          const here = i === cur;
          const next = here ? TITLE_LADDER[i + 1] : undefined;
          return (
            <li
              key={t.name}
              aria-current={here ? 'step' : undefined}
              className={`relative flex items-center gap-3 rounded-xl py-1 ${here ? 'trophy-lit my-2 py-3' : ''}`}
            >
              <span className="grid w-14 shrink-0 place-items-center">
                <span
                  className={`trophy-plaque grid place-items-center ${here ? 'size-14' : 'size-11'} ${i > cur ? 'brightness-[0.55] saturate-50' : ''}`}
                  style={{ background: t.frame }}
                >
                  <TitleBadge
                    name={t.name}
                    locked={i > cur}
                    className={here ? 'size-10' : 'size-8'}
                  />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-condensed leading-none font-extrabold uppercase ${here ? 'text-3xl text-gold' : `text-xl ${reached ? '' : 'text-chalk-soft'}`}`}
                >
                  {t.name}
                </p>
                {here ? (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <p className="text-sm font-semibold">
                      {next
                        ? `Faltam ${next.min - total} estrelas para ${next.name}.`
                        : 'Topo da escada. Não tem título acima.'}
                    </p>
                    {next && (
                      <div
                        role="progressbar"
                        aria-label={`Estrelas até ${next.name}`}
                        aria-valuemin={t.min}
                        aria-valuemax={next.min}
                        aria-valuenow={total}
                        className="h-2 max-w-72 overflow-hidden rounded-full bg-chalk/15"
                      >
                        <span
                          className="block h-full rounded-full bg-cover transition-[width] duration-700 ease-out-expo"
                          style={{ width: `${((total - t.min) / (next.min - t.min)) * 100}%` }}
                        />
                      </div>
                    )}
                    <p className="text-sm text-chalk-soft">Recompensa: {t.perk}</p>
                  </div>
                ) : (
                  <p className="mt-1 truncate text-sm text-chalk-soft max-sm:hidden">{t.perk}</p>
                )}
              </div>
              {!here && (
                <span className="tabular flex shrink-0 items-center gap-1 text-sm font-semibold text-chalk-soft">
                  {reached ? (
                    <>
                      <CheckIcon className="size-4 text-chalk" />
                      <span className="max-sm:sr-only">Conquistado</span>
                    </>
                  ) : (
                    <>
                      <LockIcon className="size-4" />
                      {t.min}
                      <StarIcon className="size-3.5" />
                      <span className="sr-only">estrelas</span>
                    </>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
