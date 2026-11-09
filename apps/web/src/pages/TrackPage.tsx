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
import { GameHeader, Notice, Skeleton } from '../components/ui';
import { StarIcon } from '../components/Stars';

type Level = TrackResponse['levels'][number];
const DIFFICULTY = { 1: 'fácil', 2: 'média', 3: 'difícil' } as Record<number, string>;
const PAGE = 10;

function Tile({ l, mode, current }: { l: Level; mode: GameMode; current: boolean }) {
  const label = `Fase ${l.level}, ${DIFFICULTY[l.difficultyTier] ?? ''}`;
  if (l.state === 'locked')
    return (
      <li
        className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-chalk-soft/35 text-chalk-soft/75"
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
        className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg transition-transform duration-200 ease-out-expo hover:-translate-y-0.5 ${
          done
            ? 'bg-paper text-ink shadow-[0_6px_14px_-6px_rgb(0_0_0/0.5)]'
            : 'bg-cover text-ink shadow-[0_0_0_4px_rgb(255_255_255/0.12),0_10px_24px_-8px_rgb(0_0_0/0.6)] motion-safe:animate-[paste_420ms_var(--ease-out-expo)]'
        }`}
      >
        <span className="font-condensed tabular text-2xl leading-none font-black sm:text-3xl">
          {l.level}
        </span>
        {done ? (
          <Stars n={l.stars} size="size-3 sm:size-3.5" />
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
                className="grid grid-cols-5 gap-2 px-4 pb-4 sm:gap-3"
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
