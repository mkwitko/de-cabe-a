// Pure parsers for scripts/club-pack/fetch-cities.ts (IBGE SIDRA, NASA POWER, Wikidata WKT, club
// names). No network here, so they are unit-tested (cities.test.ts).

/** Folds case and accents: "São João" -> "sao joao". */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** SIDRA's JSON: a header row, then one row per value ("V" is text, "-", "..." and "X" mean none). */
export function parseSidra(rows: Record<string, string>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows.slice(1)) {
    const v = Number(r.V);
    if (r.D1C && Number.isFinite(v) && /^\d+(\.\d+)?$/.test(r.V ?? '')) out.set(r.D1C, v);
  }
  return out;
}

/** Wikidata's "Point(lon lat)" literal. */
export function parseWkt(s: string | undefined): { lat: number; lon: number } | null {
  const m = /Point\(([-\d.eE+]+) ([-\d.eE+]+)\)/i.exec(s ?? '');
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
}

const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export type Month = { rainMm: number; tempC: number; humidity: number };

/**
 * NASA POWER climatology (PRECTOTCORR mm/day, T2M C, RH2M %) -> 12 monthly normals; rain becomes
 * mm a month. A -999 fill value or a missing month makes the whole answer unusable (null).
 */
export function monthsFromPower(body: {
  properties?: { parameter?: Record<string, Record<string, number>> };
}): Month[] | null {
  const p = body.properties?.parameter;
  const rain = p?.PRECTOTCORR;
  const temp = p?.T2M;
  const hum = p?.RH2M;
  if (!rain || !temp || !hum) return null;
  const out: Month[] = [];
  for (const [i, m] of MONTHS.entries()) {
    const r = rain[m];
    const t = temp[m];
    const h = hum[m];
    if (r === undefined || t === undefined || h === undefined) return null;
    if (r < 0 || t < -90 || h < 0) return null;
    out.push({
      rainMm: Math.round(r * DAYS[i]!),
      tempC: Math.round(t * 10) / 10,
      humidity: Math.round(h),
    });
  }
  return out;
}

const GENERIC = new Set(
  (
    'clube futebol esporte esportes esportivo sport sporting associacao atletica atletico sociedade ' +
    'recreativo recreativa football club saf ltda sc ec fc ac cd de do da dos das e s a regatas ' +
    'desportivo desportiva futsal'
  ).split(' '),
);

/**
 * Municipality named by a club ("Sport Club Genus de Porto Velho" -> Porto Velho), only on
 * conservative evidence: the name ends "de/do/da <municipality>", or what is left of the name after
 * the generic words (clube, esporte, saf...) is exactly the municipality. `names` maps a folded
 * municipality name to its candidates (ibge, uf); several candidates need the "(UF)" tag.
 */
export function municipalityInClubName(
  club: string,
  names: Map<string, { ibge: string; uf: string }[]>,
): string | null {
  const tag = /\(([A-Za-z]{2})\)/.exec(club)?.[1]?.toUpperCase();
  const f = fold(club.replace(/\([^)]*\)/g, ' '));
  const words = f.split(' ');
  const rest = words.filter((w) => !GENERIC.has(w)).join(' ');
  const cands: string[] = [];
  for (let i = 0; i < words.length; i++)
    if (['de', 'do', 'da'].includes(words[i]!) && i > 0) cands.push(words.slice(i + 1).join(' '));
  cands.push(rest);
  for (const c of cands) {
    const hit = names.get(c);
    if (!hit) continue;
    const ok = tag ? hit.filter((h) => h.uf === tag) : hit;
    if (ok.length === 1) return ok[0]!.ibge;
  }
  return null;
}
