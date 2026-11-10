import { StarIcon } from './Stars';
import { TitleBadge } from './TitleBadge';
import { titleFrame, titleTone } from '../lib/format';

/**
 * Carteirinha de sócio: the member's card on /stats and /perfil/:apelido. The outer ring is the
 * title's frame (its ladder reward); the field is the title's colour. Leans toward the finger.
 */
export function MemberCard({
  name,
  title,
  stars,
  levels,
  heading = 'h1',
  className = 'max-w-md',
}: {
  name: string;
  title: string;
  stars: number;
  levels: number;
  heading?: 'h1' | 'h2';
  className?: string;
}) {
  const H = heading;
  return (
    <div
      className={`lean w-full ${className} -rotate-1 rounded-[16px] p-3 text-ink shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5),0_2px_4px_rgb(0_0_0/0.2)]`}
      style={{ background: titleFrame(title) }}
    >
      <div className="flex items-center justify-between gap-3 rounded-t-[8px] bg-ink px-4 py-2 text-paper">
        <span className="font-condensed shrink-0 text-xs font-extrabold tracking-[0.12em] uppercase sm:text-sm sm:tracking-[0.2em]">
          Sócio · De Cabeça F.C.
        </span>
        <span className="font-condensed min-w-0 truncate text-sm font-extrabold uppercase">
          {name}
        </span>
      </div>
      <div
        className="flex items-center gap-4 rounded-b-[8px] px-4 py-5"
        style={{ background: titleTone(title) }}
      >
        <TitleBadge name={title} className="size-20" />
        <div className="min-w-0">
          <H className="font-condensed text-[clamp(2.5rem,11vw,3.75rem)] leading-[0.85] font-black uppercase">
            {title}
          </H>
          <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-lg font-bold">
            <span className="flex items-center gap-1.5">
              <StarIcon className="size-5" />
              <span className="tabular">{stars}</span> estrelas
            </span>
            <span>
              <span className="tabular">{levels}</span> {levels === 1 ? 'fase' : 'fases'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
