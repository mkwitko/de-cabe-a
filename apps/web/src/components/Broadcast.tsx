import { useEffect, useRef, type ReactNode } from 'react';
import { buzz } from '../lib/haptics';
import { play } from '../lib/sound';
import { Stars } from './Stars';
import { TitleBadge } from './TitleBadge';
import { titleTone } from '../lib/format';
import { motionReduced } from '../lib/settings';

/** The system setting or Ajustes > Reduzir animacoes. */
export const reducedMotion = motionReduced;

/** Floodlights (`on` = how many are lit). */
export function Lamps({ on }: { on: number }) {
  const pos = ['-left-[18%] -rotate-[16deg]', '-right-[18%] rotate-[16deg]', 'left-[20%]'];
  return (
    <>
      {pos.map((p, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`pointer-events-none absolute -top-8 h-3/4 w-3/5 bg-[radial-gradient(ellipse_at_top,rgb(235_242_255/0.5),transparent_62%)] ${p} ${i < on ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
    </>
  );
}

/** The player the level was about: their name, and their Wikimedia portrait when there is one. */
export type Hero = { name: string; photo: string | null; credit: string | null };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * The stadium's big screen: shows the player's portrait through an LED grid, or their initials when there is no photo.
 */
function BigScreen({ hero }: { hero: Hero }) {
  return (
    <figure className="flex flex-col items-center gap-1">
      <div className="rounded-[10px] bg-[#1b2024] p-1.5 shadow-[0_24px_50px_-16px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.08)]">
        <div className="relative aspect-[4/5] w-[min(58vw,30dvh,320px)] overflow-hidden sm:w-[min(40vw,36dvh,360px)] rounded-[5px] bg-[#0c1116]">
          {hero.photo ? (
            <img
              src={hero.photo}
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority="high"
              className="size-full object-cover object-[50%_20%]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="font-condensed grid size-full place-items-center bg-cover text-[clamp(4rem,22vw,8rem)] leading-none font-black text-ink"
            >
              {initials(hero.name)}
            </div>
          )}
          {/* LED grid and scanlines: the picture is on a stadium screen, not a phone. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(transparent_55%,rgb(0_0_0/0.45)_100%),repeating-linear-gradient(0deg,rgb(0_0_0/0.22)_0_1px,transparent_1px_3px)] bg-[length:3px_3px,auto]"
          />
        </div>
      </div>
      {hero.credit && (
        <figcaption className="max-w-[min(58vw,30dvh,320px)] truncate sm:max-w-[min(40vw,36dvh,360px)] text-xs text-white/55">
          {hero.credit}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Stadium broadcast at the end of a won level, in one step: the lights, the screen, his name and
 * the score appear together under a single 150 ms fade. With a `hero` (Career Path), the player
 * is the star and the points and stars are the caption. Without one, the score is the headline.
 */
export function Broadcast({
  stars,
  score,
  headline,
  detail,
  onDone,
  promoted,
  hero,
}: {
  /** Title this level's stars just earned, if it changed. */
  promoted?: string | null;
  stars: number;
  score: number;
  headline: string;
  detail: ReactNode;
  onDone: () => void;
  hero?: Hero | undefined;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const pts = score;

  // One short step: the sounds play once together; nothing counts up or waits.
  useEffect(() => {
    play('stamp');
    play('star');
    if (promoted) play('promote');
    if (!reducedMotion()) buzz(30);
    return play('crowd') ?? undefined;
  }, [promoted]);

  const Headline = hero ? 'p' : 'h2';
  const action = (
    <button
      type="button"
      onClick={() => onDoneRef.current()}
      className="font-condensed group inline-flex min-h-14 shrink-0 items-center justify-center gap-2 px-6 text-xl lg:min-h-20 lg:px-10 lg:text-2xl font-black tracking-wide uppercase transition-[background-color,color] duration-150 bg-cover text-ink hover:bg-[oklch(0.92_0.17_95)]"
    >
      Continuar
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6 fill-none stroke-current stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    </button>
  );
  return (
    <div
      role="dialog"
      aria-label="Resultado"
      className="screen-overlay fixed inset-0 z-50 overflow-hidden bg-[#070b14] text-white motion-safe:animate-[fade-in_150ms_both]"
    >
      <div className="absolute inset-0">
        {/* One stadium at night: sky, the stands lit by the floodlights, the pitch running away from
            the camera. Each layer fades into the next; there is no flat band. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(#05080f_0%,#0b1322_38%,#0f1a24_56%,#0b1a12_100%)]"
        />
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-[26%] h-[36%] [mask-image:linear-gradient(transparent,black_30%,black_70%,transparent)]`}
        >
          <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgb(255_255_255/0.035)_0_2px,transparent_2px_14px)]" />
          <div className="absolute inset-0 bg-[radial-gradient(#e9eef8_1px,transparent_1.6px),radial-gradient(#f5c400_1px,transparent_1.6px)] bg-[length:8px_7px,13px_11px] bg-[position:0_0,4px_3px] opacity-30" />
        </div>
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-[50%] overflow-hidden [mask-image:linear-gradient(transparent,black_22%)]`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_calc(50%-1.5px),rgb(255_255_255/0.5)_calc(50%-1.5px)_calc(50%+1.5px),transparent_calc(50%+1.5px)),repeating-linear-gradient(90deg,#1f7a3d_0_5%,#1a6a35_5%_10%)]" />
          {/* Floodlight pools on the grass, continuous with the lamps above. */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_10%,rgb(235_242_255/0.22),transparent_70%),linear-gradient(transparent_40%,rgb(3_8_6/0.75))]" />
        </div>
        <Lamps on={3} />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="flex items-center gap-2 text-xs font-extrabold tracking-[0.18em] uppercase">
            <span className="size-2 rounded-full bg-[#e5484d]" />
            Ao vivo
          </span>
          <span className="text-xs font-extrabold tracking-[0.18em] uppercase opacity-80">
            De Cabeça F.C.
          </span>
        </div>

        {hero ? (
          <div className="absolute inset-x-0 top-12 bottom-44 mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 px-5 sm:bottom-36">
            <BigScreen hero={hero} />
            <h2 className="font-condensed max-w-full text-center text-[clamp(3rem,15vw,7.5rem)] leading-[0.84] font-black tracking-[-0.01em] text-balance uppercase [text-shadow:0_6px_18px_rgb(0_0_0/0.6)]">
              {hero.name}
            </h2>
          </div>
        ) : (
          <p className="font-condensed tabular absolute inset-x-0 top-[20%] text-center text-[clamp(88px,30vw,150px)] leading-none font-black">
            {pts}
            <small className="block text-sm font-extrabold tracking-[0.3em] uppercase opacity-70">
              pontos
            </small>
          </p>
        )}

        {/* The TV lower third: the verdict, stars and points, and the way on, as one graphic. */}
        <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mx-auto max-w-3xl sm:inset-x-8 lg:max-w-4xl sm:bottom-[max(2rem,env(safe-area-inset-bottom))]">
          {promoted && (
            <div
              role="status"
              className="ml-3 inline-flex items-center gap-2 rounded-t-md px-3 py-1.5 text-ink"
              style={{ background: titleTone(promoted) }}
            >
              <span className="relative -my-3 shrink-0">
                <TitleBadge name={promoted} className="size-11" />
              </span>
              <p className="font-condensed text-lg leading-none font-black uppercase">
                Promovido a {promoted}
              </p>
            </div>
          )}
          <div className="flex w-full flex-col overflow-hidden rounded-lg border-t-[3px] border-cover bg-[#0d1626]/95 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.9)] sm:flex-row sm:items-stretch">
            {
              <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 lg:min-h-20 lg:gap-5 lg:px-6">
                <div className="min-w-0 flex-1">
                  {/* With a hero his name is the heading; otherwise the verdict is. */}
                  <Headline className="font-condensed text-xl leading-none font-black tracking-wide text-cover uppercase sm:text-2xl lg:text-3xl">
                    {headline}
                  </Headline>
                  {!hero && <div className="mt-1 text-sm leading-snug text-white/80">{detail}</div>}
                </div>
                <Stars n={stars} size="size-6 sm:size-7 lg:size-8" animate />
                <span className="font-condensed tabular text-3xl leading-none font-black lg:text-4xl">
                  {pts}
                  <span className="ml-1 text-sm font-extrabold tracking-[0.2em] uppercase opacity-70">
                    pts
                  </span>
                </span>
              </div>
            }
            {action}
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {hero ? `Era ${hero.name}! ` : 'Acertou! '}
        {score} pontos
      </p>
    </div>
  );
}
