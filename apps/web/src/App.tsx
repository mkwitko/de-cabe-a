import {
  lazy,
  Suspense,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router';
import type { GamesResponse } from '@decabeca/contracts';
import { useGames } from './lib/game';
import { CareerPathPage } from './games/career-path/CareerPathPage';
import { GridPage } from './games/grid/GridPage';
import { HistoryPage } from './pages/HistoryPage';
import { StatsPage } from './pages/StatsPage';
import { btnPrimary, Skeleton, useOnline } from './components/ui';

const AdminApp = lazy(() => import('./admin/AdminApp'));

const GAMES = [
  {
    slot: '01',
    mode: 'CAREER_PATH',
    name: 'Career Path',
    path: '/career-path',
    rule: 'Adivinhe o jogador pela sequência de clubes. Seis chances.',
    howTo: [
      'Você vê o primeiro clube da carreira de um jogador.',
      'Cada chute errado ou "pular" revela o próximo clube.',
      'Acerte em até 6 tentativas. Quanto antes, mais pontos.',
    ],
  },
  {
    slot: '02',
    mode: 'FOOTBALL_GRID',
    name: 'Football Grid',
    path: '/grid',
    rule: 'Ache um jogador para cada cruzamento da grade 3×3. Nove chances.',
    howTo: [
      'Cada célula pede um jogador que cumpra a linha e a coluna.',
      'Você tem 9 tentativas; errar gasta uma e a célula fica vazia.',
      'Cada jogador vale uma vez só por grid.',
    ],
  },
] as const;

/** Brand sticker: tilts and catches the light under the pointer (off with reduced motion). */
function BrandSticker() {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - r.left) / r.width));
    el.style.setProperty('--my', String((e.clientY - r.top) / r.height));
  }

  function onLeave() {
    ref.current?.style.setProperty('--mx', '0.5');
    ref.current?.style.setProperty('--my', '0.5');
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ '--mx': 0.5, '--my': 0.5 } as CSSProperties}
      className="group relative w-fit max-w-full shrink-0 -rotate-2 rounded-[10px] bg-paper p-2.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)] transition-transform duration-500 ease-out-expo motion-safe:[transform:perspective(900px)_rotate(-2deg)_rotateX(calc((0.5-var(--my))*10deg))_rotateY(calc((var(--mx)-0.5)*12deg))]"
    >
      <div className="relative overflow-hidden rounded-[5px] bg-cover px-5 pt-4 pb-5 text-ink">
        <span className="tabular block text-right text-xs font-bold tracking-wide">Nº 00</span>
        <h1 className="font-condensed mt-1 text-[clamp(3rem,14vw,5.5rem)] leading-[0.85] font-black tracking-[-0.02em] whitespace-nowrap uppercase">
          De Cabeça
        </h1>
        <p className="mt-3 text-sm font-semibold">Minijogos de futebol</p>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-500 group-hover:opacity-100 motion-reduce:hidden"
          style={{
            background:
              'radial-gradient(circle at calc(var(--mx)*100%) calc(var(--my)*100%), rgb(255 255 255 / 0.9), transparent 55%)',
          }}
        />
      </div>
    </div>
  );
}

type Daily = GamesResponse['games'][number]['daily'];

function DailyState({
  daily,
  path,
  mode,
}: {
  daily: Daily | undefined;
  path: string;
  mode: string;
}) {
  if (daily === undefined) return <Skeleton className="h-11 w-40" />;
  if (daily === null)
    return (
      <p className="font-semibold text-chalk-soft">
        Sem desafio hoje.{' '}
        <Link to={`${path}/practice`} className="text-chalk underline underline-offset-4">
          Jogue no treino.
        </Link>
      </p>
    );
  const a = daily.attempt;
  if (a && a.status !== 'IN_PROGRESS') {
    const result =
      mode === 'FOOTBALL_GRID'
        ? `${a.score}/9`
        : a.status === 'WON'
          ? `${7 - a.score / 10}/6`
          : 'X/6';
    return (
      <Link
        to={path}
        className="flex items-center gap-3 self-start rounded-lg bg-paper px-3 py-2 text-ink shadow-[0_6px_14px_-6px_rgb(0_0_0/0.5)]"
      >
        <span className="font-condensed tabular text-3xl font-black">{result}</span>
        <span className="text-sm leading-tight font-semibold">
          #{daily.publicNumber} colada
          <br />
          <span className="underline underline-offset-2">ver resultado</span>
        </span>
      </Link>
    );
  }
  return (
    <Link to={path} className={`${btnPrimary} self-start`}>
      {a ? 'Continuar' : 'Jogar'} #{daily.publicNumber}
    </Link>
  );
}

export function Home({ games }: { games?: GamesResponse | undefined }) {
  return (
    <>
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-10">
        <BrandSticker />
        <p className="max-w-[34ch] text-lg leading-snug font-medium text-chalk sm:pb-3 sm:text-xl">
          Pra quem sabe a escalação de cor. Um desafio por dia, sem cadastro, de cabeça.
        </p>
      </header>

      <section aria-labelledby="jogos" className="mt-12 sm:mt-16">
        <h2 id="jogos" className="font-condensed text-2xl font-extrabold uppercase">
          Desafios de hoje
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {GAMES.map((g) => {
            const daily = games?.games.find((x) => x.mode === g.mode)?.daily;
            return (
              <li
                key={g.slot}
                className="relative flex min-h-64 flex-col gap-3 rounded-lg border-2 border-dashed border-chalk-soft/60 bg-chalk/[0.06] p-5"
              >
                <span
                  aria-hidden="true"
                  className="font-condensed tabular text-7xl leading-none font-black text-chalk-soft/50"
                >
                  {g.slot}
                </span>
                <h3 className="font-condensed mt-auto text-3xl font-extrabold uppercase">
                  {g.name}
                </h3>
                <p className="max-w-[32ch] text-chalk-soft">{g.rule}</p>
                <DailyState
                  daily={games ? (daily ?? null) : undefined}
                  path={g.path}
                  mode={g.mode}
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                  <Link to={`${g.path}/practice`} className="underline underline-offset-4">
                    Treinar
                  </Link>
                  <details className="group">
                    <summary className="cursor-pointer list-none underline underline-offset-4">
                      Como jogar?
                    </summary>
                    <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 font-normal text-chalk-soft">
                      {g.howTo.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ol>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function HomeRoute() {
  const { data } = useGames();
  return <Home games={data} />;
}

const NAV = [
  ['/', 'Jogos'],
  ['/history', 'Histórico'],
  ['/stats', 'Stats'],
] as const;

function Shell({ children }: { children: ReactNode }) {
  const online = useOnline();
  const home = useLocation().pathname === '/';
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 pt-4 pb-28 sm:px-8 sm:pb-12">
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-chalk/15 bg-pitch-deep/95 backdrop-blur sm:static sm:mb-6 sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
      >
        <ul className="mx-auto flex max-w-4xl justify-around sm:justify-end sm:gap-6">
          {!home && (
            <li className="mr-auto hidden sm:block">
              <Link to="/" className="font-condensed text-2xl font-black uppercase">
                De Cabeça
              </Link>
            </li>
          )}
          {NAV.map(([to, label]) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `font-condensed flex min-h-14 items-center px-4 text-lg font-extrabold uppercase tracking-wide sm:min-h-11 sm:px-0 ${isActive ? 'text-cover' : 'text-chalk-soft hover:text-chalk'}`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {!online && (
        <p role="status" className="mb-4 rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
          Sem conexão. As jogadas voltam quando a internet voltar.
        </p>
      )}
      <main className={home ? 'pt-6 sm:pt-4' : ''}>{children}</main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="*" element={<PublicRoutes />} />
    </Routes>
  );
}

function PublicRoutes() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/career-path" element={<CareerPathPage key="daily" kind="daily" />} />
        <Route
          path="/career-path/practice"
          element={<CareerPathPage key="practice" kind="practice" />}
        />
        <Route path="/grid" element={<GridPage key="daily" kind="daily" />} />
        <Route path="/grid/practice" element={<GridPage key="practice" kind="practice" />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/stats" element={<StatsPage />} />
        {/* share links: decabeca.app/c/123 and /g/45 land on today's game */}
        <Route path="/c/:n" element={<Navigate to="/career-path" replace />} />
        <Route path="/g/:n" element={<Navigate to="/grid" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
