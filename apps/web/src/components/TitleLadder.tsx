import { TITLE_LADDER } from '../lib/format';
import { TitleBadge } from './TitleBadge';
import { CheckIcon, LockIcon } from './Icons';
import { StarIcon } from './Stars';

/** The reward, shown as itself: a small card in the title's frame and colour. */
function FramePreview({
  frame,
  tone,
  className,
}: {
  frame: string;
  tone: string;
  className: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rounded-[5px] p-[3px] shadow-[0_2px_4px_rgb(0_0_0/0.25)] ${className}`}
      style={{ background: frame }}
    >
      <span className="block size-full rounded-[3px]" style={{ background: tone }} />
    </span>
  );
}

/**
 * The 10 titles climbing upward. The current one is a lit card in its own colour and frame with
 * the bar to the next; reached ones carry a check, future ones a lock, each with its reward.
 */
export function TitleLadder({ total }: { total: number }) {
  const cur = TITLE_LADDER.findLastIndex((t) => total >= t.min);
  return (
    <section aria-labelledby="escada" className="flex flex-col gap-4">
      <h2 id="escada" className="font-condensed text-3xl font-extrabold uppercase">
        Escada de títulos
      </h2>
      <ol className="flex flex-col-reverse gap-1">
        {TITLE_LADDER.map((t, i) => {
          if (i === cur) {
            const next = TITLE_LADDER[i + 1];
            const pct = next ? ((total - t.min) / (next.min - t.min)) * 100 : 100;
            return (
              <li
                key={t.name}
                aria-current="step"
                className="my-2 rounded-[14px] p-2 shadow-[0_14px_30px_-12px_rgb(0_0_0/0.55)]"
                style={{ background: t.frame }}
              >
                <div
                  className="flex flex-col gap-4 rounded-[8px] p-4 text-ink"
                  style={{ background: t.tone }}
                >
                  <div className="flex items-center gap-4">
                    <TitleBadge name={t.name} className="size-16 sm:size-20" />
                    <div className="min-w-0">
                      <p className="font-condensed text-[clamp(2.25rem,9vw,3.25rem)] leading-[0.85] font-black uppercase">
                        {t.name}
                      </p>
                      <p className="mt-2 text-sm font-bold">Seu título · recompensa: {t.perk}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="font-semibold">
                      {next
                        ? `Faltam ${next.min - total} estrelas para ${next.name}.`
                        : 'Topo da escada. Não tem título acima.'}
                    </p>
                    <div
                      role="progressbar"
                      aria-label={next ? `Estrelas até ${next.name}` : 'Título máximo'}
                      aria-valuemin={t.min}
                      aria-valuemax={next?.min ?? total}
                      aria-valuenow={total}
                      className="h-3 overflow-hidden rounded-full bg-ink/15"
                    >
                      <span
                        className="block h-full rounded-full bg-ink transition-[width] duration-700 ease-out-expo"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {next && (
                      <p className="tabular flex justify-between text-sm font-bold">
                        <span>{total}</span>
                        <span>{next.min}</span>
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          }
          const reached = i < cur;
          return (
            <li key={t.name} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <TitleBadge name={t.name} locked={!reached} className="size-11" />
              <div className="min-w-0 flex-1">
                <p
                  className={`font-condensed text-xl leading-none font-extrabold uppercase ${reached ? '' : 'text-chalk-soft'}`}
                >
                  {t.name}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-chalk-soft">
                  <FramePreview frame={t.frame} tone={t.tone} className="h-5 w-4" />
                  {t.perk}
                </p>
              </div>
              <span className="tabular flex shrink-0 items-center gap-1 text-sm font-semibold text-chalk-soft">
                {reached ? (
                  <>
                    <CheckIcon className="size-4 text-chalk" />
                    Conquistado
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}
