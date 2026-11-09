/**
 * Word filter for names other players see: nicknames, league names, career footballers
 * (GROWTH_PLAN.md 2.8). Catches accents, l33t spelling, spaces or dots between letters and
 * repeated letters, without blocking innocent words that contain a short root
 * ("Disputa", "Enviado", "Cuca", "Pinto").
 */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

/** Lowercase letters only per word, l33t undone and repeated letters collapsed ("pooorra" -> "pora"). */
function words(input: string): string[] {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c]!)
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((w) => w.replace(/(.)\1+/g, '$1'));
}

// Roots are written with repeated letters already collapsed (caralho -> caralho, porra -> pora).
/** Long roots: blocked anywhere, even glued to other words or spelled with dots between letters. */
const ANYWHERE = [
  'caralh',
  'buceta',
  'boceta',
  'arombad',
  'piroca',
  'punheta',
  'xoxota',
  'filhodaputa',
  'filhadaputa',
  'vagabund',
  'retardad',
  'estupr',
  'pedofil',
  'hitler',
  'niger',
  'niga',
  'fagot',
  'cuzao',
  'xereca',
  'sapatao',
  'traveco',
  'fodase',
  'macaca',
  'macaco',
];
/** Short roots: blocked only as a whole word ("puta" yes, "disputa" no). */
const WHOLE = new Set([
  'puta',
  'puto',
  'putinha',
  'pora',
  'merda',
  'bosta',
  'cu',
  'cuzinho',
  'foda',
  'foder',
  'fode',
  'fdp',
  'pqp',
  'vsf',
  'tnc',
  'vtnc',
  'viado',
  'veado',
  'bicha',
  'corno',
  'nazi',
  'nazista',
  'xota',
  'rola',
  'piru',
  'kct',
  'krl',
  'crl',
]);

export function isOffensive(input: string): boolean {
  const ws = words(input);
  if (ws.some((w) => WHOLE.has(w))) return true;
  // Letters spelled apart ("p u t a", "p.u.t.a") join into one word for both checks.
  const glued = ws.join('');
  const singles = ws.filter((w) => w.length === 1).join('');
  if (singles.length >= 2 && WHOLE.has(singles)) return true;
  return ANYWHERE.some((r) => glued.includes(r));
}
