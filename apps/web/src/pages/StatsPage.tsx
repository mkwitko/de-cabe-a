import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useStats } from '../lib/game';
import { TITLE_LADDER } from '../lib/format';
import { StarIcon } from '../components/Stars';
import { Skeleton } from '../components/ui';
import { Achievements } from '../components/Achievements';

/** A number that counts up when it enters; the final value stays in the DOM for assistive tech. */
function Count({ n }: { n: number }) {
  const still = n < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [v, setV] = useState(still ? n : 0);
  useEffect(() => {
    if (still) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick(t) {
      const k = Math.min(1, (t - t0) / 700);
      setV(Math.round(n * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [n, still]);
  return (
    <>
      <span className="sr-only">{n}</span>
      <span aria-hidden="true">{v}</span>
    </>
  );
}

/** One figure on the match sheet: label for assistive tech first (dt), number shown first. */
function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-sm font-semibold text-ink/70">{label}</dt>
      <dd className="font-condensed tabular flex items-center gap-1 text-5xl leading-none font-black">
        {typeof children === 'number' ? <Count n={children} /> : children}
      </dd>
    </div>
  );
}

/** One game's printed sheet (súmula): ink header band, perforated edge, figures on paper. */
function Sheet({
  id,
  title,
  figures,
  children,
  i,
}: {
  id: string;
  title: string;
  figures: [string, ReactNode][];
  children?: ReactNode;
  i: number;
}) {
  return (
    <section
      aria-labelledby={id}
      style={{ animationDelay: `${i * 60}ms` }}
      className="sheet-in flex flex-col overflow-hidden rounded-lg bg-paper text-ink shadow-[0_12px_26px_-12px_rgb(0_0_0/0.55)]"
    >
      <h2
        id={id}
        className="font-condensed bg-ink px-5 py-3 text-2xl font-black text-paper uppercase [border-bottom:6px_double_var(--color-cover)]"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-5 p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          {figures.map(([label, v]) => (
            <Figure key={label} label={label}>
              {v}
            </Figure>
          ))}
        </dl>
        {children}
      </div>
    </section>
  );
}

const Stars_ = ({ n }: { n: number }) => (
  <>
    <StarIcon className="size-8 text-ink" />
    {n}
  </>
);
const link = 'font-bold text-ink underline underline-offset-4';

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
              className={`font-condensed text-lg leading-none font-extrabold uppercase ${t.name === current ? 'text-gold' : reached ? '' : 'text-chalk-soft'}`}
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
  const maxBar = Math.max(1, ...Object.values(cp.distribution));
  const next = data.title.next;
  const rank = (n: number | null) =>
    n ? `${n}º` : <span className="text-2xl text-chalk-soft">sem posição</span>;
  const std = (
    g: { completed: number; stars: number; threeStars: number },
    last: [string, number],
  ) =>
    [
      ['fases jogadas', g.completed],
      ['estrelas', <Stars_ key="s" n={g.stars} />],
      ['fases com 3 estrelas', g.threeStars],
      last,
    ] as [string, ReactNode][];
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
          <dl className="grid grid-cols-2 gap-6 border-t-2 border-chalk/15 pt-5 [&_dt]:text-chalk-soft">
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
            </Link>{' '}
            ·{' '}
            <Link to="/conta" className="text-chalk underline underline-offset-4">
              Conta, apelido e preferências
            </Link>
          </p>
        </div>
      </section>

      <Achievements />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Sheet
          i={0}
          id="cp-stats"
          title="Career Path"
          figures={[
            ['fases jogadas', cp.completed],
            ['de acerto', cp.completed ? `${Math.round((cp.won / cp.completed) * 100)}%` : '—'],
            ['estrelas', <Stars_ key="s" n={cp.stars} />],
            ['fases com 3 estrelas', cp.threeStars],
          ]}
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink/70">Acertou na tentativa…</h3>
            <ol className="flex flex-col gap-1.5">
              {Object.entries(cp.distribution).map(([n, count]) => (
                <li key={n} className="flex items-center gap-3">
                  <span className="font-condensed tabular w-6 text-right text-lg font-black">
                    {n}ª
                  </span>
                  <span className="h-6 flex-1 rounded-sm border border-dashed border-ink/30">
                    {count > 0 && (
                      <span
                        className="block h-full rounded-sm bg-ink"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    )}
                  </span>
                  <span
                    className={`font-condensed tabular w-8 text-right font-bold ${count ? '' : 'text-ink/60'}`}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Sheet>

        <Sheet
          i={1}
          id="grid-stats"
          title="Grid"
          figures={[
            ['fases jogadas', grid.completed],
            ['células por grid', grid.completed ? grid.avgScore.toLocaleString('pt-BR') : '—'],
            ['estrelas', <Stars_ key="s" n={grid.stars} />],
            ['álbuns completos', grid.perfect],
          ]}
        >
          {grid.completed === 0 && (
            <p className="rounded-lg bg-ink/[0.07] px-4 py-3 text-sm text-ink/75">
              Nenhum grid jogado ainda.{' '}
              <Link to="/grid" className={link}>
                Ver as fases do Grid
              </Link>
            </p>
          )}
        </Sheet>

        <Sheet
          i={2}
          id="impostor-stats"
          title="Impostor"
          figures={std(data.IMPOSTOR, ['5 de 5', data.IMPOSTOR.perfect])}
        >
          {data.IMPOSTOR.completed === 0 && (
            <p className="rounded-lg bg-ink/[0.07] px-4 py-3 text-sm text-ink/75">
              Nenhum impostor caçado ainda.{' '}
              <Link to="/impostor" className={link}>
                Ver as fases do Impostor
              </Link>
            </p>
          )}
        </Sheet>

        <Sheet
          i={3}
          id="timeline-stats"
          title="Linha do tempo"
          figures={std(data.TIMELINE, ['5 de 5', data.TIMELINE.perfect])}
        />
        <Sheet
          i={4}
          id="hl-stats"
          title="Mais ou Menos"
          figures={std(data.HIGHER_LOWER, ['5 de 5', data.HIGHER_LOWER.perfect])}
        />
        <Sheet
          i={5}
          id="xi-stats"
          title="Escalação"
          figures={std(data.MISSING_XI, ['escalações completas', data.MISSING_XI.perfect])}
        />
        <Sheet
          i={6}
          id="mys-stats"
          title="Craque Misterioso"
          figures={std(data.MYSTERY_PLAYER, ['de primeira', data.MYSTERY_PLAYER.perfect])}
        />
        <Sheet
          i={7}
          id="con-stats"
          title="Conexões"
          figures={std(data.CONNECTIONS, ['sem erros', data.CONNECTIONS.perfect])}
        />
        <Sheet
          i={8}
          id="draft-stats"
          title="Draft"
          figures={std(data.DRAFT, ['11 de 11', data.DRAFT.perfect])}
        />
      </div>

      <Link
        to="/album"
        className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4"
      >
        Meu álbum
      </Link>
      <Link
        to="/history"
        className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4"
      >
        Ver histórico de partidas
      </Link>
    </div>
  );
}
