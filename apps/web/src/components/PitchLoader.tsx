/**
 * The waiting mark: a small pitch at night where the ball goes round three team-mates.
 * Decorative (aria-hidden): the caller says in words what is happening, in a role="status".
 * Under prefers-reduced-motion the ball rests at the first player's feet (index.css).
 */
export function PitchLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const w = size === 'sm' ? 'w-12' : size === 'lg' ? 'w-44 sm:w-56' : 'w-28';
  return (
    <svg viewBox="0 0 120 80" className={`pitch-loader ${w} shrink-0`} aria-hidden="true">
      <rect x="1" y="1" width="118" height="78" rx="6" className="pitch-loader-turf" />
      <g className="pitch-loader-lines" fill="none" strokeWidth="1.2">
        <rect x="6" y="6" width="108" height="68" rx="2" />
        <line x1="60" y1="6" x2="60" y2="74" />
        <circle cx="60" cy="40" r="11" />
        <rect x="6" y="24" width="14" height="32" />
        <rect x="100" y="24" width="14" height="32" />
      </g>
      <g className="pitch-loader-mates">
        <circle cx="34" cy="56" r="4" />
        <circle cx="60" cy="22" r="4" />
        <circle cx="88" cy="52" r="4" />
      </g>
      <circle cx="34" cy="50" r="2.6" className="pitch-loader-ball" />
    </svg>
  );
}
