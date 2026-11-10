import { MusicToggle, SoundToggle } from './components/SoundToggle';
import { sceneFor, setScene } from './lib/music';
import { ThemeToggle } from './components/ThemeToggle';
import { LockerRoom } from './components/LockerRoom';
import { RouteMeta } from './components/RouteMeta';
import { AlbumIcon, DailyIcon, GamesIcon, ProfileIcon, RankingIcon } from './components/Icons';
import { AD_SLOTS, AdSlot } from './components/AdSlot';
import { ConsentBanner, LegalLinks } from './components/ConsentBanner';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { Crest } from './components/Crest';
import { SignInButton } from './components/SignInButton';
import { ComingSoonPage } from './pages/ComingSoonPage';
import {
  closedRoute,
  isModeLaunched,
  isPageLaunched,
  LAUNCH_ALL,
  type PageKey,
} from './lib/launch';
import { GAME_NAME, GAME_PATH, useMe } from './lib/game';
import type { GameMode } from '@decabeca/contracts';
import { TrackPage } from './pages/TrackPage';
import { ModeGate } from './games/Clock';
import { btnSecondary, Skeleton, useOnline } from './components/ui';

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
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const CookiesPage = lazy(() =>
  import('./pages/CookiesPage').then((m) => ({ default: m.CookiesPage })),
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
const DraftPage = lazy(() =>
  import('./games/draft/DraftPage').then((m) => ({ default: m.DraftPage })),
);
const FantasyPage = lazy(() =>
  import('./pages/FantasyPage').then((m) => ({ default: m.FantasyPage })),
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
const oficina = () => import('./pages/OficinaPage');
const OficinaPage = lazy(() => oficina().then((m) => ({ default: m.OficinaPage })));
const OficinaCreatePage = lazy(() => oficina().then((m) => ({ default: m.OficinaCreatePage })));
const OficinaLevelPage = lazy(() => oficina().then((m) => ({ default: m.OficinaLevelPage })));
const CreatorPage = lazy(() => oficina().then((m) => ({ default: m.CreatorPage })));
const EventPage = lazy(() => oficina().then((m) => ({ default: m.EventPage })));
const CopaPage = lazy(() => import('./pages/CopaPage').then((m) => ({ default: m.CopaPage })));
const DailyPage = lazy(() => import('./pages/DailyPage').then((m) => ({ default: m.DailyPage })));
const LeaguesPage = lazy(() =>
  import('./pages/LeaguesPage').then((m) => ({ default: m.LeaguesPage })),
);
const LeaguePage = lazy(() =>
  import('./pages/LeaguesPage').then((m) => ({ default: m.LeaguePage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const AlbumPage = lazy(() => import('./pages/AlbumPage').then((m) => ({ default: m.AlbumPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));

export const GAMES = [
  {
    slot: '01',
    mode: 'CAREER_PATH',
    facts: ['6 chances', '1 min'],
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
    facts: ['9 chances', '3 min'],
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
    facts: ['5 rodadas', '2 min'],
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
    facts: ['5 jogadores', '2 min'],
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
    facts: ['5 duelos', '1 min'],
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
    facts: ['até 5 erros', '3 min'],
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
    facts: ['8 palpites', '2 min'],
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
    facts: ['até 4 erros', '3 min'],
    name: 'Conexões',
    path: '/conexoes',
    rule: '16 jogadores, 4 grupos escondidos. Ache o que cada quatro têm em comum.',
    howTo: [
      'Toque em 4 jogadores que você acha que têm algo em comum e confirme.',
      'Grupos: mesmo clube, mesma seleção ou titulares da mesma final. Cada jogador está em um grupo só.',
      '4 erros encerram a fase. Ache os 4 grupos com até 1 erro para 3 estrelas.',
    ],
  },
  {
    slot: '09',
    mode: 'DRAFT',
    facts: ['11 rodadas', '2 min'],
    name: 'Draft',
    path: '/draft',
    rule: 'Monte um 4-3-3 com titulares de jogos de verdade, uma posição por rodada.',
    howTo: [
      'Cada rodada mostra um jogo de verdade, um time e uma posição.',
      'Das 4 opções, só uma foi titular nesse jogo. As outras jogaram pelo mesmo time em outros jogos.',
      'São 11 rodadas, uma por posição. Acerte 10 ou 11 para 3 estrelas.',
    ],
  },
] as const;

/** Entrar for guests, the initial as an avatar once signed in (to the profile). */
function AccountLink() {
  const { data: me } = useMe();
  if (!me?.account) return <SignInButton className={`${btnSecondary} shrink-0`} />;
  const who = me.nickname ?? me.account.email;
  return (
    <Link
      to="/stats"
      aria-label="Meu perfil"
      className="font-condensed grid size-11 shrink-0 place-items-center rounded-full bg-cover text-xl font-black text-ink uppercase"
    >
      {who?.[0] ?? '?'}
    </Link>
  );
}

/** Crest, name and tagline; the page heading on the home, a link home everywhere else. */
function Brand({ home }: { home: boolean }) {
  const H = home ? 'h1' : 'span';
  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2 sm:gap-3"
      aria-label={home ? undefined : 'De Cabeça F.C., início'}
    >
      <Crest className="h-10 w-9 shrink-0 sm:h-11 sm:w-10" />
      <div className="min-w-0">
        <H className="font-condensed block text-[1.35rem] leading-[0.95] font-black whitespace-nowrap uppercase sm:text-2xl lg:text-3xl">
          De Cabeça F.C.
        </H>
        <span className="mt-0.5 block text-sm leading-tight font-semibold text-chalk-soft sm:whitespace-nowrap">
          Minijogos de futebol
        </span>
      </div>
    </Link>
  );
}

/** Pages that are still closed; they hang with the closed modes and do not open. */
const SOON_EXTRA: { name: string; page: PageKey }[] = [
  { name: 'Modo Carreira', page: 'career' },
  { name: 'Copa dos Sonhos', page: 'copa' },
  { name: 'Oficina', page: 'oficina' },
];

/**
 * The home is one scene: the Career Path passport open on the locker-room bench, the next-level
 * ticket clipped to it, and the closed modes hanging as jerseys (numbered by their slot).
 */
export function Home() {
  const modes = GAMES.flatMap((g) =>
    g.mode === 'CAREER_PATH' || isModeLaunched(g.mode)
      ? []
      : [{ key: g.mode, name: g.name, number: String(Number(g.slot)) }],
  );
  const extra = SOON_EXTRA.filter((x) => !isPageLaunched(x.page)).map((x, i) => ({
    key: x.page,
    name: x.name,
    number: String(GAMES.length + 1 + i),
  }));
  return <LockerRoom jerseys={[...modes, ...extra]} />;
}

function HomeRoute() {
  return (
    <>
      <Home />
      <div className="mt-10">
        <AdSlot slot={AD_SLOTS.home} />
      </div>
      <p className="mt-10 text-center text-sm text-chalk-soft">
        {isPageLaunched('daily') && (
          <>
            <Link to="/d/hoje" className="underline underline-offset-4 hover:text-chalk">
              Desafio do Dia
            </Link>
            {' · '}
          </>
        )}
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

/**
 * Four places when everything is open, each the home of a few pages: Jogos (home, tracks, levels,
 * Modo Carreira), Desafio, Ranking (ranking, seasons, leagues), Perfil (stats, history, account,
 * public profiles). At launch only three: Jogar, Álbum, Perfil.
 */
const NAV_ALL = [
  {
    to: '/',
    label: 'Jogos',
    Icon: GamesIcon,
    match: (p: string) =>
      !/^\/(d|ranking|ligas?|fantasy|stats|album|history|conta|perfil)(\/|$)/.test(p),
  },
  { to: '/d/hoje', label: 'Desafio', Icon: DailyIcon, match: (p: string) => /^\/d(\/|$)/.test(p) },
  {
    to: '/ranking',
    label: 'Ranking',
    Icon: RankingIcon,
    match: (p: string) => /^\/(ranking|ligas?|fantasy)(\/|$)/.test(p),
  },
  {
    to: '/stats',
    label: 'Perfil',
    Icon: ProfileIcon,
    match: (p: string) => /^\/(stats|album|history|conta|perfil)(\/|$)/.test(p),
  },
] as const;

const NAV_LAUNCH = [
  {
    to: '/',
    label: 'Jogar',
    Icon: GamesIcon,
    match: (p: string) => !/^\/(album|stats|history|conta|perfil)(\/|$)/.test(p),
  },
  { to: '/album', label: 'Álbum', Icon: AlbumIcon, match: (p: string) => /^\/album(\/|$)/.test(p) },
  {
    to: '/stats',
    label: 'Perfil',
    Icon: ProfileIcon,
    match: (p: string) => /^\/(stats|history|conta|perfil)(\/|$)/.test(p),
  },
] as const;

const NAV = LAUNCH_ALL ? NAV_ALL : NAV_LAUNCH;

function Shell({ children }: { children: ReactNode }) {
  const online = useOnline();
  const { pathname } = useLocation();
  const home = pathname === '/';
  useEffect(() => setScene(sceneFor(pathname)), [pathname]);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pt-[calc(1rem+var(--consent-room,0px))] pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8 sm:pb-12">
      {/* One header: brand, places, sound, theme and Entrar on wide screens; on the phone the places
          are the bottom bar and only the home keeps a top (brand, sound, Entrar). */}
      <header
        className={`items-center gap-3 sm:mb-6 sm:flex sm:gap-4 lg:gap-6 ${home ? 'mb-4 flex justify-between' : 'contents'}`}
      >
        <div className={home ? 'min-w-0' : 'hidden min-w-0 sm:block'}>
          <Brand home={home} />
        </div>
        <nav
          aria-label="Principal"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-chalk/15 bg-pitch-deep/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:ml-auto sm:border-0 sm:bg-transparent sm:pb-0 sm:backdrop-blur-none"
        >
          <ul
            className={`mx-auto grid h-16 max-w-xl ${LAUNCH_ALL ? 'grid-cols-4' : 'grid-cols-3'} sm:flex sm:h-auto sm:items-center sm:gap-4 lg:gap-6`}
          >
            {NAV.map(({ to, label, Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={to} className="flex">
                  <Link
                    to={to}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-xs font-bold tracking-wide transition-colors duration-150 sm:font-condensed sm:min-h-11 sm:flex-row sm:gap-2 sm:text-base sm:font-extrabold lg:text-lg sm:uppercase ${active ? 'text-gold' : 'text-chalk-soft hover:text-chalk'}`}
                  >
                    {/* active marker: a short cover bar on top of the phone tab, under the word on wide screens */}
                    <span
                      aria-hidden="true"
                      className={`absolute top-0 h-[3px] w-8 rounded-b-full bg-cover transition-opacity duration-150 sm:top-auto sm:bottom-0 sm:w-full sm:rounded-full ${active ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <Icon className="size-[22px] sm:hidden" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={`shrink-0 items-center gap-1 ${home ? 'flex' : 'hidden sm:flex'}`}>
          <span className="hidden sm:contents">
            <MusicToggle />
          </span>
          <SoundToggle />
          <span className="hidden sm:contents">
            <ThemeToggle />
          </span>
          <span className="ml-1 sm:ml-2">
            <AccountLink />
          </span>
        </div>
      </header>
      {!online && (
        <p role="status" className="mb-4 rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
          Sem conexão. As jogadas voltam quando a internet voltar.
        </p>
      )}
      <main>{children}</main>
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
  const closed = closedRoute(useLocation().pathname);
  return (
    <Shell>
      <RouteMeta />
      <Suspense fallback={<Skeleton className="h-96" />}>
        {closed ? (
          <ComingSoonPage closed={closed} />
        ) : (
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
            <Route
              path="/craque-misterioso/:level"
              element={<LevelRoute mode="MYSTERY_PLAYER" />}
            />
            <Route path="/draft" element={<TrackPage mode="DRAFT" />} />
            <Route path="/draft/:level" element={<LevelRoute mode="DRAFT" />} />
            <Route path="/conexoes" element={<TrackPage mode="CONNECTIONS" />} />
            <Route path="/conexoes/:level" element={<LevelRoute mode="CONNECTIONS" />} />
            <Route path="/escalacao" element={<TrackPage mode="MISSING_XI" />} />
            <Route path="/escalacao/:level" element={<LevelRoute mode="MISSING_XI" />} />
            <Route path="/d" element={<Navigate to="/d/hoje" replace />} />
            <Route path="/d/:date" element={<DailyPage />} />
            <Route path="/perfil/:nickname" element={<ProfilePage />} />
            <Route path="/ligas" element={<LeaguesPage />} />
            <Route path="/liga/:code" element={<LeaguePage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/fantasy" element={<FantasyPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/album" element={<AlbumPage />} />
            <Route path="/conta" element={<AccountPage />} />
            <Route path="/conta/nova-senha" element={<NewPasswordPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/como-jogar" element={<HowToPlayPage />} />
            <Route path="/carreira" element={<CareerPage />} />
            <Route path="/copa" element={<CopaPage />} />
            <Route path="/oficina" element={<OficinaPage />} />
            <Route path="/oficina/criar" element={<OficinaCreatePage />} />
            <Route path="/oficina/:id" element={<OficinaLevelPage />} />
            <Route path="/criador/:nickname" element={<CreatorPage />} />
            <Route path="/eventos/:slug" element={<EventPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Suspense>
      <LegalLinks />
      <ConsentBanner />
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
        ) : mode === 'DRAFT' ? (
          <DraftPage level={level} timed={timed} />
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
