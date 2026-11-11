import { onSettingsRequest, SettingsButton } from './components/SettingsButton';
import { useApplyCosmetics } from './lib/cosmetics';
import { sceneFor, setScene } from './lib/music';
import { LockerRoom, type Locker } from './components/LockerRoom';
import { RouteMeta } from './components/RouteMeta';
import { AlbumIcon, DailyIcon, GamesIcon, ProfileIcon, RankingIcon } from './components/Icons';
import { AD_SLOTS, AdSlot } from './components/AdSlot';
import { ConsentBanner, LegalLinks } from './components/ConsentBanner';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { Crest } from './components/Crest';
import { SignInButton } from './components/SignInButton';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { closedRoute, isModeLaunched, isPageLaunched, LAUNCH_ALL } from './lib/launch';
import { GAME_NAME, GAME_PATH, useMe } from './lib/game';
import type { GameMode, VotableMode } from '@decabeca/contracts';
import { ModeGate } from './games/Clock';
import { AfterPaint, btnSecondary, Skeleton, useOnline } from './components/ui';

const SettingsDialog = lazy(() =>
  import('./components/Settings').then((m) => ({ default: m.SettingsDialog })),
);
const FirstRun = lazy(() => import('./components/Welcome').then((m) => ({ default: m.FirstRun })));
const TrackPage = lazy(() => import('./pages/TrackPage').then((m) => ({ default: m.TrackPage })));
const loadCareerPath = () => import('./games/career-path/CareerPathPage');
const AdminApp = lazy(() => import('./admin/AdminApp'));
// Each screen loads on demand: the first visit downloads only the shell and the home.
const CareerPathPage = lazy(() => loadCareerPath().then((m) => ({ default: m.CareerPathPage })));
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
const EntrarPage = lazy(() =>
  import('./pages/EntrarPage').then((m) => ({ default: m.EntrarPage })),
);
const SugestoesPage = lazy(() =>
  import('./pages/SugestoesPage').then((m) => ({ default: m.SugestoesPage })),
);
const ApoiePage = lazy(() => import('./pages/ApoiePage').then((m) => ({ default: m.ApoiePage })));
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
const clube = () => import('./pages/ClubePage');
const ClubePage = lazy(() => clube().then((m) => ({ default: m.ClubePage })));
const GiftRedeemPage = lazy(() => clube().then((m) => ({ default: m.GiftRedeemPage })));

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
  const { pathname } = useLocation();
  // On /entrar itself the button would point at the page already open.
  if (!me?.account && pathname === '/entrar') return null;
  if (!me?.account)
    return (
      <SignInButton
        className={`${btnSecondary} min-h-10 shrink-0 border-cover/70 px-3 text-base text-cover hover:border-cover sm:px-4 sm:text-lg`}
      />
    );
  const who = me.nickname ?? me.account.email;
  return (
    <Link
      to="/stats"
      aria-label="Meu perfil"
      className="font-condensed grid size-11 shrink-0 place-items-center rounded-full bg-cover text-xl font-black text-ink uppercase ring-2 ring-cover/30 ring-offset-2 ring-offset-pitch-deep"
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
      className="flex min-h-11 min-w-0 items-center gap-2.5"
      aria-label={home ? undefined : 'De Cabeça F.C., início'}
    >
      <Crest className="h-9 w-8 shrink-0 drop-shadow-[0_2px_3px_rgb(0_0_0/0.5)]" />
      <div className="min-w-0">
        <H className="font-condensed block text-lg leading-[0.95] font-black whitespace-nowrap uppercase min-[400px]:text-xl lg:text-2xl">
          De Cabeça F.C.
        </H>
        <span className="mt-0.5 hidden text-xs leading-tight font-semibold whitespace-nowrap text-chalk-soft min-[400px]:block">
          Minijogos de futebol
        </span>
      </div>
    </Link>
  );
}

/** Pages that are still closed; they get a poster next to the closed modes and do not open. */
const SOON_EXTRA: {
  name: string;
  page: 'career' | 'copa' | 'oficina';
  rule: string;
  howTo: string[];
}[] = [
  {
    name: 'Modo Carreira',
    page: 'career',
    rule: 'Seu próprio jogador, da base à Europa. Quem treina ele é você: as estrelas que você ganha nos jogos viram evolução.',
    howTo: [
      'Crie seu craque: nome e posição.',
      'Cada estrela ganha nos jogos vira treino para os atributos dele.',
      'Jogue a temporada e suba da base até a Europa.',
    ],
  },
  {
    name: 'Copa dos Sonhos',
    page: 'copa',
    rule: 'Monte um XI com craques das grandes seleções e dispute uma Copa contra as lendas. As notas vêm da história de cada um em Copas.',
    howTo: [
      'Em cada posição, escolha 1 de 4 craques das grandes seleções.',
      'Quem jogou junto de verdade dá entrosamento ao time.',
      'Escolha a tática de cada jogo e dispute a Copa contra seleções lendárias.',
    ],
  },
  {
    name: 'Oficina',
    page: 'oficina',
    rule: 'Monte o seu próprio Football Grid com os nossos dados e desafie a galera.',
    howTo: [
      'Escolha as linhas e colunas: clubes, seleções ou posições.',
      'O servidor confere: cada cruzamento precisa de pelo menos 8 respostas certas.',
      'Aprovada por um editor, sua grade entra na Oficina para a galera jogar e votar.',
    ],
  },
];

/** The hook on each closed mode's poster: what the mode is, in a few words. */
const PITCH: Record<VotableMode, string> = {
  FOOTBALL_GRID: 'Um craque por cruzamento',
  IMPOSTOR: 'Ache quem nunca jogou lá',
  TIMELINE: 'Os clubes na ordem certa',
  HIGHER_LOWER: 'Quem fez mais pelo clube?',
  MISSING_XI: 'O XI de uma final de Copa',
  MYSTERY_PLAYER: 'Cada palpite dá uma pista',
  CONNECTIONS: '16 nomes, 4 grupos',
  DRAFT: 'Um 4-3-3 de titulares reais',
  career: 'Seu craque, da base à Europa',
  copa: 'Um XI de lendas na Copa',
  oficina: 'Crie seu próprio Grid',
};

/**
 * The home is one scene: the Career Path passport open on the locker-room bench, the next-level
 * ticket clipped to it, and the closed modes as premiere posters on the wall; each opens to what
 * the mode is and a vote for the one that opens next.
 */
export function Home() {
  const modes: Locker[] = GAMES.flatMap((g) =>
    g.mode === 'CAREER_PATH' || isModeLaunched(g.mode)
      ? []
      : [
          {
            key: g.mode,
            name: g.name,
            rule: g.rule,
            pitch: PITCH[g.mode],
            howTo: g.howTo,
          },
        ],
  );
  const extra: Locker[] = SOON_EXTRA.filter((x) => !isPageLaunched(x.page)).map((x) => ({
    key: x.page,
    name: x.name,
    rule: x.rule,
    pitch: PITCH[x.page],
    howTo: x.howTo,
  }));
  return <LockerRoom lockers={[...modes, ...extra]} />;
}

function HomeRoute() {
  // Warm the launch level's chunk once the home is idle, so opening it is instant.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 2000));
    idle(() => void loadCareerPath());
  }, []);
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
      !/^\/(d|ranking|ligas?|fantasy|stats|album|history|conta|entrar|apoie|perfil)(\/|$)/.test(p),
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
    match: (p: string) => /^\/(stats|album|history|conta|entrar|apoie|perfil)(\/|$)/.test(p),
  },
] as const;

const NAV_LAUNCH = [
  {
    to: '/',
    label: 'Jogar',
    Icon: GamesIcon,
    match: (p: string) => !/^\/(album|stats|history|conta|entrar|apoie|perfil)(\/|$)/.test(p),
  },
  { to: '/album', label: 'Álbum', Icon: AlbumIcon, match: (p: string) => /^\/album(\/|$)/.test(p) },
  {
    to: '/stats',
    label: 'Perfil',
    Icon: ProfileIcon,
    match: (p: string) => /^\/(stats|history|conta|entrar|apoie|perfil)(\/|$)/.test(p),
  },
] as const;

const NAV = LAUNCH_ALL ? NAV_ALL : NAV_LAUNCH;

function Shell({ children }: { children: ReactNode }) {
  const online = useOnline();
  const { pathname } = useLocation();
  const home = pathname === '/';
  const level = sceneFor(pathname) === 'level';
  useEffect(() => setScene(sceneFor(pathname)), [pathname]);
  useApplyCosmetics();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pt-[calc(1rem+var(--consent-room,0px))] pb-[calc(3rem+var(--nav-room,4rem)+env(safe-area-inset-bottom))] sm:px-8 sm:pb-12">
      {/* The scoreboard strip, the same 56px on every route: crest, places, Ajustes, Entrar.
          On the phone the places are the bottom bar; inside a level the game owns the phone
          screen (its height is measured without this strip), so only the bottom bar stays. */}
      <header
        className={`scoreboard floodlit mb-3 h-14 items-center gap-3 rounded-2xl border border-chalk/10 pr-1.5 pl-3 shadow-[0_14px_30px_-16px_rgb(0_0_0/0.8)] sm:flex sm:gap-4 sm:pl-4 lg:gap-6 ${level ? 'max-sm:contents' : 'flex'}`}
      >
        <div className={`min-w-0 ${level ? 'max-sm:hidden' : ''}`}>
          <Brand home={home} />
        </div>
        <nav
          aria-label="Principal"
          className="app-bar scoreboard floodlit fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] sm:static sm:mx-auto sm:self-stretch sm:bg-none sm:pb-0 sm:shadow-none sm:before:hidden"
        >
          <ul
            className={`mx-auto grid h-16 max-w-xl ${LAUNCH_ALL ? 'grid-cols-4' : 'grid-cols-3'} sm:flex sm:h-full sm:gap-1 lg:gap-2`}
          >
            {NAV.map(({ to, label, Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={to} className="flex">
                  <Link
                    to={to}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-xs font-bold tracking-wide transition-colors duration-150 sm:font-condensed sm:flex-row sm:gap-2 sm:px-3 sm:text-base sm:font-extrabold sm:uppercase lg:px-4 lg:text-lg ${active ? 'tab-lit text-gold' : 'text-chalk-soft hover:text-chalk'}`}
                  >
                    {/* the lit bar: the phone tab's top edge, the strip's floor on wide screens */}
                    <span
                      aria-hidden="true"
                      className={`absolute top-0 h-[3px] w-10 rounded-b-full bg-cover transition-[opacity,scale] duration-200 ease-[var(--ease-out-expo)] sm:top-auto sm:bottom-0 sm:w-[calc(100%-1rem)] sm:rounded-t-full sm:rounded-b-none ${active ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-0'}`}
                    />
                    <Icon className="size-[22px] sm:size-5" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div
          className={`ml-auto flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-2 ${level ? 'max-sm:hidden' : ''}`}
        >
          <SettingsButton />
          <AccountLink />
        </div>
      </header>
      <SettingsHost />
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

/** Ajustes (a separate chunk with the wardrobe) is fetched and mounted on the first open. */
function SettingsHost() {
  const [on, setOn] = useState(false);
  useEffect(() => onSettingsRequest(() => setOn(true)), []);
  return on ? (
    <Suspense fallback={null}>
      <SettingsDialog />
    </Suspense>
  ) : null;
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
            <Route path="/entrar" element={<EntrarPage />} />
            <Route path="/apoie" element={<ApoiePage />} />
            <Route path="/sugestoes" element={<SugestoesPage />} />
            <Route path="/clube" element={<ClubePage />} />
            <Route path="/presente/:code" element={<GiftRedeemPage />} />
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
      <AfterPaint>
        <Suspense fallback={null}>
          <FirstRun />
        </Suspense>
      </AfterPaint>
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
