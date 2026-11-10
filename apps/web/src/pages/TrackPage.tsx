/**
 * A game's track as chapters of 10 levels (ADR-007), each a page laid out as a winding path: done
 * levels carry their stars, the next level is the lit house, the rest are quiet locked outlines.
 * Only the chapter with the current level starts open; the others are one line each (native
 * <details>). Career Path draws the chapters as passport pages with ink stamps, its passport card
 * on top (left on wide screens), and opens with the current stamp centred on screen.
 */
import { AD_SLOTS, AdSlot } from '../components/AdSlot';
import { useEffect } from 'react';
import { Link } from 'react-router';
import type { GameMode, TrackResponse } from '@decabeca/contracts';
import { GAME_NAME, GAME_PATH, useTrack } from '../lib/game';
import { Stars } from '../components/Stars';
import { ModeCover } from '../components/ModeCover';
import { CareerPathCard } from '../components/CareerPathCard';
import { btnPrimary, GameHeader, Notice, Skeleton } from '../components/ui';
import { StarIcon } from '../components/Stars';

type Level = TrackResponse['levels'][number];
const DIFFICULTY = { 1: 'fácil', 2: 'média', 3: 'difícil' } as Record<number, string>;
const PAGE = 10;

/**
 * The material a mode's houses are made of: `shape` is the outline (also used by the locked,
 * dashed house), `done` the face of a finished one, `dark` whether stars need a light ink.
 */
const HOUSE: Record<GameMode, { shape: string; done: string; dark: boolean }> = {
  CAREER_PATH: {
    // passport stamps
    shape: 'rounded-full border-[5px] border-double',
    done: 'border-[#5b2b1d] bg-[#f3e9d2] text-[#5b2b1d]',
    dark: false,
  },
  FOOTBALL_GRID: {
    // chalk on the board
    shape: 'rounded-full border-2',
    done: 'obj-dark border-chalk bg-[#1f2d26] text-chalk',
    dark: true,
  },
  TIMELINE: {
    // newsprint clippings
    shape: 'rounded-none border',
    done: 'border-[#2b2418] bg-[#e8dcc0] text-[#2b2418] [background-image:repeating-linear-gradient(0deg,#0000000d_0_1px,transparent_1px_5px)]',
    dark: false,
  },
  DRAFT: {
    // foil of the sealed pack
    shape: 'rounded-lg border-2',
    done: 'border-ink/70 bg-[linear-gradient(115deg,#b9c4cc,#eef2f4_45%,#9aa7b1)] text-ink',
    dark: false,
  },
  HIGHER_LOWER: {
    // LED stadium screen
    shape: 'rounded-md border-4',
    done: 'border-[#2a2f33] bg-[#0b0d0e] text-[#f5e27a] [background-image:repeating-linear-gradient(0deg,#0004_0_1px,transparent_1px_3px)]',
    dark: true,
  },
  MISSING_XI: {
    // photo prints
    shape: 'rounded-sm border-[6px] border-b-[16px] rotate-1',
    done: 'border-paper bg-[#a9a08a] text-[#2b2418]',
    dark: false,
  },
  MYSTERY_PLAYER: {
    // scout folder
    shape: 'rounded-md border-2 border-dashed',
    done: 'border-[#5a4520] bg-[#d6b46f] text-[#3d2f14]',
    dark: false,
  },
  CONNECTIONS: {
    // locker doors
    shape: 'rounded-sm border-4',
    done: 'border-[#4b565c] bg-[#aab5ba] text-[#20282c]',
    dark: false,
  },
  IMPOSTOR: {
    // recognition board
    shape: 'rounded-sm border-4',
    done: 'border-[#2a2d31] bg-[#8d9096] text-[#1c1e21]',
    dark: false,
  },
};

/** Passport ink for done Career Path levels, turning like real stamps do. */
const INK = ['#1d2a4f', '#7a2633', '#1f5e3b', '#5b3a7a'];
const ROT = [-6, 4, -3, 7, -8, 2, -5, 6, -2, 5];

/** Serpentine place of the i-th level of a chapter: rows of 5, every other row runs back. */
const COLS = 5;
const place = (i: number) => {
  const row = Math.floor(i / COLS);
  const col = row % 2 ? COLS - (i % COLS) : (i % COLS) + 1;
  return { row: row + 1, col };
};

/** The dashed road through a chapter's houses, behind them (cell centres, 20 units per cell). */
function Road({ n, ink }: { n: number; ink: string }) {
  const rows = Math.ceil(n / COLS);
  const pts = Array.from({ length: n }, (_, i) => {
    const { row, col } = place(i);
    return `${(col - 0.5) * 20},${(row - 0.5) * 20}`;
  });
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${COLS * 20} ${rows * 20}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={ink}
        strokeWidth="2"
        strokeDasharray="5 6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Tile({ l, mode, current }: { l: Level; mode: GameMode; current: boolean }) {
  const label = `Fase ${l.level}, ${DIFFICULTY[l.difficultyTier] ?? ''}`;
  const passport = mode === 'CAREER_PATH';
  const h = HOUSE[mode];
  if (l.state === 'locked')
    return (
      <span
        className={`grid aspect-square w-full place-items-center border-dashed ${passport ? 'rounded-full border-2 border-[#6d5c3a]/40 bg-[#f3ead2] text-[#6d5c3a]/75' : `${h.shape} border-chalk-soft/40 text-chalk-soft`}`}
        aria-label={`${label}, trancada`}
        role="img"
      >
        <span className="font-condensed tabular text-xl font-black sm:text-2xl">{l.level}</span>
      </span>
    );
  const done = l.state === 'done';
  const ink = INK[l.level % INK.length];
  return (
    <Link
      to={`${GAME_PATH[mode]}/${l.level}`}
      data-current={current || undefined}
      aria-label={
        done
          ? `${label}, ${l.stars} estrelas`
          : `${label}, ${l.state === 'in_progress' ? 'em andamento' : 'jogar'}`
      }
      style={
        passport && done ? { color: ink, rotate: `${ROT[l.level % ROT.length]}deg` } : undefined
      }
      className={`flex aspect-square w-full flex-col items-center justify-center gap-1 transition-transform duration-200 ease-out-expo hover:-translate-y-0.5 ${h.shape} ${
        done
          ? passport
            ? 'border-current bg-[#f3ead2]'
            : `${h.done} shadow-[0_6px_14px_-6px_rgb(0_0_0/0.5)]`
          : 'house-pulse border-ink/60 bg-cover text-ink shadow-[0_10px_24px_-8px_rgb(0_0_0/0.6)]'
      }`}
    >
      <span className="font-condensed tabular text-2xl leading-none font-black sm:text-3xl">
        {l.level}
      </span>
      {done ? (
        <Stars n={l.stars} size="size-3 sm:size-3.5" onCover={!h.dark} />
      ) : (
        <span className="font-condensed hidden text-xs font-extrabold tracking-wide uppercase sm:block">
          {l.state === 'in_progress' ? 'Continuar' : 'Jogar'}
        </span>
      )}
    </Link>
  );
}

export function TrackPage({ mode }: { mode: GameMode }) {
  const { data, error, refetch } = useTrack(mode);
  const levels = data?.levels ?? [];
  const passport = mode === 'CAREER_PATH';
  const stars = levels.reduce((s, l) => s + l.stars, 0);
  const done = levels.filter((l) => l.state === 'done').length;
  const current = levels.find((l) => l.state === 'open' || l.state === 'in_progress');
  const pages = Array.from({ length: Math.ceil(levels.length / PAGE) }, (_, i) =>
    levels.slice(i * PAGE, i * PAGE + PAGE),
  );
  const currentPage = current ? Math.floor((current.level - 1) / PAGE) : pages.length - 1;

  // Open on the player's place: the current house centred, unless it is already on screen.
  const ready = !!data;
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-current]');
    if (!ready || !el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight - 80)
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [ready]);

  const path = (
    <div className="flex min-w-0 flex-col gap-3">
      {error && (
        <Notice
          title="Deu ruim na conexão"
          action={
            <button className={btnPrimary} onClick={() => void refetch()}>
              Tentar de novo
            </button>
          }
        >
          A trilha não carregou. Confira a internet e tente de novo.
        </Notice>
      )}
      {!data && !error && <Skeleton className="h-96" />}
      {data && levels.length === 0 && (
        <Notice title="Nenhuma fase ainda">As primeiras fases estão sendo preparadas.</Notice>
      )}
      {pages.slice(0, currentPage + 3).map((page, i) => {
        const pageStars = page.reduce((s, l) => s + l.stars, 0);
        const pageDone = page.filter((l) => l.state === 'done').length;
        const locked = page.every((l) => l.state === 'locked');
        const paper = passport && !locked;
        return (
          <details
            key={i}
            open={i === currentPage}
            className={`group rounded-xl ${
              paper
                ? 'bg-[#f3ead2] text-[#1d2a4f] shadow-[0_18px_34px_-16px_rgb(0_0_0/0.6)] [background-image:repeating-linear-gradient(0deg,transparent_0_27px,#c9b98f55_27px_28px)]'
                : locked
                  ? 'border-2 border-dashed border-chalk-soft/30'
                  : 'border border-chalk/15 bg-chalk/[0.05]'
            }`}
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-col">
                <span className="font-condensed text-xl font-extrabold uppercase">
                  {passport ? 'Página' : 'Capítulo'} {i + 1}
                </span>
                <span className={`text-sm ${paper ? 'text-[#6d5c3a]' : 'text-chalk-soft'}`}>
                  fases {page[0]!.level}–{page.at(-1)!.level}
                </span>
              </span>
              <span
                className={`flex shrink-0 items-center gap-3 ${paper ? 'text-[#6d5c3a]' : 'text-chalk-soft'}`}
              >
                <span
                  className="font-condensed tabular text-lg font-bold whitespace-nowrap"
                  aria-label={`${pageDone} de ${page.length} fases, ${pageStars} de ${page.length * 3} estrelas`}
                >
                  {locked ? (
                    'trancado'
                  ) : (
                    <>
                      {pageDone}/{page.length} ·{' '}
                      <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {pageStars}/
                      {page.length * 3}
                    </>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-150 ease-standard group-open:rotate-180"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </span>
            </summary>
            <div className="px-4 pt-1 pb-5 sm:px-6">
              <ol
                className="relative grid grid-cols-5 gap-x-3 gap-y-5 sm:gap-x-5"
                aria-label={`Fases ${page[0]!.level} a ${page.at(-1)!.level}`}
              >
                <Road n={page.length} ink={paper ? '#6d5c3a88' : 'rgb(255 255 255 / 0.35)'} />
                {page.map((l, j) => {
                  const { row, col } = place(j);
                  return (
                    <li
                      key={l.level}
                      className="relative mx-auto w-full max-w-24"
                      style={{ gridRow: row, gridColumn: col }}
                    >
                      <Tile l={l} mode={mode} current={current?.level === l.level} />
                    </li>
                  );
                })}
              </ol>
            </div>
          </details>
        );
      })}
      {pages.length > currentPage + 3 && (
        <p className="px-4 text-sm text-chalk-soft">
          Mais {pages.length - currentPage - 3}{' '}
          {passport ? 'páginas trancadas' : 'capítulos trancados'}.
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <GameHeader title={GAME_NAME[mode]} />
      {passport ? (
        // The passport card carries the progress (title, fases, stars) and the one button.
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-10">
          <div className="mx-auto w-full max-w-md lg:sticky lg:top-6">
            <CareerPathCard linked={false} />
          </div>
          {path}
        </div>
      ) : (
        <>
          {/* The mode's own object as the header; the h1 above carries the name for assistive tech. */}
          <div
            aria-hidden="true"
            className="flex flex-col overflow-hidden rounded-xl shadow-[0_14px_30px_-12px_rgb(0_0_0/0.6)]"
          >
            <ModeCover mode={mode} name={GAME_NAME[mode]} />
          </div>
          {data && levels.length > 0 && (
            <section className="grid gap-4 rounded-xl bg-chalk/[0.05] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8 sm:p-5">
              <p className="font-condensed tabular text-5xl leading-none font-black">
                {done}
                <span className="text-2xl text-chalk-soft">/{levels.length}</span>
              </p>
              <div className="flex flex-col gap-1.5">
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-chalk/15"
                  role="progressbar"
                  aria-valuenow={done}
                  aria-valuemin={0}
                  aria-valuemax={levels.length}
                  aria-label="Fases concluídas"
                >
                  <div
                    className="h-full rounded-full bg-cover transition-[width] duration-500 ease-out-expo"
                    style={{ width: `${(done / levels.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-chalk-soft">
                  fases concluídas · <StarIcon className="inline size-[0.85em] align-[-0.08em]" />{' '}
                  {stars} de {levels.length * 3} estrelas
                </p>
              </div>
              {current && (
                <Link
                  to={`${GAME_PATH[mode]}/${current.level}`}
                  className="font-condensed rounded-lg bg-cover px-5 py-3 text-center text-lg font-extrabold tracking-wide text-ink uppercase"
                >
                  {current.state === 'in_progress' ? 'Continuar' : 'Jogar'} fase {current.level}
                </Link>
              )}
            </section>
          )}
          {path}
        </>
      )}
      <AdSlot slot={AD_SLOTS.track} />
    </div>
  );
}
