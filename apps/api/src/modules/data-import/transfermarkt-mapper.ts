/**
 * Pure mapping from dcaribou/transfermarkt-datasets tables to knowledge-base rows
 * (DATA_SOURCES.md, "Transfermarkt datasets"). The data is scraped from Transfermarkt:
 * everything mapped here is stored as `imported`, never `verified`.
 */
import { normalizeName } from '@decabeca/engine';

/** Columns read from the dataset's CSVs (players, transfers, clubs, competitions). */
export type Row = Record<
  | 'player_id'
  | 'name'
  | 'first_name'
  | 'last_name'
  | 'date_of_birth'
  | 'country_of_citizenship'
  | 'position'
  | 'url'
  | 'transfer_date'
  | 'from_club_id'
  | 'to_club_id'
  | 'from_club_name'
  | 'to_club_name'
  | 'club_id'
  | 'domestic_competition_id'
  | 'competition_id'
  | 'country_name',
  string
>;
export type PositionGroup = 'GK' | 'DF' | 'MF' | 'FW';

/** RFC 4180 CSV (quoted fields, "" escapes, newlines inside quotes) -> rows keyed by header. */
export function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head = [], ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])) as Row);
}

// Transfermarkt country names (English) -> ISO 3166-1 alpha-2.
const REGIONS = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRY_ISO = new Map<string, string>();
for (let a = 65; a < 91; a++)
  for (let b = 65; b < 91; b++) {
    const iso = String.fromCharCode(a, b);
    const name = REGIONS.of(iso);
    if (name && name !== iso) COUNTRY_ISO.set(normalizeName(name), iso);
  }
const COUNTRY_ALIASES: Record<string, string> = {
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  'korea south': 'KR',
  'korea north': 'KP',
  'cote d ivoire': 'CI',
  turkey: 'TR',
  russia: 'RU',
  'czech republic': 'CZ',
  'bosnia herzegovina': 'BA',
  'dr congo': 'CD',
  congo: 'CG',
  'the gambia': 'GM',
  'cape verde': 'CV',
  'united states': 'US',
  'north macedonia': 'MK',
  curacao: 'CW',
};
for (const [n, iso] of Object.entries(COUNTRY_ALIASES)) COUNTRY_ISO.set(n, iso);
export const countryIso = (name: string) => COUNTRY_ISO.get(normalizeName(name)) ?? null;

export function positionGroup(position: string): PositionGroup | null {
  const groups: Record<string, PositionGroup> = {
    Goalkeeper: 'GK',
    Defender: 'DF',
    Midfield: 'MF',
    Attack: 'FW',
  };
  return groups[position] ?? null;
}

/** Same club-name key as scripts/research/import-matches.ts (drops FC/CF/... tokens). */
export const clubKey = (n: string) =>
  normalizeName(n)
    .replace(/\b(fc|cf|afc|sc|ac|ssc|as|cd|ud|sd|rc|ca|ec|se)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const YOUTH_NAME = /\b(u-?\d{2}|sub-?\d{2}|youth|juniores|primavera|ii|b)$/i;
/** Pseudo-clubs Transfermarkt uses as the destination of a transfer. */
const NOT_A_CLUB = new Set(['without club', 'unknown', 'retired', 'career break', 'ban']);

export interface TmSpell {
  clubId: string;
  clubName: string;
  spellType: 'professional' | 'loan' | 'youth';
  start: string | null; // YYYY-MM-DD
  end: string | null;
  loanFromClubId: string | null;
}

const monthsBetween = (a: string, b: string) =>
  (Date.parse(b) - Date.parse(a)) / (30.44 * 86_400_000);
/** A loan is a round trip: X -> Y and, within this many months, Y -> X. */
const LOAN_MAX_MONTHS = 24;

/**
 * One player's transfers (any order) -> club spells. A transfer closes the open spell and
 * opens one at the destination; the first transfer also yields the origin club with unknown
 * start. Transfermarkt's table has no loan marker, so loans are inferred (round trip).
 * Future-dated rows (scheduled moves) are not facts yet and are dropped.
 * ponytail: lender's own spell is split in two around the loan; merge if editors object.
 */
export type TransferRow = Pick<
  Row,
  'transfer_date' | 'from_club_id' | 'from_club_name' | 'to_club_id' | 'to_club_name'
>;
export function buildSpells(transfers: TransferRow[], today: string): TmSpell[] {
  const ts = [...transfers].sort((a, b) => a.transfer_date.localeCompare(b.transfer_date));
  const isClub = (id: string, name: string) => !!id && !NOT_A_CLUB.has(name.trim().toLowerCase());
  const spells: TmSpell[] = [];
  let open: TmSpell | null = null;
  const first = ts[0];
  if (first && isClub(first.from_club_id, first.from_club_name))
    spells.push(
      (open = {
        clubId: first.from_club_id,
        clubName: first.from_club_name,
        spellType: 'professional',
        start: null,
        end: null,
        loanFromClubId: null,
      }),
    );
  ts.forEach((t, i) => {
    const date = t.transfer_date.slice(0, 10);
    const future = date > today;
    if (open && !future) open.end = date;
    open = null;
    if (future || !isClub(t.to_club_id, t.to_club_name)) return;
    const back = ts.slice(i + 1).find((n) => n.to_club_id === t.from_club_id);
    const loan =
      !!back &&
      back.from_club_id === t.to_club_id &&
      monthsBetween(date, back.transfer_date.slice(0, 10)) <= LOAN_MAX_MONTHS;
    spells.push(
      (open = {
        clubId: t.to_club_id,
        clubName: t.to_club_name,
        spellType: loan
          ? 'loan'
          : YOUTH_NAME.test(t.to_club_name.trim())
            ? 'youth'
            : 'professional',
        start: date,
        end: null,
        loanFromClubId: loan ? t.from_club_id : null,
      }),
    );
  });
  return spells;
}
