/** A club as a round album sticker: initials on a colour derived from the name (no logos, PRODUCT.md). */
export function clubInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-Z0-9]+$/.test(w));
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function hue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function ClubBadge({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const h = hue(name);
  return (
    <span
      aria-hidden="true"
      className={`font-condensed grid shrink-0 place-items-center rounded-full border-2 border-paper font-black text-white shadow-[0_2px_4px_rgb(0_0_0/0.3)] ${size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-14 text-base' : 'size-11 text-sm'}`}
      style={{ background: `oklch(0.5 0.15 ${h})` }}
    >
      {clubInitials(name)}
    </span>
  );
}
