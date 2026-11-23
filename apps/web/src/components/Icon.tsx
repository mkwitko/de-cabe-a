/** One stroke icon set, drawn here (24px grid, 2px stroke, round caps). */
const PATHS = {
  back: 'M15 18l-6-6 6-6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  share: 'M12 15V3M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  cross: 'M7 7l10 10M17 7L7 17',
  skip: 'M6 6l7 6-7 6M17 6v12',
  info: 'M12 17v-6M12 7.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  // Modo Clube rooms (career rail).
  desk: 'M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6l2-8z',
  shirt: 'M8 3l4 2 4-2 5 4-3 4-2-1.5V21H8V9.5L6 11 3 7l5-4z',
  cone: 'M12 3l5 15H7l5-15zM4 21h16M9.3 11h5.4',
  transfer: 'M4 8h14l-4-4M20 16H6l4 4',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8',
  exit: 'M10 5H5v14h5M15 8l4 4-4 4M19 12H9',
  forward: 'M5 12h14M13 6l6 6-6 6',
} as const;

export function Icon({
  name,
  className = 'size-5',
}: {
  name: keyof typeof PATHS;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
