import {
  lazy,
  Suspense,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import type { GamesResponse } from '@decabeca/contracts';
import { useGames, useStats } from './lib/game';
import { CareerPathPage } from './games/career-path/CareerPathPage';
import { GridPage } from './games/grid/GridPage';
import { HistoryPage } from './pages/HistoryPage';
import { TrackPage } from './pages/TrackPage';
import { RankingPage } from './pages/RankingPage';
import { ModeGate } from './games/Clock';
import { NewPasswordPage } from './pages/NewPasswordPage';
import { AccountPage } from './pages/AccountPage';
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

type Track = GamesResponse['games'][number];

function TrackState({ track, path }: { track: Track | undefined; path: string }) {
  if (!track) return <Skeleton className="h-11 w-40" />;
  if (track.levels === 0) return <p className="font-semibold text-chalk-soft">Fases a caminho.</p>;
  const pct = (track.completed / track.levels) * 100;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <span className="font-condensed tabular text-2xl font-black">
          {track.completed}/{track.levels}
        </span>
        <span className="text-chalk-soft">fases</span>
        <span
          className="font-condensed tabular ml-auto text-xl font-black"
          aria-label={`${track.stars} estrelas`}
        >
          ★ {track.stars}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-chalk/15" aria-hidden="true">
        <div className="h-full rounded-full bg-cover" style={{ width: `${pct}%` }} />
      </div>
      <Link
        to={track.nextLevel ? `${path}/${track.nextLevel}` : path}
        className={`${btnPrimary} self-start`}
      >
        {track.nextLevel
          ? track.completed
            ? `Jogar fase ${track.nextLevel}`
            : 'Começar'
          : 'Ver fases'}
      </Link>
    </div>
  );
}

export function Home({ games }: { games?: GamesResponse | undefined }) {
  return (
    <>
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-10">
        <BrandSticker />
        <p className="max-w-[34ch] text-lg leading-snug font-medium text-chalk sm:pb-3 sm:text-xl">
          Pra quem sabe a escalação de cor. Fase por fase, estrela por estrela, até virar lenda.
        </p>
      </header>

      <section aria-labelledby="jogos" className="mt-12 sm:mt-16">
        <h2 id="jogos" className="font-condensed text-2xl font-extrabold uppercase">
          Jogos
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {GAMES.map((g) => {
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
                <TrackState track={games?.games.find((x) => x.mode === g.mode)} path={g.path} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                  <Link to={g.path} className="underline underline-offset-4">
                    Ver fases
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

/** The player's standing at a glance: title, stars, ranking and what the next title needs. */
function PlayerStrip() {
  const { data } = useStats();
  if (!data) return null;
  return (
    <Link
      to="/stats"
      className="mt-8 grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-1 rounded-xl bg-chalk/[0.06] p-4 hover:bg-chalk/[0.09] sm:grid-cols-[auto_auto_auto_1fr] sm:gap-x-8"
    >
      <span className="font-condensed row-span-2 text-4xl leading-none font-black text-cover uppercase sm:row-span-1">
        {data.title.name}
      </span>
      <span className="font-condensed tabular text-xl font-bold">★ {data.totalStars} estrelas</span>
      <span className="font-condensed tabular text-xl font-bold">
        {data.rank.all ? `${data.rank.all}º no ranking` : 'Fora do ranking'}
      </span>
      <span className="col-span-2 text-sm text-chalk-soft sm:col-span-1 sm:text-right">
        {data.title.next
          ? `Faltam ${data.title.next.missing} estrelas para ${data.title.next.name}`
          : 'Título máximo. Lenda!'}
      </span>
    </Link>
  );
}

function HomeRoute() {
  const { data } = useGames();
  return (
    <>
      <Home games={data} />
      <PlayerStrip />
    </>
  );
}

const NAV = [
  ['/', 'Jogos'],
  ['/ranking', 'Ranking'],
  ['/stats', 'Stats'],
  ['/conta', 'Conta'],
] as const;

function Shell({ children }: { children: ReactNode }) {
  const online = useOnline();
  const { pathname } = useLocation();
  const home = pathname === '/';
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pt-4 pb-28 sm:px-8 sm:pb-12">
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-chalk/15 bg-pitch-deep/95 backdrop-blur sm:static sm:mb-6 sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
      >
        <ul className="mx-auto flex max-w-7xl justify-around sm:justify-end sm:gap-6">
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
        <Route path="/career-path" element={<TrackPage mode="CAREER_PATH" />} />
        <Route path="/career-path/:level" element={<LevelRoute mode="CAREER_PATH" />} />
        <Route path="/grid" element={<TrackPage mode="FOOTBALL_GRID" />} />
        <Route path="/grid/:level" element={<LevelRoute mode="FOOTBALL_GRID" />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/conta" element={<AccountPage />} />
        <Route path="/conta/nova-senha" element={<NewPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

/** /career-path/:level and /grid/:level; the key remounts the game when the level changes. */
function LevelRoute({ mode }: { mode: 'CAREER_PATH' | 'FOOTBALL_GRID' }) {
  const level = Number(useParams().level);
  if (!Number.isInteger(level) || level < 1)
    return <Navigate to={mode === 'CAREER_PATH' ? '/career-path' : '/grid'} replace />;
  const title = `${mode === 'CAREER_PATH' ? 'Career Path' : 'Grid'} · Fase ${level}`;
  return (
    <ModeGate key={level} mode={mode} level={level} title={title}>
      {(timed) =>
        mode === 'CAREER_PATH' ? (
          <CareerPathPage level={level} timed={timed} />
        ) : (
          <GridPage level={level} timed={timed} />
        )
      }
    </ModeGate>
  );
}
