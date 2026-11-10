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
  // The headline is the next game still to play (or the first, when all are done).
  const lead = data.games.find((g) => g.state !== 'done') ?? data.games[0];
  return (
    <>
      <GameHeader title="Desafio do Dia" />
      {/* Capa de jornal: masthead, date line, headline with the mode of the day, columns. */}
      <article className="mt-5 overflow-hidden rounded-lg border-2 border-[#2b2418] text-[#2b2418] shadow-[0_14px_30px_-12px_rgb(0_0_0/0.6)] [background:repeating-linear-gradient(0deg,#0000000d_0_1px,transparent_1px_6px),#e8dcc0]">
        <div className="font-condensed flex flex-wrap items-center justify-between gap-x-4 border-b-4 border-double border-[#2b2418] px-4 py-2 text-sm font-extrabold tracking-[0.15em] uppercase">
          <span>Gazeta De Cabeça</span>
          <span className="first-letter:uppercase">{dayLabel(data.date)}</span>
          <span className="tabular">
            {done}/{data.games.length} jogados
          </span>
        </div>
        {lead && (
          <div className="flex flex-col gap-3 border-b-2 border-[#2b2418] px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="font-condensed text-sm font-extrabold tracking-[0.2em] uppercase">
                {done === data.games.length ? 'Tudo jogado' : 'Manchete do dia'}
              </p>
              <p className="font-condensed text-5xl leading-[0.88] font-black uppercase sm:text-7xl">
                {GAME_NAME[lead.mode]}
              </p>
              <p className="mt-2 text-sm font-semibold">
                Fase {lead.level}
                {lead.solvedPct !== null && ` · ${lead.solvedPct}% acertaram`}
              </p>
            </div>
          </div>
        )}
        <p className="px-4 pt-3 text-sm font-semibold">
          {isToday ? 'Mesmas fases para todo mundo, novas à meia-noite.' : 'Edição de outro dia.'}
        </p>
        <ul className="grid gap-px p-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.games.map((g) => {
            const to = `${GAME_PATH[g.mode]}/${g.level}`;
            return (
              <li key={g.mode} className="flex items-center gap-4 border-b border-[#2b2418]/30 p-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-condensed text-xl leading-tight font-extrabold uppercase">
                    {GAME_NAME[g.mode]}
                  </span>
                  <span className="text-sm font-medium">
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
                    <Stars n={g.stars} onCover />
                  </Link>
                ) : (
                  <Link
                    to={to}
                    className="font-condensed inline-flex min-h-11 shrink-0 items-center rounded-lg bg-[#2b2418] px-5 text-lg font-extrabold tracking-wide text-[#e8dcc0] uppercase"
                  >
                    {g.state === 'in_progress' ? 'Continuar' : 'Jogar'}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </article>
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
