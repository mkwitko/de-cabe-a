import { StarIcon } from './Stars';
import { titleTone } from '../lib/format';

/** Shield badge in the title's colour; locked ones are a dashed outline. Decorative: the name is next to it. */
export function TitleBadge({
  name,
  locked = false,
  className = 'size-10',
}: {
  name: string;
  locked?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center text-ink ${className}`}
    >
      <svg viewBox="0 0 40 46" className="absolute inset-0 size-full">
        <path
          d="M20 2 36 7v14c0 10.500-6.800 17.500-16 21.500C10.800 38.500 4 31.500 4 21V7z"
          fill={locked ? 'none' : titleTone(name)}
          stroke="currentColor"
          strokeOpacity={locked ? 0.45 : 1}
          strokeDasharray={locked ? '3 3' : undefined}
          strokeWidth="2.500"
          strokeLinejoin="round"
        />
        {name === 'Rei da Bola' && !locked && (
          <path d="M11 6 14 0l6 4 6-4 3 6z" fill="currentColor" />
        )}
      </svg>
      <StarIcon className={`relative size-[42%] ${locked ? 'opacity-45' : ''}`} />
    </span>
  );
}
