/**
 * Club structure from real signals (facilities, playing style, youth policy, market taste).
 * Pure mappings used by scripts/club-pack/import-fm.ts; documented in data/FONTES.md.
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** FM corporate_facilities_code (1..20: basic 1-2, fairly basic 3-5, adequate 6-9, average 10-12, good 13-14, excellent 15+) to 1..5. */
export function corporateLevel(code: number | null): number | null {
  if (code === null || !(code >= 1)) return null; // 0 / missing: no signal
  if (code <= 2) return 1;
  if (code <= 5) return 2;
  if (code <= 9) return 3;
  if (code <= 12) return 4;
  return 5;
}

/**
 * Facility levels: the FM corporate-facilities rating averaged with the reputation-derived
 * level (`repLevel`, the old estimate) for training and medical; youth adds one level for a
 * CBF "Clube Formador" certificate and one more when the first team's minutes come mostly from
 * academy players (>= 40%). With no FM rating the reputation level stands.
 */
export function facilitiesFrom(input: {
  repLevel: number;
  corporateCode: number | null;
  certified: boolean;
  academyShare: number | null;
}): { training: number; youth: number; medical: number } {
  const corp = corporateLevel(input.corporateCode);
  const base = corp === null ? input.repLevel : clamp((input.repLevel + corp) / 2, 1, 5);
  const youth = clamp(
    base + (input.certified ? 1 : 0) + ((input.academyShare ?? 0) >= 0.4 ? 1 : 0),
    1,
    5,
  );
  return { training: base, youth, medical: base };
}

const STOP = new Set([
  'saf', 'ltda', 'me', 'sociedade', 'anonima', 'do', 'de', 'da', 'futebol', 'clube', 'club', 'fc',
  'esporte', 'ec', 'sa', 's', 'a', 'e', 'foot', 'ball', 'sport', 'sports', 'associacao', 'sc',
]); // prettier-ignore

/** Name key for matching the CBF list against FM names: accents, legal forms and generic words out. */
export function clubKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .sort()
    .join(' ');
}

export function isCertified(names: string[], listKeys: Set<string>): boolean {
  return names.some((n) => {
    const k = clubKey(n);
    return k !== '' && listKeys.has(k);
  });
}

/** Team rates per 90 minutes from the FM season stats (summed over the squad's rows). */
export type StyleRates = {
  passes: number;
  progressive: number;
  pressures: number;
  clearances: number;
  crosses: number;
  sprints: number;
  lost: number;
};

/** Percentile (0..100) of `x` among `all`. */
export function percentile(x: number, all: number[]): number {
  if (all.length < 2) return 50;
  let below = 0;
  for (const a of all) if (a < x) below++;
  return Math.round((100 * below) / (all.length - 1));
}

/**
 * The seven style axes as percentiles of the club among its peers' rates:
 * possession = passes; verticality = progressive passes per pass; pressing = pressures;
 * block (height) = few clearances; width = crosses; tempo = high-intensity sprints;
 * risk = possession lost. Bounded to 10..90 so no club is a caricature.
 */
export function styleFrom(r: StyleRates, cohort: StyleRates[]) {
  const p = (f: (s: StyleRates) => number) => clamp(percentile(f(r), cohort.map(f)), 10, 90);
  const vert = (s: StyleRates) => (s.passes > 0 ? s.progressive / s.passes : 0);
  return {
    possession: p((s) => s.passes),
    verticality: p(vert),
    pressing: p((s) => s.pressures),
    block: p((s) => -s.clearances),
    width: p((s) => s.crosses),
    tempo: p((s) => s.sprints),
    risk: p((s) => s.lost),
  };
}

/** Academy share of minutes (0..1) to the 0..100 youthPolicy score: half the minutes = 95. */
export const youthPolicyFrom = (share: number) => clamp((100 * share) / 0.5, 5, 95);

/**
 * Market taste from the squad: mean age 21 -> 10, 31 -> 90 (readyVsYoung); national reach
 * (regionalVsNational) = 25 + 400 x foreign share + 50 x share not formed at the club, 5..95.
 */
export function marketFrom(meanAge: number, foreignShare: number, notFormedHereShare: number) {
  return {
    readyVsYoung: clamp(10 + ((meanAge - 21) * 80) / 10, 5, 95),
    regionalVsNational: clamp(25 + 400 * foreignShare + 50 * notFormedHereShare, 5, 95),
  };
}
