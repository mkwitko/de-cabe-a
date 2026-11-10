import { StarIcon } from './Stars';
import { TitleBadge } from './TitleBadge';
import { titleFrame, titleTone } from '../lib/format';
import { ClubeSeal } from './Icons';

/** "Apoiador": a thank-you for supporting the project (/apoie). Only a tag, nothing in play. */
export function SupporterTag({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-condensed inline-flex items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-0.5 text-xs leading-none font-black tracking-[0.14em] whitespace-nowrap uppercase ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
        <path d="M8 14.2 2.3 8.6A3.4 3.4 0 0 1 7.1 3.8L8 4.7l.9-.9a3.4 3.4 0 0 1 4.8 4.8z" />
      </svg>
      Apoiador
    </span>
  );
}

/**
 * Carteirinha de sócio: the member's card on /stats and /perfil/:apelido. The outer ring is the
 * title's frame (its ladder reward); the field is the title's colour. The name leads, the title
 * sits in an ink tab, and the numbers read like the Nota on a sticker: big figure, small label.
 */
export function MemberCard({
  name,
  title,
  stars,
  levels,
  stickers,
  guest = false,
  member = false,
  supporter = false,
  heading = 'h1',
  className = 'max-w-md',
}: {
  name: string;
  title: string;
  stars: number;
  levels: number;
  /** Stickers owned; the third figure when known. */
  stickers?: number | undefined;
  guest?: boolean;
  /** Clube member: the strip carries the member seal (cosmetic only). */
  member?: boolean;
  /** Has supported the project: a small "Apoiador" tag beside the title (thank-you only). */
  supporter?: boolean;
  heading?: 'h1' | 'h2';
  className?: string;
}) {
  const H = heading;
  const figures: [number, string][] = [
    [stars, stars === 1 ? 'estrela' : 'estrelas'],
    [levels, levels === 1 ? 'fase' : 'fases'],
    ...(stickers === undefined
      ? []
      : [[stickers, stickers === 1 ? 'figurinha' : 'figurinhas'] as [number, string]]),
  ];
  return (
    <div
      className={`lean w-full ${className} -rotate-1 rounded-[18px] p-2.5 text-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.65),0_2px_4px_rgb(0_0_0/0.25)]`}
      style={{ background: titleFrame(title) }}
    >
      <div className="overflow-hidden rounded-[10px]">
        <div className="flex items-center justify-between gap-3 bg-ink px-4 py-2 text-paper">
          <span className="font-condensed min-w-0 truncate text-xs font-extrabold tracking-[0.18em] uppercase">
            Sócio · De Cabeça F.C.
          </span>
          {member ? (
            <span className="font-condensed inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cover px-2.5 py-0.5 text-xs font-black tracking-[0.14em] whitespace-nowrap text-ink uppercase shadow-[0_1px_3px_rgb(0_0_0/0.4)]">
              <ClubeSeal className="size-3.5" />
              Sócio do Clube
            </span>
          ) : (
            <span className="font-condensed text-xs font-extrabold tracking-[0.18em] text-paper/70 uppercase">
              {guest ? 'Convidado' : 'Carteirinha'}
            </span>
          )}
        </div>
        <div
          className="member-field flex flex-col gap-4 px-4 pt-5 pb-4 sm:px-5"
          style={{ backgroundColor: titleTone(title) }}
        >
          <div className="flex items-center gap-4">
            <TitleBadge name={title} className="size-20 sm:size-24" />
            <div className="flex min-w-0 flex-col items-start gap-2">
              <H
                className={`font-condensed max-w-full leading-[0.85] font-black break-words uppercase ${
                  // Nicknames run to 20 characters: longer names step down so words stay whole.
                  name.length <= 8
                    ? 'text-[clamp(2.25rem,10vw,3.5rem)]'
                    : name.length <= 12
                      ? 'text-[clamp(1.9rem,8vw,3rem)]'
                      : 'text-[clamp(1.6rem,6.5vw,2.5rem)]'
                }`}
              >
                {name}
              </H>
              <p className="font-condensed rounded-md bg-ink px-2.5 py-1 text-lg leading-none font-black text-paper uppercase">
                <span className="sr-only">Título: </span>
                {title}
              </p>
              {supporter && <SupporterTag className="text-ink" />}
            </div>
          </div>
          <dl
            className="grid border-t-2 border-dashed border-ink/25 pt-3"
            style={{ gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))` }}
          >
            {figures.map(([n, label], i) => (
              <div
                key={label}
                className={`flex flex-col-reverse ${i ? 'border-l-2 border-ink/15 pl-3' : ''}`}
              >
                <dt className="text-xs font-bold tracking-wide text-ink/75 uppercase">{label}</dt>
                <dd className="font-condensed tabular flex items-center gap-1 text-4xl leading-none font-black">
                  {i === 0 && <StarIcon className="size-6" />}
                  {n}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
