/**
 * /como-jogar at launch: Career Path only. Three illustrated steps drawn in the passport's own
 * materials (the passport, the guess, the stars), one line each, a button to the player's next real
 * level, and the FAQ folded below. The prerendered page keeps the full text for search.
 */
import { Link } from 'react-router';
import { Stars } from '../components/Stars';
import { btnPrimary } from '../components/ui';
import { useTrack } from '../lib/game';
import { isModeLaunched, isPageLaunched } from '../lib/launch';
import { nextLevel } from '../lib/track';
import seo from '../seo-pages.json';

const PAPER =
  'bg-[#f3ead2] text-[#1d2a4f] [background-image:repeating-linear-gradient(0deg,transparent_0_19px,#c9b98f55_19px_20px)]';

function MiniStamp({
  name,
  years,
  ink,
  rot,
}: {
  name: string;
  years: string;
  ink: string;
  rot: number;
}) {
  return (
    <span
      className="flex aspect-[1.25] w-[88%] flex-col items-center justify-center rounded-full border-[3px] border-current text-center mix-blend-multiply"
      style={{ color: ink, rotate: `${rot}deg` }}
    >
      <b className="font-condensed text-lg leading-none font-black uppercase">{name}</b>
      <span className="tabular text-xs font-bold">{years}</span>
    </span>
  );
}

function PassportArt() {
  return (
    <div className={`grid h-full grid-cols-2 place-items-center gap-x-2 gap-y-1 p-3 ${PAPER}`}>
      <MiniStamp name="Santos" years="2009–2013" ink="#1d2a4f" rot={-7} />
      <MiniStamp name="Barcelona" years="2013–2017" ink="#7a2633" rot={5} />
      <span className="font-condensed grid aspect-square w-3/5 place-items-center rounded-full border-2 border-dashed border-[#6d5c3a66] text-3xl font-black text-[#6d5c3a88]">
        ?
      </span>
      <span className="font-condensed grid aspect-square w-3/5 place-items-center rounded-full border-2 border-dashed border-[#6d5c3a66] text-3xl font-black text-[#6d5c3a88]">
        ?
      </span>
    </div>
  );
}

function GuessArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 bg-pitch-deep p-4">
      <div className="flex gap-2">
        <span className="flex min-h-11 flex-1 items-center rounded-lg bg-paper px-3 font-semibold text-ink">
          Ney
          <span className="ml-px h-5 w-0.5 bg-ink motion-safe:animate-pulse" />
        </span>
        <span className="font-condensed grid min-h-11 place-items-center rounded-lg bg-cover px-3 font-extrabold text-ink uppercase">
          Chutar
        </span>
      </div>
      <span className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm font-bold text-ink shadow-[0_8px_16px_-8px_rgb(0_0_0/0.6)]">
        <span className="grid size-7 place-items-center rounded-full bg-ink text-xs text-paper">
          NJ
        </span>
        Neymar
      </span>
      <span className="flex gap-1.5" aria-hidden="true">
        {[1, 1, 0, 0, 0, 0].map((u, i) => (
          <span
            key={i}
            className={`size-3.5 rounded-[3px] border-2 ${u ? 'rotate-45 border-[#a3242f] bg-[#a3242f]' : 'border-chalk-soft/70'}`}
          />
        ))}
      </span>
    </div>
  );
}

function StarsArt() {
  return (
    <div className="flex h-full items-center justify-center gap-5 bg-[#070b14] p-4">
      <Stars n={3} size="size-9" />
      <span className="aspect-[3/4] w-20 rotate-3 rounded-[8px] bg-paper p-1 shadow-[6px_10px_16px_rgb(0_0_0/0.5)]">
        <span className="flex h-full flex-col justify-between rounded-[5px] bg-[linear-gradient(150deg,#ffe46b,#f2c200_45%,#d99e00)] p-1.5 text-[#1a2b1f]">
          <span className="text-[10px] font-extrabold tracking-[0.14em] uppercase">Ouro</span>
          <span className="font-condensed text-base leading-none font-black uppercase">Neymar</span>
        </span>
      </span>
    </div>
  );
}

const STEPS = [
  {
    name: 'O passaporte',
    text: 'Cada carimbo é um clube da carreira de um jogador, na ordem, com anos, jogos e gols.',
    Art: PassportArt,
  },
  {
    name: 'O palpite',
    text: 'Chute o nome. Errou ou pulou? Mais um clube é carimbado. São seis chances.',
    Art: GuessArt,
  },
  {
    name: 'As estrelas',
    text: 'Acerte cedo: até 3 estrelas por fase, títulos novos e a figurinha dele no álbum.',
    Art: StarsArt,
  },
];

/** FAQ entries about closed games or the closed ranking stay out until they reopen. */
const faq = seo.faq.filter(
  ([q = '']) =>
    (isModeLaunched('FOOTBALL_GRID') || !/Football Grid/.test(q)) &&
    (isModeLaunched('IMPOSTOR') || !/Impostor/.test(q)) &&
    (isPageLaunched('ranking') || !/relógio/.test(q)),
);

export function HowToPlayPage() {
  const track = useTrack('CAREER_PATH');
  const next = nextLevel(track.data);
  const levels = track.data?.levels.length ?? 0;
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-condensed text-4xl font-black uppercase sm:text-5xl">Como jogar</h1>
        <p className="max-w-[48ch] text-lg text-chalk-soft">
          Career Path: adivinhe o jogador pelos clubes por onde ele passou.
        </p>
      </header>
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ name, text, Art }, i) => (
          <li
            key={name}
            className="flex flex-col overflow-hidden rounded-xl border border-chalk/15 bg-chalk/[0.05]"
          >
            <div aria-hidden="true" className="h-44 overflow-hidden">
              <Art />
            </div>
            <div className="flex flex-col gap-1 p-4">
              <h2 className="font-condensed flex items-baseline gap-2 text-2xl leading-none font-extrabold uppercase">
                <span className="tabular text-gold">{i + 1}.</span> {name}
              </h2>
              <p className="leading-snug">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link
        to={next ? `/career-path/${next.level}` : '/career-path'}
        className={`${btnPrimary} min-h-14 self-stretch text-xl sm:self-center sm:px-10`}
      >
        {next
          ? next.inProgress
            ? `Continuar a fase ${next.level}`
            : next.level === 1
              ? 'Jogar a fase 1'
              : `Jogar a fase ${next.level}`
          : levels > 0
            ? 'Ver as fases'
            : 'Ir para o Career Path'}
      </Link>
      <section className="flex flex-col gap-2">
        <h2 className="font-condensed text-2xl leading-none font-extrabold uppercase">
          Perguntas frequentes
        </h2>
        {faq.map(([q, a]) => (
          <details key={q} className="group rounded-lg border border-chalk/15 bg-chalk/[0.05]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
              {q}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5 shrink-0 text-chalk-soft transition-transform duration-150 ease-standard group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <p className="max-w-[65ch] px-4 pb-4 text-chalk-soft">{a}</p>
          </details>
        ))}
      </section>
    </article>
  );
}
