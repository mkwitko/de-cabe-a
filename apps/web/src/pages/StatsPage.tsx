import type { ReactNode } from 'react';
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
  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-condensed text-4xl font-black uppercase">Stats</h1>
      <section aria-labelledby="cp-stats" className="flex flex-col gap-5">
        <h2 id="cp-stats" className="font-condensed text-2xl font-extrabold uppercase">
          Career Path
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Big value={cp.played} label="desafios jogados" />
          <Big
            value={cp.played ? `${Math.round((cp.won / cp.played) * 100)}%` : '—'}
            label="de acerto"
          />
          <Big value={cp.currentStreak} label="sequência atual" />
          <Big value={cp.maxStreak} label="melhor sequência" />
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
        <p className="text-sm text-chalk-soft">Treinos jogados: {cp.practicePlayed}</p>
      </section>
      <section aria-labelledby="grid-stats" className="flex flex-col gap-5">
        <h2 id="grid-stats" className="font-condensed text-2xl font-extrabold uppercase">
          Grid
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Big value={grid.played} label="grids jogados" />
          <Big
            value={grid.played ? grid.avgScore.toLocaleString('pt-BR') : '—'}
            label="células por grid"
          />
          <Big value={grid.perfect} label="álbuns completos" />
          <Big value={grid.currentStreak} label="sequência atual" />
        </div>
        <p className="text-sm text-chalk-soft">
          Treinos jogados: {grid.practicePlayed} · Melhor sequência: {grid.maxStreak}
        </p>
      </section>
      <p className="max-w-[60ch] text-sm text-chalk-soft">
        Seu progresso fica neste navegador, sem cadastro. Se você limpar os cookies ou trocar de
        aparelho, ele recomeça do zero.
      </p>
    </div>
  );
}
