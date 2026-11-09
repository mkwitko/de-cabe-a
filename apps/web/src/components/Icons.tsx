/**
 * Drawn icons: one 24px grid, 2px round stroke, so the nav, the clock and the trophies share one
 * hand. Decorative by default (aria-hidden); the label sits next to them as text.
 */
import type { ReactNode } from 'react';

function Icon({ className = 'size-5', children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Jogos: an album page of four stickers. */
export const GamesIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" strokeDasharray="2.5 2" />
  </Icon>
);

/** Desafio do Dia: a calendar page. */
export const DailyIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="M10.5 15.2l1.2 1.2 2.6-2.8" />
  </Icon>
);

/** Ranking: the podium. */
export const RankingIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M9 20.5V9.5h6v11M3.5 20.5v-7H9M15 20.5V12h5.5v8.5M2.5 20.5h19" />
    <path d="M12 3.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 5.6l2-.3z" />
  </Icon>
);

/** Perfil: the player. */
export const ProfileIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
  </Icon>
);

export const ClockIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2M10 2.5h4" />
  </Icon>
);

export const TrophyIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" />
    <path d="M12 14v3.5M8.5 20.5h7l-.8-3h-5.4z" />
  </Icon>
);
