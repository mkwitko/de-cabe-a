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

/** Stadium broadcast: lamps, crowd, score ticking up, lower-third with the answer. */
export function Broadcast({
  stars,
  score,
  headline,
  detail,
  onDone,
  short,
  promoted,
}: {
  /** Title this level's stars just earned, if it changed. */
  promoted?: string | null;
  stars: number;
  score: number;
  headline: string;
  detail: ReactNode;
  onDone: () => void;
  short: boolean;
}) {
  const [lamps, setLamps] = useState(0);
  const [lit, setLit] = useState(false);
  const [pts, setPts] = useState(0);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const stopCrowd = useRef<(() => void) | void>(undefined);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const quick = short || reducedMotion();
    const timers: number[] = [];
    let raf = 0;
    const at = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms));
    const count = (from: number, dur: number) => {
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
          setDone(true);
        }
      };
      at(from, () => (raf = requestAnimationFrame(step)));
    };
    if (quick) {
      setLamps(3);
      setLit(true);
      stopCrowd.current = play('crowd');
      count(150, 500);
    } else {
      [330, 660, 990].forEach((ms, i) =>
        at(ms, () => {
          setLamps(i + 1);
          play('clunk');
          buzz(15);
        }),
      );
      at(1240, () => {
        setLit(true);
        stopCrowd.current = play('crowd');
      });
      count(1540, 1100);
    }
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      stopCrowd.current?.();
    };
  }, [score, short]);

  const fade = 'transition-opacity duration-1000 motion-reduce:duration-200';
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
          <Stars n={stars} size="size-7" animate />
          <span className="text-xs font-extrabold tracking-[0.18em] uppercase opacity-80">
            De Cabeça F.C.
          </span>
        </div>
        <p
          className={`absolute inset-x-0 top-[22%] text-center text-[clamp(88px,30vw,150px)] leading-none font-black tracking-tighter tabular-nums transition-[opacity,transform] duration-300 ${lit ? 'opacity-100' : 'scale-75 opacity-0'}`}
        >
          {pts}
          <small className="block text-sm font-extrabold tracking-[0.3em] uppercase opacity-70">
            pontos
          </small>
        </p>
        {promoted && (
          <div
            role="status"
            className={`absolute inset-x-5 top-[60%] mx-auto flex max-w-3xl items-center gap-3 rounded-lg px-4 py-2.5 text-ink transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${done ? 'opacity-100' : 'translate-y-3 opacity-0'}`}
            style={{ background: titleTone(promoted) }}
          >
            <TitleBadge name={promoted} className="size-10" />
            <p className="font-condensed text-2xl leading-none font-black uppercase">
              Promovido a {promoted}
            </p>
          </div>
        )}
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
      </div>
      <p aria-live="polite" className="sr-only">
        Acertou! {score} pontos
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
