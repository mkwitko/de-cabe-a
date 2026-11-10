import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { GameMode, type StatsResponse } from '@decabeca/contracts';
import { useAlbum, useMe, useStats } from '../lib/game';
import { isModeLaunched, isPageLaunched } from '../lib/launch';
import { useEntitlements } from '../lib/billing';
import { SignInButton } from '../components/SignInButton';
import { MemberCard } from '../components/MemberCard';
import { TitleLadder } from '../components/TitleLadder';
import { bestFirst, Showcase } from '../components/Showcase';
import { StarIcon } from '../components/Stars';
import { btnPrimary, Skeleton } from '../components/ui';
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

/** One game's printed sheet (súmula): ink header band, figures on paper. Closed games only. */
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
const chalkLink =
  'inline-flex min-h-11 items-center font-semibold text-chalk underline underline-offset-4';

/** Vitrine: the album's best stickers on the glass shelf, with the way into the album. */
function AlbumShowcase() {
  const { data } = useAlbum();
  return (
    <section aria-labelledby="vitrine" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="vitrine" className="font-condensed text-3xl font-extrabold uppercase">
          Vitrine
        </h2>
        {data && (
          <Link to="/album" className={`${chalkLink} gap-1.5`}>
            Abrir o álbum
            <span className="tabular font-medium text-chalk-soft">
              · {data.owned} de {data.total}
            </span>
          </Link>
        )}
      </div>
      {!data ? (
        <Skeleton className="h-64" />
      ) : data.stickers.length ? (
        <Showcase stickers={bestFirst(data.stickers)} cols="grid-cols-3 lg:grid-cols-6" />
      ) : (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-dashed border-chalk-soft/50 p-4">
          <p className="min-w-0 flex-1 basis-48 text-sm text-chalk-soft">
            A vitrine está vazia. Cada jogador que você acerta vira figurinha, e as melhores ficam
            expostas aqui.
          </p>
          <Link to="/" className={`${btnPrimary} shrink-0`}>
            Jogar
          </Link>
        </div>
      )}
    </section>
  );
}

/** Career Path, compact: two figures and the attempt spread as a small bar chart. */
function CareerSheet({ cp }: { cp: StatsResponse['CAREER_PATH'] }) {
  const bars = Object.entries(cp.distribution);
  const maxBar = Math.max(1, ...bars.map(([, c]) => c));
  const figures: [string, ReactNode][] = [
    ['de acerto', cp.completed ? `${Math.round((cp.won / cp.completed) * 100)}%` : '—'],
    ['fases com 3 estrelas', cp.threeStars],
  ];
  return (
    <section
      aria-labelledby="cp-stats"
      className="sheet-in overflow-hidden rounded-lg bg-paper text-ink shadow-[0_12px_26px_-12px_rgb(0_0_0/0.55)]"
    >
      <h2
        id="cp-stats"
        className="font-condensed bg-ink px-4 py-2 text-xl font-black text-paper uppercase [border-bottom:6px_double_var(--color-cover)]"
      >
        Career Path
      </h2>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-6 p-4 sm:gap-10 sm:px-5">
        <dl className="flex flex-col gap-4">
          {figures.map(([label, v]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="max-w-[10ch] text-xs leading-tight font-semibold text-ink/70">
                {label}
              </dt>
              <dd className="font-condensed tabular text-4xl leading-none font-black">
                {typeof v === 'number' ? <Count n={v} /> : v}
              </dd>
            </div>
          ))}
        </dl>
        <figure className="flex min-w-0 flex-col gap-1.5">
          <figcaption className="text-xs font-semibold text-ink/70">
            Acertou na tentativa
          </figcaption>
          <ol className="grid grid-cols-6 items-end gap-1.5">
            {bars.map(([n, count]) => (
              <li
                key={n}
                aria-label={`${n}ª tentativa: ${count}`}
                className="flex flex-col items-center gap-0.5"
              >
                <span aria-hidden="true" className="font-condensed tabular text-sm font-bold">
                  {count}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-16 w-full max-w-10 items-end overflow-hidden rounded-sm bg-ink/[0.07]"
                >
                  {count > 0 && (
                    <span
                      className={`block w-full ${n === '1' ? 'bg-cover' : 'bg-ink'}`}
                      style={{ height: `${(count / maxBar) * 100}%` }}
                    />
                  )}
                </span>
                <span aria-hidden="true" className="font-condensed tabular text-sm font-black">
                  {n}ª
                </span>
              </li>
            ))}
          </ol>
        </figure>
      </div>
    </section>
  );
}

export function StatsPage() {
  const { data } = useStats();
  const me = useMe().data;
  const ents = useEntitlements(!!me?.account && isPageLaunched('clube')).data;
  const album = useAlbum().data;
  if (!data) return <Skeleton className="h-96" />;
  const grid = data.FOOTBALL_GRID;
  const levels = GameMode.options
    .filter((m) => isModeLaunched(m))
    .reduce((n, m) => n + data[m].completed, 0);
  const ranking = isPageLaunched('ranking');
  const guest = !!me && !me.account;
  const rank = (n: number | null) =>
    n ? (
      `${n}º`
    ) : (
      <span className="text-2xl text-chalk-soft">{guest ? 'só com conta' : 'sem posição'}</span>
    );
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
  // The other games' sheets, only while their game is open (lib/launch.ts).
  const others: [GameMode, string, string, [string, ReactNode][], ReactNode?][] = [
    [
      'FOOTBALL_GRID',
      'grid-stats',
      'Grid',
      [
        ['fases jogadas', grid.completed],
        ['células por grid', grid.completed ? grid.avgScore.toLocaleString('pt-BR') : '—'],
        ['estrelas', <Stars_ key="s" n={grid.stars} />],
        ['álbuns completos', grid.perfect],
      ],
      grid.completed === 0 && (
        <p className="rounded-lg bg-ink/[0.07] px-4 py-3 text-sm text-ink/75">
          Nenhum grid jogado ainda.{' '}
          <Link to="/grid" className={link}>
            Ver as fases do Grid
          </Link>
        </p>
      ),
    ],
    [
      'IMPOSTOR',
      'impostor-stats',
      'Impostor',
      std(data.IMPOSTOR, ['5 de 5', data.IMPOSTOR.perfect]),
    ],
    [
      'TIMELINE',
      'timeline-stats',
      'Linha do tempo',
      std(data.TIMELINE, ['5 de 5', data.TIMELINE.perfect]),
    ],
    [
      'HIGHER_LOWER',
      'hl-stats',
      'Mais ou Menos',
      std(data.HIGHER_LOWER, ['5 de 5', data.HIGHER_LOWER.perfect]),
    ],
    [
      'MISSING_XI',
      'xi-stats',
      'Escalação',
      std(data.MISSING_XI, ['escalações completas', data.MISSING_XI.perfect]),
    ],
    [
      'MYSTERY_PLAYER',
      'mys-stats',
      'Craque Misterioso',
      std(data.MYSTERY_PLAYER, ['de primeira', data.MYSTERY_PLAYER.perfect]),
    ],
    [
      'CONNECTIONS',
      'con-stats',
      'Conexões',
      std(data.CONNECTIONS, ['sem erros', data.CONNECTIONS.perfect]),
    ],
    ['DRAFT', 'draft-stats', 'Draft', std(data.DRAFT, ['11 de 11', data.DRAFT.perfect])],
  ];
  const open = others.filter(([m]) => isModeLaunched(m));

  return (
    <div className="flex flex-col gap-12">
      <div aria-hidden="true" className="scene-art room-dim" />
      {/*
        Phone: card, rail, Career Path, vitrine, medals (the vitrine starts inside two screens).
        Wide: card | rail + Career Path, then vitrine | medals.
      */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        <div className="flex flex-col items-center gap-4 lg:col-span-5 lg:row-start-1 lg:items-stretch">
          <MemberCard
            name={me?.nickname ?? 'Convidado'}
            title={data.title.name}
            stars={data.totalStars}
            levels={levels}
            stickers={album?.owned}
            guest={guest}
            member={!!ents?.clube.active}
            className="max-w-lg"
          />
          {guest && (
            <section
              aria-labelledby="save-progress"
              className="flex w-full max-w-lg flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-xl border-2 border-dashed border-cover/50 bg-pitch-deep/70 p-4"
            >
              <div className="min-w-0 flex-1 basis-52">
                <h2 id="save-progress" className="font-condensed text-xl font-extrabold uppercase">
                  Salve seu progresso
                </h2>
                <p className="text-sm text-chalk-soft">
                  Suas estrelas e figurinhas estão só neste aparelho. Entre e leve tudo para
                  qualquer outro{ranking ? '; com conta, você também entra no ranking' : ''}.
                </p>
              </div>
              <SignInButton />
            </section>
          )}
          {ranking && (
            <dl className="grid w-full max-w-lg grid-cols-2 gap-6 border-t-2 border-chalk/15 pt-5 [&_dt]:text-chalk-soft">
              <Figure label="no ranking geral">{rank(data.rank.all)}</Figure>
              <Figure label="no ranking da semana">{rank(data.rank.week)}</Figure>
            </dl>
          )}
          <nav
            aria-label="Mais do perfil"
            className="flex w-full max-w-lg flex-wrap gap-x-6 text-sm"
          >
            <Link to="/conta" className={chalkLink}>
              Conta, apelido e preferências
            </Link>
            <Link to="/history" className={chalkLink}>
              Ver histórico de partidas
            </Link>
            {ranking && (
              <Link to="/ranking" className={chalkLink}>
                Ver ranking
              </Link>
            )}
            {me?.nickname && me.publicProfile && (
              <Link to={`/perfil/${encodeURIComponent(me.nickname)}`} className={chalkLink}>
                Perfil público
              </Link>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-8 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
          <TitleLadder total={data.totalStars} />
          <CareerSheet cp={data.CAREER_PATH} />
        </div>

        <div className="lg:col-span-7 lg:col-start-6 lg:row-start-3">
          <AlbumShowcase />
        </div>
        <div className="lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-2">
          <Achievements />
        </div>
      </div>

      {open.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {open.map(([, id, title, figures, extra], i) => (
            <Sheet key={id} i={i + 1} id={id} title={title} figures={figures}>
              {extra}
            </Sheet>
          ))}
        </div>
      )}
    </div>
  );
}
