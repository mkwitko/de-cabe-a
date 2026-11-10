import type { ReactNode } from 'react';

/**
 * Flags drawn inline (30×20), simplified: stripes, crosses and the main emblem, no coats of arms.
 * Covers the nationalities in the knowledge base; any other code gets a neutral badge with it.
 */
type Spec = { h: string[] } | { v: string[] } | { draw: ReactNode };

const star = (cx: number, cy: number, r: number, fill: string) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.42 : r;
    return `${(cx + d * Math.cos(a)).toFixed(2)},${(cy + d * Math.sin(a)).toFixed(2)}`;
  });
  return <polygon points={pts.join(' ')} fill={fill} />;
};
const nordic = (bg: string, cross: string, inner?: string) => ({
  draw: (
    <>
      <rect width="30" height="20" fill={bg} />
      <path d="M0 10h30M11 0v20" stroke={cross} strokeWidth={inner ? 5 : 4} />
      {inner && <path d="M0 10h30M11 0v20" stroke={inner} strokeWidth="2.4" />}
    </>
  ),
});

const W = '#ffffff';
const B = '#0b3d91';
const K = '#111111';

const FLAGS: Record<string, Spec> = {
  BR: {
    draw: (
      <>
        <rect width="30" height="20" fill="#009c3b" />
        <path d="M15 2.2 27.4 10 15 17.8 2.6 10z" fill="#ffdf00" />
        <circle cx="15" cy="10" r="4.6" fill="#002776" />
        <path d="M10.6 9.2c3-1 6.2-.7 8.8.9" stroke={W} strokeWidth=".8" fill="none" />
      </>
    ),
  },
  AR: {
    draw: (
      <>
        <rect width="30" height="20" fill="#74acdf" />
        <rect y="6.67" width="30" height="6.67" fill={W} />
        <circle cx="15" cy="10" r="2" fill="#f6b40e" />
      </>
    ),
  },
  GB: {
    draw: (
      <>
        <rect width="30" height="20" fill="#012169" />
        <path d="M0 0l30 20M30 0 0 20" stroke={W} strokeWidth="4" />
        <path d="M0 0l30 20M30 0 0 20" stroke="#c8102e" strokeWidth="1.4" />
        <path d="M15 0v20M0 10h30" stroke={W} strokeWidth="6" />
        <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" />
      </>
    ),
  },
  ES: {
    draw: (
      <>
        <rect width="30" height="20" fill="#aa151b" />
        <rect y="5" width="30" height="10" fill="#f1bf00" />
      </>
    ),
  },
  DE: { h: [K, '#dd0000', '#ffce00'] },
  IT: { v: ['#009246', W, '#ce2b37'] },
  FR: { v: ['#002395', W, '#ed2939'] },
  JP: {
    draw: (
      <>
        <rect width="30" height="20" fill={W} />
        <circle cx="15" cy="10" r="6" fill="#bc002d" />
      </>
    ),
  },
  NL: { h: ['#ae1c28', W, '#21468b'] },
  PT: {
    draw: (
      <>
        <rect width="30" height="20" fill="#da291c" />
        <rect width="12" height="20" fill="#046a38" />
        <circle cx="12" cy="10" r="3.6" fill="#ffe900" />
        <circle cx="12" cy="10" r="2" fill="#da291c" />
      </>
    ),
  },
  UY: {
    draw: (
      <>
        <rect width="30" height="20" fill={W} />
        {[1, 3, 5, 7].map((i) => (
          <rect key={i} y={i * 2.22} width="30" height="2.22" fill="#0038a8" />
        ))}
        <rect width="11" height="11.1" fill={W} />
        <circle cx="5.5" cy="5.5" r="3" fill="#fcd116" />
      </>
    ),
  },
  CO: {
    draw: (
      <>
        <rect width="30" height="20" fill="#ce1126" />
        <rect width="30" height="15" fill="#003893" />
        <rect width="30" height="10" fill="#fcd116" />
      </>
    ),
  },
  EC: {
    draw: (
      <>
        <rect width="30" height="20" fill="#ed1c24" />
        <rect width="30" height="15" fill="#034ea2" />
        <rect width="30" height="10" fill="#ffdd00" />
        <circle cx="15" cy="10" r="2.4" fill="#7a5c2e" />
      </>
    ),
  },
  HR: {
    draw: (
      <>
        <rect width="30" height="20" fill={B} />
        <rect width="30" height="13.33" fill={W} />
        <rect width="30" height="6.67" fill="#ff0000" />
        <rect x="12" y="5" width="6" height="7" fill={W} stroke="#ff0000" strokeWidth=".6" />
        <path
          d="M12 5h2v2h-2zM16 5h2v2h-2zM14 7h2v2h-2zM12 9h2v2h-2zM16 9h2v2h-2z"
          fill="#ff0000"
        />
      </>
    ),
  },
  CL: {
    draw: (
      <>
        <rect width="30" height="20" fill="#d52b1e" />
        <rect width="30" height="10" fill={W} />
        <rect width="10" height="10" fill="#0039a6" />
        {star(5, 5, 2.6, W)}
      </>
    ),
  },
  PY: { h: ['#d52b1e', W, '#0038a8'] },
  BE: { v: [K, '#fdda24', '#ef3340'] },
  DK: nordic('#c8102e', W),
  NO: nordic('#ba0c2f', W, '#00205b'),
  SE: nordic('#006aa7', '#fecc00'),
  IS: nordic('#02529c', W, '#dc1e35'),
  CH: {
    draw: (
      <>
        <rect width="30" height="20" fill="#da291c" />
        <path d="M15 4.5v11M9.5 10h11" stroke={W} strokeWidth="3.4" />
      </>
    ),
  },
  RS: { h: ['#c6363c', '#0c4076', W] },
  AU: {
    draw: (
      <>
        <rect width="30" height="20" fill="#012169" />
        {star(7.5, 14.5, 2.4, W)}
        {star(23, 4.5, 1.3, W)}
        {star(19.5, 9.5, 1.3, W)}
        {star(26, 9, 1.3, W)}
        {star(23, 16, 1.3, W)}
      </>
    ),
  },
  TR: {
    draw: (
      <>
        <rect width="30" height="20" fill="#e30a17" />
        <circle cx="12" cy="10" r="5" fill={W} />
        <circle cx="13.3" cy="10" r="4" fill="#e30a17" />
        {star(18.6, 10, 2.3, W)}
      </>
    ),
  },
  CZ: {
    draw: (
      <>
        <rect width="30" height="20" fill="#d7141a" />
        <rect width="30" height="10" fill={W} />
        <path d="M0 0l15 10L0 20z" fill="#11457e" />
      </>
    ),
  },
  MX: {
    draw: (
      <>
        <rect width="30" height="20" fill="#ce1126" />
        <rect width="20" height="20" fill={W} />
        <rect width="10" height="20" fill="#006847" />
        <circle cx="15" cy="10" r="2.2" fill="#8c6a2e" />
      </>
    ),
  },
  US: {
    draw: (
      <>
        <rect width="30" height="20" fill={W} />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => (
          <rect key={i} y={i * 1.54} width="30" height="1.54" fill="#b22234" />
        ))}
        <rect width="12" height="10.8" fill="#3c3b6e" />
      </>
    ),
  },
  CM: {
    draw: (
      <>
        <rect width="30" height="20" fill="#fcd116" />
        <rect width="20" height="20" fill="#ce1126" />
        <rect width="10" height="20" fill="#007a5e" />
        {star(15, 10, 2.6, '#fcd116')}
      </>
    ),
  },
  PL: { h: [W, '#dc143c'] },
  PE: { v: ['#d91023', W, '#d91023'] },
  UA: { h: ['#0057b7', '#ffd700'] },
  CI: { v: ['#f77f00', W, '#009e60'] },
  AT: { h: ['#ed2939', W, '#ed2939'] },
  GR: {
    draw: (
      <>
        <rect width="30" height="20" fill="#0d5eaf" />
        {[1, 3, 5, 7].map((i) => (
          <rect key={i} y={i * 2.22} width="30" height="2.22" fill={W} />
        ))}
        <rect width="11.1" height="11.1" fill="#0d5eaf" />
        <path d="M5.55 0v11.1M0 5.55h11.1" stroke={W} strokeWidth="2.22" />
      </>
    ),
  },
  BA: {
    draw: (
      <>
        <rect width="30" height="20" fill="#002395" />
        <path d="M8 0h12v20z" fill="#fecb00" />
      </>
    ),
  },
  MA: {
    draw: (
      <>
        <rect width="30" height="20" fill="#c1272d" />
        <polygon
          points="15,5.2 16.9,11 12,7.4 18,7.4 13.1,11"
          fill="none"
          stroke="#006233"
          strokeWidth=".9"
        />
      </>
    ),
  },
  SN: {
    draw: (
      <>
        <rect width="30" height="20" fill="#e31b23" />
        <rect width="20" height="20" fill="#fdef42" />
        <rect width="10" height="20" fill="#00853f" />
        {star(15, 10, 2.6, '#00853f')}
      </>
    ),
  },
  IE: { v: ['#169b62', W, '#ff883e'] },
  RO: { v: ['#002b7f', '#fcd116', '#ce1126'] },
  NG: { v: ['#008751', W, '#008751'] },
  SI: { h: [W, '#005da4', '#ed1c24'] },
  GH: {
    draw: (
      <>
        <rect width="30" height="20" fill="#006b3f" />
        <rect width="30" height="13.33" fill="#fcd116" />
        <rect width="30" height="6.67" fill="#ce1126" />
        {star(15, 10, 2.8, K)}
      </>
    ),
  },
  RU: { h: [W, '#0039a6', '#d52b1e'] },
  HU: { h: ['#cd2a3e', W, '#436f4d'] },
  BO: { h: ['#d52b1e', '#f9e300', '#007934'] },
  KR: {
    draw: (
      <>
        <rect width="30" height="20" fill={W} />
        <circle cx="15" cy="10" r="5" fill="#003478" />
        <path d="M10 10a5 5 0 0 1 10 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 0-5 0z" fill="#cd2e3a" />
      </>
    ),
  },
  SK: { h: [W, '#0b4ea2', '#ee1c25'] },
  ME: {
    draw: (
      <>
        <rect width="30" height="20" fill="#d4af37" />
        <rect x="1" y="1" width="28" height="18" fill="#c40308" />
        <circle cx="15" cy="10" r="3" fill="#d4af37" />
      </>
    ),
  },
  MK: {
    draw: (
      <>
        <rect width="30" height="20" fill="#ce2028" />
        <path
          d="M15 10 0 0h5zM15 10 30 0h-5zM15 10 0 20h5zM15 10l15 10h-5zM15 10 0 8v4zM15 10l15-2v4zM15 10 13 0h4zM15 10l-2 10h4z"
          fill="#f9d616"
        />
        <circle cx="15" cy="10" r="2.6" fill="#f9d616" stroke="#ce2028" strokeWidth=".5" />
      </>
    ),
  },
  AL: {
    draw: (
      <>
        <rect width="30" height="20" fill="#e41e20" />
        <path d="M15 5l3 3-1 1 3 2-3 0-2 4-2-4h-3l3-2-1-1z" fill={K} />
      </>
    ),
  },
  IR: { h: ['#239f40', W, '#da0000'] },
  CR: {
    draw: (
      <>
        <rect width="30" height="20" fill="#002b7f" />
        <rect y="3.33" width="30" height="13.33" fill={W} />
        <rect y="6.67" width="30" height="6.67" fill="#ce1126" />
      </>
    ),
  },
  TN: {
    draw: (
      <>
        <rect width="30" height="20" fill="#e70013" />
        <circle cx="15" cy="10" r="5" fill={W} />
        <circle cx="15.6" cy="10" r="3.4" fill="#e70013" />
        <circle cx="16.6" cy="10" r="2.8" fill={W} />
        {star(16.8, 10, 1.6, '#e70013')}
      </>
    ),
  },
  VE: { h: ['#ffcc00', '#00247d', '#cf142b'] },
  ZA: {
    draw: (
      <>
        <rect width="30" height="20" fill={W} />
        <rect width="30" height="8" fill="#e03c31" />
        <rect y="12" width="30" height="8" fill="#001489" />
        <path d="M0 0l13 10L0 20" fill="none" stroke={W} strokeWidth="5" />
        <path d="M0 0l13 10L0 20M13 10h17" fill="none" stroke="#007749" strokeWidth="3.2" />
        <path d="M0 3l9 7-9 7z" fill="#ffb612" />
        <path d="M0 5l6.4 5L0 15z" fill={K} />
      </>
    ),
  },
  DZ: {
    draw: (
      <>
        <rect width="30" height="20" fill={W} />
        <rect width="15" height="20" fill="#006233" />
        <circle cx="15" cy="10" r="4.4" fill="#d21034" />
        <circle cx="16.3" cy="10" r="3.6" fill={W} />
        {star(17.4, 10, 1.8, '#d21034')}
      </>
    ),
  },
  BG: { h: [W, '#00966e', '#d62612'] },
  EG: { h: ['#ce1126', W, K] },
  CA: {
    draw: (
      <>
        <rect width="30" height="20" fill="#d80621" />
        <rect x="7.5" width="15" height="20" fill={W} />
        {star(15, 10, 3.6, '#d80621')}
      </>
    ),
  },
  GA: { h: ['#009e60', '#fcd116', '#3a75c4'] },
  ML: { v: ['#14b53a', '#fcd116', '#ce1126'] },
  GE: {
    draw: (
      <>
        <rect width="30" height="20" fill={W} />
        <path d="M15 0v20M0 10h30" stroke="#ff0000" strokeWidth="3.4" />
      </>
    ),
  },
  NZ: {
    draw: (
      <>
        <rect width="30" height="20" fill="#00247d" />
        {star(22, 5, 1.6, '#cc142b')}
        {star(19, 10, 1.6, '#cc142b')}
        {star(25, 9, 1.4, '#cc142b')}
        {star(22, 15.5, 1.8, '#cc142b')}
      </>
    ),
  },
};

export function Flag({
  code,
  name,
  className = '',
}: {
  code?: string | undefined;
  name: string;
  className?: string;
}) {
  const spec = code ? FLAGS[code.toUpperCase()] : undefined;
  if (!spec)
    return (
      <span role="img" aria-label={name} title={name} className={`flag-badge ${className}`}>
        {code?.toUpperCase().slice(0, 3) ?? '—'}
      </span>
    );
  const body =
    'draw' in spec
      ? spec.draw
      : 'h' in spec
        ? spec.h.map((c, i) => (
            <rect
              key={i}
              y={(20 / spec.h.length) * i}
              width="30"
              height={20 / spec.h.length}
              fill={c}
            />
          ))
        : spec.v.map((c, i) => (
            <rect
              key={i}
              x={(30 / spec.v.length) * i}
              width={30 / spec.v.length}
              height="20"
              fill={c}
            />
          ));
  return (
    <svg viewBox="0 0 30 20" role="img" aria-label={name} className={className}>
      <title>{name}</title>
      {body}
    </svg>
  );
}
