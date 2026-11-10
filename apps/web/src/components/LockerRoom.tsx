/**
 * The home as one scene, "Vestiário à noite": a locker room under one floodlight (by day, window
 * light), the Career Path passport lying open on the bench (inside cover: the name and the title
 * in its frame; visa page: the stamps), the player's stickers fanned out of it, the next-level
 * ticket clipped to it, and the closed modes as premiere posters taped to the wall.
 *
 * Entry (once per tab session): the light switches on, the cover swings open, stickers slide out,
 * the ticket lands, the last stamp thumps. Pointer (and device tilt where it needs no permission)
 * moves the scene a little. Reduced motion: the composed scene, still.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAlbum, useModeVotes, useStats, useTrack } from '../lib/game';
import { nextLevel } from '../lib/track';
import { titleFrame, titleTone, TITLE_LADDER } from '../lib/format';
import { RARITY_ORDER } from './rarity';
import { StampMark } from './CareerPathCard';
import { StarIcon } from './Stars';
import { StickerCard } from './StickerCard';
import { TitleBadge } from './TitleBadge';
import { SoonStamp } from '../pages/ComingSoonPage';
import { Skeleton } from './ui';
import { Moment } from './Moment';
import type { VotableMode } from '@decabeca/contracts';
import { leaderOf, ModeArt, ModeDialog, type Locker } from './ModeDialog';
import { motionReduced } from '../lib/settings';

// the system setting or Ajustes › Reduzir animações (JS-driven motion; CSS follows data-motion)
const reduced = motionReduced;

/**
 * Pointer (or a tilt that needs no permission) as --sx/--sy in −1…1, one write per frame onto the
 * elements that move (registered non-inherited in index.css: nothing else restyles).
 */
function useParallax(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let frame = 0;
    const set = (x: number, y: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const m of el.querySelectorAll<HTMLElement>('.scene-art, .scene-tilt, .ticket')) {
          m.style.setProperty('--sx', x.toFixed(3));
          m.style.setProperty('--sy', y.toFixed(3));
        }
      });
    };
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      set(clamp(e.gamma / 25), clamp((e.beta - 45) / 25));
    };
    addEventListener('pointermove', onPointer, { passive: true });
    // iOS asks for permission before it reports tilt; there we keep to the pointer.
    const D = globalThis.DeviceOrientationEvent as unknown as
      { requestPermission?: unknown } | undefined;
    const tilt = D && typeof D.requestPermission !== 'function';
    if (tilt) addEventListener('deviceorientation', onTilt, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('pointermove', onPointer);
      if (tilt) removeEventListener('deviceorientation', onTilt);
    };
  }, [ref]);
}

/** The dust in the light comes after the entry, and only for those who accept motion. */
function useDust() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (reduced()) return;
    const t = setTimeout(() => setOn(true), 2200);
    return () => clearTimeout(t);
  }, []);
  return on;
}

export type { Locker };

/** Each poster's own light: the hue its backdrop is printed in. */
const HUE: Record<VotableMode, number> = {
  FOOTBALL_GRID: 150,
  IMPOSTOR: 25,
  TIMELINE: 65,
  HIGHER_LOWER: 95,
  MISSING_XI: 255,
  MYSTERY_PLAYER: 50,
  CONNECTIONS: 200,
  DRAFT: 300,
  career: 15,
  copa: 85,
  oficina: 175,
};
/** Pasted by hand: no two posters hang quite straight. */
const TILT = [-1.4, 0.9, -0.5, 1.5, -1, 0.4];

const Chevron = ({ className = '', flip = false }: { className?: string; flip?: boolean }) => (
  <svg
    viewBox="0 0 12 12"
    aria-hidden="true"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={flip ? 'M8 2 4 6l4 4' : 'M4 2l4 4-4 4'} />
  </svg>
);

/**
 * The closed modes as premiere posters taped to the locker-room wall: the mode's art full-bleed
 * under its own light, the name in big condensed type, a one-line hook, the "Em breve" strip and
 * the votes. One row that scrolls sideways. A tap (or Enter) opens the mode: what it is, how it
 * plays and the vote for the next one. The open mode lives in the URL (?modo=), so the back button
 * closes it and a sign-in returns to it.
 */
function PosterWall({ lockers }: { lockers: Locker[] }) {
  const [params, setParams] = useSearchParams();
  const row = useRef<HTMLUListElement>(null);
  const votes = useModeVotes().data;
  if (!lockers.length) return null;
  const open = lockers.find((l) => l.key === params.get('modo')) ?? null;
  const leader = leaderOf(votes?.modes);
  const close = () =>
    setParams(
      (p) => {
        p.delete('modo');
        return p;
      },
      { replace: true },
    );
  const page = (dir: 1 | -1) => {
    const el = row.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const arrow =
    'grid size-11 place-items-center rounded-full border border-chalk-soft/40 bg-black/55 text-chalk transition-colors hover:bg-black/80 hover:text-cover';
  return (
    <section aria-labelledby="em-breve" className="posters relative mt-8 lg:mt-4">
      <div className="flex items-center gap-x-3">
        <h2 id="em-breve" className="shrink-0">
          <SoonStamp className="text-base sm:text-lg" />
        </h2>
        <p className="font-condensed text-sm leading-tight font-extrabold text-chalk uppercase [text-shadow:0_1px_3px_rgb(0_0_0/0.8)] sm:text-base">
          Toque para conhecer e votar
          <span className="max-sm:hidden"> no próximo modo</span>
        </p>
        <div className="ml-auto flex shrink-0 gap-2 max-lg:hidden">
          <button
            type="button"
            className={arrow}
            aria-label="Cartazes anteriores"
            onClick={() => page(-1)}
          >
            <Chevron flip className="size-3.5" />
          </button>
          <button
            type="button"
            className={arrow}
            aria-label="Próximos cartazes"
            onClick={() => page(1)}
          >
            <Chevron className="size-3.5" />
          </button>
        </div>
      </div>
      <ul ref={row} aria-label="Modos que chegam em breve" className="poster-row">
        {lockers.map((l, i) => {
          const n = votes?.modes.find((m) => m.mode === l.key)?.votes;
          const mine = votes?.mine === l.key;
          return (
            <li
              key={l.key}
              className="poster"
              style={
                {
                  '--h': HUE[l.key],
                  '--tilt': `${TILT[i % TILT.length]}deg`,
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                className="poster-sheet"
                aria-haspopup="dialog"
                onClick={() => setParams({ modo: l.key })}
              >
                <span aria-hidden="true" className="poster-art">
                  <ModeArt mode={l.key} />
                </span>
                <span className="poster-name font-condensed">{l.name}</span>
                <span className="poster-hook">{l.pitch}</span>
                <span aria-hidden="true" className="poster-strip font-condensed">
                  Em breve
                  <span className="inline-flex items-center gap-1">
                    Votar <Chevron className="size-[0.7em]" />
                  </span>
                </span>
                {n !== undefined && (
                  <span className={`poster-votes font-condensed ${mine ? 'is-mine' : ''}`}>
                    <span className="tabular block text-[2.1em] leading-[0.85]">{n}</span>
                    {n === 1 ? 'voto' : 'votos'}
                    {mine && <span className="block">Seu voto</span>}
                  </span>
                )}
                {leader === l.key && (
                  <span className="poster-ribbon font-condensed">Mais votado</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <ModeDialog locker={open} lockers={lockers} onClose={close} />
    </section>
  );
}

export function LockerRoom({ lockers }: { lockers: Locker[] }) {
  const scene = useRef<HTMLDivElement>(null);
  const track = useTrack('CAREER_PATH');
  const stats = useStats();
  const album = useAlbum();
  const dust = useDust();
  useParallax(scene);

  // The full entry plays once per tab; coming back from a level, the scene is simply there.
  // (A mark older than a moment means an earlier visit; React's dev double mount stays within it.)
  useLayoutEffect(() => {
    try {
      const at = Number(sessionStorage.getItem('scene-seen'));
      if (!at) sessionStorage.setItem('scene-seen', String(Date.now()));
      else if (Date.now() - at > 1500) scene.current?.setAttribute('data-still', '');
    } catch {
      /* no storage: play it every time */
    }
  }, []);

  const levels = track.data?.levels ?? [];
  const done = levels.filter((l) => l.state === 'done').length;
  const stars = levels.reduce((s, l) => s + l.stars, 0);
  const next = nextLevel(track.data);
  const title = stats.data?.title.name ?? 'Peneira';
  const upcoming = stats.data?.title.next;
  const reward = upcoming && TITLE_LADDER.find((t) => t.name === upcoming.name);
  const stickers = [...(album.data?.stickers ?? [])]
    .filter((s) => s.mode === 'CAREER_PATH')
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))
    .slice(0, 5);

  // Ten slots around the next level (five on a phone): two stamps back, the lit one, the rest ahead.
  const at = next ? levels.findIndex((l) => l.level === next.level) : levels.length - 1;
  const from = Math.max(0, Math.min(at - 2, levels.length - 10));
  const lastDone = levels.findLast((l) => l.state === 'done')?.level;

  const cta = next
    ? next.inProgress
      ? `Continuar a fase ${next.level}`
      : `Jogar fase ${next.level}`
    : levels.length > 0
      ? 'Rever as fases'
      : 'Jogar';

  return (
    <div ref={scene} className="scene relative">
      <div aria-hidden="true" className="scene-art">
        <div className="scene-cone" />
        {dust && <Moment className="scene-dust" src="/lottie/dust.json" loop />}
      </div>
      {/* the room before the light comes on, over everything for a moment */}
      <div aria-hidden="true" className="scene-dark" />

      <section
        aria-labelledby="cp-name"
        className="scene-stage relative flex flex-col items-center gap-5 lg:flex-row lg:items-end lg:justify-center lg:gap-0"
      >
        <div className="scene-tilt relative w-full max-w-xl lg:w-[min(62vw,58rem)] lg:max-w-none">
          {/* stickers fanned out from under the passport */}
          {stickers.length > 0 && (
            <ul aria-label="Suas figurinhas do Career Path" className="fan">
              {stickers.map((s, i) => (
                <li
                  key={s.playerId}
                  className="fan-card aspect-[3/4]"
                  style={{ '--i': i, '--n': stickers.length } as React.CSSProperties}
                >
                  <StickerCard sticker={s} size="sm" />
                </li>
              ))}
            </ul>
          )}

          <div className="book relative grid lg:grid-cols-2">
            {/* inside of the cover: the name, the rule and the title in its frame */}
            <div className="leaf relative flex flex-col gap-3 rounded-t-[14px] p-5 pb-5 text-[#e7c26a] sm:p-7 lg:rounded-l-[14px] lg:rounded-tr-none lg:p-9">
              <i aria-hidden="true" className="leaf-tool" />
              <div className="flex items-center justify-between gap-4">
                <h2
                  id="cp-name"
                  className="font-condensed text-[2.4rem] leading-[0.82] sm:text-[3.6rem] font-black uppercase [text-shadow:0_-1px_0_#0007,0_1px_0_#fff3] lg:text-[clamp(3rem,5.4vw,5rem)]"
                >
                  <Link
                    to="/career-path"
                    className="rounded-sm focus-visible:outline-[#e7c26a] hover:text-[#f6dc95]"
                  >
                    Career Path
                  </Link>
                </h2>
                {levels.length > 0 && (
                  <p
                    className="font-condensed tabular flex shrink-0 items-center gap-1.5 self-start text-2xl font-black"
                    aria-label={`${stars} estrelas`}
                  >
                    <StarIcon className="size-5" /> {stars}
                  </p>
                )}
              </div>
              <p className="-mt-1 max-w-[30ch] text-base leading-snug font-semibold text-[#f3e3b8] lg:text-lg">
                Adivinhe o jogador pelos clubes.
                <span className="max-sm:hidden"> Seis chances.</span>
              </p>
              <div
                className="mt-auto flex min-w-0 items-center gap-3 rounded-[12px] p-1.5 shadow-[0_6px_12px_-6px_rgb(0_0_0/0.5)]"
                style={{ background: titleFrame(title) }}
              >
                <div
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[8px] px-3 py-2 text-ink"
                  style={{ background: titleTone(title) }}
                >
                  <TitleBadge name={title} className="size-11 shrink-0 lg:size-14" />
                  <div className="min-w-0">
                    <p className="font-condensed truncate text-[1.9rem] leading-[0.85] font-black uppercase lg:text-[2.4rem]">
                      {title}
                    </p>
                    {upcoming && (
                      <p className="mt-1 text-sm leading-tight font-bold">
                        Faltam <span className="tabular">{upcoming.missing}</span>{' '}
                        <StarIcon className="inline size-[0.85em] align-[-0.08em]" />
                        <span className="sr-only">estrelas</span> para {upcoming.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* the visa page: stamps around the next level and the count */}
            <div className="page relative flex flex-col gap-3 rounded-b-[14px] p-4 text-[#1d2a4f] sm:p-7 lg:rounded-r-[14px] lg:rounded-bl-none lg:p-9">
              {!track.data && !track.error ? (
                <Skeleton className="h-36 w-full" />
              ) : track.error ? (
                <p className="font-semibold">Seu progresso não carregou. Confira a internet.</p>
              ) : levels.length === 0 ? (
                <p className="font-semibold">Fases a caminho.</p>
              ) : (
                <>
                  <ol
                    aria-hidden="true"
                    className="grid grid-cols-5 gap-2 sm:gap-3 max-lg:[&>li:nth-child(n+6)]:hidden"
                  >
                    {levels.slice(from, from + 10).map((l) => (
                      <li
                        key={l.level}
                        className={`aspect-square ${l.level === lastDone ? 'stamp-hit' : ''}`}
                      >
                        <StampMark l={l} next={l.level === next?.level} small />
                      </li>
                    ))}
                  </ol>
                  <div className="mt-auto flex flex-col gap-1.5">
                    <p className="text-sm font-bold">
                      <span className="tabular">{done}</span> de{' '}
                      <span className="tabular">{levels.length}</span> fases carimbadas
                    </p>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-[#1d2a4f]/15"
                      role="progressbar"
                      aria-label="Fases concluídas"
                      aria-valuemin={0}
                      aria-valuemax={levels.length}
                      aria-valuenow={done}
                    >
                      <div
                        className="h-full rounded-full bg-[#1d2a4f]"
                        style={{
                          width: `${Math.max(done ? 2 : 0, (done / levels.length) * 100)}%`,
                        }}
                      />
                    </div>
                    <Link
                      to="/career-path"
                      className="font-condensed mt-1 inline-flex min-h-11 items-center self-start max-lg:hidden text-base font-extrabold uppercase underline decoration-2 underline-offset-4 hover:decoration-[#7a2633]"
                    >
                      Ver a trilha de carimbos
                    </Link>
                  </div>
                </>
              )}
              {/* the closed cover, swinging open on the way in */}
              <div aria-hidden="true" className="cover-front">
                <div className="cover-face">
                  <span className="font-condensed text-[clamp(2.4rem,10vw,4.5rem)] leading-[0.82] font-black uppercase">
                    Career Path
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* the ticket for the next level, clipped to the passport */}
        {!(track.error && !levels.length) && (
          <div className="ticket relative z-10 w-full max-w-sm lg:-ml-16 lg:mb-[-1.5rem] lg:w-[19rem]">
            <svg
              viewBox="0 0 24 60"
              aria-hidden="true"
              className="absolute -top-7 left-8 h-14 w-6 text-[#b9c0c4] drop-shadow-[1px_2px_1px_rgb(0_0_0/0.4)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M8 40V9a4 4 0 0 1 8 0v38a6 6 0 0 1-12 0V14" />
            </svg>
            <div className="overflow-hidden rounded-[14px] bg-paper text-ink shadow-[0_24px_40px_-16px_rgb(0_0_0/0.75)]">
              <div className="flex items-end justify-between gap-3 bg-cover px-5 pt-3 pb-2 sm:pt-4 sm:pb-3">
                <p className="font-condensed leading-none font-black uppercase">
                  <span className="block text-lg">
                    {next?.inProgress ? 'Em jogo' : next || !track.data ? 'A próxima' : 'Completo'}
                  </span>
                  <span className="tabular block text-[3rem] leading-[0.8] sm:text-[4.5rem]">
                    {next?.level ?? (levels.length || '\u00a0')}
                  </span>
                </p>
                <ul className="flex flex-col items-end gap-1 pb-1 text-right text-sm leading-tight font-bold">
                  <li className="flex items-center gap-1">
                    Até 3 <StarIcon className="size-4" />
                    <span className="sr-only">estrelas</span>
                  </li>
                  <li>A figurinha do jogador</li>
                  {upcoming && reward && (
                    <li>
                      Rumo a {reward.name} (<span className="tabular">{upcoming.missing}</span>
                      <StarIcon className="inline size-[0.85em] align-[-0.08em]" />
                      <span className="sr-only">estrelas</span>)
                    </li>
                  )}
                </ul>
              </div>
              <div aria-hidden="true" className="mx-3 border-t-[3px] border-dashed border-ink/25" />
              <div className="p-2.5 sm:p-3">
                {!track.data && !track.error ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <Link
                    to={next ? `/career-path/${next.level}` : '/career-path'}
                    className="cta font-condensed flex min-h-16 w-full items-center justify-center rounded-[10px] bg-ink px-5 text-center text-[1.9rem] leading-none font-black text-cover uppercase shadow-[0_10px_18px_-10px_rgb(0_0_0/0.8)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {cta}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <PosterWall lockers={lockers} />
    </div>
  );
}
