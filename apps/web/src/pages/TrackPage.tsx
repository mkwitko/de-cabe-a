/**
 * A game's track as album chapters of 10 levels (ADR-007): done levels are pasted stickers with
 * their stars, the next level is the open slot, the rest are locked slots. Only the chapter with
 * the current level starts open; the others are one line each (native <details>).
 */
import { AD_SLOTS, AdSlot } from '../components/AdSlot';
import { Link } from 'react-router';
import type { GameMode, TrackResponse } from '@decabeca/contracts';
import { GAME_NAME, GAME_PATH, useTrack } from '../lib/game';
import { Stars } from '../components/Stars';
import { ModeCover } from '../components/ModeCover';
import { GameHeader, Notice, Skeleton } from '../components/ui';
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
    shape: 'rounded-full border-[3px] border-double -rotate-3',
    done: 'border-[#5b2b1d] bg-[#f3e9d2] text-[#5b2b1d]',
    dark: false,
  },
  FOOTBALL_GRID: {
    // chalk on the board
    shape: 'rounded-full border-2',
    done: 'border-chalk bg-[#1f2d26] text-chalk',
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

function Tile({ l, mode, current }: { l: Level; mode: GameMode; current: boolean }) {
  const label = `Fase ${l.level}, ${DIFFICULTY[l.difficultyTier] ?? ''}`;
  const h = HOUSE[mode];
  if (l.state === 'locked')
    return (
      <li
        className={`grid aspect-square place-items-center ${h.shape} border-dashed border-chalk-soft/40 text-chalk-soft`}
        aria-label={`${label}, trancada`}
      >
        <span className="font-condensed tabular text-xl font-black sm:text-2xl">{l.level}</span>
      </li>
    );
  const done = l.state === 'done';
  return (
    <li>
      <Link
        to={`${GAME_PATH[mode]}/${l.level}`}
        data-current={current || undefined}
        aria-label={
          done
            ? `${label}, ${l.stars} estrelas`
            : `${label}, ${l.state === 'in_progress' ? 'em andamento' : 'jogar'}`
        }
        className={`flex aspect-square flex-col items-center justify-center gap-1 transition-transform duration-200 ease-out-expo hover:-translate-y-0.5 ${h.shape} ${
          done
            ? `${h.done} shadow-[0_6px_14px_-6px_rgb(0_0_0/0.5)]`
            : 'house-pulse border-ink/60 bg-cover text-ink shadow-[0_10px_24px_-8px_rgb(0_0_0/0.6)]'
        }`}
      >
        <span className="font-condensed tabular text-2xl leading-none font-black sm:text-3xl">
          {l.level}
        </span>
        {done ? (
          <Stars n={l.stars} size="size-3 sm:size-3.5" onCover={!h.dark} />
        ) : (
          <span className="font-condensed text-[0.7rem] font-extrabold tracking-wide uppercase sm:text-xs">
            {l.state === 'in_progress' ? 'Continuar' : 'Jogar'}
          </span>
        )}
      </Link>
    </li>
  );
}

export function TrackPage({ mode }: { mode: GameMode }) {
  const { data, error } = useTrack(mode);
  const levels = data?.levels ?? [];
  const stars = levels.reduce((s, l) => s + l.stars, 0);
  const done = levels.filter((l) => l.state === 'done').length;
  const current = levels.find((l) => l.state === 'open' || l.state === 'in_progress');
  const pages = Array.from({ length: Math.ceil(levels.length / PAGE) }, (_, i) =>
    levels.slice(i * PAGE, i * PAGE + PAGE),
  );
  const currentPage = current ? Math.floor((current.level - 1) / PAGE) : pages.length - 1;

  return (
    <div className="flex flex-col gap-8">
      <GameHeader title={GAME_NAME[mode]} />
      {/* The mode's own object as the header; the h1 above carries the name for assistive tech. */}
      <div
        aria-hidden="true"
        className="flex flex-col overflow-hidden rounded-xl shadow-[0_14px_30px_-12px_rgb(0_0_0/0.6)]"
      >
        <ModeCover mode={mode} name={GAME_NAME[mode]} />
      </div>
      {error && <Notice title="Deu ruim na conexão">{(error as Error).message}</Notice>}
      {!data && !error && <Skeleton className="h-96" />}
      {data && levels.length === 0 && (
        <Notice title="Nenhuma fase ainda">As primeiras fases estão sendo preparadas.</Notice>
      )}

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

      <div className="flex flex-col gap-3">
        {pages.slice(0, currentPage + 3).map((page, i) => {
          const pageStars = page.reduce((s, l) => s + l.stars, 0);
          const pageDone = page.filter((l) => l.state === 'done').length;
          const locked = page.every((l) => l.state === 'locked');
          return (
            <details
              key={i}
              open={i === currentPage}
              className={`group rounded-xl border border-chalk/15 ${locked ? '' : 'bg-chalk/[0.05]'}`}
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 flex-col">
                  <span className="font-condensed text-xl font-extrabold uppercase">
                    Capítulo {i + 1}
                  </span>
                  <span className="text-sm text-chalk-soft">
                    fases {page[0]!.level}–{page.at(-1)!.level}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span
                    className="font-condensed tabular text-lg font-bold whitespace-nowrap text-chalk-soft"
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
                    className="text-chalk-soft transition-transform duration-150 ease-standard group-open:rotate-180"
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
              <ol
                className="grid grid-cols-5 gap-x-2 gap-y-4 px-4 pb-5 sm:gap-x-3 [&>li]:relative [&>li:not(:nth-child(5n))::after]:absolute [&>li:not(:nth-child(5n))::after]:top-1/2 [&>li:not(:nth-child(5n))::after]:left-full [&>li:not(:nth-child(5n))::after]:h-0 [&>li:not(:nth-child(5n))::after]:w-2 [&>li:not(:nth-child(5n))::after]:border-t-2 [&>li:not(:nth-child(5n))::after]:border-dashed [&>li:not(:nth-child(5n))::after]:border-chalk-soft/50 [&>li:not(:nth-child(5n))::after]:content-[''] sm:[&>li:not(:nth-child(5n))::after]:w-3"
                aria-label={`Fases ${page[0]!.level} a ${page.at(-1)!.level}`}
              >
                {page.map((l) => (
                  <Tile key={l.level} l={l} mode={mode} current={current?.level === l.level} />
                ))}
              </ol>
            </details>
          );
        })}
        {pages.length > currentPage + 3 && (
          <p className="px-4 text-sm text-chalk-soft">
            Mais {pages.length - currentPage - 3} capítulos trancados.
          </p>
        )}
      </div>
      <AdSlot slot={AD_SLOTS.track} />
    </div>
  );
}
