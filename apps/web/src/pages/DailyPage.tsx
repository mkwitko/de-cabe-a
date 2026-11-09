/**
 * Desafio do Dia (GROWTH_PLAN.md 1.9): one level per mode, the same for everyone, new at midnight
 * in Brasília. Shows how many got it right once 30 plays make the share meaningful, and the days
 * before. No streak on purpose.
 */
import { Link, useParams } from 'react-router';
import { GAME_NAME, GAME_PATH, useDaily } from '../lib/game';
import { Stars } from '../components/Stars';
import { btnPrimary, btnSecondary, GameHeader, Notice, Skeleton } from '../components/ui';

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
