/**
 * A game's track as album pages of 10 levels (ADR-007): done levels are pasted stickers with
 * their stars, the next level is the open slot, the rest are locked slots. Scrolls to the current level.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { GameMode, TrackResponse } from '@decabeca/contracts';
import { GAME_NAME, GAME_PATH, useTrack } from '../lib/game';
import { Stars } from '../components/Stars';
import { GameHeader, Notice, Skeleton } from '../components/ui';

type Level = TrackResponse['levels'][number];
const DIFFICULTY = { 1: 'fácil', 2: 'média', 3: 'difícil' } as Record<number, string>;
const PAGE = 10;

function Tile({ l, mode, current }: { l: Level; mode: GameMode; current: boolean }) {
  const label = `Fase ${l.level}, ${DIFFICULTY[l.difficultyTier] ?? ''}`;
  if (l.state === 'locked')
    return (
      <li
        className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-chalk-soft/25 text-chalk-soft/40"
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
  const scrolled = useRef(false);

  useEffect(() => {
    if (scrolled.current || !current || current.level <= PAGE) return;
    scrolled.current = true;
    document.querySelector('[data-current]')?.scrollIntoView({ block: 'center' });
  }, [current]);

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
              fases concluídas · ★ {stars} de {levels.length * 3} estrelas
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

      <div className="grid gap-8 xl:grid-cols-2">
        {pages.map((page, i) => {
          const pageStars = page.reduce((s, l) => s + l.stars, 0);
          return (
            <section key={i} aria-labelledby={`page-${i}`} className="flex flex-col gap-3">
              <header className="flex items-baseline justify-between gap-3 border-b border-chalk/15 pb-2">
                <h2 id={`page-${i}`} className="font-condensed text-xl font-extrabold uppercase">
                  Página {i + 1}{' '}
                  <span className="text-chalk-soft">
                    · fases {page[0]!.level}–{page.at(-1)!.level}
                  </span>
                </h2>
                <span
                  className="font-condensed tabular text-lg font-bold text-chalk-soft"
                  aria-label={`${pageStars} de ${page.length * 3} estrelas nesta página`}
                >
                  ★ {pageStars}/{page.length * 3}
                </span>
              </header>
              <ol
                className="grid grid-cols-5 gap-2 sm:gap-3"
                aria-label={`Fases ${page[0]!.level} a ${page.at(-1)!.level}`}
              >
                {page.map((l) => (
                  <Tile key={l.level} l={l} mode={mode} current={current?.level === l.level} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
