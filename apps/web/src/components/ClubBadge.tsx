import { crestUri, type KitPattern } from './clubArt';

export { initialsOf as clubInitials } from './clubArt';

function hue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** The club's colour at a given lightness (the badge field, the Trajetória stamp ink). */
export const clubColor = (name: string, l = 0.5) => `oklch(${l} 0.15 ${hue(name)})`;

/** Crest colours when the club has no kit data: a hash of the name (NOT the real colours). */
const fallbackColours = (name: string): [string, string] => {
  const h = hue(name);
  const hsl = (l: number) => {
    const k = (n: number) => (n + h / 30) % 12;
    const a = 0.45 * Math.min(l, 1 - l);
    const f = (n: number) =>
      Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
        .toString(16)
        .padStart(2, '0');
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  return [hsl(0.4), '#f4f1e8'];
};

const SIZE = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-11',
  lg: 'size-14',
  xl: 'size-16 sm:size-24',
} as const;

/** A club crest: our own SVG from the club's colours (shape by hash of the name), never a real logo. */
export function ClubBadge({
  name,
  size = 'md',
  colours,
  pattern,
}: {
  name: string;
  size?: keyof typeof SIZE;
  colours?: [string, string];
  pattern?: KitPattern | undefined;
}) {
  return (
    <img
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${SIZE[size]} shrink-0 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]`}
      src={crestUri(name, colours ?? fallbackColours(name), pattern)}
    />
  );
}
