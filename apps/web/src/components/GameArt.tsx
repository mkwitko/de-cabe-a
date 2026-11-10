/**
 * One drawn picture per game for the home carousel: flat shapes in the album palette (paper,
 * cover yellow, ink, pitch), on a chalk-lined pitch panel. Decorative: the card's text says it.
 */
import type { GameMode } from '@decabeca/contracts';
import type { ReactNode } from 'react';

const PAPER = 'var(--color-paper)';
const COVER = 'var(--color-cover)';
const INK = 'var(--color-ink)';
const CHALK = 'var(--color-chalk)';

/** A shirt, centered on (x, y), `s` = scale. */
function Shirt({
  x,
  y,
  s = 1,
  fill = PAPER,
  mark,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  mark?: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M-12 -20 L-4 -24 Q0 -20 4 -24 L12 -20 L22 -10 L15 -2 L11 -5 L11 22 L-11 22 L-11 -5 L-15 -2 L-22 -10 Z"
        fill={fill}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {mark}
    </g>
  );
}

const q = (x: number, y: number, size = 16) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    fontSize={size}
    fontWeight={900}
    fill={INK}
    fontFamily="inherit"
  >
    ?
  </text>
);

/** Career Path has no cover art: its passport is drawn by CareerPathCard. */
export type CoverMode = Exclude<GameMode, 'CAREER_PATH'>;

const ART: Record<CoverMode, ReactNode> = {
  FOOTBALL_GRID: (
    <>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const filled = (r + c) % 2 === 0 && !(r === 1 && c === 1);
          return (
            <rect
              key={`${r}${c}`}
              x={64 + c * 26}
              y={14 + r * 32}
              width={22}
              height={28}
              rx={4}
              fill={filled ? PAPER : 'transparent'}
              stroke={filled ? INK : CHALK}
              strokeWidth={2.5}
              strokeDasharray={filled ? undefined : '4 4'}
            />
          );
        }),
      )}
      <rect
        x={90}
        y={46}
        width={22}
        height={28}
        rx={4}
        fill={COVER}
        stroke={INK}
        strokeWidth={2.5}
      />
      <path
        d="M95 60 l4 5 l8 -9"
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  IMPOSTOR: (
    <>
      <Shirt x={40} y={64} s={0.95} />
      <Shirt x={80} y={64} s={0.95} />
      <Shirt x={120} y={64} s={0.95} fill={COVER} mark={q(0, 10, 18)} />
      <Shirt x={160} y={64} s={0.95} />
    </>
  ),
  TIMELINE: (
    <>
      <path d="M22 70 H180" stroke={CHALK} strokeWidth={3} strokeLinecap="round" />
      <path
        d="M172 62 l10 8 l-10 8"
        fill="none"
        stroke={CHALK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[40, 80, 120, 160].map((x, i) => (
        <g key={x}>
          <rect
            x={x - 14}
            y={i % 2 ? 26 : 34}
            width={28}
            height={28}
            rx={6}
            fill={i === 2 ? COVER : PAPER}
            stroke={INK}
            strokeWidth={2.5}
          />
          <text
            x={x}
            y={(i % 2 ? 26 : 34) + 20}
            textAnchor="middle"
            fontSize={15}
            fontWeight={900}
            fill={INK}
          >
            {i + 1}
          </text>
          <circle cx={x} cy={70} r={4} fill={CHALK} />
        </g>
      ))}
    </>
  ),
  HIGHER_LOWER: (
    <>
      <Shirt x={62} y={66} s={1.1} />
      <Shirt x={138} y={66} s={1.1} fill={COVER} />
      <path
        d="M100 30 v52"
        stroke={CHALK}
        strokeWidth={2.5}
        strokeDasharray="3 6"
        strokeLinecap="round"
      />
      <path
        d="M163 46 l8 -10 l8 10 M171 36 v24"
        fill="none"
        stroke={CHALK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 74 l8 10 l8 -10 M29 84 v-24"
        fill="none"
        stroke={CHALK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  MISSING_XI: (
    <>
      <rect
        x={24}
        y={10}
        width={152}
        height={100}
        rx={6}
        fill="none"
        stroke={CHALK}
        strokeWidth={2.5}
      />
      <path d="M100 10 v100 M24 40 h20 v40 h-20" fill="none" stroke={CHALK} strokeWidth={2.5} />
      <circle cx={100} cy={60} r={14} fill="none" stroke={CHALK} strokeWidth={2.5} />
      {[
        [36, 60],
        [62, 26],
        [62, 48],
        [62, 72],
        [62, 94],
        [92, 34],
        [92, 60],
        [92, 86],
        [132, 30],
        [140, 60],
        [132, 90],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={8}
            fill={i === 6 || i === 9 ? COVER : PAPER}
            stroke={INK}
            strokeWidth={2.5}
          />
          {(i === 6 || i === 9) && q(x!, y! + 5, 12)}
        </g>
      ))}
    </>
  ),
  MYSTERY_PLAYER: (
    <>
      <Shirt x={100} y={62} s={1.6} fill={COVER} mark={q(0, 12, 26)} />
      {[
        [36, 40],
        [164, 40],
        [44, 88],
        [156, 88],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x! - 14}
          y={y! - 9}
          width={28}
          height={18}
          rx={9}
          fill={i % 2 ? PAPER : 'transparent'}
          stroke={i % 2 ? INK : CHALK}
          strokeWidth={2.5}
        />
      ))}
    </>
  ),
  CONNECTIONS: (
    <>
      {[0, 1, 2, 3].flatMap((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect
            key={`${r}${c}`}
            x={52 + c * 25}
            y={10 + r * 25}
            width={21}
            height={21}
            rx={4}
            fill={r === 0 ? COVER : r === 1 ? PAPER : 'transparent'}
            stroke={r < 2 ? INK : CHALK}
            strokeWidth={2.5}
          />
        )),
      )}
    </>
  ),
  DRAFT: (
    <>
      <path
        d="M24 110 V30 H176 V110 M70 30 v20 h60 v-20"
        fill="none"
        stroke={CHALK}
        strokeWidth={2.5}
      />
      {[
        [100, 100],
        [46, 82],
        [80, 86],
        [120, 86],
        [154, 82],
        [64, 62],
        [100, 64],
        [136, 62],
        [52, 42],
        [100, 40],
        [148, 42],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={7.5}
          fill={i === 9 ? 'transparent' : i === 8 ? COVER : PAPER}
          stroke={i === 9 ? CHALK : INK}
          strokeWidth={2.5}
          strokeDasharray={i === 9 ? '3 3' : undefined}
        />
      ))}
      <path d="M100 18 v12" stroke={CHALK} strokeWidth={3} strokeLinecap="round" />
      <path
        d="M94 24 l6 7 l6 -7"
        fill="none"
        stroke={CHALK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function GameArt({ mode, className = '' }: { mode: CoverMode; className?: string }) {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true" className={className}>
      {ART[mode]}
    </svg>
  );
}
