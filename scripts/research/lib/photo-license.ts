// Pure helpers for the Commons photo importer (tested in apps/api/src/lib/photo-license.test.ts).

/** Free licences we accept: CC0, public domain, CC BY, CC BY-SA. NC/ND, GFDL-only, fair use: no. */
export function isFreeLicense(short: string | null | undefined): boolean {
  const s = (short ?? '').trim().toLowerCase();
  if (!s || /\b(nc|nd)\b|non-?commercial|no ?deriv/.test(s)) return false;
  return /^(cc0|cc[- ]zero|public domain|pd[- ]|pd$)/.test(s) || /^cc[- ]by(-sa)?[- ]\d/.test(s);
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Commons Artist is HTML ("<a href=..>Name</a>"): plain text, entities decoded, max 200 chars. */
export function cleanArtist(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code =
          e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}
