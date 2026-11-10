const STAR = 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z';

/** One drawn star, for counts ("12 estrelas"); decorative, the number carries the meaning. */
export function StarIcon({ className = 'size-[0.8em]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      <path d={STAR} />
    </svg>
  );
}

/** 0–3 stars, drawn; text label for screen readers (never colour alone). `onCover` inks them for yellow grounds. */
export function Stars({
  n,
  size = 'size-5',
  onCover = false,
  animate = false,
}: {
  n: number;
  size?: string;
  onCover?: boolean;
  /** Stamp the earned stars one after another (the end of a level). */
  animate?: boolean;
}) {
  const filled = onCover ? 'fill-ink text-ink' : 'fill-cover text-gold';
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${n} de 3 estrelas`}>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`${size} ${i < n ? filled : `fill-none text-current ${onCover ? 'opacity-30' : 'opacity-40'}`} ${animate && i < n ? 'motion-safe:animate-[star-pop_360ms_var(--ease-emphasis)_both]' : ''}`}
          style={animate && i < n ? { animationDelay: `${400 + i * 110}ms` } : undefined}
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}
