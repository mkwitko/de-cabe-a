/**
 * First run of Career Path: three steps laid over level 1 itself (the passport, the guess, the six
 * chances). A spotlight cuts the step's part of the screen out of a dimmed layer and a passport
 * paper ticket explains it in one line. Skippable at any step; seen once per device.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { play } from '../../lib/sound';

const KEY = 'dc-tutorial-career-path';

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true; // no storage: never trap the player in a tutorial that keeps coming back
  }
}

const STEPS = [
  {
    target: 'passport',
    title: 'Um passaporte, um jogador',
    text: 'Cada carimbo é um clube da carreira dele, na ordem, com anos, jogos e gols.',
  },
  {
    target: 'guess',
    title: 'Chute o nome',
    text: 'Busque o jogador e chute. Errou ou pulou? Mais um clube é carimbado.',
  },
  {
    target: 'tries',
    title: 'Seis chances',
    text: 'Quanto antes acertar, mais estrelas (até 3) e melhor a figurinha dele no álbum.',
  },
] as const;

type Box = { top: number; left: number; width: number; height: number };

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const s = STEPS[step]!;
  const last = step === STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* private mode: it may show again next visit */
    }
    onDone();
  };

  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      const pad = 6;
      setBox({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });
    };
    measure();
    addEventListener('resize', measure);
    addEventListener('scroll', measure, true);
    return () => {
      removeEventListener('resize', measure);
      removeEventListener('scroll', measure, true);
    };
  }, [s.target]);

  useEffect(() => {
    next.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [step]);

  // Ticket beside the spotlight when the screen has room (wide screens), else below it when it
  // sits in the top half of the screen, above it otherwise.
  const TICKET = 384;
  const side = !!box && innerWidth - (box.left + box.width) >= TICKET + 32;
  const below = !box || box.top + box.height / 2 < innerHeight / 2;
  // On wide screens the ticket also lines up with the spotlight instead of the screen's centre.
  const wide = !!box && innerWidth >= 640;
  const x = wide
    ? {
        left: Math.min(
          Math.max(16, box.left + box.width / 2 - TICKET / 2),
          innerWidth - TICKET - 16,
        ),
        right: 'auto',
        width: TICKET,
      }
    : {};
  const ticket: React.CSSProperties = !box
    ? { bottom: 96 }
    : side
      ? {
          top: Math.max(16, box.top),
          left: box.left + box.width + 16,
          right: 'auto',
          width: TICKET,
        }
      : below
        ? { ...x, top: Math.min(box.top + box.height + 12, innerHeight - 200) }
        : { ...x, bottom: Math.min(innerHeight - box.top + 12, innerHeight - 200) };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-text"
      className="fixed inset-0 z-[60]"
    >
      {box ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl shadow-[0_0_0_200vmax_rgb(3_9_6/0.74)] ring-2 ring-cover"
          style={box}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgb(3_9_6/0.74)]" />
      )}
      <div
        key={step}
        className="fixed inset-x-4 mx-auto max-w-sm rounded-xl data-[side=true]:mx-0 data-[side=true]:max-w-none bg-[#f3ead2] p-4 text-[#1d2a4f] shadow-[0_18px_40px_-10px_rgb(0_0_0/0.7)] [background-image:repeating-linear-gradient(0deg,transparent_0_27px,#c9b98f55_27px_28px)] motion-safe:animate-[paste_420ms_var(--ease-out-expo)]"
        style={ticket}
        data-side={side || wide}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="tour-title" className="font-condensed text-2xl leading-none font-black uppercase">
            {s.title}
            <span className="sr-only">
              {' '}
              (passo {step + 1} de {STEPS.length})
            </span>
          </h2>
          <span aria-hidden="true" className="mt-1.5 flex shrink-0 gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`size-2 rounded-full ${i <= step ? 'bg-[#1d2a4f]' : 'bg-[#1d2a4f]/25'}`}
              />
            ))}
          </span>
        </div>
        <p id="tour-text" className="mt-1.5 leading-snug font-medium">
          {s.text}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="-ml-2 min-h-11 rounded-lg px-2 text-sm font-bold whitespace-nowrap text-[#6d5c3a] underline underline-offset-4"
          >
            Pular tutorial
          </button>
          <button
            ref={next}
            type="button"
            onClick={() => {
              play('tap');
              if (last) finish();
              else setStep(step + 1);
            }}
            className="font-condensed inline-flex min-h-11 items-center rounded-lg whitespace-nowrap bg-[#1d2a4f] px-5 text-lg font-extrabold tracking-wide text-[#f3ead2] uppercase"
          >
            {last ? 'Bora jogar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
}
