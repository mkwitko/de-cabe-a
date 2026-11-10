/**
 * Sticker album as a Panini book: one page per position group, two facing pages from `lg`, one
 * on phones, turned with Voltar/Virar or the group tabs. Numbered slots with a silhouette and the
 * position; stickers sit pasted in, a little crooked. The cover band carries the count.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AlbumResponse, Sticker } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { play } from '../lib/sound';
import { GameHeader, Notice, Skeleton, btnPrimary, btnSecondary } from '../components/ui';
import { GoalLoop } from '../components/Moment';
import { RARITY_ORDER, RARITY_STYLE } from '../components/rarity';
import { POSITION, StickerCard } from '../components/StickerCard';
import { useTrack } from '../lib/game';
import { nextLevel } from '../lib/track';

const GROUPS = [
  { key: 'GK', label: 'Goleiros' },
  { key: 'DF', label: 'Defensores' },
  { key: 'MF', label: 'Meio-campistas' },
  { key: 'FW', label: 'Atacantes' },
  { key: null, label: 'Outros' },
] as const;
/** Slots per page: a multiple of 3 and 4 (phone and wide grids), at least two empty ones. */
const slotsFor = (n: number) => Math.max(12, Math.ceil((n + 2) / 12) * 12);
const TILT = [-1.6, 1.1, -0.6, 1.8, -1.2, 0.5];

const WIDE = '(min-width: 1024px)';
const subscribe = (cb: () => void) => {
  if (typeof matchMedia !== 'function') return () => {};
  const m = matchMedia(WIDE);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const isWide = () => typeof matchMedia === 'function' && matchMedia(WIDE).matches;

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

type Page = { key: keyof typeof POSITION | null; label: string; list: Sticker[]; first: number };

export function AlbumPage() {
  const qc = useQueryClient();
  const q = useQuery<AlbumResponse, ApiError>({
    queryKey: ['album'],
    queryFn: () => api('/v1/me/album'),
  });
  const [picked, setPicked] = useState<Sticker | null>(null);
  const [at, setAt] = useState(0);
  const [turn, setTurn] = useState<'next' | 'prev' | null>(null);
  const wide = useSyncExternalStore(subscribe, isWide, () => false);
  const per = wide ? 2 : 1;
  const next = nextLevel(useTrack('CAREER_PATH').data);
  const promote = useMutation<AlbumResponse, ApiError, string>({
    mutationFn: (playerId) => api('/v1/me/album/promote', { method: 'POST', json: { playerId } }),
    onSuccess: (data) => {
      qc.setQueryData(['album'], data);
      setPicked(null);
    },
  });
  // A spread index means something else when the page count per view changes.
  useEffect(() => setAt((a) => (per === 2 ? Math.floor(a / 2) : a * 2)), [per]);

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

  // Pages in album order; slot numbers run on across them.
  const pages: Page[] = [];
  let n = 1;
  for (const { key, label } of GROUPS) {
    const list = a.stickers.filter((s) => s.positionGroup === key);
    if (!list.length && key === null) continue;
    pages.push({ key, label, list, first: n });
    n += slotsFor(list.length);
  }
  const views = Math.ceil(pages.length / per);
  const view = Math.min(at, views - 1);
  const shown = pages.slice(view * per, view * per + per);
  const go = (to: number) => {
    if (to < 0 || to >= views || to === view) return;
    setTurn(to > view ? 'next' : 'prev');
    setAt(to);
    play('tap');
  };
  const turnBtn =
    'font-condensed inline-flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-chalk-soft/50 px-3 text-lg font-extrabold uppercase hover:border-chalk disabled:opacity-30';

  return (
    <div className="flex flex-col gap-6">
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
        <div className="rounded-xl border-2 border-cover bg-pitch-deep/80 p-4">
          <p className="font-condensed text-xl font-extrabold uppercase">
            Você está no pódio da Temporada {promo.season}: toque numa figurinha para promovê-la
          </p>
          {picked && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="font-semibold">Promover {picked.name} para a próxima raridade?</p>
              <button
                type="button"
                className={btnPrimary}
                disabled={promote.isPending}
                onClick={() => promote.mutate(picked.playerId)}
              >
                Promover
              </button>
              <button type="button" className={btnSecondary} onClick={() => setPicked(null)}>
                Cancelar
              </button>
            </div>
          )}
          {promote.isError && (
            <p role="alert" className="mt-2 text-sm font-semibold">
              Não deu para promover agora. Tente de novo em instantes.
            </p>
          )}
        </div>
      )}

      <div className="album-book text-ink">
        {/* The cover band: the album's own count and finishes. */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-3 pt-2 pb-4 sm:px-5">
          <div>
            <p className="font-condensed text-sm font-extrabold tracking-[0.18em] uppercase">
              Álbum De Cabeça F.C.
            </p>
            <p className="font-condensed tabular text-5xl leading-none font-black sm:text-6xl">
              {a.owned} <span className="text-3xl sm:text-4xl">de {a.total}</span>
            </p>
          </div>
          <ul className="flex flex-wrap gap-1.5 sm:gap-2" aria-label="Figurinhas por raridade">
            {RARITY_ORDER.filter((r) => a.byRarity[r]).map((r) => (
              <li
                key={r}
                className="flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-paper sm:gap-2 sm:px-3 sm:py-1 sm:text-sm"
              >
                <span
                  aria-hidden="true"
                  className={`size-3 rounded-full bg-[var(--rc)] ${RARITY_STYLE[r].className.split(' ')[0]}`}
                />
                {RARITY_STYLE[r].label} · <span className="tabular">{a.byRarity[r]}</span>
              </li>
            ))}
          </ul>
        </div>

        <nav
          aria-label="Seções do álbum"
          className="flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none]"
        >
          {pages.map((p, i) => {
            const on = Math.floor(i / per) === view;
            return (
              <button
                key={p.label}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => go(Math.floor(i / per))}
                className={`font-condensed min-h-11 shrink-0 rounded-t-lg px-2.5 text-base sm:px-3 font-extrabold uppercase ${on ? 'bg-ink text-cover' : 'text-ink/75 hover:bg-ink/10'}`}
              >
                {p.key ? POSITION[p.key] : p.label} <span className="tabular">{p.list.length}</span>
              </button>
            );
          })}
        </nav>

        <div
          key={view}
          onAnimationEnd={() => setTurn(null)}
          className={`grid overflow-hidden rounded-[10px] lg:grid-cols-2 ${turn === 'next' ? 'page-turn-next' : turn === 'prev' ? 'page-turn-prev' : ''}`}
        >
          {shown.map((p) => (
            <section
              key={p.label}
              aria-labelledby={`pg-${p.label}`}
              className="album-page flex flex-col gap-4 p-4 sm:p-6"
            >
              <header className="flex items-baseline justify-between gap-3 border-b-4 border-double border-[#1d2a4f]/40 pb-2">
                <h2
                  id={`pg-${p.label}`}
                  className="font-condensed text-3xl leading-none font-black uppercase sm:text-4xl"
                >
                  {p.label}
                </h2>
                <p className="font-condensed tabular text-lg font-extrabold">
                  {p.list.length} {p.list.length === 1 ? 'colada' : 'coladas'}
                </p>
              </header>
              <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
                {Array.from({ length: slotsFor(p.list.length) }, (_, i) => {
                  const s = p.list[i];
                  const num = p.first + i;
                  if (!s)
                    return (
                      <li
                        key={`slot-${num}`}
                        aria-hidden="true"
                        className="album-slot relative grid aspect-[3/4] place-items-center rounded-lg"
                      >
                        <span className="font-condensed tabular absolute top-1.5 left-2 text-lg leading-none font-black">
                          {num}
                        </span>
                        <Silhouette />
                        {p.key && (
                          <span className="font-condensed absolute bottom-1.5 text-xs font-extrabold tracking-wider">
                            {POSITION[p.key]}
                          </span>
                        )}
                      </li>
                    );
                  const sel = picked?.playerId === s.playerId;
                  return (
                    <li
                      key={s.playerId}
                      className="album-stuck aspect-[3/4]"
                      style={{ '--tilt': `${TILT[i % TILT.length]}deg` } as React.CSSProperties}
                    >
                      {promo ? (
                        <button
                          type="button"
                          aria-pressed={sel}
                          aria-label={`Promover ${s.name}`}
                          onClick={() => setPicked(s)}
                          className="block h-full w-full text-left"
                        >
                          <StickerCard sticker={s} size="sm" selected={sel} />
                        </button>
                      ) : (
                        <StickerCard sticker={s} size="sm" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
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
        <p className="font-condensed tabular text-lg font-extrabold uppercase" aria-live="polite">
          {shown.map((p) => p.label).join(' · ')}
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

      {a.owned > 0 && (
        <p className="max-w-[64ch] text-sm text-chalk-soft">
          Nota De Cabeça: de 50 a 99, feita só com dados reais (fama, jogos e gols na carreira,
          seleção, Copas ganhas e passagem por clube grande).
        </p>
      )}
    </div>
  );
}
