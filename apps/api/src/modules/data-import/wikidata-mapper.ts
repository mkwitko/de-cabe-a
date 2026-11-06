/**
 * Pure mapping from Wikidata entities to knowledge-base rows (DATA_SOURCES.md §2).
 * Properties: P54 member of sports team (+ P580 start, P582 end, P1642 acquisition
 * transaction), P413 position, P27 citizenship, P569 birth, P1477 birth name, P17 country,
 * P571 inception, P297 ISO code. Everything mapped here is stored as `imported`.
 */
import { normalizeName } from '@decabeca/engine';
import type { WikidataClaim, WikidataEntity, WikidataValue } from './wikidata-client';

export type Precision = 'day' | 'month' | 'year' | 'unknown';
export type PositionGroup = 'GK' | 'DF' | 'MF' | 'FW';

export interface Lookups {
  clubs: Record<string, WikidataEntity>;
  /** country QID -> ISO 3166-1 alpha-2 */
  countryIso: Record<string, string>;
  /** position QID -> English label */
  positionLabels: Record<string, string>;
}

export interface MappedSpell {
  clubQid: string;
  spellType: 'professional' | 'loan' | 'youth';
  startDate: Date | null;
  startPrecision: Precision;
  endDate: Date | null;
  endPrecision: Precision;
  loanFromClubQid: string | null;
}

export interface MappedPlayer {
  player: {
    wikidataId: string;
    canonicalName: string;
    fullName: string | null;
    birthDate: Date | null;
    birthDatePrecision: Precision;
    nationalityIso: string | null;
    secondaryNationalityIso: string | null;
    primaryPositionGroup: PositionGroup | null;
    secondaryPositionGroups: PositionGroup[];
  };
  aliases: {
    alias: string;
    normalized: string;
    kind: 'canonical' | 'full' | 'variant';
    isPrimary: boolean;
  }[];
  spells: MappedSpell[];
}

const LOAN = 'Q2914547';
const NATIONAL_TEAM_CLASSES = new Set([
  'Q6979593',
  'Q135408445',
  'Q21945604',
  'Q23759293',
  'Q23901123',
]);
const NATIONAL_TEAM_NAME = /\b(national|seleção|selección|nazionale|nationalmannschaft)\b/i;
const YOUTH_NAME = /\b(sub|u)-?\d{2}\b|\bjuniores\b|\byouth\b|\breserves?\b|\bB$|\bII$/i;

const itemId = (v: WikidataValue | undefined) =>
  v && typeof v === 'object' && 'id' in v ? v.id : undefined;
const snakValue = (claim: { datavalue?: { value: WikidataValue } } | undefined) =>
  claim?.datavalue?.value;

/** Preferred-rank claims first, then normal; deprecated ones dropped. */
const claims = (e: WikidataEntity, p: string): WikidataClaim[] => {
  const all = (e.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated');
  return [
    ...all.filter((c) => c.rank === 'preferred'),
    ...all.filter((c) => c.rank !== 'preferred'),
  ];
};

const label = (e: WikidataEntity) => e.labels?.pt?.value ?? e.labels?.en?.value ?? e.id;

export function parseWikidataTime(
  v: WikidataValue | undefined,
): { date: Date; precision: Precision } | null {
  if (!v || typeof v !== 'object' || !('time' in v)) return null;
  const m = /^([+-]\d+)-(\d{2})-(\d{2})/.exec(v.time);
  if (!m) return null;
  const precision: Precision =
    v.precision >= 11
      ? 'day'
      : v.precision === 10
        ? 'month'
        : v.precision === 9
          ? 'year'
          : 'unknown';
  const year = Number(m[1]);
  const month = precision === 'year' ? 1 : Math.max(1, Number(m[2]));
  const day = precision === 'day' ? Math.max(1, Number(m[3])) : 1;
  return { date: new Date(Date.UTC(year, month - 1, day)), precision };
}

export function positionGroup(label: string): PositionGroup | null {
  if (/goalkeeper/i.test(label)) return 'GK';
  if (/back|defender|sweeper|libero/i.test(label)) return 'DF';
  if (/midfield/i.test(label)) return 'MF';
  if (/forward|striker|winger|attacker/i.test(label)) return 'FW';
  return null;
}

export function isNationalTeam(club: WikidataEntity): boolean {
  const classes = claims(club, 'P31').map((c) => itemId(snakValue(c.mainsnak)));
  return (
    classes.some((id) => id && NATIONAL_TEAM_CLASSES.has(id)) ||
    NATIONAL_TEAM_NAME.test(club.labels?.en?.value ?? '') ||
    NATIONAL_TEAM_NAME.test(club.labels?.pt?.value ?? '')
  );
}

export function mapClub(club: WikidataEntity, lookups: Lookups) {
  const country = itemId(snakValue(claims(club, 'P17')[0]?.mainsnak));
  return {
    wikidataId: club.id,
    name: label(club),
    shortName: label(club), // editorial short name is set during verification
    countryIso: (country && lookups.countryIso[country]) || null,
    foundedYear:
      parseWikidataTime(snakValue(claims(club, 'P571')[0]?.mainsnak))?.date.getUTCFullYear() ??
      null,
  };
}

export function mapPlayer(e: WikidataEntity, lookups: Lookups): MappedPlayer {
  const nationalities = claims(e, 'P27')
    .map((c) => itemId(snakValue(c.mainsnak)))
    .map((id) => (id ? lookups.countryIso[id] : undefined))
    .filter((iso): iso is string => !!iso);
  const birth = parseWikidataTime(snakValue(claims(e, 'P569')[0]?.mainsnak));
  const fullNameValue = snakValue(claims(e, 'P1477')[0]?.mainsnak);
  const fullName =
    fullNameValue && typeof fullNameValue === 'object' && 'text' in fullNameValue
      ? fullNameValue.text
      : null;
  const positions = [
    ...new Set(
      claims(e, 'P413')
        .map((c) => itemId(snakValue(c.mainsnak)))
        .map((id) => (id ? positionGroup(lookups.positionLabels[id] ?? '') : null))
        .filter((g): g is PositionGroup => g !== null),
    ),
  ];
  const position = positions[0] ?? null;

  const canonicalName = label(e);
  const aliases: MappedPlayer['aliases'] = [];
  const addAlias = (alias: string | null | undefined, kind: 'canonical' | 'full' | 'variant') => {
    if (!alias) return;
    const normalized = normalizeName(alias);
    if (!normalized || aliases.some((a) => a.normalized === normalized)) return;
    aliases.push({ alias, normalized, kind, isPrimary: kind === 'canonical' });
  };
  addAlias(canonicalName, 'canonical');
  addAlias(fullName, 'full');
  for (const lang of ['pt', 'en'])
    for (const a of e.aliases?.[lang] ?? []) addAlias(a.value, 'variant');
  // The pt label is sometimes the full name (Dida is "Nelson de Jesus Silva"); other
  // languages keep the name fans use.
  for (const lang of ['mul', 'en', 'es', 'it']) addAlias(e.labels?.[lang]?.value, 'variant');

  const spells: MappedSpell[] = [];
  for (const c of claims(e, 'P54')) {
    const clubQid = itemId(snakValue(c.mainsnak));
    const club = clubQid ? lookups.clubs[clubQid] : undefined;
    if (!clubQid || !club || isNationalTeam(club)) continue;
    const start = parseWikidataTime(snakValue(c.qualifiers?.P580?.[0]));
    const end = parseWikidataTime(snakValue(c.qualifiers?.P582?.[0]));
    const isLoan = (c.qualifiers?.P1642 ?? []).some((q) => itemId(snakValue(q)) === LOAN);
    spells.push({
      clubQid,
      spellType: isLoan ? 'loan' : YOUTH_NAME.test(label(club)) ? 'youth' : 'professional',
      startDate: start?.date ?? null,
      startPrecision: start?.precision ?? 'unknown',
      endDate: end?.date ?? null,
      endPrecision: end?.precision ?? 'unknown',
      loanFromClubQid: null,
    });
  }
  // Wikidata rarely records the lender: take the most recent professional spell open when
  // the loan started (year-only dates make several overlap). The editor confirms it (DQ-03).
  for (const loan of spells.filter((s) => s.spellType === 'loan' && s.startDate)) {
    const t = loan.startDate!.getTime();
    const open = spells.filter(
      (s) =>
        s.spellType === 'professional' &&
        s.clubQid !== loan.clubQid &&
        s.startDate &&
        s.startDate.getTime() <= t &&
        (!s.endDate || s.endDate.getTime() >= t),
    );
    open.sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime());
    loan.loanFromClubQid = open[0]?.clubQid ?? null;
  }

  return {
    player: {
      wikidataId: e.id,
      canonicalName,
      fullName,
      birthDate: birth?.date ?? null,
      birthDatePrecision: birth?.precision ?? 'unknown',
      nationalityIso: nationalities[0] ?? null,
      secondaryNationalityIso: nationalities.find((n) => n !== nationalities[0]) ?? null,
      primaryPositionGroup: position,
      secondaryPositionGroups: positions.slice(1),
    },
    aliases,
    spells,
  };
}
