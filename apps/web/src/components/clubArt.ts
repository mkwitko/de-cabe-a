// Our own club art, drawn from the club's colours: a deterministic SVG crest (shield, circle or
// diamond picked by a hash of the name) and a kit (shirt, shorts, socks). No real logos (trademark).
// Builders return SVG strings; the UI shows them as <img src="data:..."> so nothing is injected.

export const KIT_PATTERNS = ['stripes', 'hoops', 'sash', 'halves'] as const;
export type KitPattern = (typeof KIT_PATTERNS)[number];
export interface Kit {
  body: string;
  sleeves: string;
  shorts: string;
  socks: string;
  pattern?: KitPattern | undefined;
}

const HEX = /^#[0-9a-f]{6}$/i;
/** Only a valid #rrggbb reaches the markup; anything else becomes a neutral grey. */
const safe = (c: string) => (HEX.test(c) ? c.toLowerCase() : '#808080');

/** Black or white, whichever reads on the colour. */
export function contrast(hex: string): string {
  const n = Number.parseInt(safe(hex).slice(1), 16);
  const y = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return y > 150 ? '#111111' : '#ffffff';
}

export function hashOf(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** A pattern as rectangles/polygons painted over a box, in the second colour. */
function overlay(
  p: KitPattern | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  switch (p) {
    case 'stripes': {
      const s = w / 5;
      return [0, 2, 4]
        .map((i) => `<rect x="${x + i * s}" y="${y}" width="${s}" height="${h}" fill="${fill}"/>`)
        .join('');
    }
    case 'hoops': {
      const s = h / 5;
      return [1, 3]
        .map((i) => `<rect x="${x}" y="${y + i * s}" width="${w}" height="${s}" fill="${fill}"/>`)
        .join('');
    }
    case 'sash':
      return `<polygon points="${x},${y + h * 0.15} ${x},${y + h * 0.5} ${x + w},${y + h * 0.85} ${x + w},${y + h * 0.5}" fill="${fill}"/>`;
    case 'halves':
      return `<rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${h}" fill="${fill}"/>`;
    default:
      return '';
  }
}

const SHAPES = [
  'M12 8H88V50C88 76 66 90 50 96C34 90 12 76 12 50Z',
  'M50 4A46 46 0 1 1 49.900 4Z',
  'M50 3L97 50L50 97L3 50Z',
] as const;
const FONT = { 1: 36, 2: 30, 3: 24 } as const;

/** Letters shown on a crest: the club's initials (or up to three letters of a one-word name). */
export function initialsOf(name: string): string {
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

/** The crest: shape by hash of the name, field in the first colour, pattern and rim in the second. */
export function crestSvg(name: string, colours: [string, string], pattern?: KitPattern): string {
  const [a, b] = [safe(colours[0]), safe(colours[1])];
  const shape = SHAPES[hashOf(name) % SHAPES.length]!;
  const text = initialsOf(name).replace(/[^\p{L}\p{N}]/gu, '');
  const size = FONT[Math.min(3, Math.max(1, text.length)) as 1 | 2 | 3];
  const ink = contrast(a);
  const id = `c${hashOf(name + a + b).toString(36)}`;
  // The pattern defaults to a sash when the kit has none, so every crest carries the second colour.
  const body = overlay(pattern ?? 'sash', 0, 0, 100, 100, b);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs>` +
    `<path d="${shape}" fill="${a}"/><g clip-path="url(#${id})">${body}</g>` +
    `<path d="${shape}" fill="none" stroke="${b}" stroke-width="5" stroke-linejoin="round" clip-path="url(#${id})"/>` +
    `<path d="${shape}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="2" stroke-linejoin="round"/>` +
    `<text x="50" y="${50 + size * 0.36}" text-anchor="middle" font-family="Arial Narrow,Arial,sans-serif" font-weight="900" font-size="${size}" fill="${ink}" stroke="${contrast(ink)}" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${text}</text>` +
    `</svg>`
  );
}

/** A kit: shirt (body with pattern, sleeves), shorts and socks. */
export function kitSvg(kit: Kit): string {
  const [body, sleeves, shorts, socks] = [kit.body, kit.sleeves, kit.shorts, kit.socks].map(
    safe,
  ) as [string, string, string, string];
  const second = sleeves !== body ? sleeves : shorts !== body ? shorts : contrast(body);
  const edge = 'stroke="rgba(0,0,0,.4)" stroke-width="1.500" stroke-linejoin="round"';
  const id = `k${hashOf(body + sleeves + shorts + socks).toString(36)}`;
  const shirt = 'M32 4L44 1Q50 9 56 1L68 4V64H32Z';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150">` +
    `<defs><clipPath id="${id}"><path d="${shirt}"/></clipPath></defs>` +
    `<path d="M32 4L8 22L16 38L32 30Z" fill="${sleeves}" ${edge}/>` +
    `<path d="M68 4L92 22L84 38L68 30Z" fill="${sleeves}" ${edge}/>` +
    `<path d="${shirt}" fill="${body}"/><g clip-path="url(#${id})">${overlay(kit.pattern, 32, 1, 36, 63, second)}</g>` +
    `<path d="${shirt}" fill="none" ${edge}/>` +
    `<path d="M44 1Q50 9 56 1" fill="none" stroke="${contrast(body)}" stroke-width="2" opacity=".6"/>` +
    `<path d="M32 68H68L72 100H52L50 90L48 100H28Z" fill="${shorts}" ${edge}/>` +
    `<rect x="30" y="104" width="16" height="42" rx="3" fill="${socks}" ${edge}/>` +
    `<rect x="54" y="104" width="16" height="42" rx="3" fill="${socks}" ${edge}/>` +
    `</svg>`
  );
}

const uri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
const memo = new Map<string, string>();
const cached = (key: string, build: () => string) => {
  let v = memo.get(key);
  if (v === undefined) {
    if (memo.size > 3000) memo.clear();
    v = uri(build());
    memo.set(key, v);
  }
  return v;
};
/** Data URIs, memoised: thousands of clubs can be listed without rebuilding the markup. */
export const crestUri = (name: string, colours: [string, string], pattern?: KitPattern) =>
  cached(`c|${name}|${colours[0]}|${colours[1]}|${pattern ?? ''}`, () =>
    crestSvg(name, colours, pattern),
  );
export const kitUri = (kit: Kit) =>
  cached(`k|${kit.body}|${kit.sleeves}|${kit.shorts}|${kit.socks}|${kit.pattern ?? ''}`, () =>
    kitSvg(kit),
  );
