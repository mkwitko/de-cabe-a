/**
 * Parser for OpenFootball's Football.TXT match files (CC0): "= Title", "▪ Stage" headers, date
 * lines ("Sat Apr 13 2024", year carried over) and match lines
 * "18:30  Team A  v Team B  2-1 (0-0)" with "a.e.t." and "pen." variants.
 */
export interface TxtMatch {
  stage: string | null;
  date: Date | null;
  home: string;
  away: string;
  /** ISO-2 country from the team's FIFA tag ("(URU)"), when the file gives it. */
  homeCountry: string | null;
  awayCountry: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
} as const;

/** Score after extra time when there was one (penalties are not goals). */
export function parseScore(s: string): [number, number] | null {
  const aet = /(\d+)-(\d+)\s*a\.e\.t\./.exec(s);
  if (aet) return [Number(aet[1]), Number(aet[2])];
  if (/pen\./.test(s)) {
    const ft = /\((\d+)-(\d+)/.exec(s);
    return ft ? [Number(ft[1]), Number(ft[2])] : null;
  }
  const m = /^(\d+)-(\d+)/.exec(s.trim());
  return m ? [Number(m[1]), Number(m[2])] : null;
}

// FIFA codes used by OpenFootball's continental files -> ISO-2 (as our Country table).
const FIFA: Record<string, string> = {
  ARG: 'AR',
  BRA: 'BR',
  URU: 'UY',
  PAR: 'PY',
  CHI: 'CL',
  COL: 'CO',
  PER: 'PE',
  ECU: 'EC',
  BOL: 'BO',
  VEN: 'VE',
  MEX: 'MX',
  ENG: 'GB',
  SCO: 'GB',
  WAL: 'GB',
  ESP: 'ES',
  ITA: 'IT',
  GER: 'DE',
  FRA: 'FR',
  POR: 'PT',
  NED: 'NL',
  BEL: 'BE',
  TUR: 'TR',
  SUI: 'CH',
  AUT: 'AT',
  GRE: 'GR',
  UKR: 'UA',
  RUS: 'RU',
  CRO: 'HR',
  SRB: 'RS',
  CZE: 'CZ',
  DEN: 'DK',
  SWE: 'SE',
  NOR: 'NO',
  POL: 'PL',
  ROU: 'RO',
  BUL: 'BG',
  HUN: 'HU',
  SVK: 'SK',
  SVN: 'SI',
  ISR: 'IL',
  CYP: 'CY',
  KAZ: 'KZ',
  BLR: 'BY',
  AZE: 'AZ',
  SCG: 'RS',
};
export const countryOf = (t: string) => FIFA[/\(([A-Z]{3})\)\s*$/.exec(t)?.[1] ?? ''] ?? null;

/** "AC Milan (ITA)" -> "AC Milan"; "Vasco da Gama RJ" -> "Vasco da Gama". */
export const cleanTeam = (t: string) =>
  t
    .replace(/\s*\([A-Z]{3}\)\s*$/, '')
    .replace(/\s+[A-Z]{2}$/, '')
    .trim();

export function parseFootballTxt(text: string): { title: string; matches: TxtMatch[] } {
  let title = '';
  let stage: string | null = null;
  let year: number | null = null;
  let date: Date | null = null;
  const matches: TxtMatch[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (line.startsWith('= ')) {
      title = line.slice(2).trim();
      year = Number(/\b(19|20)\d{2}\b/.exec(title)?.[0]) || null;
      continue;
    }
    if (line.startsWith('▪')) {
      stage = line.replace('▪', '').trim();
      continue;
    }
    const d =
      /^\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/.exec(
        line,
      );
    if (d) {
      if (d[3]) year = Number(d[3]);
      const month = MONTHS[d[1] as keyof typeof MONTHS];
      if (year !== null && month !== undefined)
        date = new Date(Date.UTC(year, month, Number(d[2])));
      continue;
    }
    const m = /^\s*(?:\d{1,2}[:.]\d{2}\s+)?(.+?)\s+v\s+(.+?)(?:\s{2,}(\d.*))?$/.exec(line);
    if (!m || !m[1] || !m[2]) continue;
    const score = m[3] ? parseScore(m[3]) : null;
    matches.push({
      stage,
      date,
      home: cleanTeam(m[1]),
      away: cleanTeam(m[2]),
      homeCountry: countryOf(m[1]),
      awayCountry: countryOf(m[2]),
      homeScore: score?.[0] ?? null,
      awayScore: score?.[1] ?? null,
    });
  }
  return { title, matches };
}

// Self-check (ponytail: one runnable check for the parser): tsx scripts/research/lib/football-txt.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = `= Copa do Brasil 2025

▪ Round 1
  Tue Feb 18 2025
    18:00  Tocantinópolis TO       v Atlético Mineiro         0-2 (0-0)
  Wed Feb 19
    19:30  São Raimundo RR         v Grêmio Porto Alegre      1-4 pen. 1-4 a.e.t. (1-1, 0-0)
           Capital DF              v Portuguesa RJ            5-3 pen. (0-0)
    21:00  AC Milan (ITA)          v Newcastle United FC (ENG)  2-1 a.e.t. (1-1, 0-0)
           Clube A                 v Clube B`;
  const r = parseFootballTxt(sample);
  const ok = (c: boolean, msg: string) => {
    if (!c) throw new Error(msg);
  };
  ok(r.title === 'Copa do Brasil 2025', 'title');
  ok(r.matches.length === 5, `count ${r.matches.length}`);
  ok(r.matches[0]!.home === 'Tocantinópolis' && r.matches[0]!.awayScore === 2, 'basic');
  ok(r.matches[1]!.date?.toISOString().slice(0, 10) === '2025-02-19', 'date carry');
  ok(r.matches[1]!.homeScore === 1 && r.matches[1]!.awayScore === 4, 'aet over pens');
  ok(r.matches[2]!.homeScore === 0 && r.matches[2]!.awayScore === 0, 'pens only: ft');
  ok(r.matches[3]!.home === 'AC Milan' && r.matches[3]!.homeScore === 2, 'aet, country tag');
  ok(r.matches[3]!.homeCountry === 'IT' && r.matches[3]!.awayCountry === 'GB', 'country codes');
  ok(r.matches[4]!.homeScore === null, 'unplayed');
  console.log('football-txt ok');
}
