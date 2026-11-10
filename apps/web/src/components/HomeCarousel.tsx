import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { GameMode, GamesResponse } from '@decabeca/contracts';
import { cardTransform } from '../lib/carousel';
import { buzz } from '../lib/haptics';
import { play } from '../lib/sound';
import { ModeCover } from './ModeCover';
import { StarIcon } from './Stars';
import { Skeleton } from './ui';

type Track = GamesResponse['games'][number];
export type CarouselGame = {
  mode: GameMode;
  name: string;
  path: string;
  rule: string;
};

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

const desktop = () => window.matchMedia('(min-width: 1024px)').matches;
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const chevron = (d: string) => (
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
    <path d={d} />
  </svg>
);

/**
 * The home stage: one game cover at a time on phones, two on desktop. Native scroll-snap does the
 * paging; a rAF pass turns/shrinks the neighbours (transform and opacity only) and slides the art.
 */
export function HomeCarousel({
  catalog,
  games,
}: {
  catalog: readonly CarouselGame[];
  games?: GamesResponse | undefined;
}) {
  const row = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const settled = useRef(0);

  const items = () => Array.from(row.current?.children ?? []) as HTMLElement[];
  // Scroll position at which card `i` rests: centred on phones, left edge on desktop (two cards).
  const rest = useCallback((li: HTMLElement) => {
    const el = row.current!;
    return desktop()
      ? li.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft)
      : li.offsetLeft - (el.clientWidth - li.offsetWidth) / 2;
  }, []);

  const update = useCallback(() => {
    const el = row.current;
    if (!el) return;
    const cards = items();
    const first = cards[0];
    if (!first) return;
    const pitch = (cards[1]?.offsetLeft ?? first.offsetLeft + first.offsetWidth) - first.offsetLeft;
    const flat = calm();
    let best = 0;
    cards.forEach((li, i) => {
      const off = rest(li) - el.scrollLeft;
      if (Math.abs(off) < Math.abs(rest(cards[best]!) - el.scrollLeft)) best = i;
      // On desktop the resting pair sits at +-0.5 from the stage centre.
      const mid = desktop() ? off / pitch - 0.5 : off / pitch;
      const t = flat ? { rotateY: 0, scale: 1, opacity: 1 } : cardTransform(mid);
      li.style.transform = `rotateY(${t.rotateY}deg) scale(${t.scale})`;
      li.style.opacity = String(t.opacity);
      const art = li.querySelector<HTMLElement>('[data-art]');
      if (art)
        art.style.transform = flat ? '' : `translateX(${-Math.max(-1, Math.min(1, mid)) * 16}px)`;
    });
    setActive((a) => (a === best ? a : best));
  }, [rest]);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Landed on a new card: a short tap and buzz.
        const cards = items();
        const here = cards.reduce(
          (b, li, i) =>
            Math.abs(rest(li) - el.scrollLeft) < Math.abs(rest(cards[b]!) - el.scrollLeft) ? i : b,
          0,
        );
        if (here !== settled.current) {
          settled.current = here;
          play('tap');
          buzz(8);
        }
      }, 140);
    };
    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [update, rest]);

  const go = (i: number) => {
    const li = items()[Math.max(0, Math.min(catalog.length - 1, i))];
    if (li) row.current?.scrollTo({ left: rest(li), behavior: calm() ? 'auto' : 'smooth' });
  };

  const arrow =
    'absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-ink/70 text-chalk backdrop-blur-sm hover:bg-ink disabled:opacity-0 lg:grid';

  return (
    <section aria-labelledby="jogos" aria-roledescription="carrossel" className="mt-12 sm:mt-16">
      <h2 id="jogos" className="font-condensed text-2xl font-extrabold uppercase">
        Jogos
      </h2>
      <div className="relative -mx-4 mt-5 sm:mx-0">
        <button
          type="button"
          className={`${arrow} left-2`}
          onClick={() => go(active - 1)}
          disabled={active === 0}
          aria-label="Jogo anterior"
        >
          {chevron('M15 6l-6 6 6 6')}
        </button>
        <button
          type="button"
          className={`${arrow} right-2`}
          onClick={() => go(active + 1)}
          disabled={active >= catalog.length - 1}
          aria-label="Próximo jogo"
        >
          {chevron('M9 6l6 6-6 6')}
        </button>
        <ul
          ref={row}
          tabIndex={0}
          aria-label="Jogos"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(active + 1);
            else if (e.key === 'ArrowLeft') go(active - 1);
            else return;
            e.preventDefault();
          }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[6%] py-4 [perspective:1100px] [scrollbar-width:none] focus-visible:outline-offset-[-4px] lg:px-0"
        >
          {catalog.map((g, i) => {
            const track = games?.games.find((x) => x.mode === g.mode);
            return (
              <li
                key={g.mode}
                aria-roledescription="slide"
                aria-label={`${i + 1} de ${catalog.length}: ${g.name}`}
                className="flex h-[max(26rem,calc(100svh-15rem))] max-h-[44rem] w-[88%] shrink-0 snap-center flex-col overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_18px_36px_-14px_rgb(0_0_0/0.6)] will-change-transform lg:w-[calc(50%-0.5rem)] lg:snap-start"
              >
                <ModeCover
                  mode={g.mode}
                  name={
                    <Link
                      to={g.path}
                      className="hover:underline hover:underline-offset-4 focus-visible:underline"
                    >
                      {g.name}
                    </Link>
                  }
                />
                <div className="flex flex-col gap-3 p-5">
                  <p className="font-medium">{g.rule}</p>
                  <TrackState track={track} />
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to={track?.nextLevel ? `${g.path}/${track.nextLevel}` : g.path}
                      className="font-condensed inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-ink px-5 text-xl font-extrabold text-paper uppercase"
                    >
                      {track?.nextLevel
                        ? track.completed
                          ? `Jogar fase ${track.nextLevel}`
                          : 'Começar'
                        : 'Ver fases'}
                    </Link>
                    <Link
                      to={`/como-jogar#${g.mode.toLowerCase()}`}
                      className="inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4"
                    >
                      Como jogar
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-3 flex justify-center">
        {catalog.map((g, i) => (
          <button
            key={g.mode}
            type="button"
            onClick={() => go(i)}
            aria-label={`Ir para ${g.name}`}
            aria-current={i === active}
            className="grid h-11 w-8 place-items-center"
          >
            <span
              className={`block h-2.5 rounded-full transition-[width,opacity] ${i === active ? 'w-6 bg-cover' : 'w-2.5 bg-chalk/40'}`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
