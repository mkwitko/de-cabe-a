/**
 * Desafio do Dia (GROWTH_PLAN.md 1.9): one level per mode, the same for everyone, new at midnight
 * in Brasília. Shows how many got it right once 30 plays make the share meaningful, and the days
 * before. No streak on purpose.
 */
import { Link, useParams } from 'react-router';
import { GAME_NAME, GAME_PATH, useDaily, useRound } from '../lib/game';
import { Stars } from '../components/Stars';
import { btnPrimary, btnSecondary, GameHeader, Notice, Skeleton } from '../components/ui';
import { StarIcon } from '../components/Stars';

/** "segunda-feira, 9 de novembro" for a YYYY-MM-DD civil date. */
export const dayLabel = (date: string, weekday = true) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    ...(weekday ? { weekday: 'long' } : {}),
  }).format(new Date(`${date}T12:00:00Z`));

export function DailyPage() {
  const param = useParams().date ?? 'hoje';
  const { data, error, isPending } = useDaily(param);

  if (isPending)
    return (
      <>
        <GameHeader title="Desafio do Dia" />
        <Skeleton className="mt-6 h-96" />
      </>
    );
  if (error || !data)
    return (
      <>
        <GameHeader title="Desafio do Dia" />
        <div className="mt-6">
          <Notice
            title="Sem desafio nesse dia"
            action={
              <Link to="/d/hoje" className={btnPrimary}>
                Desafio de hoje
              </Link>
            }
          >
            {error?.message ?? 'Tente outro dia.'}
          </Notice>
        </div>
      </>
    );

  const isToday = data.date === data.today;
  const done = data.games.filter((g) => g.state === 'done').length;
  return (
    <>
      <GameHeader title="Desafio do Dia" />
      <p className="mt-2 text-chalk-soft first-letter:uppercase">
        {dayLabel(data.date)}
        {isToday ? ' · mesmas fases para todo mundo, novas à meia-noite' : ''}
      </p>
      <p className="font-condensed tabular mt-4 text-xl font-black">
        {done}/{data.games.length} jogados
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.games.map((g) => {
          const to = `${GAME_PATH[g.mode]}/${g.level}`;
          return (
            <li
              key={g.mode}
              className="flex items-center gap-4 rounded-xl border border-chalk/15 bg-chalk/[0.06] p-4"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-condensed text-xl leading-tight font-extrabold uppercase">
                  {GAME_NAME[g.mode]}
                </span>
                <span className="text-sm text-chalk-soft">
                  Fase {g.level}
                  {g.solvedPct !== null && ` · ${g.solvedPct}% acertaram`}
                </span>
              </span>
              {g.state === 'done' ? (
                <Link
                  to={to}
                  aria-label={`${GAME_NAME[g.mode]}: ver resultado`}
                  className="shrink-0"
                >
                  <Stars n={g.stars} />
                </Link>
              ) : (
                <Link to={to} className={`${btnPrimary} shrink-0`}>
                  {g.state === 'in_progress' ? 'Continuar' : 'Jogar'}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-chalk-soft">
        O percentual de acerto de cada jogo aparece depois de 30 jogadas no dia.
      </p>

      <Round />

      {!isToday && (
        <Link to="/d/hoje" className={`${btnSecondary} mt-8`}>
          Desafio de hoje
        </Link>
      )}

      {data.archive.length > 0 && (
        <section aria-labelledby="arquivo" className="mt-12">
          <h2 id="arquivo" className="font-condensed text-2xl font-extrabold uppercase">
            Dias anteriores
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {data.archive.map((d) => (
              <li key={d}>
                <Link
                  to={`/d/${d}`}
                  aria-current={d === data.date ? 'page' : undefined}
                  className="inline-flex min-h-11 items-center rounded-lg border border-chalk/15 px-3 text-sm font-semibold hover:bg-chalk/[0.06] aria-[current=page]:bg-cover aria-[current=page]:text-ink"
                >
                  {dayLabel(d, false)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const WEEKDAY = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

/**
 * Rodada semanal (GROWTH_PLAN.md 2.7): the Desafio do Dia from Monday to Friday. Only the best
 * days count, so missing one or two does not knock anyone out.
 */
function Round() {
  const { data } = useRound();
  if (!data) return null;
  return (
    <section aria-labelledby="rodada" className="mt-12">
      <h2 id="rodada" className="font-condensed text-2xl font-extrabold uppercase">
        Rodada da semana
      </h2>
      <p className="mt-1 text-sm text-chalk-soft">
        Os desafios de segunda a sexta. Contam os {data.counted} melhores dias, então faltar um ou
        dois não tira você da rodada. Vale o dia em que você jogou.
      </p>
      <ol className="mt-4 grid grid-cols-5 gap-2">
        {data.days.map((d, i) => (
          <li
            key={d.day}
            className={`flex flex-col items-center rounded-lg px-1 py-2 ${d.open ? 'bg-chalk/[0.08]' : 'border border-dashed border-chalk/20 text-chalk-soft'}`}
          >
            <span className="text-xs font-semibold">{WEEKDAY[i]}</span>
            <span className="font-condensed tabular text-xl font-black">
              {d.open ? `★${d.stars}` : '·'}
            </span>
          </li>
        ))}
      </ol>
      <p className="font-condensed tabular mt-3 text-xl font-black">
        Sua rodada: <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {data.me.total}
        {data.me.position ? ` · ${data.me.position}º na rodada` : ''}
      </p>
      {data.entries.length > 0 && (
        <ol className="mt-3 flex flex-col">
          {data.entries.slice(0, 10).map((e) => (
            <li
              key={e.position}
              className={`flex min-h-11 items-center gap-3 border-b border-chalk/10 px-2 last:border-b-0 ${e.isMe ? 'rounded-md border-transparent bg-cover text-ink' : ''}`}
            >
              <span className="font-condensed tabular w-6 text-right text-lg font-black">
                {e.position}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}</span>
              <span className="font-condensed tabular font-bold">
                <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {e.stars}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
