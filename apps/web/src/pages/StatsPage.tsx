import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useStats } from '../lib/game';
import { TITLE_LADDER } from '../lib/format';
import { StarIcon } from '../components/Stars';
import { Skeleton } from '../components/ui';
import { Achievements } from '../components/Achievements';

/** One figure: label for assistive tech first (dt), number shown first. */
function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-sm text-chalk-soft">{label}</dt>
      <dd className="font-condensed tabular flex items-center gap-1 text-4xl leading-none font-black">
        {children}
      </dd>
    </div>
  );
}

/** Reserva → Titular → Craque → Lenda, filled up to the player's stars. */
function TitleLadder({ total, current }: { total: number; current: string }) {
  return (
    <ol className="grid grid-cols-4" aria-label="Escada de títulos">
      {TITLE_LADDER.map((t, i) => {
        const reached = total >= t.min;
        const next = TITLE_LADDER[i + 1];
        const fill = next ? Math.min(1, Math.max(0, (total - t.min) / (next.min - t.min))) : 0;
        return (
          <li key={t.name} className="flex flex-col gap-2">
            <div className="flex items-center">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full border-2 ${
                  reached
                    ? 'border-cover bg-cover text-ink'
                    : 'border-dashed border-chalk-soft/60 text-chalk-soft'
                }`}
              >
                <StarIcon className="size-4" />
              </span>
              {next && (
                <span className="mx-1 h-1.5 flex-1 overflow-hidden rounded-full bg-chalk/15">
                  <span
                    className="block h-full rounded-full bg-cover"
                    style={{ width: `${fill * 100}%` }}
                  />
                </span>
              )}
            </div>
            <span
              className={`font-condensed text-lg leading-none font-extrabold uppercase ${t.name === current ? 'text-cover' : reached ? '' : 'text-chalk-soft'}`}
            >
              {t.name}
              {t.name === current && <span className="sr-only"> (seu título)</span>}
            </span>
            <span className="tabular text-sm text-chalk-soft">{t.min} estrelas</span>
          </li>
        );
      })}
    </ol>
  );
}

export function StatsPage() {
  const { data } = useStats();
  if (!data) return <Skeleton className="h-96" />;
  const cp = data.CAREER_PATH;
  const grid = data.FOOTBALL_GRID;
  const imp = data.IMPOSTOR;
  const tl = data.TIMELINE;
  const hl = data.HIGHER_LOWER;
  const xi = data.MISSING_XI;
  const mysStats = data.MYSTERY_PLAYER;
  const conStats = data.CONNECTIONS;
  const maxBar = Math.max(1, ...Object.values(cp.distribution));
  const next = data.title.next;
  const rank = (n: number | null) =>
    n ? `${n}º` : <span className="text-2xl text-chalk-soft">sem posição</span>;
  return (
    <div className="flex flex-col gap-14">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="w-fit max-w-full -rotate-2 rounded-[12px] bg-paper p-2.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)]">
          <div className="rounded-[6px] bg-cover px-6 pt-5 pb-4 text-ink">
            <h1 className="font-condensed text-[clamp(3.5rem,15vw,4.75rem)] leading-[0.85] font-black uppercase">
              {data.title.name}
            </h1>
            <p className="mt-3 flex items-center gap-1.5 text-lg font-bold">
              <StarIcon className="size-5" />
              <span className="tabular">{data.totalStars}</span> estrelas
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <TitleLadder total={data.totalStars} current={data.title.name} />
          <p className="font-semibold">
            {next
              ? `Faltam ${next.missing} estrelas para ${next.name}.`
              : 'Lenda. Não tem título acima.'}
          </p>
          <dl className="grid grid-cols-2 gap-6 border-t-2 border-chalk/15 pt-5">
            <Figure label="no ranking geral">{rank(data.rank.all)}</Figure>
            <Figure label="no ranking da semana">{rank(data.rank.week)}</Figure>
          </dl>
          <p className="-mt-2 text-sm text-chalk-soft">
            {!data.rank.all || !data.rank.week ? (
              <>
                Sem posição?{' '}
                <Link to="/conta" className="text-chalk underline underline-offset-4">
                  Escolha um apelido
                </Link>{' '}
                e termine uma fase.{' '}
              </>
            ) : null}
            <Link to="/ranking" className="text-chalk underline underline-offset-4">
              Ver ranking
            </Link>
          </p>
        </div>
      </section>

      <Achievements />

      <div className="grid gap-12 md:grid-cols-2 md:gap-10 xl:grid-cols-3">
        <section
          aria-labelledby="cp-stats"
          className="flex flex-col gap-6 border-t-2 border-chalk/15 pt-5"
        >
          <h2 id="cp-stats" className="font-condensed text-3xl font-black uppercase">
            Career Path
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Figure label="fases jogadas">{cp.completed}</Figure>
            <Figure label="de acerto">
              {cp.completed ? `${Math.round((cp.won / cp.completed) * 100)}%` : '—'}
            </Figure>
            <Figure label="estrelas">
              <StarIcon className="size-7 text-cover" />
              {cp.stars}
            </Figure>
            <Figure label="fases com 3 estrelas">{cp.threeStars}</Figure>
          </dl>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-chalk-soft">Acertou na tentativa…</h3>
            <ol className="flex flex-col gap-1.5">
              {Object.entries(cp.distribution).map(([n, count]) => (
                <li key={n} className="flex items-center gap-3">
                  <span className="font-condensed tabular w-6 text-right text-lg font-black">
                    {n}ª
                  </span>
                  <span className="h-6 flex-1 rounded-sm border border-dashed border-chalk-soft/30">
                    {count > 0 && (
                      <span
                        className="block h-full rounded-sm bg-cover"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    )}
                  </span>
                  <span
                    className={`font-condensed tabular w-8 text-right font-bold ${count ? '' : 'text-chalk-soft'}`}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="grid-stats"
          className="flex flex-col gap-6 border-t-2 border-chalk/15 pt-5"
        >
          <h2 id="grid-stats" className="font-condensed text-3xl font-black uppercase">
            Grid
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Figure label="fases jogadas">{grid.completed}</Figure>
            <Figure label="células por grid">
              {grid.completed ? grid.avgScore.toLocaleString('pt-BR') : '—'}
            </Figure>
            <Figure label="estrelas">
              <StarIcon className="size-7 text-cover" />
              {grid.stars}
            </Figure>
            <Figure label="álbuns completos">{grid.perfect}</Figure>
          </dl>
          {grid.completed === 0 && (
            <p className="rounded-lg bg-chalk/[0.06] px-4 py-3 text-sm text-chalk-soft">
              Nenhum grid jogado ainda.{' '}
              <Link to="/grid" className="text-chalk underline underline-offset-4">
                Ver as fases do Grid
              </Link>
            </p>
          )}
        </section>

        <section
          aria-labelledby="impostor-stats"
          className="flex flex-col gap-6 border-t-2 border-chalk/15 pt-5"
        >
          <h2 id="impostor-stats" className="font-condensed text-3xl font-black uppercase">
            Impostor
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Figure label="fases jogadas">{imp.completed}</Figure>
            <Figure label="estrelas">
              <StarIcon className="size-7 text-cover" />
              {imp.stars}
            </Figure>
            <Figure label="fases com 3 estrelas">{imp.threeStars}</Figure>
            <Figure label="5 de 5">{imp.perfect}</Figure>
          </dl>
          {imp.completed === 0 && (
            <p className="rounded-lg bg-chalk/[0.06] px-4 py-3 text-sm text-chalk-soft">
              Nenhum impostor caçado ainda.{' '}
              <Link to="/impostor" className="text-chalk underline underline-offset-4">
                Ver as fases do Impostor
              </Link>
            </p>
          )}
        </section>

        <section
          aria-labelledby="timeline-stats"
          className="flex flex-col gap-6 border-t-2 border-chalk/15 pt-5"
        >
          <h2 id="timeline-stats" className="font-condensed text-3xl font-black uppercase">
            Linha do tempo
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Figure label="fases jogadas">{tl.completed}</Figure>
            <Figure label="estrelas">
              <StarIcon className="size-7 text-cover" />
              {tl.stars}
            </Figure>
            <Figure label="fases com 3 estrelas">{tl.threeStars}</Figure>
            <Figure label="5 de 5">{tl.perfect}</Figure>
          </dl>
        </section>

        <section
          aria-labelledby="hl-stats"
          className="flex flex-col gap-6 border-t-2 border-chalk/15 pt-5"
        >
          <h2 id="hl-stats" className="font-condensed text-3xl font-black uppercase">
            Mais ou Menos
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Figure label="fases jogadas">{hl.completed}</Figure>
            <Figure label="estrelas">
              <StarIcon className="size-7 text-cover" />
              {hl.stars}
            </Figure>
            <Figure label="fases com 3 estrelas">{hl.threeStars}</Figure>
            <Figure label="5 de 5">{hl.perfect}</Figure>
          </dl>
        </section>

        <section
          aria-labelledby="xi-stats"
          className="flex flex-col gap-6 border-t-2 border-chalk/15 pt-5"
        >
          <h2 id="xi-stats" className="font-condensed text-3xl font-black uppercase">
            Escalação
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Figure label="fases jogadas">{xi.completed}</Figure>
            <Figure label="estrelas">
              <StarIcon className="size-7 text-cover" />
              {xi.stars}
            </Figure>
            <Figure label="fases com 3 estrelas">{xi.threeStars}</Figure>
            <Figure label="escalações completas">{xi.perfect}</Figure>
          </dl>
        </section>

        <section
          aria-labelledby="mys-stats"
          className="flex flex-col gap-6 border-t-2 border-chalk/15 pt-5"
        >
          <h2 id="mys-stats" className="font-condensed text-3xl font-black uppercase">
            Craque Misterioso
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Figure label="fases jogadas">{mysStats.completed}</Figure>
            <Figure label="estrelas">
              <StarIcon className="size-7 text-cover" />
              {mysStats.stars}
            </Figure>
            <Figure label="fases com 3 estrelas">{mysStats.threeStars}</Figure>
            <Figure label="de primeira">{mysStats.perfect}</Figure>
          </dl>
        </section>

        <section
          aria-labelledby="con-stats"
          className="flex flex-col gap-6 border-t-2 border-chalk/15 pt-5"
        >
          <h2 id="con-stats" className="font-condensed text-3xl font-black uppercase">
            Conexões
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Figure label="fases jogadas">{conStats.completed}</Figure>
            <Figure label="estrelas">
              <StarIcon className="size-7 text-cover" />
              {conStats.stars}
            </Figure>
            <Figure label="fases com 3 estrelas">{conStats.threeStars}</Figure>
            <Figure label="sem erros">{conStats.perfect}</Figure>
          </dl>
        </section>
      </div>

      <Link
        to="/history"
        className="inline-flex min-h-10 items-center self-start font-semibold underline underline-offset-4"
      >
        Ver histórico de partidas
      </Link>
    </div>
  );
}
