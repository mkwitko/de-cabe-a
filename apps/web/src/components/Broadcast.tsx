import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buzz } from '../lib/haptics';
import { play } from '../lib/sound';
import { Stars } from './Stars';
import { TitleBadge } from './TitleBadge';
import { titleTone } from '../lib/format';

export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Floodlights: each one clunks on in turn (`on` = how many are lit). */
export function Lamps({ on }: { on: number }) {
  const pos = ['-left-[18%] -rotate-[16deg]', '-right-[18%] rotate-[16deg]', 'left-[20%]'];
  return (
    <>
      {pos.map((p, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`pointer-events-none absolute -top-8 h-3/4 w-3/5 bg-[radial-gradient(ellipse_at_top,rgb(235_242_255/0.5),transparent_62%)] transition-opacity duration-100 motion-reduce:duration-200 ${p} ${i < on ? 'opacity-100' : 'opacity-0'}`}
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
 * The stadium's big screen: it powers on like a CRT (a bright line opening to the full picture)
 * and shows the player's portrait through an LED grid, or their initials when there is no photo.
 */
function BigScreen({ hero, on }: { hero: Hero; on: boolean }) {
  return (
    <figure className="flex flex-col items-center gap-1">
      <div className="rounded-[10px] bg-[#1b2024] p-1.5 shadow-[0_24px_50px_-16px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.08)]">
        <div
          className={`relative aspect-[4/5] w-[min(58vw,30dvh,320px)] overflow-hidden sm:w-[min(40vw,36dvh,360px)] rounded-[5px] bg-[#0c1116] transition-[clip-path,filter] duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-opacity ${
            on
              ? '[clip-path:inset(0_0_0_0)] brightness-100'
              : '[clip-path:inset(49%_0_49%_0)] brightness-[3] motion-reduce:opacity-0 motion-reduce:[clip-path:none]'
          }`}
        >
          {hero.photo ? (
            <img
              src={hero.photo}
              alt=""
              draggable={false}
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
 * Stadium broadcast at the end of a won level. With a `hero` (Career Path), the player is the star:
 * the floodlights clunk on, the big screen shows him, his name lands in display type, and the
 * points and stars are the caption. Without one, the score itself is the headline.
 */
export function Broadcast({
  stars,
  score,
  headline,
  detail,
  onDone,
  short,
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
  short: boolean;
  hero?: Hero | undefined;
}) {
  const [lamps, setLamps] = useState(0);
  const [lit, setLit] = useState(false);
  const [screen, setScreen] = useState(false);
  const [named, setNamed] = useState(false);
  const [pts, setPts] = useState(0);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const stopCrowd = useRef<(() => void) | void>(undefined);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const withHero = !!hero;

  useEffect(() => {
    const quick = short || reducedMotion();
    const timers: number[] = [];
    let raf = 0;
    const at = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms));
    const count = (from: number, dur: number) => {
      at(from, () => {
        const st = performance.now();
        const step = (t: number) => {
          const k = Math.min(1, (t - st) / dur);
          setPts(Math.round(score * (1 - Math.pow(1 - k, 3))));
          if (k < 1) {
            if (Math.random() < 0.5) play('tick');
            raf = requestAnimationFrame(step);
          } else {
            if (!reducedMotion()) {
              setShake(true);
              buzz(60);
            }
            play('star');
            setDone(true);
          }
        };
        raf = requestAnimationFrame(step);
      });
    };
    const light = () => {
      setLit(true);
      stopCrowd.current = play('crowd');
    };
    const showScreen = () => {
      setScreen(true);
      play('shimmer');
    };
    const showName = () => {
      setNamed(true);
      play('stamp');
      if (!reducedMotion()) buzz(30);
    };
    if (quick) {
      setLamps(3);
      light();
      at(60, showScreen);
      at(260, showName);
      count(300, 500);
    } else {
      // The build-up starts at once: three lamps inside 300 ms, then the screen, then the name.
      [0, 120, 240].forEach((ms, i) =>
        at(ms, () => {
          setLamps(i + 1);
          play('clunk');
          buzz(15);
        }),
      );
      at(300, light);
      at(420, showScreen);
      at(withHero ? 1000 : 420, showName);
      count(withHero ? 1200 : 700, 900);
    }
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      stopCrowd.current?.();
    };
  }, [score, short, withHero]);

  // A title promotion gets its own fanfare once the score has landed.
  useEffect(() => {
    if (done && promoted) play('promote');
  }, [done, promoted]);

  const fade = 'transition-opacity duration-500 motion-reduce:duration-200';
  return (
    <div
      role="dialog"
      aria-label="Resultado"
      className="fixed inset-0 z-50 overflow-hidden bg-[#070b14] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white"
    >
      <div
        className="absolute inset-0 motion-safe:data-[shake=true]:animate-[bc-shake_320ms_linear]"
        data-shake={shake}
        style={{ '--amp': `${2 + stars * 2}px` } as React.CSSProperties}
      >
        <Lamps on={lamps} />
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-[34%] h-[22%] bg-[radial-gradient(#e9eef8_1px,transparent_1.6px),radial-gradient(#f5c400_1px,transparent_1.6px)] bg-[length:8px_7px,13px_11px] bg-[position:0_0,4px_3px] ${fade} ${lit ? 'opacity-30 motion-safe:animate-[crowd-step_500ms_steps(2)_infinite]' : 'opacity-0'}`}
        />
        <div
          aria-hidden="true"
          className={`absolute -inset-x-[30%] -bottom-[6%] h-[52%] origin-bottom [transform:rotateX(64deg)] bg-[repeating-linear-gradient(90deg,#1e7039_0_12%,#1a6533_12%_24%)] ${fade} ${lit ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
          {hero ? <span /> : <Stars n={stars} size="size-7" animate />}
          <span className="text-xs font-extrabold tracking-[0.18em] uppercase opacity-80">
            De Cabeça F.C.
          </span>
        </div>

        {hero ? (
          <div
            className={`absolute inset-x-0 top-14 mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 px-5 ${promoted ? 'bottom-40' : 'bottom-24'}`}
          >
            <BigScreen hero={hero} on={screen} />
            <h2
              className={`font-condensed max-w-full text-center text-[clamp(3rem,17vw,7.5rem)] leading-[0.84] font-black tracking-[-0.01em] text-balance uppercase [text-shadow:0_6px_18px_rgb(0_0_0/0.6)] transition-[opacity,transform,clip-path] duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-opacity ${
                named
                  ? 'translate-y-0 opacity-100 [clip-path:inset(-20%_-5%_-20%_-5%)]'
                  : 'translate-y-4 opacity-0 [clip-path:inset(100%_-5%_-20%_-5%)] motion-reduce:translate-y-0'
              }`}
            >
              {hero.name}
            </h2>
            {named && (
              <div className="flex flex-col items-center gap-1.5 motion-safe:animate-[fade-in_300ms_both]">
                <p className="font-condensed text-center text-xl leading-none font-extrabold tracking-wide text-cover uppercase sm:text-2xl">
                  {headline}
                </p>
                <p className="flex items-center gap-3">
                  <Stars n={stars} size="size-6" animate />
                  <span className="font-condensed tabular text-2xl leading-none font-black">
                    {pts}
                    <span className="ml-1 text-sm font-extrabold tracking-[0.2em] uppercase opacity-70">
                      pts
                    </span>
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <p
              className={`absolute inset-x-0 top-[22%] text-center text-[clamp(88px,30vw,150px)] leading-none font-black tracking-tighter tabular-nums transition-[opacity,transform] duration-300 ${lit ? 'opacity-100' : 'scale-75 opacity-0'}`}
            >
              {pts}
              <small className="block text-sm font-extrabold tracking-[0.3em] uppercase opacity-70">
                pontos
              </small>
            </p>
            <div
              className={`absolute inset-x-0 bottom-24 mx-auto max-w-3xl px-5 transition-[opacity,transform] duration-500 ${lit ? 'opacity-100' : 'translate-y-8 opacity-0'}`}
            >
              <div className="rounded-lg bg-cover px-4 py-3 text-ink">
                <h2 className="font-condensed text-3xl leading-[0.92] font-black text-balance uppercase sm:text-5xl">
                  {headline}
                </h2>
                <div className="mt-1 text-sm leading-snug font-semibold">{detail}</div>
              </div>
            </div>
          </>
        )}

        {promoted && (
          <div
            role="status"
            className={`absolute inset-x-5 mx-auto flex max-w-md items-center gap-3 rounded-lg px-4 py-2.5 text-ink transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${hero ? 'bottom-24' : 'top-[60%]'} ${done ? 'opacity-100' : 'translate-y-3 opacity-0'}`}
            style={{ background: titleTone(promoted) }}
          >
            <TitleBadge name={promoted} className="size-10" />
            <p className="font-condensed text-2xl leading-none font-black uppercase">
              Promovido a {promoted}
            </p>
          </div>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {hero ? `Era ${hero.name}! ` : 'Acertou! '}
        {score} pontos
      </p>
      <button
        type="button"
        onClick={() => onDoneRef.current()}
        className={
          done
            ? 'font-condensed absolute inset-x-5 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto min-h-14 max-w-md rounded-xl bg-cover text-xl font-black tracking-wide text-ink uppercase shadow-[0_10px_24px_-8px_rgb(0_0_0/0.7)] motion-safe:animate-[fade-in_300ms_both]'
            : 'absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] min-h-11 rounded-full border-2 border-white/60 px-5 font-extrabold text-white'
        }
      >
        {done ? 'Continuar' : 'Pular'}
      </button>
    </div>
  );
}
