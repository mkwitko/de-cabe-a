/** What a closed mode or page shows (src/lib/launch.ts): its own object, a rubber stamp, one way back to play. */
import { Link } from 'react-router';
import { ModeCover } from '../components/ModeCover';
import { btnPrimary } from '../components/ui';
import { GAME_NAME } from '../lib/game';
import type { Closed } from '../lib/launch';

/** The "Em breve" rubber stamp. */
export function SoonStamp({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-condensed inline-block -rotate-6 rounded border-[3px] border-ink bg-stamp px-2.5 py-0.5 text-lg leading-tight font-black tracking-wider text-ink uppercase shadow-[0_2px_0_rgb(0_0_0/0.25)] ${className}`}
    >
      Em breve
    </span>
  );
}

export function ComingSoonPage({ closed }: { closed: Closed }) {
  const name = closed.mode ? GAME_NAME[closed.mode] : closed.name;
  return (
    <section
      aria-labelledby="em-breve"
      className="mx-auto flex w-full max-w-md flex-col items-center gap-6 pt-4 text-center sm:pt-10"
    >
      <div className="relative w-full overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_18px_36px_-14px_rgb(0_0_0/0.6)]">
        <div className="flex h-72 flex-col grayscale-[0.6]">
          {closed.mode ? (
            <ModeCover mode={closed.mode} name={name} />
          ) : (
            <div className="grid flex-1 place-items-center bg-cover px-5">
              <p className="font-condensed text-5xl leading-[0.9] font-black uppercase">{name}</p>
            </div>
          )}
        </div>
        <SoonStamp className="absolute top-5 right-4 z-10 text-2xl" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 id="em-breve" className="font-condensed text-3xl leading-none font-black uppercase">
          {name} chega em breve
        </h1>
        <p className="text-chalk-soft">
          Por enquanto o De Cabeça F.C. abre só com o Career Path. O resto vem depois.
        </p>
      </div>
      <Link to="/career-path" className={`${btnPrimary} min-h-12 w-full max-w-xs`}>
        Jogar Career Path
      </Link>
    </section>
  );
}
