/**
 * Sticker album as a Panini book. Shut, the cover (title, count, the best stickers); open, the
 * inside cover (count, finishes, index) and one printed page per position group, 12 numbered
 * slots each. From `lg` two facing pages sized to the viewport, on phones one page. A page turns
 * on its spine (CSS 3D, driven by one progress value `--turn` so a drag and a click share the same
 * turn): click/arrows, the page corner, the group tabs, or a drag/swipe. Reduced motion: a
 * crossfade. A sticker opens in focus (StickerDetail).
 */
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AlbumResponse, Sticker } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { play } from '../lib/sound';
import { GameHeader, Notice, Skeleton, btnPrimary } from '../components/ui';
import { GoalLoop } from '../components/Moment';
import { RARITY_ORDER, RARITY_STYLE } from '../components/rarity';
import { POSITION, StickerCard } from '../components/StickerCard';
import { StickerDetail } from '../components/StickerDetail';
import { useTrack } from '../lib/game';
import { nextLevel } from '../lib/track';
import { useFinish } from '../lib/cosmetics';
import { motionReduced } from '../lib/settings';

const GROUPS = [
  { key: 'GK', label: 'Goleiros' },
  { key: 'DF', label: 'Defensores' },
  { key: 'MF', label: 'Meio-campistas' },
  { key: 'FW', label: 'Atacantes' },
  { key: null, label: 'Outros' },
] as const;
const PER_PAGE = 12;
const TURN_MS = 720;
// what reads --turn/--lift (besides the book, which slides as the cover opens)
const TURNING = '.album-leaf, .album-shade, .album-gloss, .album-cast';

export type AlbumLeaf = {
  key: keyof typeof POSITION | null;
  label: string;
  /** printed page number (the inside cover is unnumbered) */
  n: number;
  list: Sticker[];
  /** number of the first slot */
  first: number;
};
type Side = 'blank' | 'cover' | 'inside' | 'end' | AlbumLeaf;

/** One page per 12 slots of a group, at least two empty slots left; slot numbers run on. */
export function albumPages(stickers: Sticker[]): AlbumLeaf[] {
  const pages: AlbumLeaf[] = [];
  let first = 1;
  for (const { key, label } of GROUPS) {
    const list = stickers.filter((s) => s.positionGroup === key);
    if (!list.length && key === null) continue;
    const count = Math.max(1, Math.ceil((list.length + 2) / PER_PAGE));
    for (let i = 0; i < count; i++) {
      pages.push({
        key,
        label,
        n: pages.length + 1,
        list: list.slice(i * PER_PAGE, (i + 1) * PER_PAGE),
        first,
      });
      first += PER_PAGE;
    }
  }
  return pages;
}

/**
 * The book's sides in reading order. `at` (the position kept in state) indexes the phone order
 * [cover, inside, page 1, …]; wide screens prepend a blank (the left of the shut book) and pad to
 * an even count, so spread `v` shows sides 2v and 2v+1.
 */
export const albumSides = (pages: AlbumLeaf[], wide: boolean): Side[] => {
  const base: Side[] = ['cover', 'inside', ...pages];
  if (!wide) return base;
  return ['blank', ...base, ...(base.length % 2 ? [] : ['end' as const])];
};
export const spreadOf = (at: number) => Math.floor((at + 1) / 2);
export const atOfSpread = (v: number) => Math.max(0, 2 * v - 1);

const WIDE = '(min-width: 1024px)';
const subscribe = (cb: () => void) => {
  if (typeof matchMedia !== 'function') return () => {};
  const m = matchMedia(WIDE);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const isWide = () => typeof matchMedia === 'function' && matchMedia(WIDE).matches;
// the system setting or Ajustes › Reduzir animações (JS-driven motion; CSS follows data-motion)
const reduced = motionReduced;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const out = (t: number) => 1 - (1 - t) ** 3;

function Silhouette() {
  return (
    <svg viewBox="0 0 60 70" aria-hidden="true" className="w-1/2 opacity-60">
      <circle cx="30" cy="22" r="12" fill="currentColor" />
      <path d="M6 70c0-15 10-26 24-26s24 11 24 26z" fill="currentColor" />
    </svg>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

/** A page turning: spread (or phone side) `a` to `b`; `--turn` 0 shows a, 1 shows b. */
type Flip = { a: number; b: number };

export function AlbumPage() {
  const finishOf = useFinish();
  const qc = useQueryClient();
  const q = useQuery<AlbumResponse, ApiError>({
    queryKey: ['album'],
    queryFn: () => api('/v1/me/album'),
  });
  const [open, setOpen] = useState<Sticker | null>(null);
  const [at, setAt] = useState(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const [fade, setFade] = useState(0);
  const wide = useSyncExternalStore(subscribe, isWide, () => false);
  const next = nextLevel(useTrack('CAREER_PATH').data);
  const promote = useMutation<AlbumResponse, ApiError, string>({
    mutationFn: (playerId) => api('/v1/me/album/promote', { method: 'POST', json: { playerId } }),
    onSuccess: (data) => {
      qc.setQueryData(['album'], data);
      setOpen(null);
    },
  });

  const book = useRef<HTMLDivElement>(null);
  const p = useRef(0);
  const raf = useRef(0);
  const drag = useRef<{
    x: number;
    y: number;
    id: number;
    span: number;
    from: number;
    on: boolean;
  } | null>(null);
  const dragged = useRef(false);

  const pages = q.data ? albumPages(q.data.stickers) : [];
  const sides = albumSides(pages, wide);
  const views = wide ? sides.length / 2 : sides.length;
  const view = Math.min(wide ? spreadOf(at) : at, views - 1);
  const toAt = useCallback((v: number) => (wide ? atOfSpread(v) : v), [wide]);

  const setP = (v: number) => {
    p.current = v;
    const b = book.current;
    if (!b) return;
    const turn = v.toFixed(4);
    const lift = Math.sin(v * Math.PI).toFixed(4);
    for (const el of [b, ...b.querySelectorAll<HTMLElement>(TURNING)]) {
      el.style.setProperty('--turn', turn);
      el.style.setProperty('--lift', lift);
    }
  };
  // the leaf mounts with the flip; give it the current progress before it paints
  useLayoutEffect(() => {
    if (flip) setP(p.current);
  }, [flip]);
  const anims = useRef<Animation[]>([]);
  const stop = () => {
    cancelAnimationFrame(raf.current);
    for (const a of anims.current) a.cancel();
    anims.current = [];
  };
  useEffect(() => stop, []);

  // A turn the hand lets go of plays as Web Animations of transform and opacity, sampled from the
  // same curve the drag follows: the compositor runs them, so no frame waits on the main thread.
  const run = (f: Flip, to: 0 | 1, ease: (t: number) => number) => {
    stop();
    const from = p.current;
    const ms = Math.max(160, TURN_MS * Math.abs(to - from));
    // the leaf mounts with this render; start once it is in the page
    raf.current = requestAnimationFrame(() => {
      const b = book.current;
      if (!b) return;
      const ps = Array.from({ length: 25 }, (_, i) => from + (to - from) * ease(i / 24));
      const play = (sel: string, frame: (p: number, lift: number) => Keyframe) => {
        for (const el of sel ? b.querySelectorAll<HTMLElement>(sel) : [b])
          anims.current.push(
            el.animate(
              ps.map((v) => frame(v, Math.sin(v * Math.PI))),
              { duration: ms, fill: 'forwards' },
            ),
          );
      };
      play('.album-leaf', (v) => ({ transform: `rotateY(${v * -180}deg)` }));
      play('.album-face-front .album-shade', (v) => ({ opacity: Math.min(1, v * 2) }));
      play('.album-face-back .album-shade', (v) => ({ opacity: Math.min(1, (1 - v) * 2) }));
      play('.album-gloss', (_, lift) => ({ opacity: lift }));
      play('.album-gloss', (v) => ({ backgroundPosition: `${100 - v * 100}% 0` }));
      play('.album-cast', (_, lift) => ({ opacity: lift * 0.9 }));
      if (b.hasAttribute('data-opening')) play('', (v) => ({ translate: `${(v - 1) * 25}% 0` }));
      void anims.current[0]?.finished.then(
        () => {
          setP(to);
          stop();
          setAt(toAt(to ? f.b : f.a));
          setFlip(null);
        },
        () => {},
      );
    });
  };

  const go = (to: number) => {
    if (flip || to < 0 || to >= views || to === view) return;
    play('tap');
    if (reduced()) {
      setAt(toAt(to));
      setFade((n) => n + 1);
      return;
    }
    const f = to > view ? { a: view, b: to } : { a: to, b: view };
    p.current = to > view ? 0 : 1;
    setFlip(f);
    run(f, to > view ? 1 : 0, inOut);
  };

  // arrow keys turn the page while no dialog is up
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || document.querySelector('dialog[open]')) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight') goRef.current(viewRef.current + 1);
      else if (e.key === 'ArrowLeft') goRef.current(viewRef.current - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const viewRef = useRef(view);
  viewRef.current = view;

  // drag / swipe: a horizontal drag lifts the page and follows the finger; release past a third
  // of the way finishes the turn, short of it the page falls back
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flip || e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      span: wide ? r.width * 0.6 : r.width * 0.8,
      from: 0,
      on: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.on) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(e.clientY - d.y)) return;
      if (dx < 0 ? view >= views - 1 : view <= 0) {
        drag.current = null;
        return;
      }
      d.on = true;
      dragged.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (reduced()) return;
      d.from = dx < 0 ? 0 : 1;
      p.current = d.from;
      setFlip(dx < 0 ? { a: view, b: view + 1 } : { a: view - 1, b: view });
    }
    if (!reduced()) setP(Math.min(1, Math.max(0, d.from - dx / d.span)));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.on) return;
    // the click that may follow this release is swallowed, and only that one
    setTimeout(() => (dragged.current = false));
    if (reduced()) {
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 60) go(view + (dx < 0 ? 1 : -1));
      return;
    }
    const f = flip ?? (d.from ? { a: view - 1, b: view } : { a: view, b: view + 1 });
    const done = d.from ? p.current < 0.67 : p.current > 0.33;
    const to = (done ? 1 - d.from : d.from) as 0 | 1;
    if (done) play('tap');
    run(f, to, out);
  };

  if (q.isPending) return <Skeleton className="h-96" />;
  if (!q.data)
    return (
      <>
        <GameHeader title="Meu álbum" />
        <div className="mt-6">
          <Notice
            art={<GoalLoop />}
            title="O álbum não abriu"
            action={
              <button type="button" className={btnPrimary} onClick={() => void q.refetch()}>
                Tentar de novo
              </button>
            }
          >
            Pode ser a conexão. Confira a internet e tente de novo.
          </Notice>
        </div>
      </>
    );
  const a = q.data;
  const promo = a.promotions[0];
  /** phone-order index of the first page of each group, for the tabs and the index */
  const groupAt = GROUPS.flatMap(({ key, label }) => {
    const i = pages.findIndex((pg) => pg.key === key);
    if (i < 0) return [];
    const list = pages.filter((pg) => pg.key === key).flatMap((pg) => pg.list);
    return [{ key, label, at: i + 2, n: pages[i]!.n, count: list.length }];
  });
  const goAt = (i: number) => go(wide ? spreadOf(i) : i);

  const sideAt = (i: number) => sides[i] ?? 'blank';
  const turnBtn =
    'font-condensed inline-flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-chalk-soft/50 px-3 text-lg font-extrabold uppercase hover:border-chalk disabled:opacity-30';

  const rarities = (
    <ul className="flex flex-wrap gap-1.5" aria-label="Figurinhas por raridade">
      {RARITY_ORDER.filter((r) => a.byRarity[r]).map((r) => (
        <li
          key={r}
          className="flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-paper sm:text-sm"
        >
          <span
            aria-hidden="true"
            className={`size-3 rounded-full bg-[var(--rc)] ${RARITY_STYLE[r].className.split(' ')[0]}`}
          />
          {RARITY_STYLE[r].label} · <span className="tabular">{a.byRarity[r]}</span>
        </li>
      ))}
    </ul>
  );

  /** One side of a leaf. `live` sides take focus and clicks; faces of a turning leaf don't. */
  const renderSide = (side: Side, pos: 'left' | 'right' | 'single', live: boolean) => {
    if (side === 'blank') return null;
    const cls = `album-side album-side-${pos}`;
    if (side === 'cover')
      return (
        <section aria-label="Capa do álbum" className={`${cls} album-cover`}>
          <div className="relative z-10 flex flex-col gap-1">
            <p className="font-condensed text-base font-extrabold tracking-[0.2em] uppercase lg:text-lg">
              De Cabeça F.C.
            </p>
            <h2 className="font-condensed text-[clamp(3.5rem,16cqw,7rem)] leading-[0.82] font-black uppercase">
              Álbum
              <br />
              de figurinhas
            </h2>
          </div>
          <div aria-hidden="true" className="album-cover-fan">
            {a.stickers.slice(0, 3).map((s, i) => (
              <div key={s.playerId} style={{ '--i': i - 1 } as React.CSSProperties}>
                <StickerCard sticker={s} size="sm" finish={finishOf(s.playerId)} />
              </div>
            ))}
          </div>
          <div className="relative z-10 mt-auto flex flex-col gap-3">
            <p className="font-condensed tabular text-6xl leading-none font-black">
              {a.owned} <span className="text-3xl">de {a.total}</span>
            </p>
            {rarities}
            {live && (
              <button
                type="button"
                onClick={() => go(1)}
                className="font-condensed mt-1 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-lg bg-ink px-6 text-xl font-extrabold text-cover uppercase hover:bg-ink/90"
              >
                Abrir o álbum
                <Chevron d="M9 6l6 6-6 6" />
              </button>
            )}
          </div>
        </section>
      );
    if (side === 'end')
      return (
        <div aria-hidden="true" className={`${cls} album-paper`}>
          <p className="font-condensed m-auto text-center text-xl font-extrabold text-[#1d2a4f]/40 uppercase">
            Continua na próxima fase
          </p>
        </div>
      );
    if (side === 'inside')
      return (
        <section aria-labelledby="album-inside" className={`${cls} album-paper gap-5`}>
          <header className="album-head">
            <h2
              id="album-inside"
              className="font-condensed text-3xl leading-none font-black uppercase lg:text-4xl"
            >
              Sua coleção
            </h2>
          </header>
          <div className="flex flex-col gap-3">
            <p className="font-condensed tabular text-6xl leading-none font-black">
              {a.owned} <span className="text-3xl">de {a.total}</span>
            </p>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-[#1d2a4f]/15"
              role="progressbar"
              aria-label="Figurinhas coladas"
              aria-valuemin={0}
              aria-valuemax={a.total}
              aria-valuenow={a.owned}
            >
              <div
                className="h-full rounded-full bg-[#1d2a4f]"
                style={{ width: `${a.total ? (a.owned / a.total) * 100 : 0}%` }}
              />
            </div>
            {rarities}
          </div>
          <nav aria-label="Índice do álbum" className="flex flex-col">
            <h3 className="font-condensed mb-1 text-lg font-extrabold uppercase">Índice</h3>
            <ol className="flex flex-col">
              {groupAt.map((g) => (
                <li key={g.label}>
                  <button
                    type="button"
                    tabIndex={live ? 0 : -1}
                    onClick={() => goAt(g.at)}
                    className="album-index-row"
                  >
                    <span className="font-condensed text-xl font-extrabold uppercase">
                      {g.label}
                    </span>
                    <span aria-hidden="true" className="album-leader" />
                    <span className="tabular text-sm font-semibold">
                      {g.count} {g.count === 1 ? 'colada' : 'coladas'} · pág. {g.n}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <p className="mt-auto max-w-[52ch] text-sm leading-snug">
            <strong>Nota De Cabeça</strong>: de 50 a 99, feita só com dados reais (fama, jogos e
            gols na carreira, seleção, Copas ganhas e passagem por clube grande).
          </p>
        </section>
      );
    const pg = side;
    return (
      <section aria-label={`${pg.label}, página ${pg.n}`} className={`${cls} album-paper`}>
        <header className="album-head">
          <h2 className="font-condensed text-3xl leading-none font-black uppercase lg:text-4xl">
            {pg.label}
          </h2>
          <p className="font-condensed tabular text-base font-extrabold uppercase lg:text-lg">
            {pg.key && <span className="album-pos">{POSITION[pg.key]}</span>}
            {pg.list.length} {pg.list.length === 1 ? 'colada' : 'coladas'}
          </p>
        </header>
        <ul className="album-grid">
          {Array.from({ length: PER_PAGE }, (_, i) => {
            const s = pg.list[i];
            const num = pg.first + i;
            return (
              <li key={num} className="album-cell">
                {s ? (
                  <button
                    type="button"
                    tabIndex={live ? 0 : -1}
                    aria-label={`${s.name}, ${RARITY_STYLE[s.rarity].label}. Ver figurinha`}
                    onClick={() => startTransition(() => setOpen(s))}
                    className="album-stuck"
                  >
                    <StickerCard sticker={s} size="sm" finish={finishOf(s.playerId)} />
                  </button>
                ) : (
                  <div aria-hidden="true" className="album-slot">
                    <span className="font-condensed tabular absolute top-1.5 left-2 text-lg leading-none font-black">
                      {num}
                    </span>
                    <Silhouette />
                    {pg.key && (
                      <span className="font-condensed absolute bottom-1.5 text-xs font-extrabold tracking-wider">
                        {POSITION[pg.key]}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p aria-hidden="true" className="album-folio font-condensed tabular">
          {pg.n}
        </p>
      </section>
    );
  };

  // what lies on the table: at rest the current view; turning, the pages under the leaf
  const half = (i: number, pos: 'left' | 'right', live: boolean, cast: boolean) => (
    <div
      key={`${pos}-${fade}`}
      className={`album-half album-half-${pos} ${live && fade ? 'album-fade' : ''}`}
    >
      {renderSide(sideAt(i), pos, live)}
      {cast && <div aria-hidden="true" className={`album-cast album-cast-${pos}`} />}
    </div>
  );
  const corner = (dir: 1 | -1) => (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onClick={() => go(view + dir)}
      className={`album-corner ${dir > 0 ? 'album-corner-next' : 'album-corner-prev'}`}
    />
  );
  const label =
    view === 0
      ? 'Capa'
      : (wide ? [sideAt(2 * view), sideAt(2 * view + 1)] : [sideAt(view)])
          .map((s) =>
            s === 'inside'
              ? 'Sua coleção'
              : typeof s === 'object'
                ? `Pág. ${s.n} · ${s.label}`
                : null,
          )
          .filter(Boolean)
          .join('  ·  ');
  const tabOn = (g: (typeof groupAt)[number]) =>
    (wide ? [2 * view, 2 * view + 1] : [view]).some((i) => {
      const s = sideAt(i);
      return typeof s === 'object' && s.key === g.key;
    });

  let stage;
  if (wide) {
    const f = flip;
    stage = f ? (
      <>
        {half(2 * f.a, 'left', false, true)}
        {half(2 * f.b + 1, 'right', false, true)}
        <div className="album-leaf album-leaf-wide" aria-hidden="true">
          <div className="album-face album-face-front">
            {renderSide(sideAt(2 * f.a + 1), 'right', false)}
            <div className="album-gloss" />
            <div className="album-shade" />
          </div>
          <div className="album-face album-face-back">
            {renderSide(sideAt(2 * f.b), 'left', false)}
            <div className="album-gloss" />
            <div className="album-shade" />
          </div>
        </div>
      </>
    ) : (
      <>
        {half(2 * view, 'left', true, false)}
        {half(2 * view + 1, 'right', true, false)}
        {view > 0 && corner(-1)}
        {view < views - 1 && corner(1)}
      </>
    );
  } else {
    const f = flip;
    stage = f ? (
      <>
        {half(f.b, 'right', false, true)}
        <div className="album-leaf album-leaf-single" aria-hidden="true">
          <div className="album-face album-face-front">
            {renderSide(sideAt(f.a), 'single', false)}
            <div className="album-gloss" />
            <div className="album-shade" />
          </div>
          <div className="album-face album-face-back">
            <div className="album-side album-side-left album-paper" />
            <div className="album-shade" />
          </div>
        </div>
      </>
    ) : (
      <>
        <div key={fade} className={`album-half album-half-single ${fade ? 'album-fade' : ''}`}>
          {renderSide(sideAt(view), 'single', true)}
        </div>
        {view < views - 1 && corner(1)}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div aria-hidden="true" className="scene-art room-dim" />
      <GameHeader title="Meu álbum" />

      {a.owned === 0 && (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <GoalLoop className="h-24 w-32 shrink-0" />
          <p className="max-w-[44ch] text-lg leading-snug font-semibold sm:mr-auto">
            Álbum vazio por enquanto. Acerte uma fase do Career Path e a figurinha do jogador vem
            colada aqui.
          </p>
          <Link
            to={next ? `/career-path/${next.level}` : '/career-path'}
            className={`${btnPrimary} min-h-14 self-stretch text-xl sm:self-auto sm:px-10`}
          >
            {next ? `Jogar fase ${next.level}` : 'Ver as fases'}
          </Link>
        </div>
      )}

      {promo && (
        <p className="font-condensed rounded-xl border-2 border-cover bg-pitch-deep/80 p-4 text-xl font-extrabold uppercase">
          Você está no pódio da Temporada {promo.season}: abra uma figurinha e promova-a
        </p>
      )}

      <nav aria-label="Seções do álbum" className="album-tabs">
        {groupAt.map((g) => {
          const on = view > 0 && tabOn(g);
          return (
            <button
              key={g.label}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => goAt(g.at)}
              className={`album-tab ${on ? 'album-tab-on' : ''}`}
            >
              {g.key ? POSITION[g.key] : g.label}{' '}
              <span className="tabular opacity-70">{g.count}</span>
            </button>
          );
        })}
      </nav>

      <div className="album-stage">
        <div
          ref={book}
          className="album-book"
          data-wide={wide || undefined}
          data-closed={(wide && view === 0 && !flip) || undefined}
          data-opening={(wide && flip?.a === 0) || undefined}
          data-turning={flip ? '' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={(e) => {
            if (!dragged.current) return;
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {wide && view > 0 && <div aria-hidden="true" className="album-spine" />}
          {stage}
        </div>
      </div>

      <nav aria-label="Páginas do álbum" className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={turnBtn}
          disabled={view === 0}
          onClick={() => go(view - 1)}
        >
          <Chevron d="M15 6l-6 6 6 6" />
          Voltar
        </button>
        <p
          className="font-condensed tabular text-center text-base font-extrabold uppercase sm:text-lg"
          aria-live="polite"
        >
          {label}
        </p>
        <button
          type="button"
          className={turnBtn}
          disabled={view >= views - 1}
          onClick={() => go(view + 1)}
        >
          Virar
          <Chevron d="M9 6l6 6-6 6" />
        </button>
      </nav>

      {open && (
        <StickerDetail sticker={open} onClose={() => setOpen(null)}>
          {promo && (
            <div className="flex flex-col gap-2 rounded-xl border-2 border-cover/70 p-3">
              <p className="text-sm font-semibold">
                {RARITY_ORDER.indexOf(open.rarity) < RARITY_ORDER.indexOf('selecao_temporada')
                  ? `Pódio da Temporada ${promo.season}: esta figurinha pode virar Seleção da Temporada.`
                  : `Pódio da Temporada ${promo.season}: esta figurinha já está acima de Seleção da Temporada; promover gasta o pódio sem mudar a raridade.`}
              </p>
              <button
                type="button"
                className={`${btnPrimary} self-start`}
                disabled={promote.isPending}
                onClick={() => promote.mutate(open.playerId)}
              >
                Promover {open.name}
              </button>
              {promote.isError && (
                <p role="alert" className="text-sm font-semibold">
                  Não deu para promover agora. Tente de novo em instantes.
                </p>
              )}
            </div>
          )}
        </StickerDetail>
      )}
    </div>
  );
}
