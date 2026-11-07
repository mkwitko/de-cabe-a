import { onSoundChange, setSound, soundOn } from './lib/sound';
import { AD_SLOTS, AdConsentBanner, AdSlot } from './components/AdSlot';
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import type { GamesResponse } from '@decabeca/contracts';
import { GAME_NAME, GAME_PATH, useGames, useStats } from './lib/game';
import type { GameMode } from '@decabeca/contracts';
import { TrackPage } from './pages/TrackPage';
import { ModeGate } from './games/Clock';
import { btnPrimary, Skeleton, useOnline } from './components/ui';

const AdminApp = lazy(() => import('./admin/AdminApp'));
// Each screen loads on demand: the first visit downloads only the shell and the home.
const CareerPathPage = lazy(() =>
  import('./games/career-path/CareerPathPage').then((m) => ({ default: m.CareerPathPage })),
);
const GridPage = lazy(() => import('./games/grid/GridPage').then((m) => ({ default: m.GridPage })));
const ImpostorPage = lazy(() =>
  import('./games/impostor/ImpostorPage').then((m) => ({ default: m.ImpostorPage })),
);
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const RankingPage = lazy(() =>
  import('./pages/RankingPage').then((m) => ({ default: m.RankingPage })),
);
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const NewPasswordPage = lazy(() =>
  import('./pages/NewPasswordPage').then((m) => ({ default: m.NewPasswordPage })),
);
const AccountPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })),
);
const HowToPlayPage = lazy(() =>
  import('./pages/HowToPlayPage').then((m) => ({ default: m.HowToPlayPage })),
);
const TimelinePage = lazy(() =>
  import('./games/timeline/TimelinePage').then((m) => ({ default: m.TimelinePage })),
);
const MysteryPlayerPage = lazy(() =>
  import('./games/mystery-player/MysteryPlayerPage').then((m) => ({
    default: m.MysteryPlayerPage,
  })),
);
const ConnectionsPage = lazy(() =>
  import('./games/connections/ConnectionsPage').then((m) => ({ default: m.ConnectionsPage })),
);
const MissingXiPage = lazy(() =>
  import('./games/missing-xi/MissingXiPage').then((m) => ({ default: m.MissingXiPage })),
);
const HigherLowerPage = lazy(() =>
  import('./games/higher-lower/HigherLowerPage').then((m) => ({ default: m.HigherLowerPage })),
);
const CareerPage = lazy(() =>
  import('./pages/CareerPage').then((m) => ({ default: m.CareerPage })),
);
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));

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
  {
    slot: '03',
    mode: 'IMPOSTOR',
    name: 'Impostor',
    path: '/impostor',
    rule: 'Três jogaram no clube, um nunca vestiu a camisa. Ache o impostor.',
    howTo: [
      'Cada fase tem 5 rodadas, cada uma com um clube e 4 jogadores.',
      'Três jogaram no clube; toque no que nunca jogou.',
      'Uma escolha por rodada. Acerte as 5 para 3 estrelas.',
    ],
  },
  {
    slot: '04',
    mode: 'TIMELINE',
    name: 'Linha do tempo',
    path: '/linha-do-tempo',
    rule: 'Quatro clubes de um jogador, embaralhados. Ponha na ordem da carreira.',
    howTo: [
      'Cada fase tem 5 jogadores, com 4 clubes de cada um.',
      'Toque nos clubes do primeiro ao último; toque de novo para desfazer.',
      'Uma resposta por jogador. Acerte as 5 ordens para 3 estrelas.',
    ],
  },
  {
    slot: '05',
    mode: 'HIGHER_LOWER',
    name: 'Mais ou Menos',
    path: '/mais-ou-menos',
    rule: 'Duas passagens reais: quem fez mais gols, ou mais jogos, pelo clube?',
    howTo: [
      'Cada fase tem 5 duelos entre jogadores em seus clubes.',
      'Toque em quem tem o número maior (gols ou jogos pelo clube).',
      'Os números aparecem depois. Acerte os 5 para 3 estrelas.',
    ],
  },
  {
    slot: '06',
    mode: 'MISSING_XI',
    name: 'Escalação',
    path: '/escalacao',
    rule: 'Complete a escalação de um jogo histórico: finais e mata-matas de Copa.',
    howTo: [
      'Cada fase é o time titular de um jogo real (final, semi, quartas...), com nomes escondidos.',
      'Busque os jogadores que estavam em campo; 5 erros encerram a fase.',
      'Ache todos os escondidos para 3 estrelas.',
    ],
  },
  {
    slot: '07',
    mode: 'MYSTERY_PLAYER',
    name: 'Craque Misterioso',
    path: '/craque-misterioso',
    rule: 'Um craque escondido. Cada palpite mostra o que ele tem em comum com o seu chute.',
    howTo: [
      'Chute qualquer jogador: veja se a nacionalidade e a posição batem, se ele é mais velho ou mais novo e os clubes em comum.',
      'São 8 palpites para descobrir quem é.',
      'Acerte em até 3 palpites para 3 estrelas.',
    ],
  },
  {
    slot: '08',
    mode: 'CONNECTIONS',
    name: 'Conexões',
    path: '/conexoes',
    rule: '16 jogadores, 4 grupos escondidos. Ache o que cada quatro têm em comum.',
    howTo: [
      'Toque em 4 jogadores que você acha que têm algo em comum e confirme.',
      'Grupos: mesmo clube, mesma seleção ou titulares da mesma final. Cada jogador está em um grupo só.',
      '4 erros encerram a fase. Ache os 4 grupos com até 1 erro para 3 estrelas.',
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

      {/* Modo Carreira: the stars from every game train the player's own footballer. */}
      <Link
        to="/carreira"
        className="mt-10 flex flex-col gap-2 rounded-2xl bg-cover p-5 text-ink shadow-[0_14px_30px_-12px_rgb(0_0_0/0.5)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">
            Novo · Modo Carreira
          </span>
          <span className="font-condensed block text-3xl leading-none font-black uppercase sm:text-4xl">
            Crie seu craque e leve ele da base à Europa
          </span>
          <span className="mt-1 block font-semibold">
            Cada estrela que você ganha nos jogos vira treino.
          </span>
        </span>
        <span className="font-condensed self-start rounded-lg bg-ink px-5 py-3 text-lg font-extrabold text-paper uppercase sm:self-center">
          Jogar
        </span>
      </Link>

      <section aria-labelledby="jogos" className="mt-12 sm:mt-16">
        <h2 id="jogos" className="font-condensed text-2xl font-extrabold uppercase">
          Jogos
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <Link
                    to={g.path}
                    className="inline-flex min-h-10 items-center underline underline-offset-4"
                  >
                    Ver fases
                  </Link>
                  <details className="group">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center underline underline-offset-4">
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
      <div className="mt-10">
        <AdSlot slot={AD_SLOTS.home} />
      </div>
      <p className="mt-10 text-center text-sm text-chalk-soft">
        <Link to="/privacidade" className="underline underline-offset-4 hover:text-chalk">
          Privacidade
        </Link>
        {' · '}
        <Link to="/como-jogar" className="underline underline-offset-4 hover:text-chalk">
          Como jogar
        </Link>
        {' · '}
        <a href="/jogadores" className="underline underline-offset-4 hover:text-chalk">
          Carreiras de jogadores
        </a>
      </p>
    </>
  );
}

const NAV = [
  ['/', 'Jogos'],
  ['/ranking', 'Ranking'],
  ['/stats', 'Stats'],
  ['/conta', 'Conta'],
] as const;

/** Sound on/off (off by default); the state lives on the device. */
function SoundToggle() {
  const [on, setOn] = useState(soundOn);
  useEffect(() => onSoundChange(setOn), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setSound(!on)}
      className={`font-condensed flex min-h-14 min-w-11 items-center justify-center gap-1.5 px-2 text-base font-extrabold uppercase tracking-wide sm:min-h-11 sm:px-0 sm:text-lg ${on ? 'text-cover' : 'text-chalk-soft hover:text-chalk'}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6 sm:size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {on ? (
          <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
        ) : (
          <path d="M17 9l5 6M22 9l-5 6" />
        )}
      </svg>
      {/* Icon only on the phone's bottom bar; the name stays for screen readers. */}
      <span className="sr-only sm:not-sr-only">Som</span>
    </button>
  );
}

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
                  `font-condensed flex min-h-14 items-center px-2 text-base font-extrabold uppercase tracking-wide sm:min-h-11 sm:px-0 sm:text-lg ${isActive ? 'text-cover' : 'text-chalk-soft hover:text-chalk'}`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <SoundToggle />
          </li>
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
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/career-path" element={<TrackPage mode="CAREER_PATH" />} />
          <Route path="/career-path/:level" element={<LevelRoute mode="CAREER_PATH" />} />
          <Route path="/grid" element={<TrackPage mode="FOOTBALL_GRID" />} />
          <Route path="/grid/:level" element={<LevelRoute mode="FOOTBALL_GRID" />} />
          <Route path="/impostor" element={<TrackPage mode="IMPOSTOR" />} />
          <Route path="/impostor/:level" element={<LevelRoute mode="IMPOSTOR" />} />
          <Route path="/linha-do-tempo" element={<TrackPage mode="TIMELINE" />} />
          <Route path="/linha-do-tempo/:level" element={<LevelRoute mode="TIMELINE" />} />
          <Route path="/mais-ou-menos" element={<TrackPage mode="HIGHER_LOWER" />} />
          <Route path="/mais-ou-menos/:level" element={<LevelRoute mode="HIGHER_LOWER" />} />
          <Route path="/craque-misterioso" element={<TrackPage mode="MYSTERY_PLAYER" />} />
          <Route path="/craque-misterioso/:level" element={<LevelRoute mode="MYSTERY_PLAYER" />} />
          <Route path="/conexoes" element={<TrackPage mode="CONNECTIONS" />} />
          <Route path="/conexoes/:level" element={<LevelRoute mode="CONNECTIONS" />} />
          <Route path="/escalacao" element={<TrackPage mode="MISSING_XI" />} />
          <Route path="/escalacao/:level" element={<LevelRoute mode="MISSING_XI" />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/conta" element={<AccountPage />} />
          <Route path="/conta/nova-senha" element={<NewPasswordPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/como-jogar" element={<HowToPlayPage />} />
          <Route path="/carreira" element={<CareerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <AdConsentBanner />
    </Shell>
  );
}

/** /career-path/:level and /grid/:level; the key remounts the game when the level changes. */
function LevelRoute({ mode }: { mode: GameMode }) {
  const level = Number(useParams().level);
  if (!Number.isInteger(level) || level < 1) return <Navigate to={GAME_PATH[mode]} replace />;
  const title = `${mode === 'FOOTBALL_GRID' ? 'Grid' : GAME_NAME[mode]} · Fase ${level}`;
  return (
    <ModeGate key={level} mode={mode} level={level} title={title}>
      {(timed) =>
        mode === 'CAREER_PATH' ? (
          <CareerPathPage level={level} timed={timed} />
        ) : mode === 'IMPOSTOR' ? (
          <ImpostorPage level={level} timed={timed} />
        ) : mode === 'TIMELINE' ? (
          <TimelinePage level={level} timed={timed} />
        ) : mode === 'MYSTERY_PLAYER' ? (
          <MysteryPlayerPage level={level} timed={timed} />
        ) : mode === 'CONNECTIONS' ? (
          <ConnectionsPage level={level} timed={timed} />
        ) : mode === 'MISSING_XI' ? (
          <MissingXiPage level={level} timed={timed} />
        ) : mode === 'HIGHER_LOWER' ? (
          <HigherLowerPage level={level} timed={timed} />
        ) : (
          <GridPage level={level} timed={timed} />
        )
      }
    </ModeGate>
  );
}
