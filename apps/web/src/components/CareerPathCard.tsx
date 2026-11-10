/**
 * Career Path as the leather passport the level opens: gold-foil cover with the game's name and
 * rule, a visa page tucked in it (title in its frame, the rarest sticker, the last stamps and the
 * next slot, progress) and one button to the next real level. The cover opens the track; the
 * button opens the level. `stage` makes it fill the first phone screen on the home.
 */
import { Link } from 'react-router';
import type { TrackResponse } from '@decabeca/contracts';
import { useAlbum, useStats, useTrack } from '../lib/game';
import { nextLevel } from '../lib/track';
import { titleFrame, titleTone } from '../lib/format';
import { RARITY_ORDER, RARITY_STYLE } from './rarity';
import { StarIcon, Stars } from './Stars';
import { StickerCard } from './StickerCard';
import { TitleBadge } from './TitleBadge';
import { Skeleton } from './ui';

type Level = TrackResponse['levels'][number];

/** Passport inks for stamps, turning like real ones do (shared with the trail). */
export const STAMP_INK = ['#1d2a4f', '#7a2633', '#1f5e3b', '#5b3a7a'];
export const STAMP_ROT = [-6, 4, -3, 7, -8, 2, -5, 6, -2, 5];

/** Gold-foil seal on the cover: a ball inside a laurel ring, our own drawing. */
function Seal({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
    >
      <circle cx="32" cy="32" r="29" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="24.5" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="32" cy="32" r="12" strokeWidth="2.5" />
      <path
        d="m32 25.5 6 4.4-2.3 7h-7.4l-2.3-7z"
        fill="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {[-50, -30, -10, 10, 30, 50].map((a) => (
        <g key={a} transform={`rotate(${a} 32 32)`}>
          <path
            d="M32 8.5c-2.4 1.6-2.4 4.6 0 6.2 2.4-1.6 2.4-4.6 0-6.2z"
            fill="currentColor"
            strokeWidth="0"
          />
        </g>
      ))}
    </svg>
  );
}

/** A level's slot on a passport page: an ink stamp once done, the lit dashed slot when next, faint otherwise. */
export function StampMark({
  l,
  next,
  small = false,
}: {
  l: Level;
  next: boolean;
  small?: boolean;
}) {
  const num = (
    <span
      className={`font-condensed tabular leading-none font-black ${small ? 'text-lg' : 'text-3xl sm:text-4xl'}`}
    >
      {l.level}
    </span>
  );
  if (l.state === 'done') {
    const ink = STAMP_INK[l.level % STAMP_INK.length];
    return (
      <span
        className="relative grid size-full place-items-center rounded-full border-[3px] border-current mix-blend-multiply"
        style={{
          color: ink,
          rotate: `${STAMP_ROT[l.level % STAMP_ROT.length]}deg`,
          borderRadius: l.level % 3 === 0 ? '18%' : '999px',
        }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-[4px] rounded-[inherit] border border-current"
        />
        <span className="flex flex-col items-center gap-0.5">
          {!small && (
            <span className="font-condensed text-[0.7rem] font-extrabold tracking-[0.16em] uppercase">
              Fase
            </span>
          )}
          {num}
          <Stars n={l.stars} size={small ? 'size-2' : 'size-3 sm:size-3.5'} onCover />
        </span>
      </span>
    );
  }
  if (next)
    return (
      <span className="house-pulse grid size-full place-items-center rounded-full border-[3px] border-dashed border-[#1d2a4f] bg-cover/70 text-[#1d2a4f] shadow-[0_0_0_6px_rgb(255_214_80/0.25)]">
        <span className="flex flex-col items-center gap-0.5">
          {num}
          {!small && (
            <span className="font-condensed text-xs font-extrabold tracking-wide uppercase">
              {l.state === 'in_progress' ? 'Continuar' : 'Jogar'}
            </span>
          )}
        </span>
      </span>
    );
  return (
    <span className="grid size-full place-items-center rounded-full border-2 border-dashed border-[#6d5c3a]/35 text-[#6d5c3a]/85">
      {num}
    </span>
  );
}

/** The slots around the next level: the last stamps, the lit slot, the first locked ones. */
function StampStrip({
  levels,
  next,
  slots = 5,
}: {
  levels: Level[];
  next: number | null;
  slots?: number;
}) {
  const at = next ? levels.findIndex((l) => l.level === next) : levels.length - 1;
  const from = Math.max(0, Math.min(at - (slots - 2), levels.length - slots));
  return (
    <ol
      aria-hidden="true"
      className="grid gap-2 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}
    >
      {levels.slice(from, from + slots).map((l) => (
        <li key={l.level} className="aspect-square">
          <StampMark l={l} next={l.level === next} small />
        </li>
      ))}
    </ol>
  );
}

export function CareerPathCard({
  linked = true,
  stage = false,
}: {
  linked?: boolean;
  stage?: boolean;
}) {
  const track = useTrack('CAREER_PATH');
  const stats = useStats();
  const album = useAlbum();

  const levels = track.data?.levels ?? [];
  const done = levels.filter((l) => l.state === 'done').length;
  const stars = levels.reduce((s, l) => s + l.stars, 0);
  const next = nextLevel(track.data);
  const title = stats.data?.title.name ?? 'Peneira';
  const nextTitle = stats.data?.title.next;
  const rarest = [...(album.data?.stickers ?? [])]
    .filter((s) => s.mode === 'CAREER_PATH')
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))[0];

  const name = 'Career Path';
  return (
    <article
      aria-labelledby="cp-name"
      className={`@container relative isolate flex flex-col overflow-hidden rounded-[8px_22px_22px_8px] text-[#e7c26a] shadow-[0_30px_50px_-18px_rgb(0_0_0/0.7),inset_-2px_0_0_rgb(255_255_255/0.06)] [background:radial-gradient(#00000030_1px,transparent_1.5px)_0_0/4px_4px,radial-gradient(circle_at_30%_15%,#7a2633,#5b1a24_55%,#3d1018)] ${stage ? 'min-h-[calc(100svh-10rem-env(safe-area-inset-bottom))] sm:min-h-[36rem]' : ''}`}
    >
      {/* spine and the gold tooling around the cover */}
      <i
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-5 bg-[linear-gradient(90deg,rgb(0_0_0/0.45),transparent)]"
      />
      <i
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-[4px_14px_14px_4px] border border-[#e7c26a]/40 sm:inset-4"
      />
      <div className="relative flex flex-1 flex-col gap-4 py-5 pr-5 pl-7 sm:gap-6 sm:py-9 sm:pr-9 sm:pl-11">
        <div className="flex items-start justify-between gap-4">
          <Seal className="size-10 sm:size-16" />
          {levels.length > 0 && (
            <p
              className="font-condensed tabular flex items-center gap-1.5 text-2xl font-black"
              aria-label={`${stars} estrelas`}
            >
              <StarIcon className="size-5" /> {stars}
            </p>
          )}
        </div>
        <div>
          <h2
            id="cp-name"
            className="font-condensed text-[clamp(2.5rem,14cqw,6.5rem)] leading-[0.8] font-black tracking-[-0.01em] uppercase [text-shadow:0_-1px_0_#0007,0_1px_0_#fff3]"
          >
            {linked ? (
              <Link
                to="/career-path"
                className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-[-6px] focus-visible:after:outline-[#e7c26a]"
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </h2>
          <p className="mt-2 max-w-[30ch] text-base leading-snug font-semibold text-[#f3e3b8] sm:mt-3 sm:text-lg">
            Adivinhe o jogador pelos clubes. Seis chances.
          </p>
        </div>

        {/* the visa page tucked into the cover */}
        <div className="relative mt-auto -rotate-1 rounded-[6px] bg-[#f3ead2] p-4 text-[#1d2a4f] shadow-[0_14px_24px_-10px_rgb(0_0_0/0.6)] [background-image:repeating-linear-gradient(0deg,transparent_0_27px,#c9b98f55_27px_28px),radial-gradient(circle_at_50%_40%,#f8f1dc,#f3ead2_60%,#e2d5b3)] max-sm:p-3 sm:p-5">
          {!track.data && !track.error ? (
            <Skeleton className="h-40 w-full" />
          ) : track.error ? (
            <p className="font-semibold">Seu progresso não carregou. Confira a internet.</p>
          ) : levels.length === 0 ? (
            <p className="font-semibold">Fases a caminho.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* the title in its frame: the ladder's reward, worn on the passport */}
              <div
                className="flex min-w-0 items-center gap-3 rounded-[12px] p-1.5 shadow-[0_6px_12px_-6px_rgb(0_0_0/0.5)]"
                style={{ background: titleFrame(title) }}
              >
                <div
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[8px] px-3 py-2 text-ink sm:py-2.5"
                  style={{ background: titleTone(title) }}
                >
                  <TitleBadge name={title} className="size-10 shrink-0 sm:size-14" />
                  <div className="min-w-0">
                    <p className="font-condensed truncate text-[clamp(1.5rem,8cqw,2.5rem)] leading-[0.85] font-black uppercase">
                      {title}
                    </p>
                    {nextTitle && (
                      <p className="mt-1 text-sm leading-tight font-bold">
                        Faltam <span className="tabular">{nextTitle.missing}</span>{' '}
                        <StarIcon className="inline size-[0.85em] align-[-0.08em]" />
                        <span className="sr-only">estrelas</span> para {nextTitle.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <StampStrip levels={levels} next={next?.level ?? null} />
              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
                      style={{ width: `${Math.max(done ? 2 : 0, (done / levels.length) * 100)}%` }}
                    />
                  </div>
                </div>
                {rarest && (
                  // the rarest sticker, pasted in the corner of the page with its name beside it
                  <figure className="flex shrink-0 items-center gap-2.5">
                    <div className="aspect-[3/4] w-11 rotate-6 sm:w-12">
                      <StickerCard sticker={rarest} size="sm" showName={false} />
                    </div>
                    <figcaption className="max-w-[7rem] text-sm leading-tight font-bold">
                      <span className="sr-only">Figurinha mais rara: </span>
                      <span className="block truncate">{rarest.name}</span>
                      <span className="text-xs">{RARITY_STYLE[rarest.rarity].label}</span>
                    </figcaption>
                  </figure>
                )}
              </div>
            </div>
          )}
        </div>

        {!(track.error && !linked) && (
          <Link
            to={next ? `/career-path/${next.level}` : '/career-path'}
            className="font-condensed relative z-10 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-cover px-5 text-2xl sm:min-h-14 font-black text-ink uppercase shadow-[0_8px_18px_-8px_rgb(0_0_0/0.7)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5"
          >
            {next
              ? next.inProgress
                ? `Continuar a fase ${next.level}`
                : `Jogar fase ${next.level}`
              : levels.length > 0
                ? 'Rever as fases'
                : 'Jogar'}
          </Link>
        )}
      </div>
    </article>
  );
}
