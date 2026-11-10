/**
 * The Career Path track as the passport itself: a spread of two visa pages, one stamp slot per
 * level. Done levels carry their ink stamp and stars, the next level is the lit slot (centred on
 * screen when the trail opens), locked ones stay faint. Turning the page moves 12 levels at a time.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { TrackResponse } from '@decabeca/contracts';
import { StampMark } from '../../components/CareerPathCard';
import { play } from '../../lib/sound';

type Level = TrackResponse['levels'][number];
const DIFFICULTY = { 1: 'fácil', 2: 'média', 3: 'difícil' } as Record<number, string>;
/** Levels per visa page; a spread is two pages. */
const PER_PAGE = 6;
const SPREAD = PER_PAGE * 2;

function Slot({ l, next }: { l: Level; next: boolean }) {
  const label = `Fase ${l.level}, ${DIFFICULTY[l.difficultyTier] ?? ''}`;
  if (l.state === 'locked')
    return (
      <span role="img" aria-label={`${label}, trancada`} className="block size-full">
        <StampMark l={l} next={false} />
      </span>
    );
  return (
    <Link
      to={`/career-path/${l.level}`}
      data-current={next || undefined}
      aria-label={
        l.state === 'done'
          ? `${label}, ${l.stars} estrelas`
          : `${label}, ${l.state === 'in_progress' ? 'em andamento' : 'jogar'}`
      }
      className="block size-full rounded-full transition-transform duration-200 ease-out-expo hover:scale-[1.04]"
    >
      <StampMark l={l} next={next} />
    </Link>
  );
}

/** One visa page: ruled paper, three rows of two stamp slots, its number at the foot. */
function VisaPage({
  levels,
  n,
  next,
  side,
}: {
  levels: Level[];
  n: number;
  next: number | null;
  side: 'l' | 'r';
}) {
  return (
    <section
      aria-label={`Página ${n}, fases ${levels[0]!.level} a ${levels.at(-1)!.level}`}
      className={`relative flex flex-col overflow-hidden bg-[var(--pp-paper)] px-5 pt-6 pb-4 text-[var(--pp-text)] [background-image:repeating-linear-gradient(0deg,transparent_0_27px,var(--pp-rule)_27px_28px),radial-gradient(circle_at_50%_45%,var(--pp-paper-hi),var(--pp-paper)_60%,var(--pp-paper-lo))] sm:px-8 ${side === 'l' ? 'rounded-t-[14px] md:rounded-l-[14px] md:rounded-tr-none md:shadow-[inset_-18px_0_24px_-16px_#00000045]' : 'rounded-b-[14px] md:rounded-r-[14px] md:rounded-bl-none md:shadow-[inset_18px_0_24px_-16px_#00000045]'}`}
    >
      <ol className="grid flex-1 grid-cols-2 gap-x-6 gap-y-5 sm:gap-x-10">
        {levels.map((l) => (
          <li key={l.level} className="mx-auto aspect-square w-full max-w-28 sm:max-w-36">
            <Slot l={l} next={l.level === next} />
          </li>
        ))}
      </ol>
      <p
        aria-hidden="true"
        className={`font-condensed tabular mt-4 text-sm font-extrabold text-[var(--pp-label)] ${side === 'l' ? 'text-left' : 'text-right'}`}
      >
        {n}
      </p>
    </section>
  );
}

export function CareerTrail({ levels, next }: { levels: Level[]; next: number | null }) {
  const spreads = Math.ceil(levels.length / SPREAD);
  const home = Math.floor(((next ?? levels.length) - 1) / SPREAD);
  const [at, setAt] = useState(home);
  const [turn, setTurn] = useState<'next' | 'prev' | null>(null);

  // Back to the player's spread when the track changes under it (a level was won).
  useEffect(() => setAt(home), [home]);

  // Open with the lit slot centred, unless it is already on screen.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-current]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight - 80)
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, []);

  const go = (to: number) => {
    if (to < 0 || to >= spreads) return;
    setTurn(to > at ? 'next' : 'prev');
    setAt(to);
    play('tap');
  };

  const first = levels.slice(at * SPREAD, at * SPREAD + PER_PAGE);
  const second = levels.slice(at * SPREAD + PER_PAGE, (at + 1) * SPREAD);
  const range = `fases ${first[0]?.level}–${(second.at(-1) ?? first.at(-1))?.level}`;
  const btn =
    'font-condensed inline-flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-chalk-soft/50 px-3 text-lg font-extrabold uppercase hover:border-chalk disabled:opacity-30';

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        key={at}
        onAnimationEnd={() => setTurn(null)}
        className={`grid grid-cols-[minmax(0,1fr)] rounded-[16px] shadow-[0_30px_50px_-20px_rgb(0_0_0/0.65)] md:grid-cols-2 ${turn === 'next' ? 'page-turn-next' : turn === 'prev' ? 'page-turn-prev' : ''}`}
      >
        <VisaPage levels={first} n={at * 2 + 1} next={next} side="l" />
        {second.length > 0 && <VisaPage levels={second} n={at * 2 + 2} next={next} side="r" />}
      </div>
      <nav aria-label="Páginas do passaporte" className="flex items-center justify-between gap-3">
        <button type="button" className={btn} disabled={at === 0} onClick={() => go(at - 1)}>
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
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Voltar
        </button>
        <div className="flex flex-col items-center text-center">
          <p
            className="font-condensed tabular text-lg leading-tight font-extrabold uppercase"
            aria-live="polite"
          >
            {range}
          </p>
          {at !== home && (
            <button
              type="button"
              onClick={() => go(home)}
              className="min-h-11 text-sm font-bold text-chalk-soft underline underline-offset-4 hover:text-chalk"
            >
              Ir à fase {next ?? levels.length}
            </button>
          )}
        </div>
        <button
          type="button"
          className={btn}
          disabled={at >= spreads - 1}
          onClick={() => go(at + 1)}
        >
          Virar
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
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
