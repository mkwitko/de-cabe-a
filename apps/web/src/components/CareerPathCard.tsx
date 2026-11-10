/**
 * Career Path as a leather passport: the game's cover, then the player's page in it (title on the
 * ladder, progress, stars, rarest sticker) and one button to the next real level. The card opens
 * the track; the button opens the level.
 */
import { Link } from 'react-router';
import { useAlbum, useStats, useTrack } from '../lib/game';
import { nextLevel } from '../lib/track';
import { ModeCover } from './ModeCover';
import { RARITY_ORDER, RARITY_STYLE } from './rarity';
import { StarIcon } from './Stars';
import { Skeleton } from './ui';

export function CareerPathCard({ linked = true }: { linked?: boolean }) {
  const track = useTrack('CAREER_PATH');
  const stats = useStats();
  const album = useAlbum();

  const levels = track.data?.levels ?? [];
  const done = levels.filter((l) => l.state === 'done').length;
  const stars = levels.reduce((s, l) => s + l.stars, 0);
  const next = nextLevel(track.data);
  const rarest = [...(album.data?.stickers ?? [])].sort(
    (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
  )[0];

  const name = 'Career Path';
  return (
    <article
      aria-labelledby="cp-name"
      className="relative flex flex-col overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_18px_36px_-14px_rgb(0_0_0/0.6)]"
    >
      <ModeCover
        mode="CAREER_PATH"
        compact
        name={
          <h2 id="cp-name">
            {linked ? (
              <Link to="/career-path" className="after:absolute after:inset-0 after:content-['']">
                {name}
              </Link>
            ) : (
              name
            )}
          </h2>
        }
      />
      <div className="flex flex-col gap-2.5 p-4">
        <p className="font-medium">Adivinhe o jogador pelos clubes. Seis chances.</p>
        {!track.data && !track.error ? (
          <Skeleton className="h-16 w-full" />
        ) : levels.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2 text-sm font-semibold">
              <span className="font-condensed text-xl font-black uppercase">
                {stats.data?.title.name ?? 'Peneira'}
              </span>
              <span className="tabular">
                {done}/{levels.length} fases
              </span>
              <span
                className="font-condensed tabular ml-auto text-lg font-black"
                aria-label={`${stars} estrelas`}
              >
                <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {stars}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-ink/15"
              role="progressbar"
              aria-label="Fases concluídas"
              aria-valuemin={0}
              aria-valuemax={levels.length}
              aria-valuenow={done}
            >
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${(done / levels.length) * 100}%` }}
              />
            </div>
            {rarest && (
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className={`${RARITY_STYLE[rarest.rarity].className} size-3 shrink-0 rounded-full bg-(--rc) ring-2 ring-ink/60`}
                />
                <span className="truncate">
                  Figurinha mais rara: {rarest.name} · {RARITY_STYLE[rarest.rarity].label}
                </span>
              </p>
            )}
          </div>
        ) : (
          <p className="font-semibold">Fases a caminho.</p>
        )}
        <Link
          to={next ? `/career-path/${next.level}` : '/career-path'}
          className="font-condensed relative z-10 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-ink px-5 text-xl font-extrabold text-paper uppercase"
        >
          {next
            ? next.inProgress
              ? 'Continuar'
              : `Jogar fase ${next.level}`
            : levels.length > 0
              ? 'Rever as fases'
              : 'Jogar'}
        </Link>
      </div>
    </article>
  );
}
