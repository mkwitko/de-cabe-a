import { titleEmblem, titleTone, type TitleEmblem } from '../lib/format';

/** Five-point star polygon centred on (x, y). */
const star = (x: number, y: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const k = i % 2 ? r * 0.45 : r;
    return `${(x + k * Math.cos(a)).toFixed(2)},${(y + k * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

/** Each title's mark inside the shield, drawn on the 40×46 grid in ink. */
const EMBLEM: Record<TitleEmblem, React.ReactNode> = {
  cone: (
    <>
      <path d="M20 12 27 30H13z" fill="currentColor" />
      <path d="M16.2 22h7.6" stroke="var(--color-paper)" strokeWidth="2.2" />
      <path d="M11 30.5h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  ball: (
    <>
      <circle cx="20" cy="22" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <polygon points="20,17.6 24.2,20.6 22.6,25.5 17.4,25.5 15.8,20.6" fill="currentColor" />
    </>
  ),
  '12': (
    <text
      x="20"
      y="28.5"
      textAnchor="middle"
      className="font-condensed"
      fontSize="17"
      fontWeight="900"
      fill="currentColor"
    >
      12
    </text>
  ),
  shirt: (
    <path
      d="M16 13 10.5 16l2 5.2 2.6-1V31h9.8V20.2l2.6 1 2-5.2L24 13c-.8 1.7-2.2 2.6-4 2.6s-3.2-.9-4-2.6z"
      fill="currentColor"
    />
  ),
  C: (
    <>
      <rect x="10" y="15" width="20" height="14" rx="2.5" fill="currentColor" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        className="font-condensed"
        fontSize="13"
        fontWeight="900"
        fill="var(--color-paper)"
      >
        C
      </text>
    </>
  ),
  star: <polygon points={star(20, 22.5, 9.5)} fill="currentColor" />,
  stars2: (
    <>
      <polygon points={star(14.5, 22.5, 6)} fill="currentColor" />
      <polygon points={star(25.5, 22.5, 6)} fill="currentColor" />
    </>
  ),
  stars3: (
    <>
      <polygon points={star(20, 17.5, 5.5)} fill="currentColor" />
      <polygon points={star(13.5, 26, 5.5)} fill="currentColor" />
      <polygon points={star(26.5, 26, 5.5)} fill="currentColor" />
    </>
  ),
  ring: (
    <>
      <circle cx="20" cy="22.5" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <polygon points={star(20, 22.5, 6.5)} fill="currentColor" />
    </>
  ),
  crown: (
    <>
      <path d="M11.5 29 10 16l5.5 4.5L20 13l4.5 7.5L30 16l-1.5 13z" fill="currentColor" />
      <path d="M12 32h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
};

/**
 * Shield badge in the title's colour with its own emblem. Locked ones keep their colour faded
 * and a dashed edge, so the reward stays visible. Decorative: the name is next to it.
 */
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
    <svg
      viewBox="0 0 40 46"
      aria-hidden="true"
      className={`block shrink-0 ${locked ? 'text-chalk-soft' : 'text-ink'} ${className}`}
      style={{ filter: locked ? undefined : 'drop-shadow(0 2px 2px rgb(0 0 0 / 0.25))' }}
    >
      <path
        d="M20 2 36 7v14c0 10.5-6.8 17.5-16 21.5C10.8 38.5 4 31.5 4 21V7z"
        fill={titleTone(name)}
        fillOpacity={locked ? 0.35 : 1}
        stroke="currentColor"
        strokeOpacity={locked ? 0.5 : 1}
        strokeDasharray={locked ? '3 3' : undefined}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <g opacity={locked ? 0.55 : 1}>{EMBLEM[titleEmblem(name)]}</g>
    </svg>
  );
}
