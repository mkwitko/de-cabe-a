import { SoundToggle } from './components/SoundToggle';
import { GameArt } from './components/GameArt';
import { RouteMeta } from './components/RouteMeta';
import { StarIcon } from './components/Stars';
import { DailyIcon, GamesIcon, ProfileIcon, RankingIcon } from './components/Icons';
import { AD_SLOTS, AdConsentBanner, AdSlot } from './components/AdSlot';
import {
  lazy,
  Suspense,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import type { GamesResponse } from '@decabeca/contracts';
import { GAME_NAME, GAME_PATH, useGames, useStats } from './lib/game';
import type { GameMode } from '@decabeca/contracts';
import { TrackPage } from './pages/TrackPage';
import { ModeGate } from './games/Clock';
import { btnPrimary, btnSecondary, Skeleton, useOnline } from './components/ui';

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
        <h1 className="font-condensed text-[clamp(3rem,14vw,5.5rem)] leading-[0.85] font-black tracking-[-0.02em] whitespace-nowrap uppercase">
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

function TrackState({ track }: { track: Track | undefined }) {
  if (!track) return <Skeleton className="h-9 w-full" />;
  if (track.levels === 0) return <p className="font-semibold">Fases a caminho.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-sm font-semibold">
        <span className="font-condensed tabular text-xl font-black">
          {track.completed}/{track.levels}
        </span>
        <span>fases</span>
        <span
          className="font-condensed tabular ml-auto text-lg font-black"
          aria-label={`${track.stars} estrelas`}
        >
          <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {track.stars}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/15" aria-hidden="true">
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${(track.completed / track.levels) * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The nine games as a row of album stickers: drawing, what the game is, its pace, the player's
 * progress and one button into the next level. Native scroll-snap; arrows on wider screens.
 */
function GameCarousel({ games }: { games?: GamesResponse | undefined }) {
  const row = useRef<HTMLUListElement>(null);
  const step = (dir: 1 | -1) => {
    const el = row.current;
    const card = el?.querySelector('li');
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: 'smooth' });
  };
  const arrow =
    'hidden size-11 place-items-center rounded-full border border-chalk/25 text-chalk hover:bg-chalk/10 sm:grid';
  return (
    <section aria-labelledby="jogos" className="mt-12 sm:mt-16">
      <div className="flex items-end justify-between gap-4">
        <h2 id="jogos" className="font-condensed text-2xl font-extrabold uppercase">
          Jogos
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            className={arrow}
            onClick={() => step(-1)}
            aria-label="Jogos anteriores"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            className={arrow}
            onClick={() => step(1)}
            aria-label="Próximos jogos"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
      <ul
        ref={row}
        className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 scroll-px-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] sm:scroll-px-0 sm:[scrollbar-width:thin] sm:-mx-0 sm:px-0"
      >
        {GAMES.map((g) => {
          const track = games?.games.find((x) => x.mode === g.mode);
          return (
            <li
              key={g.mode}
              className="flex w-[82%] max-w-80 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_14px_30px_-14px_rgb(0_0_0/0.55)] sm:w-80"
            >
              <Link
                to={g.path}
                tabIndex={-1}
                aria-hidden="true"
                className="block bg-pitch-deep px-4 py-3"
              >
                <GameArt mode={g.mode} className="mx-auto h-32 w-full" />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="font-condensed text-3xl leading-none font-black uppercase">
                  <Link to={g.path} className="hover:underline hover:underline-offset-4">
                    {g.name}
                  </Link>
                </h3>
                <p className="font-medium">{g.rule}</p>
                <p className="flex gap-2 text-sm font-semibold">
                  {g.facts.map((f) => (
                    <span key={f} className="rounded-full bg-ink/10 px-2.5 py-1">
                      {f}
                    </span>
                  ))}
                </p>
                <div className="mt-auto flex flex-col gap-3 pt-2">
                  <TrackState track={track} />
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to={track?.nextLevel ? `${g.path}/${track.nextLevel}` : g.path}
                      className="font-condensed inline-flex min-h-11 items-center rounded-lg bg-ink px-5 text-lg font-extrabold text-paper uppercase"
                    >
                      {track?.nextLevel
                        ? track.completed
                          ? `Jogar fase ${track.nextLevel}`
                          : 'Começar'
                        : 'Ver fases'}
                    </Link>
                    <Link
                      to={`/como-jogar#${g.mode.toLowerCase()}`}
                      className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
                    >
                      Como jogar
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Home({ games }: { games?: GamesResponse | undefined }) {
  // The game with the most progress that still has a level to play: one tap back into it.
  const resume = games?.games
    .filter((g) => g.completed > 0 && g.nextLevel)
    .sort((a, b) => b.completed - a.completed)[0];
  return (
    <>
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-10">
        <BrandSticker />
        <p className="max-w-[34ch] text-lg leading-snug font-medium text-chalk sm:pb-3 sm:text-xl">
          Pra quem sabe a escalação de cor. Fase por fase, estrela por estrela, até virar lenda.
        </p>
      </header>

      <Link
        to="/d/hoje"
        className="mt-10 flex items-center justify-between gap-4 rounded-2xl bg-paper p-5 text-ink shadow-[0_14px_30px_-12px_rgb(0_0_0/0.5)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 sm:p-6"
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-condensed text-3xl leading-none font-black uppercase sm:text-4xl">
            Desafio do Dia
          </span>
          <span className="mt-1.5 font-semibold">
            Uma fase de cada jogo, a mesma para todos. Nova à meia-noite.
          </span>
        </span>
        <span className={`${btnPrimary} shrink-0`}>Jogar</span>
      </Link>

      {/* Modo Carreira: the stars from every game train the player's own footballer. */}
      <Link
        to="/carreira"
        className="mt-6 flex flex-col gap-2 rounded-2xl bg-cover p-5 text-ink shadow-[0_14px_30px_-12px_rgb(0_0_0/0.5)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <span>
          <span className="font-condensed block text-3xl leading-none font-black uppercase sm:text-4xl">
            Modo Carreira
          </span>
          <span className="mt-1.5 block font-semibold">
            Crie seu craque e leve ele da base à Europa. Cada estrela que você ganha nos jogos vira
            treino.
          </span>
        </span>
        <span className="font-condensed self-start rounded-lg bg-ink px-5 py-3 text-lg font-extrabold text-paper uppercase sm:self-center">
          Jogar
        </span>
      </Link>

      <Link
        to="/copa"
        className="mt-6 flex flex-col gap-2 rounded-2xl border-2 border-cover p-5 transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <span>
          <span className="font-condensed block text-3xl leading-none font-black uppercase sm:text-4xl">
            Copa dos Sonhos
          </span>
          <span className="mt-1.5 block font-semibold text-chalk-soft">
            Monte um time com craques de todas as Copas e tente ser campeão contra seleções
            históricas.
          </span>
        </span>
        <span className={`${btnPrimary} self-start sm:self-center`}>Montar time</span>
      </Link>

      <Link
        to="/oficina"
        className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-chalk/15 bg-chalk/[0.06] px-5 py-4 transition-transform duration-100 ease-standard hover:-translate-y-px"
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-condensed text-2xl font-black uppercase">Oficina</span>
          <span className="text-sm font-semibold text-chalk-soft">
            Grids da comunidade, eventos e o seu próprio desafio
          </span>
        </span>
        <span className={`${btnSecondary} shrink-0`}>Abrir</span>
      </Link>

      {resume && (
        <Link
          to={`${GAME_PATH[resume.mode]}/${resume.nextLevel}`}
          className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-chalk/15 bg-chalk/[0.06] px-5 py-4 transition-transform duration-100 ease-standard hover:-translate-y-px"
        >
          <span className="flex min-w-0 flex-col">
            <span className="font-condensed truncate text-2xl font-black uppercase">
              {resume.name} · Fase {resume.nextLevel}
            </span>
            <span className="text-sm font-semibold text-chalk-soft">Continuar de onde parei</span>
          </span>
          <span className={`${btnPrimary} shrink-0`}>Jogar</span>
        </Link>
      )}

      <GameCarousel games={games} />
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
      <span className="font-condensed tabular text-xl font-bold">
        <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {data.totalStars} estrelas
      </span>
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

/**
 * Four places, each the home of a few pages: Jogos (home, tracks, levels, Modo Carreira),
 * Desafio (Desafio do Dia and its round), Ranking (ranking, seasons, leagues), Perfil (stats,
 * history, account and preferences, public profiles).
 */
const NAV = [
  {
    to: '/',
    label: 'Jogos',
    Icon: GamesIcon,
    match: (p: string) => !/^\/(d|ranking|ligas?|fantasy|stats|history|conta|perfil)(\/|$)/.test(p),
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
    match: (p: string) => /^\/(stats|history|conta|perfil)(\/|$)/.test(p),
  },
] as const;

function Shell({ children }: { children: ReactNode }) {
  const online = useOnline();
  const { pathname } = useLocation();
  const home = pathname === '/';
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8 sm:pb-12">
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-chalk/15 bg-pitch-deep/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:mb-6 sm:border-0 sm:bg-transparent sm:pb-0 sm:backdrop-blur-none"
      >
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-4 sm:flex sm:h-auto sm:max-w-7xl sm:items-center sm:justify-end sm:gap-7">
          {!home && (
            <li className="mr-auto hidden sm:block">
              <Link to="/" className="font-condensed text-2xl font-black uppercase">
                De Cabeça
              </Link>
            </li>
          )}
          {NAV.map(({ to, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={to} className="flex">
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-xs font-bold tracking-wide transition-colors duration-150 sm:font-condensed sm:min-h-11 sm:flex-row sm:gap-2 sm:text-lg sm:font-extrabold sm:uppercase ${active ? 'text-cover' : 'text-chalk-soft hover:text-chalk'}`}
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
          <li className="hidden sm:block">
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
      <RouteMeta />
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
          <Route path="/conta" element={<AccountPage />} />
          <Route path="/conta/nova-senha" element={<NewPasswordPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
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
