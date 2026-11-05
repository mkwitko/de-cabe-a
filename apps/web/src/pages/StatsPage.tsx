import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useStats } from '../lib/game';
import { Skeleton } from '../components/ui';

function Big({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-condensed tabular text-5xl leading-none font-black">{value}</span>
      <span className="mt-1 text-sm text-chalk-soft">{label}</span>
    </div>
  );
}

export function StatsPage() {
  const { data } = useStats();
  if (!data) return <Skeleton className="h-96" />;
  const cp = data.CAREER_PATH;
  const grid = data.FOOTBALL_GRID;
  const maxBar = Math.max(1, ...Object.values(cp.distribution));
  const next = data.title.next;
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-xl bg-cover p-5 text-ink shadow-[0_18px_40px_-14px_rgb(0_0_0/0.55)]">
        <p className="text-sm font-semibold uppercase">Seu título</p>
        <h1 className="font-condensed text-6xl leading-none font-black uppercase">
          {data.title.name}
        </h1>
        <p className="mt-2 text-lg font-semibold">★ {data.totalStars} estrelas</p>
        {next && (
          <div className="mt-3 flex flex-col gap-1">
            <div
              className="h-2.5 overflow-hidden rounded-full bg-ink/15"
              role="progressbar"
              aria-label={`Progresso até ${next.name}`}
              aria-valuenow={data.totalStars}
              aria-valuemin={0}
              aria-valuemax={data.totalStars + next.missing}
            >
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${(data.totalStars / (data.totalStars + next.missing)) * 100}%` }}
              />
            </div>
            <p className="text-sm font-semibold">
              Faltam {next.missing} estrelas para {next.name}
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-6">
        <Big value={data.rank.all ? `${data.rank.all}º` : '—'} label="no ranking geral" />
        <Big value={data.rank.week ? `${data.rank.week}º` : '—'} label="no ranking da semana" />
      </section>
      {(!data.rank.all || !data.rank.week) && (
        <p className="-mt-6 text-sm text-chalk-soft">
          Sem posição?{' '}
          <Link to="/conta" className="text-chalk underline underline-offset-4">
            Escolha um apelido
          </Link>{' '}
          e termine uma fase.
        </p>
      )}

      <section aria-labelledby="cp-stats" className="flex flex-col gap-5">
        <h2 id="cp-stats" className="font-condensed text-2xl font-extrabold uppercase">
          Career Path
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Big value={cp.completed} label="fases jogadas" />
          <Big
            value={cp.completed ? `${Math.round((cp.won / cp.completed) * 100)}%` : '—'}
            label="de acerto"
          />
          <Big value={`★ ${cp.stars}`} label="estrelas" />
          <Big value={cp.threeStars} label="fases com 3 estrelas" />
        </div>
        <div className="flex flex-col gap-1.5" aria-label="Acertos por tentativa">
          {Object.entries(cp.distribution).map(([n, count]) => (
            <div key={n} className="flex items-center gap-2">
              <span className="font-condensed tabular w-4 text-right font-black">{n}</span>
              <span
                className="flex h-7 items-center justify-end rounded-sm bg-cover px-2 text-sm font-bold text-ink"
                style={{ width: `max(2rem, ${(count / maxBar) * 100}%)` }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="grid-stats" className="flex flex-col gap-5">
        <h2 id="grid-stats" className="font-condensed text-2xl font-extrabold uppercase">
          Grid
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Big value={grid.completed} label="fases jogadas" />
          <Big
            value={grid.completed ? grid.avgScore.toLocaleString('pt-BR') : '—'}
            label="células por grid"
          />
          <Big value={`★ ${grid.stars}`} label="estrelas" />
          <Big value={grid.perfect} label="álbuns completos" />
        </div>
      </section>
      <Link to="/history" className="font-semibold underline underline-offset-4">
        Ver histórico de partidas
      </Link>
    </div>
  );
}
