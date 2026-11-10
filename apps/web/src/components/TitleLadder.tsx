import { TITLE_LADDER } from '../lib/format';
import { TitleBadge } from './TitleBadge';

/** The 10 titles as a vertical track: reached ones filled, the current one lit, the next one says what is missing. */
export function TitleLadder({ total }: { total: number }) {
  const cur = TITLE_LADDER.findLastIndex((t) => total >= t.min);
  const next = TITLE_LADDER[cur + 1];
  return (
    <div>
      <p className="font-semibold">
        {next
          ? `Faltam ${next.min - total} estrelas para ${next.name}.`
          : 'Rei da Bola. Não tem título acima.'}
      </p>
      <ol aria-label="Escada de títulos" className="mt-4 flex flex-col-reverse">
        {TITLE_LADDER.map((t, i) => {
          const reached = i <= cur;
          const here = i === cur;
          return (
            <li
              key={t.name}
              aria-current={here ? 'step' : undefined}
              className={`relative flex items-center gap-4 rounded-lg px-3 py-2 ${here ? 'bg-chalk/[0.12]' : ''}`}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-[calc(100%-0.5rem)] left-[calc(2.125rem-1px)] h-4 w-0.5 ${reached ? 'bg-cover' : 'bg-chalk-soft/30'}`}
                />
              )}
              <TitleBadge name={t.name} locked={!reached} className="size-11" />
              <div className="min-w-0 flex-1">
                <p
                  className={`font-condensed text-xl leading-none font-extrabold uppercase ${here ? 'text-gold' : reached ? '' : 'text-chalk-soft'}`}
                >
                  {t.name}
                  {here && <span className="sr-only"> (seu título)</span>}
                </p>
                <p className="mt-1 text-sm text-chalk-soft">{t.perk}</p>
              </div>
              <span className="tabular shrink-0 text-sm font-semibold text-chalk-soft">
                {t.min} estrelas
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
