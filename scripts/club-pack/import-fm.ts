// Modo Clube real pack from the owner's own FM26 save export (ADR-014 item 2, note of 2026-11-17).
// Reads a folder of CSVs (untrusted data: parsed, never executed), builds a `kind: 'real'` pack,
// validates it with PackSchema and prints a quality report. Neither the CSVs nor the output are
// committed (apps/api/club-packs/ is gitignored).
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/import-fm.ts <csv-dir> [out.json.gz]
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  ATTRIBUTES,
  MENTAL,
  PHYSICAL,
  TACTICAL,
  TECHNICAL,
  TRAITS,
  fork,
  rngFrom,
  type AttributeId,
  type Attributes,
} from '../../packages/match-engine/src/index';
import {
  PEAK,
  PackSchema,
  economy,
  estimatedBody,
  staffing,
  type Pack,
  type PackClub,
  type PackPlayer,
} from '../../packages/club-domain/src/index';
import { realDivisions } from '../../packages/club-domain/src/generate/competitions';
import {
  clubKey,
  facilitiesFrom,
  isCertified,
  marketFrom,
  styleFrom,
  youthPolicyFrom,
  type StyleRates,
} from '../../packages/club-domain/src/generate/structure';
import { FIRST_NAMES, LAST_NAMES, NICKNAMES } from '../../packages/club-domain/src/generate/names';

import { parseCsv } from './lib/csv';
import { parseDerbies, resolveRivals } from './lib/rivals';

const BRAZIL = '189';
/** The save was exported in December 2026 (last played fixture 2026-12-17); the pack opens 2027. */
const SEASON = 2027;
/**
 * PARÂMETRO: money. The save's base currency is GBP (check: Atlético-MG pays 625,951 a week in the
 * save, about R$ 4.4 million at 7.0, which matches the club's real payroll). The pack counts
 * wages per MONTH and money in BRL (finance/career wage sum is posted monthly).
 */
const GBP_TO_BRL = 7.0;
const WEEKS_PER_MONTH = 52 / 12;
const monthlyBrl = (weekly: number) => Math.round(weekly * WEEKS_PER_MONTH * GBP_TO_BRL);
const brl = (gbp: number) => Math.round(gbp * GBP_TO_BRL);

/**
 * How a club is run (mapa de conhecimento §2.4): data/governance.json, researched with a source
 * per club (2026-11-18), matched by name or alias and state. A SAF owned by a multi-club group
 * (City Football Group, Red Bull, Eagle, 777) or a company is a groupSaf; another SAF an
 * ownedSaf; else an association. Without research, a FM26 legal name with "SAF" in it.
 */
const fold = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const GOVERNANCE = (
  JSON.parse(readFileSync(new URL('./data/governance.json', import.meta.url), 'utf8')) as {
    clubs: {
      club: string;
      state: string | null;
      model: 'saf' | 'empresa' | 'associacao' | null;
      owner: string | null;
      source: string | null;
      aliases?: string[];
    }[];
  }
).clubs.filter((g) => g.model && g.source);
const GROUPS = /city football|red bull|eagle|777/i;
let governanceResearched = 0;
function modelOf(name: string, short: string, state: string | undefined) {
  const names = [fold(name), fold(short)];
  const g = GOVERNANCE.find(
    (x) => x.state === state && [x.club, ...(x.aliases ?? [])].some((n) => names.includes(fold(n))),
  );
  if (g) {
    governanceResearched++;
    if (g.model === 'associacao') return 'association' as const;
    return g.model === 'empresa' || GROUPS.test(g.owner ?? '')
      ? ('groupSaf' as const)
      : ('ownedSaf' as const);
  }
  return /\bSAF\b/.test(name) ? ('ownedSaf' as const) : ('association' as const);
}

// ── Money: real cash and debt (data/finances-audited.json, data/finances.json) ──────────────────
// Cash: the audited 2025 balance sheet (7 clubs), else CASH_SHARE of revenue (median of those 7:
// 2.1 %, flagged estimate). Debt: the audited gross loans, else the press total debt (Anresf 2025,
// finances.json), held to DEBT_CAP x revenue: the game repays the pack's debt in five years, and
// real clubs service the rest over decades (Lei SAF: 20 % of monthly revenue). Revenue: audited or
// press 2025, else the economy's payroll over PAYROLL_SHARE (the dev pack's 55-76 % of income).
const PAYROLL_SHARE = 0.65;
const CASH_SHARE = 0.021;
const DEBT_CAP = 0.8;
interface RealMoney {
  revenue: number | null;
  cash: number | null;
  debt: number | null;
}
const MONEY = new Map<string, RealMoney>();
{
  type Num = { value: number } | null;
  const dir = new URL('./data/', import.meta.url);
  const press = JSON.parse(readFileSync(new URL('finances.json', dir), 'utf8')) as {
    clubs: {
      club: string;
      division: string;
      revenueTotal: number | null;
      totalDebt: number | null;
    }[];
  };
  const audited = JSON.parse(readFileSync(new URL('finances-audited.json', dir), 'utf8')) as {
    clubs: {
      club: string;
      values: Record<string, Num | undefined>;
      extra?: Record<string, Num | undefined>;
    }[];
  };
  for (const p of press.clubs)
    if (p.division.startsWith('br-'))
      MONEY.set(fold(p.club), { revenue: p.revenueTotal, cash: null, debt: p.totalDebt });
  for (const a of audited.clubs) {
    const m = MONEY.get(fold(a.club));
    if (!m) continue;
    m.revenue = a.values.revenueTotal?.value ?? m.revenue;
    m.cash = a.values.cash?.value ?? null;
    m.debt = a.values.grossDebt?.value ?? a.extra?.loansAndFinancing?.value ?? m.debt;
  }
}
// Pack short names that differ from the research's.
const MONEY_ALIAS: Record<string, string> = {
  vasco: 'vasco da gama',
  'rb bragantino': 'red bull bragantino',
  'operario (pr)': 'operario-pr',
  'vila nova (go)': 'vila nova',
  'botafogo (sp)': 'botafogo-sp',
  'athletic (mg)': 'athletic-mg',
  sport: 'sport recife',
};
function realMoney(name: string, short: string): RealMoney | undefined {
  const k = fold(short || name);
  return MONEY.get(MONEY_ALIAS[k] ?? k) ?? MONEY.get(fold(name));
}

const [, , dirArg, outArg] = process.argv;
if (!dirArg) {
  console.error('usage: import-fm.ts <csv-dir> [out.json.gz]');
  process.exit(1);
}
const DIR = resolve(dirArg);
const OUT = resolve(
  outArg ?? fileURLToPath(new URL('../../apps/api/club-packs/br-fm26-1.json.gz', import.meta.url)),
);

const manifest: Pack['manifest'] = [];
function load(file: string, note?: string) {
  const path = join(DIR, file);
  const buf = readFileSync(path);
  const rows = parseCsv(buf.toString('utf8'));
  manifest.push({
    file,
    sha256: createHash('sha256').update(buf).digest('hex'),
    rows: rows.length,
    importedAt: new Date(statSync(path).mtimeMs).toISOString(),
    ...(note ? { note } : {}),
  });
  return rows;
}

const num = (s: string | undefined, d = 0) => {
  const n = Number(s);
  return s !== undefined && s !== '' && Number.isFinite(n) ? n : d;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
const clamp99 = (v: number) => clamp(v, 1, 99);
const clamp20 = (v: number) => clamp(v, 1, 20);

// ── Report ───────────────────────────────────────────────────────────────────────────────────────

const report = {
  drops: {} as Record<string, number>,
  estimated: {} as Record<string, number>,
  notes: [] as string[],
};
const drop = (why: string) => (report.drops[why] = (report.drops[why] ?? 0) + 1);
const est = (what: string) => (report.estimated[what] = (report.estimated[what] ?? 0) + 1);

// ── Source tables ────────────────────────────────────────────────────────────────────────────────

const t0 = Date.now();
const clubRows = load('clubs.csv');
const playerRows = load('players.csv', 'raw_attributes_* (1..100), positions_* and personality_*');
const stadiumRows = load('stadiums.csv');
const financeRows = load('finances.csv', 'latest month per club');
const sponsorRows = load('sponsorships.csv');
const tableRows = load('league-tables.csv', 'competitions 124/136/137/2227 = Série A/B/C/D');
const fixtureRows = load(
  'fixtures.csv',
  'played results of competitions 124/136/137/2227: 2026 play-offs and knockouts',
);
const contractRows = load('contracts.csv', 'clauses (JSON): release fees, see clauseOf');
const injuryRows = load('injuries.csv', 'history rows: injury proneness, see injuryBump');
const staffRows = load('staff.csv', 'head coaches: see headCoachOf');
console.log(`read CSVs in ${Date.now() - t0} ms`);

const nations = (
  JSON.parse(readFileSync(new URL('./data/fm-nations.json', import.meta.url), 'utf8')) as {
    map: Record<string, string>;
  }
).map;

// ── Competitions: which clubs play the four national divisions in 2026, and in 2027 ─────────────
// competitions.csv has no names. Identified by famous clubs in league-tables.csv: 124 holds
// Flamengo and Palmeiras (38 rounds), 136 CRB, Juventude, Cuiabá (Série B), 137 Amazonas, Caxias,
// Paysandu (Série C, 20 clubs) and 2227 is sixteen tables of six (Série D, 96 clubs).
const clubByTeam = new Map<string, string>();
for (const c of clubRows)
  for (const t of JSON.parse(c.teams || '[]') as { team_id: number }[])
    clubByTeam.set(String(t.team_id), c.uid);
const tables = (competition: string) =>
  tableRows
    .filter((r) => r.competition_id === competition)
    .map((r) =>
      (JSON.parse(r.rows) as { position: number; team_id: number }[])
        .sort((a, b) => a.position - b.position)
        .map((x) => clubByTeam.get(String(x.team_id))),
    );
const whole = (competition: string, size: number) => {
  const t = tables(competition).find((x) => x.length === size && x.every(Boolean));
  if (!t) throw new Error(`competition ${competition}: no table of ${size} clubs`);
  return t as string[];
};
const serieA = whole('124', 20);
const serieB = whole('136', 20);
const serieC = whole('137', 20);
const groupsD = tables('2227').filter((x) => x.length === 6 && x.every(Boolean)) as string[][];
if (groupsD.length !== 16) throw new Error(`Série D: ${groupsD.length} groups of six, expected 16`);
const serieD = groupsD.flat();
const inDivision = new Map<string, number>(); // club uid -> tier in 2026
[serieA, serieB, serieC, serieD].forEach((d, i) => d.forEach((u) => inDivision.set(u, i + 1)));
if (inDivision.size !== 156) throw new Error(`divisions overlap or repeat: ${inDivision.size}/156`);

// 2026 promotion and relegation (05 §8), from the save's own finished season.
type Tie = { clubs: [string, string]; goals: Record<string, number> };
const fixturesOf = (competition: string) =>
  fixtureRows.filter((r) => r.competition_id === competition && r.played === 'true');
const clubOfTeam = (t: string) => {
  const u = clubByTeam.get(t);
  if (!u) throw new Error(`fixture team ${t} has no club`);
  return u;
};
/** Two-leg ties: the matches grouped by pair, goals added up (no away-goals rule). */
function tiesOf(rows: Record<string, string>[]): Tie[] {
  const m = new Map<string, Tie>();
  for (const r of rows) {
    const [h, a] = [clubOfTeam(r.home_team_id!), clubOfTeam(r.away_team_id!)];
    const key = [h, a].sort().join('|');
    const t = m.get(key) ?? { clubs: [h, a].sort() as [string, string], goals: { [h]: 0, [a]: 0 } };
    t.goals[h]! += num(r.home_goals);
    t.goals[a]! += num(r.away_goals);
    m.set(key, t);
  }
  return [...m.values()];
}
/** Winner on aggregate; a level aggregate goes to `tie` (the save's fixtures hold no penalties). */
const winnerOf = (t: Tie, tie: (a: string, b: string) => string) =>
  t.goals[t.clubs[0]]! === t.goals[t.clubs[1]]!
    ? tie(...t.clubs)
    : t.goals[t.clubs[0]]! > t.goals[t.clubs[1]]!
      ? t.clubs[0]
      : t.clubs[1];
const better = (table: string[]) => (a: string, b: string) =>
  table.indexOf(a) < table.indexOf(b) ? a : b;

// Série B: two up direct and two through the play-off (3rd v 6th, 4th v 5th). The play-off is every
// match of competition 136 outside the 38-round stage.
const stageSizes = new Map<string, number>();
for (const r of fixturesOf('136'))
  stageSizes.set(r.stage_id!, (stageSizes.get(r.stage_id!) ?? 0) + 1);
const bMain = [...stageSizes].sort((x, y) => y[1] - x[1])[0]![0];
const bPlayoff = tiesOf(fixturesOf('136').filter((r) => r.stage_id !== bMain));
if (
  bPlayoff.length !== 2 ||
  !bPlayoff.every((t) => t.clubs.every((u) => serieB.indexOf(u) >= 2 && serieB.indexOf(u) <= 5))
)
  throw new Error('Série B play-off: expected two ties between 3rd and 6th');
const bUp = [...serieB.slice(0, 2), ...bPlayoff.map((t) => winnerOf(t, better(serieB)))];
// Série C: the top two of each group of four go up; the bottom two of the 20-club table go down.
const groupsC = tables('137').filter((x) => x.length === 4 && x.every(Boolean)) as string[][];
if (groupsC.length !== 2) throw new Error(`Série C: ${groupsC.length} groups of four, expected 2`);
const cUp = groupsC.flatMap((g) => g.slice(0, 2));
const cDown = serieC.slice(18);
// Série D: the four semi-finalists go up, and so do the two winners of the play-off between the four
// quarter-final losers (six, 05 §8).
const dRounds = fixturesOf('2227');
const clubsIn = (round: string) =>
  new Set(
    dRounds
      .filter((r) => r.round === round)
      .flatMap((r) => [clubOfTeam(r.home_team_id!), clubOfTeam(r.away_team_id!)]),
  );
const semis = clubsIn('semi_final');
const quarterLosers = new Set([...clubsIn('quarter_final')].filter((u) => !semis.has(u)));
const dPlayoff = tiesOf(
  dRounds.filter(
    (r) =>
      quarterLosers.has(clubOfTeam(r.home_team_id!)) &&
      quarterLosers.has(clubOfTeam(r.away_team_id!)),
  ),
);
if (semis.size !== 4 || quarterLosers.size !== 4 || dPlayoff.length !== 2)
  throw new Error('Série D knockout: expected 4 semi-finalists and a play-off of 2 ties');
const dUp = [
  ...semis,
  ...dPlayoff.map((t) =>
    winnerOf(t, () => {
      throw new Error('Série D play-off level on aggregate: penalties are not in the save');
    }),
  ),
];
const aDown = serieA.slice(16);
const bDown = serieB.slice(16);
const without = (xs: string[], ...out: string[][]) =>
  xs.filter((u) => !out.some((o) => o.includes(u)));
const reputation = new Map(clubRows.map((c) => [c.uid, num(c.reputation)]));
const seeded = (xs: string[]) =>
  [...xs].sort((a, b) => reputation.get(b)! - reputation.get(a)! || Number(a) - Number(b));
const a27 = seeded([...without(serieA, aDown), ...bUp]);
const b27 = seeded([...without(serieB, bUp, bDown), ...aDown, ...cUp]);
const c27 = seeded([...without(serieC, cUp, cDown), ...bDown, ...dUp]);
const d27keep = [...without(serieD, dUp), ...cDown];
if ([a27.length, b27.length, c27.length].join() !== '20,20,24' || d27keep.length !== 92)
  throw new Error(`2027 divisions: ${[a27, b27, c27, d27keep].map((x) => x.length)}`);
report.notes.push(
  `2026 -> 2027 (from the save's final tables and knockouts): Série A down ${aDown.length}, Série B up ${bUp.length} (2 direct + 2 play-off) and down ${bDown.length}, Série C up ${cUp.length} and down ${cDown.length}, Série D up ${dUp.length} (4 semi-finalists + 2 play-off winners). Série C 2027 has 24 clubs, as 05 §8.`,
);

// ── Clubs in scope ───────────────────────────────────────────────────────────────────────────────

const clubById = new Map(clubRows.map((c) => [c.uid, c]));
const brazilianMen = (u: string) => {
  const c = clubById.get(u);
  return c !== undefined && c.nation_id === BRAZIL && c.gender === 'men';
};
// Squads (MC-017, 03 §1.3, market MAX_SQUAD = 42): the senior squad is FM's first team
// (team_slot 0). Reserve and U18 slots (1, 2) stay out; a club with fewer than MIN_SQUAD seniors
// is topped up from its reserves, best first; a club above MAX_SQUAD loses its lowest-rated.
const MIN_SQUAD = 22;
const MAX_SQUAD = 42;
const byClub = new Map<string, Record<string, string>[]>();
for (const p of playerRows) {
  if (!p.club_uid) drop('player without club');
  else if (!brazilianMen(p.club_uid)) drop('player at a club outside the Brazilian men clubs');
  else (byClub.get(p.club_uid) ?? byClub.set(p.club_uid, []).get(p.club_uid)!).push(p);
}
const ability = (p: Record<string, string>) => num(p.ability_current);
const isKeeper = (p: Record<string, string>) => num(p.positions_gk) >= 15;
const squadOf = new Map<string, Record<string, string>[]>();
/** What is left of each club's under-20 (slot 1) and under-17 (slot 2) teams after the top-up. */
const youthRowsOf = new Map<string, Record<string, string>[]>();
for (const [uid, rows] of byClub) {
  const senior = rows.filter((p) => p.team_slot === '0');
  const rest = rows.filter((p) => p.team_slot !== '0').sort((a, b) => ability(b) - ability(a));
  while (senior.length < MIN_SQUAD && rest.length) {
    senior.push(rest.shift()!);
    est('squad: reserve promoted to reach 22 seniors');
  }
  // two keepers at least: the best reserve keeper comes up when the first team has fewer
  while (senior.filter(isKeeper).length < 2 && rest.some(isKeeper)) {
    senior.push(rest.splice(rest.findIndex(isKeeper), 1)[0]!);
    est('squad: reserve keeper promoted to reach 2 keepers');
  }
  for (let i = 0; i < rest.length; i++)
    drop('player in a reserve or U18 slot, outside the senior squad');
  youthRowsOf.set(uid, rest);
  if (senior.length > MAX_SQUAD) {
    senior.sort((a, b) => ability(b) - ability(a));
    const kept = senior.slice(0, MAX_SQUAD);
    const cut = senior.slice(MAX_SQUAD);
    // never trim away the second keeper
    while (kept.filter(isKeeper).length < 2 && cut.some(isKeeper)) {
      const gk = cut.splice(cut.findIndex(isKeeper), 1)[0]!;
      const out = [...kept].reverse().find((p) => !isKeeper(p))!;
      kept.splice(kept.indexOf(out), 1, gk);
      cut.push(out);
    }
    for (let i = 0; i < cut.length; i++)
      drop('senior player over the 42 squad limit (lowest rated)');
    squadOf.set(uid, kept);
  } else squadOf.set(uid, senior);
}
// Série D 2027 has 96 places and 92 known members: the four best-reputed clubs of the save outside
// every division (state-championship qualifiers in real life) fill it.
const placed = new Set([...a27, ...b27, ...c27, ...d27keep]);
const fill = seeded([...squadOf.keys()].filter((u) => !placed.has(u))).slice(
  0,
  96 - d27keep.length,
);
const d27 = seeded([...d27keep, ...fill]);
report.estimated['division: Série D 2027 place filled by an outside club'] = fill.length;
const scope = new Set<string>([...squadOf.keys(), ...a27, ...b27, ...c27, ...d27]);
for (const u of scope)
  if (!brazilianMen(u)) throw new Error(`division club ${u} is not a Brazilian men club`);

// ── Players ──────────────────────────────────────────────────────────────────────────────────────

type Position = PackPlayer['positions'][number]['position'];
type Mark = { origin: 'imported' | 'estimated'; confidence: 'high' | 'medium' | 'low' };
const HIGH: Mark = { origin: 'imported', confidence: 'high' };
const MEDIUM: Mark = { origin: 'imported', confidence: 'medium' };

/**
 * Engine attribute <- FM raw attribute (1..100) where FM has the same thing. Every other engine
 * attribute is a weighted mix below (`MIXES`), marked estimated. PARÂMETRO: the weights are mine;
 * they are the first thing to calibrate against match results.
 */
const DIRECT: Partial<Record<AttributeId, string>> = {
  firstTouch: 'first_touch',
  passing: 'passing',
  technique: 'technique',
  dribbling: 'dribbling',
  crossing: 'crossing',
  finishing: 'finishing',
  heading: 'heading',
  tackling: 'tackling',
  marking: 'marking',
  longShots: 'long_shots',
  decisions: 'decisions',
  vision: 'vision',
  anticipation: 'anticipation',
  positioning: 'positioning',
  offTheBall: 'off_the_ball',
  composure: 'composure',
  concentration: 'concentration',
  teamwork: 'teamwork',
  workRate: 'work_rate',
  leadership: 'leadership',
  aggression: 'aggression',
  bravery: 'bravery',
  determination: 'determination',
  flair: 'flair',
  acceleration: 'acceleration',
  pace: 'pace',
  agility: 'agility',
  balance: 'balance',
  strength: 'strength',
  stamina: 'stamina',
  jumping: 'jumping_reach',
  reflexes: 'reflexes',
  handling: 'handling',
  oneOnOne: 'one_on_ones',
  commandOfArea: 'command_of_area',
};
type Raw = (k: string) => number;
const mix =
  (...parts: [string, number][]) =>
  (r: Raw) =>
    parts.reduce((s, [k, w]) => s + r(k) * w, 0) / parts.reduce((s, [, w]) => s + w, 0);
const MIXES: Record<
  string,
  { f: (r: Raw, gk: boolean) => number; confidence: Mark['confidence'] }
> = {
  // technical
  setPieces: {
    f: mix(['free_kick_taking', 0.5], ['corners', 0.3], ['penalty_taking', 0.2]),
    confidence: 'medium',
  },
  longPassing: {
    f: mix(['passing', 0.5], ['vision', 0.3], ['technique', 0.2]),
    confidence: 'medium',
  },
  shielding: {
    f: mix(['strength', 0.4], ['balance', 0.3], ['first_touch', 0.15], ['composure', 0.15]),
    confidence: 'low',
  },
  // tactical group (ADR-019): FM has no counterpart, all low or medium
  scanning: {
    f: mix(['vision', 0.4], ['anticipation', 0.3], ['concentration', 0.3]),
    confidence: 'low',
  },
  spatialAwareness: {
    f: mix(['positioning', 0.4], ['anticipation', 0.3], ['decisions', 0.3]),
    confidence: 'low',
  },
  tacticalReading: {
    f: mix(['decisions', 0.35], ['anticipation', 0.35], ['teamwork', 0.3]),
    confidence: 'medium',
  },
  bodyOrientation: {
    f: mix(['first_touch', 0.3], ['agility', 0.3], ['balance', 0.2], ['technique', 0.2]),
    confidence: 'low',
  },
  discipline: {
    f: (r) => 0.4 * r('teamwork') + 0.3 * r('concentration') + 0.3 * (101 - r('dirtiness')),
    confidence: 'medium',
  },
  timing: {
    f: mix(['anticipation', 0.4], ['decisions', 0.3], ['concentration', 0.3]),
    confidence: 'low',
  },
  pressing: {
    f: mix(['work_rate', 0.35], ['aggression', 0.25], ['stamina', 0.2], ['anticipation', 0.2]),
    confidence: 'medium',
  },
  covering: {
    f: mix(['positioning', 0.35], ['work_rate', 0.25], ['teamwork', 0.2], ['marking', 0.2]),
    confidence: 'medium',
  },
  lossReaction: {
    f: mix(['work_rate', 0.35], ['anticipation', 0.3], ['acceleration', 0.2], ['aggression', 0.15]),
    confidence: 'low',
  },
  // FM "communication" is a goalkeeper attribute (outfield mean ~10, keepers ~35): keepers use it
  communication: {
    f: (r, gk) =>
      gk
        ? 0.7 * r('communication') + 0.3 * r('leadership')
        : mix(['teamwork', 0.4], ['leadership', 0.3], ['vision', 0.3])(r),
    confidence: 'low',
  },
  // physical
  recovery: {
    f: mix(['natural_fitness', 0.5], ['stamina', 0.3], ['work_rate', 0.2]),
    confidence: 'medium',
  },
  deceleration: {
    f: mix(['agility', 0.4], ['balance', 0.3], ['acceleration', 0.3]),
    confidence: 'low',
  },
  // goalkeeping
  distribution: {
    f: mix(['kicking', 0.5], ['throwing', 0.3], ['passing', 0.2]),
    confidence: 'medium',
  },
  gkPositioning: {
    f: mix(['positioning', 0.6], ['concentration', 0.2], ['anticipation', 0.2]),
    confidence: 'medium',
  },
  sweeping: {
    f: mix(['rushing_out', 0.6], ['anticipation', 0.2], ['kicking', 0.2]),
    confidence: 'low',
  },
};

/** FM positions_* (1..20: 20 natural, 15..19 accomplished) -> level 1..3, kept from 12 up. */
function positionsOf(p: Record<string, string>) {
  const v = (k: string) => num(p['positions_' + k]);
  const cand: Record<Position, number> = {
    GK: v('gk'),
    CB: Math.max(v('dc'), v('sw')),
    RB: Math.max(v('dr'), v('wbr')),
    LB: Math.max(v('dl'), v('wbl')),
    DM: v('dm'),
    CM: v('mc'),
    RM: v('mr'),
    LM: v('ml'),
    AM: v('amc'),
    RW: v('amr'),
    LW: v('aml'),
    // no FM second-striker slot: the mean of attacking midfield and striker when both are usable
    SS: Math.min(v('amc'), v('stc')) >= 12 ? (v('amc') + v('stc')) / 2 : 0,
    ST: v('stc'),
  };
  const kept = (Object.entries(cand) as [Position, number][])
    .filter(([, s]) => s >= 12)
    .map(([position, s]) => ({
      position,
      level: s >= 20 ? 3 : s >= 15 ? 2 : 1,
      score: s,
    }))
    .sort((a, b) => b.score - a.score);
  if (kept.length === 0) return null;
  if (kept[0]!.level < 3) {
    kept[0]!.level = 3; // the best position is the natural one for the engine
    est('player: best position raised to level 3');
  }
  return kept.map(({ position, level }) => ({ position, level }));
}

/**
 * FM trait (PPM) -> engine trait, by the save's numeric `traits_code`. The export names only 16 of
 * the 63 codes (`unknown` for the rest); comparing code with name on every player that has both
 * gives the first block, which is certain. The second block is INFERRED from what the players who
 * carry the code look like (mean z-score of attributes, positions, feet) and is marked as such in
 * the report: 3 (off_the_ball +1.3, forwards), 6 (marking, tackling, DM/MC), 17 (temperament
 * -1.1, sportsmanship -1.0), 9 (long shots, penalties, strength: shoots with power), 57 and 58 (left and right wing positions; right foot 92 / left foot
 * 94, so they cut inside). Everything else (killer balls, channels, weaker foot...) is dropped and
 * counted.
 */
const TRAIT_CODE: Record<number, { trait: (typeof TRAITS)[number]; certain: boolean }> = {
  5: { trait: 'getsIntoBox', certain: true }, // gets_forward_whenever_possible
  8: { trait: 'shootsFromDistance', certain: true },
  13: { trait: 'getsIntoBox', certain: true }, // likes_to_try_to_beat_offside_trap
  22: { trait: 'holdsBall', certain: true }, // dictates_tempo
  27: { trait: 'triesDribbles', certain: true }, // knocks_ball_past_opponent
  37: { trait: 'divesIntoTackles', certain: true },
  51: { trait: 'triesDribbles', certain: true }, // runs_with_ball_often
  3: { trait: 'getsIntoBox', certain: false },
  6: { trait: 'playsSimple', certain: false },
  17: { trait: 'arguesWithReferee', certain: false },
  57: { trait: 'cutsInside', certain: false },
  58: { trait: 'cutsInside', certain: false },
  // 9: long_shots +1.6, penalties +1.6, free kicks +1.2, strength +1.2 (mean z) and it co-occurs
  // with shoots_from_distance: "shoots with power".
  9: { trait: 'shootsFromDistance', certain: false },
};
const droppedTraits: Record<string, number> = {};

const CEILING_GAIN = { technical: 0.45, mental: 0.55, physical: 0.3 };

/**
 * The club that formed him (solidarity, training compensation, the talent map): FM's
 * home_grown_club_uids, the clubs where he trained three years between 15 and 21; the first one
 * the pack keeps. FM: high confidence for who formed him.
 */
let formedKnown = 0;
function formedAt(
  p: Record<string, string>,
): { origin: { clubId: string } } | Record<string, never> {
  for (const u of (p.home_grown_club_uids ?? '').split(';'))
    if (u && squadOf.has(u)) {
      formedKnown++;
      return { origin: { clubId: `fm-c${u}` } };
    }
  return {};
}

// ── Release clauses and injury history (own block) ───────────────────────────────────────────────

/**
 * contracts.csv `clauses` is a JSON array of {kind, kind_code, parameter, value}. The release
 * clauses are `minimum_fee_release_domestic` (18), `minimum_fee_release_foreign` (16), the generic
 * `minimum_fee_release` (0) and the conditional `relegation_release` (1) / `non_promotion_release`
 * (2); `value` is the fee in the save's money (GBP, like the wages). The pack has one field, and a
 * Brazilian buyer is the case that matters: domestic, else the generic one; a foreign-only or
 * conditional clause is not a clause the pack's world can trigger, so it stays null.
 * Lei Geral do Esporte (Lei 14.597/2023, art. 28, par. 1) caps the cláusula indenizatória
 * desportiva of a transfer inside Brazil at 2,000 times the average contract wage, and leaves the
 * international transfer without a limit: a domestic fee above 2,000 monthly wages is cut to it.
 * One contract per player: the row at the club that holds him, not a loan row.
 */
const LGE_DOMESTIC_CAP = 2000;
const clauseOf = new Map<string, number>();
{
  const kept = new Map<string, Record<string, string>>();
  for (const row of contractRows) {
    if (!row.clauses) continue;
    const have = kept.get(row.player_uid);
    if (!have || (have.on_loan === 'true' && row.on_loan !== 'true')) kept.set(row.player_uid, row);
  }
  for (const [uid, row] of kept) {
    const list = JSON.parse(row.clauses) as { kind: string; value: number | null }[];
    const pick = (k: string) => list.find((c) => c.kind === k && c.value && c.value > 0)?.value;
    const fee = pick('minimum_fee_release_domestic') ?? pick('minimum_fee_release');
    if (fee) clauseOf.set(uid, brl(fee));
  }
}
const clauseStats = { found: 0, capped: 0, noWage: 0 };

/**
 * Injury proneness from the history in injuries.csv: the save's own hidden value stays and each
 * two points of severity in the history (minor 1, moderate 2, major 3) add one, at most three.
 * PARÂMETRO: only a history that already shows pushes it up (the table has no exposure time).
 */
const injuryWeight = new Map<string, number>();
for (const row of injuryRows)
  if (row.kind === 'history')
    injuryWeight.set(
      row.player_uid,
      (injuryWeight.get(row.player_uid) ?? 0) + Math.max(1, num(row.severity_code, 1)),
    );
const injuryBump = (uid: string) => Math.min(3, Math.floor((injuryWeight.get(uid) ?? 0) / 2));
const injuryStats = { bumped: 0 };

function playerOf(p: Record<string, string>, clubUid: string, id: string): PackPlayer | null {
  const positions = positionsOf(p);
  if (!positions) return (drop('player without a position >= 12'), null);
  const nat = nations[p.nation_id];
  if (!nat) est('player: nationality XX (unidentified nation)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birth_date)) return (drop('player without birth date'), null);

  const gk = positions[0]!.position === 'GK';
  const raw: Raw = (k) => num(p['raw_attributes_' + k], 1);
  const attrs = {} as Attributes;
  const field: Record<string, Mark> = {
    identity: HIGH,
    attributes: HIGH,
    personality: MEDIUM,
    hidden: MEDIUM,
    leadership: HIGH,
    potential: { origin: 'estimated', confidence: 'medium' },
  };
  for (const a of ATTRIBUTES) {
    const d = DIRECT[a];
    if (d) attrs[a] = clamp99(raw(d));
    else if (a === 'weakFoot')
      attrs[a] = clamp99(Math.min(num(p.raw_left_foot, 1), num(p.raw_right_foot, 1)));
    else {
      const m = MIXES[a];
      if (!m) throw new Error(`attribute ${a} has no mapping`);
      attrs[a] = clamp99(m.f(raw, gk));
      field[`attributes.${a}`] = { origin: 'estimated', confidence: m.confidence };
    }
  }
  const avg = (ids: readonly AttributeId[]) => ids.reduce((s, a) => s + attrs[a], 0) / ids.length;
  const cur = {
    technical: avg(TECHNICAL),
    mental: avg([...MENTAL, ...TACTICAL]),
    physical: avg(PHYSICAL),
  };
  // PARÂMETRO: ability_current/potential run 1..200 and attribute means 1..100, so one point of
  // headroom is about half a point of attribute; physical grows least.
  const room = Math.max(0, num(p.ability_potential) - num(p.ability_current));
  const ceiling = {
    technical: clamp99(cur.technical + room * CEILING_GAIN.technical),
    mental: clamp99(cur.mental + room * CEILING_GAIN.mental),
    physical: clamp99(cur.physical + room * CEILING_GAIN.physical),
  };
  const pers = (k: string) => clamp20(num(p['personality_' + k], 10));
  const hid = (k: string) => clamp20(num(p['attributes_' + k], 10));
  const fit = raw('natural_fitness');
  // PARÂMETRO: FM has no growth curve; natural fitness stands in (high ages well, low early).
  const physicalCurve = fit >= 70 ? 'late' : fit <= 35 ? 'early' : 'normal';
  const peakAge = clamp(
    PEAK[positions[0]!.position] +
      (physicalCurve === 'late' ? 1 : physicalCurve === 'early' ? -1 : 0),
    20,
    36,
  );
  const traitCodes = (p.traits_code ? p.traits_code.split(';') : []).map(Number);
  const names = p.traits ? p.traits.split(';') : [];
  const traits = [
    ...new Set(
      traitCodes.flatMap((code, i) => {
        const m = TRAIT_CODE[code];
        if (m) {
          if (!m.certain) est('traits: engine trait inferred from an unnamed FM trait code');
          return [m.trait];
        }
        const name = names[i] ?? 'unknown';
        const key = name === 'unknown' ? `code ${code} (unnamed)` : name;
        droppedTraits[key] = (droppedTraits[key] ?? 0) + 1;
        return [];
      }),
    ),
  ];
  const [lf, rf] = [num(p.raw_left_foot), num(p.raw_right_foot)];
  const foot = Math.min(lf, rf) >= 0.8 * Math.max(lf, rf) ? 'both' : lf > rf ? 'left' : 'right';

  // Contract: weekly GBP -> monthly BRL (PARÂMETRO above). A contract that already ended before the
  // pack's season (the save is from December) is kept until the season's end: a renewal assumed.
  let until = /^\d{4}-\d{2}-\d{2}$/.test(p.contract_end) ? p.contract_end : '';
  if (until < `${SEASON}-01-01`) {
    est(
      until
        ? 'contract: ended before the season, extended to 31 Dec of the season'
        : 'contract: no end date, set to 31 Dec of the season',
    );
    until = `${SEASON}-12-31`;
  }
  const loan = p.on_loan === 'true' && p.loan_parent_club_uid && scope.has(p.loan_parent_club_uid);
  if (p.on_loan === 'true' && !loan) est('loan: parent club outside the pack, loan link dropped');

  const wage = monthlyBrl(num(p.contract_wage));
  let releaseFee: number | null = clauseOf.get(p.uid) ?? null;
  if (releaseFee !== null) {
    if (wage <= 0) {
      releaseFee = null;
      clauseStats.noWage++;
    } else {
      clauseStats.found++;
      if (releaseFee > wage * LGE_DOMESTIC_CAP) {
        releaseFee = wage * LGE_DOMESTIC_CAP;
        clauseStats.capped++;
      }
    }
  }
  if (injuryBump(p.uid)) injuryStats.bumped++;

  const full = p.full_name || p.name;
  return {
    id,
    name: full.slice(0, 80),
    ...(p.common_name && p.common_name !== full ? { knownAs: p.common_name.slice(0, 40) } : {}),
    birthDate: p.birth_date,
    nationality: nat ?? 'XX',
    ...(p.height_cm ? { heightCm: clamp(num(p.height_cm), 150, 210) } : {}),
    foot,
    positions,
    attributes: attrs,
    potential: {
      ceiling,
      learning: clamp20(
        (pers('professionalism') + clamp20(raw('determination') / 5) + pers('adaptability')) / 3,
      ),
      physicalCurve,
      peakAge,
    },
    personality: {
      professionalism: pers('professionalism'),
      ambition: pers('ambition'),
      loyalty: pers('loyalty'),
      temperament: pers('temperament'),
      resilience: pers('pressure'),
      sociability: pers('sportsmanship'),
    },
    hidden: {
      consistency: hid('consistency'),
      bigMatches: hid('important_matches'),
      injuryProneness: clamp20(hid('injury_proneness') + injuryBump(p.uid)),
      adaptability: pers('adaptability'),
      versatility: hid('versatility'),
    },
    traits,
    clubId: `fm-c${clubUid}`,
    ...formedAt(p),
    contract: { wage, until, releaseFee },
    ...(loan ? { loanFromClubId: `fm-c${p.loan_parent_club_uid}` } : {}),
    field,
  };
}

const players: PackPlayer[] = [];
for (const [uid, squad] of squadOf)
  for (const row of squad) {
    const pl = playerOf(row, uid, `fm-p${row.uid}`);
    if (pl) players.push(pl);
  }

// Youth teams (career/academy.ts): the boys of the clubs in the national divisions, up to twenty
// years old, the best YOUTH_MAX of a club. Kept apart from `players`: only the person's club takes
// its boys in, into its academy, on day one.
const YOUTH_MAX = 40;
const YOUTH_AGE = 20;
const divisionClubs = new Set([
  ...a27,
  ...b27,
  ...c27,
  ...d27,
  ...serieA,
  ...serieB,
  ...serieC,
  ...serieD,
]);
const youth: { team: 'u20' | 'u17'; player: PackPlayer }[] = [];
for (const [uid, rows] of youthRowsOf) {
  if (!divisionClubs.has(uid)) continue;
  const boys = rows
    .filter((r) => num(r.age) > 0 && num(r.age) <= YOUTH_AGE)
    .sort((a, b) => ability(b) - ability(a))
    .slice(0, YOUTH_MAX);
  for (const row of boys) {
    const pl = playerOf(row, uid, `fm-p${row.uid}`);
    if (pl) youth.push({ team: row.team_slot === '2' ? 'u17' : 'u20', player: pl });
  }
}

// ── Clubs, cities, staff, governance ─────────────────────────────────────────────────────────────

const stadiumsOf = new Map<string, Record<string, string>[]>();
for (const s of stadiumRows)
  for (const u of new Set([
    s.owner_club_uid,
    ...(s.home_club_uids ? s.home_club_uids.split(';') : []),
  ]))
    if (u) (stadiumsOf.get(u) ?? stadiumsOf.set(u, []).get(u)!).push(s);
const latestFinance = new Map<string, Record<string, string>>();
for (const f of financeRows) {
  const prev = latestFinance.get(f.club_uid);
  if (!prev || f.month > prev.month) latestFinance.set(f.club_uid, f);
}
const sponsorsOf = new Map<string, Record<string, string>[]>();
for (const s of sponsorRows)
  (sponsorsOf.get(s.club_uid) ?? sponsorsOf.set(s.club_uid, []).get(s.club_uid)!).push(s);
const SPONSOR_NAME: Record<string, string> = {
  main_kit: 'Patrocinador master',
  additional_kit_sponsor: 'Patrocinador secundário',
  general: 'Patrocinador geral',
  away_kit: 'Patrocinador do uniforme 2',
  kit_manufacturer: 'Material esportivo',
  shorts: 'Patrocinador do calção',
  unknown: 'Patrocinador',
};

const hashByte = (s: string, i: number) => createHash('sha1').update(s).digest()[i]!;
/** Fallback when Wikidata has no official colour: a deterministic pair from the club uid (NOT the real colours). */
const colourOf = (uid: string, k: number) =>
  '#' +
  [0, 1, 2]
    .map((i) => (48 + (hashByte(uid, k * 3 + i) % 176)).toString(16).padStart(2, '0'))
    .join('');

// ── Kits: scripts/club-pack/fetch-kits.ts -> data/kits.json (Wikipedia infoboxes), keyed by FM uid
type KitRow = {
  body: string;
  sleeves: string;
  shorts: string;
  socks: string;
  pattern?: PackKit['pattern'];
};
type PackKit = NonNullable<PackClub['kits']>['home'];
const kits = JSON.parse(readFileSync(new URL('./data/kits.json', import.meta.url), 'utf8')) as {
  clubs: Record<string, { home: KitRow; away?: KitRow }>;
};

// ── Geography: scripts/club-pack/enrich-fm-clubs.ts -> data/br-club-geo.json (Wikidata + openfootball)
type GeoCity = {
  name: string;
  state: string | null;
  lat: number | null;
  lon: number | null;
  population: number | null;
  altitudeM: number | null;
};
const geo = JSON.parse(
  readFileSync(new URL('./data/br-club-geo.json', import.meta.url), 'utf8'),
) as {
  clubs: Record<
    string,
    {
      qid: string;
      city?: string;
      stadium?: { name: string | null; capacity: number | null };
      colours?: string[];
    }
  >;
  cities: Record<string, GeoCity>;
  openfootball: Record<
    string,
    { city: string; state: string | null; stadium?: { name: string; capacity: number } }
  >;
};
// Gap-filler venues (enrich-stadiums.ts): the stadium side of Wikidata (occupant/owner) and dated P1083.
const venueGap = JSON.parse(
  readFileSync(new URL('./data/stadiums.json', import.meta.url), 'utf8'),
) as Record<string, { name: string | null; capacity: number | null }>;
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const cities = new Map<string, Pack['cities'][number]>();
// Municipal data (IBGE, Wikidata, NASA POWER) from scripts/club-pack/fetch-cities.ts ->
// data/br-cities.json: population, income (GDP per capita a month), coordinates, altitude and monthly
// climate by IBGE municipality, and the municipality of clubs the save and Wikidata left without one.
type Muni = {
  name: string;
  uf: string;
  qid?: string;
  lat: number | null;
  lon: number | null;
  altitudeM: number | null;
  altSource?: string;
  population: number | null;
  income: number | null;
  climate: [number, number, number][] | null;
};
const CITIES = JSON.parse(
  readFileSync(new URL('./data/br-cities.json', import.meta.url), 'utf8'),
) as {
  municipalities: Record<string, Muni>;
  clubCity: Record<string, { ibge: string; by: 'wikidata' | 'ptwiki' | 'name' }>;
};
const muniByQid = new Map<string, Muni>();
const muniByName = new Map<string, Muni>();
for (const m of Object.values(CITIES.municipalities)) {
  if (m.qid) muniByQid.set(m.qid, m);
  muniByName.set(`${slug(m.name)}|${m.uf}`, m);
}
// PARÂMETRO: the neutral climate and the flat income only fill a city the municipal file does not
// know (a foreign or unmatched birthplace); every one of them is flagged in the report.
const NEUTRAL = Array.from({ length: 12 }, () => ({ rainMm: 100, tempC: 22, humidity: 70 }));
function addCity(id: string, c: GeoCity): string {
  if (!cities.has(id)) {
    const m =
      (id.startsWith('wd-') ? muniByQid.get(id.slice(3)) : undefined) ??
      muniByName.get(`${slug(c.name)}|${c.state}`);
    const lat = m?.lat ?? c.lat;
    const lon = m?.lon ?? c.lon;
    const population = m?.population ?? c.population;
    const altitudeM = m?.altitudeM ?? c.altitudeM;
    if (lat === null || lon === null) est('city: no coordinates, centre of Brazil');
    if (population === null) est('city: no population');
    if (m?.altSource === 'open-meteo')
      est('city: altitude from the Open-Meteo 90 m elevation model');
    else if (altitudeM === null) est('city: no altitude, sea level');
    if (m?.income == null) est('city: no income, flat 2000');
    if (!m?.climate) est('city: no climate, neutral 100 mm / 22 C / 70 %');
    cities.set(id, {
      id,
      name: (m?.name ?? c.name).slice(0, 80),
      state: m?.uf ?? c.state ?? 'XX',
      population: Math.round(population ?? 0),
      income: m?.income ?? 2000,
      altitudeM: clamp(altitudeM ?? 0, 0, 4500),
      lat: lat ?? -15,
      lon: lon ?? -50,
      climate: m?.climate
        ? m.climate.map(([rainMm, tempC, humidity]) => ({ rainMm, tempC, humidity }))
        : NEUTRAL,
    });
  }
  return id;
}
const wdCityByName = new Map(
  Object.entries(geo.cities).map(([q, c]) => [`${slug(c.name)}|${c.state}`, q] as const),
);
// 1 Wikidata (club -> headquarters or stadium municipality), 2 openfootball (city of the big clubs),
// 3 the other clubs of the same FM city_id (one resolved city among them), else a placeholder.
const cityOfClub = new Map<string, string>();
for (const uid of scope) {
  const g = geo.clubs[uid];
  const of = geo.openfootball[uid];
  if (g?.city && geo.cities[g.city])
    cityOfClub.set(uid, addCity(`wd-${g.city}`, geo.cities[g.city]!));
  else if (of) {
    const q = wdCityByName.get(`${slug(of.city)}|${of.state}`);
    cityOfClub.set(
      uid,
      q
        ? addCity(`wd-${q}`, geo.cities[q]!)
        : addCity(`of-${slug(of.city)}-${(of.state ?? 'xx').toLowerCase()}`, {
            name: of.city,
            state: of.state,
            lat: null,
            lon: null,
            population: null,
            altitudeM: null,
          }),
    );
    est('city: from openfootball (name and state only)');
  } else if (CITIES.clubCity[uid]) {
    // fetch-cities.ts: Wikidata P159/P115/P740, the pt.wikipedia article, or the club's own name.
    const { ibge, by } = CITIES.clubCity[uid]!;
    const m = CITIES.municipalities[ibge]!;
    cityOfClub.set(
      uid,
      addCity(m.qid ? `wd-${m.qid}` : `ibge-${ibge}`, {
        name: m.name,
        state: m.uf,
        lat: m.lat,
        lon: m.lon,
        population: m.population,
        altitudeM: m.altitudeM,
      }),
    );
    est(
      by === 'name'
        ? 'city: municipality read from the club name (fetch-cities.ts, conservative rule)'
        : `city: municipality from ${by === 'wikidata' ? 'Wikidata' : 'the pt.wikipedia article'} (fetch-cities.ts)`,
    );
  }
}
const fmCity = new Map<string, Set<string>>();
for (const [uid, id] of cityOfClub) {
  const k = clubById.get(uid)!.city_id!;
  (fmCity.get(k) ?? fmCity.set(k, new Set()).get(k)!).add(id);
}
for (const uid of scope) {
  const ids = fmCity.get(clubById.get(uid)!.city_id!);
  if (!cityOfClub.has(uid) && ids?.size === 1) {
    cityOfClub.set(uid, [...ids][0]!);
    est('city: taken from another club of the same FM city_id');
  }
}
// What is still unresolved gets a placeholder; a Série D club takes the state of its 2026 group
// (the regional draw keeps the group together), otherwise 'XX'.
const stateOfGroupmates = (uid: string) => {
  const grp = groupsD.find((g) => g.includes(uid));
  const states = (grp ?? [])
    .map((u) => cities.get(cityOfClub.get(u) ?? '')?.state)
    .filter((x): x is string => !!x && x !== 'XX');
  const n = new Map<string, number>();
  for (const x of states) n.set(x, (n.get(x) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'XX';
};
for (const uid of scope)
  if (!cityOfClub.has(uid)) {
    const state = stateOfGroupmates(uid);
    cityOfClub.set(
      uid,
      addCity(`fm-city-${clubById.get(uid)!.city_id}-${state}`, {
        name: `Cidade ${clubById.get(uid)!.city_id}`,
        state,
        lat: null,
        lon: null,
        population: null,
        altitudeM: null,
      }),
    );
    est('city: unresolved placeholder (name "Cidade N")');
  }

// Birthplaces (birthCityId): Wikidata's place of birth for Brazilian footballers
// (data/birthplaces.json, fetch-birthplaces.ts), matched on the birth date and the name: the
// label equal to the player's known or full name, or all its words inside the full name; a date
// with two such candidates is left alone. FM has no birthplace.
const BIRTHS = (
  JSON.parse(readFileSync(new URL('./data/birthplaces.json', import.meta.url), 'utf8')) as {
    players: {
      qid: string;
      name: string;
      birth: string;
      place: {
        qid: string;
        name: string;
        state: string;
        lat: number | null;
        lon: number | null;
        population: number | null;
      };
    }[];
  }
).players;
let bornKnown = 0;
{
  const byDate = new Map<string, typeof BIRTHS>();
  for (const b of BIRTHS) (byDate.get(b.birth) ?? byDate.set(b.birth, []).get(b.birth)!).push(b);
  const words = (x: string) =>
    fold(x)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  for (const pl of players) {
    const names = [pl.knownAs, pl.name].filter((x): x is string => !!x);
    const full = new Set(names.flatMap(words));
    const hits = (byDate.get(pl.birthDate) ?? []).filter((b) => {
      const label = words(b.name);
      return (
        names.some((n) => fold(n) === fold(b.name)) ||
        (label.length >= 2 && label.every((x) => full.has(x)))
      );
    });
    if (hits.length !== 1) continue;
    const at = hits[0]!.place;
    const cityId = addCity(`wd-${at.qid}`, {
      name: at.name,
      state: at.state,
      lat: at.lat,
      lon: at.lon,
      population: at.population,
      altitudeM: null,
    });
    pl.birthCityId = cityId;
    bornKnown++;
  }
}

// Second citizenships (secondNationality): Wikidata's footballers holding Brazil's and another
// (data/citizenships.json, fetch-citizenships.ts), matched as the birthplaces are. A foreigner
// with a Brazilian passport gets 'BR'; a Brazilian, his other one. FM's second_nation_ids is not
// used: it names Brazil for foreigners who do not hold its passport (Mercado, Cuello, Ferraresi).
const CITIZENS = (
  JSON.parse(readFileSync(new URL('./data/citizenships.json', import.meta.url), 'utf8')) as {
    players: { qid: string; name: string; birth: string; others: string[] }[];
  }
).players;
let dualKnown = 0;
{
  const byDate = new Map<string, typeof CITIZENS>();
  for (const b of CITIZENS) (byDate.get(b.birth) ?? byDate.set(b.birth, []).get(b.birth)!).push(b);
  const words = (x: string) =>
    fold(x)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  for (const pl of players) {
    const names = [pl.knownAs, pl.name].filter((x): x is string => !!x);
    const full = new Set(names.flatMap(words));
    const hits = (byDate.get(pl.birthDate) ?? []).filter((b) => {
      const label = words(b.name);
      return (
        names.some((n) => fold(n) === fold(b.name)) ||
        (label.length >= 2 && label.every((x) => full.has(x)))
      );
    });
    if (hits.length !== 1) continue;
    const other = pl.nationality === 'BR' ? hits[0]!.others[0] : 'BR';
    if (!other || other === pl.nationality) continue;
    pl.secondNationality = other;
    dualKnown++;
  }
}

// ── Club structure from real signals (facilities, style, youth policy, market) ─────────────────
// Mappings in packages/club-domain/src/generate/structure.ts; sources in data/FONTES.md.
const facilityCode = new Map(
  load('facilities.csv', 'corporate_facilities_code is the only facility column').map((r) => [
    r.club_uid,
    num(r.corporate_facilities_code),
  ]),
);
const CBF_FORMADORES = new Set(
  (
    JSON.parse(readFileSync(new URL('./data/clubes-formadores.json', import.meta.url), 'utf8')) as {
      clubs: string[];
    }
  ).clubs.map(clubKey),
);
const seasonRows = load('player-season-stats.csv', 'kind overall, team slot 0: style and minutes');
const styleSum = new Map<string, StyleRates & { minutes: number }>();
const minutesAt = new Map<string, number>();
for (const s of seasonRows) {
  if (s.kind !== 'overall' || s.team_slot !== '0' || !s.club_uid) continue;
  const m = num(s.minutes);
  const t = styleSum.get(s.club_uid) ?? {
    minutes: 0, passes: 0, progressive: 0, pressures: 0, clearances: 0, crosses: 0, sprints: 0, lost: 0,
  }; // prettier-ignore
  t.minutes += m;
  t.passes += num(s.passes_attempted);
  t.progressive += num(s.progressive_passes);
  t.pressures += num(s.pressures_attempted);
  t.clearances += num(s.clearances);
  t.crosses += num(s.crosses_attempted);
  t.sprints += num(s.high_intensity_sprints);
  t.lost += num(s.possession_lost);
  styleSum.set(s.club_uid, t);
  minutesAt.set(`fm-p${s.player_uid}|fm-c${s.club_uid}`, m);
}
const MIN_STYLE_MINUTES = 5000; // about five matches of data
const styleRates = new Map<string, StyleRates>();
for (const [u, t] of styleSum)
  if (scope.has(u) && t.minutes >= MIN_STYLE_MINUTES) {
    const k = 990 / t.minutes; // per 90 minutes of a team of 11
    styleRates.set(u, {
      passes: t.passes * k, progressive: t.progressive * k, pressures: t.pressures * k,
      clearances: t.clearances * k, crosses: t.crosses * k, sprints: t.sprints * k, lost: t.lost * k,
    }); // prettier-ignore
  }
const styleCohort = [...styleRates.values()];
const squadOfClub = new Map<string, PackPlayer[]>();
for (const p of players)
  if (p.clubId) (squadOfClub.get(p.clubId) ?? squadOfClub.set(p.clubId, []).get(p.clubId)!).push(p);
const structure = { facilities: 0, certified: 0, style: 0, youth: 0 };

// ── Real head coaches (own block) ────────────────────────────────────────────────────────────────

/**
 * staff.csv has 4,859 people with a club, but NO job (`job` and `job_code` are empty) and none of the
 * coaching attributes (every `attributes_*` but adaptability is empty). What it does have: the
 * wage, the current ability (1..200), the personality, the tactical preferences (1..20) and
 * `in_club_lists`: it is false for the club's manager and true for everyone listed beside him
 * (checked on the Série A clubs: Abel Ferreira, Leonardo Jardim, Tite, Dorival Júnior, Rogério
 * Ceni, Luís Castro... are the false ones, the executives and assistants are true). So the head coach
 * of a club is its best-paid person that is not in the club lists; a club with none keeps the
 * generated one. The other posts (assistant, fitness, goalkeeping, scouts...) cannot be told apart
 * without a job, and the pack's assignments feed the club's wage bill: they are not imported.
 */
const headCoachOf = new Map<string, Record<string, string>>();
for (const row of staffRows) {
  if (row.in_club_lists !== 'false' || row.has_contract !== 'true' || !row.club_uid) continue;
  const have = headCoachOf.get(row.club_uid);
  if (!have || num(row.wage) > num(have.wage)) headCoachOf.set(row.club_uid, row);
}
const coachStats = { real: 0, generated: 0 };
const usedCoach = new Set<string>();

function realCoach(row: Record<string, string>): Pack['staff'][number] {
  const ca = num(row.ability_current); // 0..200
  const to20 = (x: number) => clamp20(1 + (x / 200) * 19);
  const pref = (k: string) => clamp20(num(row['preferences_' + k], 10));
  const mark = { origin: 'estimated', confidence: 'low' } as const;
  return {
    id: `fm-s${row.uid}`,
    name: (row.full_name || row.name).slice(0, 80),
    birthDate: row.birth_date,
    nationality: nations[row.nation_id] ?? 'BR',
    roles: ['headCoach'],
    // Tactical preferences, read back by the game's coach pool (career/coach-pool.ts, prefOf).
    specialties: [
      ['press', 'trigger_press'],
      ['tempo', 'tempo'],
      ['width', 'width'],
      ['attacking', 'attacking'],
      ['directness', 'directness'],
      ['patience', 'patience'],
      ['rotation', 'squad_rotation'],
    ].map(([k, f]) => `pref:${k}=${pref(f!)}`),
    attributes: {
      tactics: to20(ca),
      gameReading: to20(ca),
      manManagement: clamp20(num(row.personality_adaptability, 10)),
      motivation: clamp20(num(row.personality_ambition, 10)),
    },
    licence: ca >= 130 ? 'Pro' : ca >= 90 ? 'A' : 'B',
    experienceYears: clamp(num(row.age) - 30, 0, 40),
    reputation: clamp(ca / 2, 0, 100),
    ties: [],
    field: {
      identity: { origin: 'imported', confidence: 'medium' },
      attributes: mark,
      licence: mark,
      experienceYears: mark,
      reputation: mark,
    },
  };
}

const root = rngFrom(20261117);
const clubs: PackClub[] = [];
const staff: Pack['staff'] = [];
const assignments: Pack['assignments'] = [];
const governance: Pack['governance'] = [];

// Goal of the board inside a division: rank by reputation, like the dev pack's rank-based goal.
const goalOf = new Map<string, number>();
for (const d of [a27, b27, c27, d27]) {
  [...d]
    .sort((a, b) => num(clubById.get(b)!.reputation) - num(clubById.get(a)!.reputation))
    .forEach((u, i) => goalOf.set(u, Math.min(d.length, i + 3)));
}

for (const uid of [...scope].sort((a, b) => Number(a) - Number(b))) {
  const c = clubById.get(uid)!;
  const rep = num(c.reputation); // 0..~8000
  // Strength on the dev pack's scale (30..80) so economy() and the squad estimates line up:
  // Série A reputations (3000..7800) land on 60..79, Série D (500..900) on 42..46.
  const strength = Math.round(30 + 50 * Math.sqrt(Math.min(rep, 8000) / 8000));
  const money = economy(strength);
  const r = fork(root, `club:${uid}`);
  const lvl = Math.max(1, Math.min(5, Math.round((strength - 35) / 10)));
  if (!rep) est('club: no reputation, strength 30');

  const cityKey = cityOfClub.get(uid)!;

  // Stadium: the biggest one the club owns or calls home; names are mostly empty in the save.
  const st = (stadiumsOf.get(uid) ?? []).sort(
    (a, b) => num(b.total_capacity) - num(a.total_capacity),
  )[0];
  const capacity = st ? clamp(num(st.total_capacity), 0, 120_000) : 0;
  const gapSt = venueGap[uid];
  if (
    !capacity &&
    !(
      geo.clubs[uid]?.stadium?.capacity ||
      gapSt?.capacity ||
      geo.openfootball[uid]?.stadium?.capacity
    )
  )
    est('stadium: capacity estimated from reputation');
  const shared = st && st.home_club_uids.includes(';');
  // Name: Wikidata home venue, then openfootball, then the save, then a placeholder. Capacity: the
  // save when it has one (the game's own number), else Wikidata (P1083), else openfootball.
  const wdSt = geo.clubs[uid]?.stadium;
  const ofSt = geo.openfootball[uid]?.stadium;
  const named = wdSt?.name || gapSt?.name || ofSt?.name || st?.name;
  if (!named) est('stadium: name is a placeholder');
  const openCap = wdSt?.capacity || gapSt?.capacity || ofSt?.capacity || 0;
  if (!capacity && openCap) est('stadium: capacity from Wikidata/openfootball');
  const stadium: PackClub['stadium'] = {
    name: (named || `Estádio ${c.short_name || c.name}`).slice(0, 80),
    capacity: capacity || clamp(openCap, 0, 120_000) || money.capacity,
    pitch: lvl >= 3 ? 'good' : 'average',
    drainage: lvl,
    arrangement: st
      ? st.owner_club_uid === uid
        ? shared
          ? 'shared'
          : 'owned'
        : 'municipal'
      : 'municipal',
  };

  const fin = latestFinance.get(uid);
  let initialCash: number;
  let initialDebt = 0;
  if (fin) {
    const balance = brl(num(fin.balance));
    // A negative balance is debt (the pack repays it in instalments); cash comes below.
    initialDebt = Math.max(0, -balance);
  } else est('finance: no finances row in the save');
  // ── Real cash and debt (data/finances-audited.json, data/finances.json) ──
  // The save's balance is a game number (negative for every club of A to C, so cash was 0).
  {
    const real = realMoney(c.name, c.short_name);
    const revenue = real?.revenue ?? Math.round((money.payroll * 12) / PAYROLL_SHARE);
    if (real?.cash != null) {
      initialCash = real.cash;
      est('finance: cash from the audited 2025 balance sheet (data/finances-audited.json)');
    } else {
      initialCash = Math.round(revenue * CASH_SHARE);
      est('finance: cash ESTIMATED as 2.1% of revenue (median of the audited clubs)');
    }
    if (real?.debt != null) {
      initialDebt = Math.min(real.debt, Math.round(revenue * DEBT_CAP));
      est('finance: debt from audited loans or press total debt 2025, capped at 0.8x revenue');
    } else if (initialDebt > revenue * DEBT_CAP) {
      initialDebt = Math.round(revenue * DEBT_CAP);
      est('finance: save-derived debt capped at 0.8x revenue');
    }
  }

  const sp = (sponsorsOf.get(uid) ?? []).filter((s) => num(s.annual_value) > 0 && s.end);
  if (!sp.length) est('sponsors: none in the save');

  // Colours: the home kit (body + the dominant second colour) first, then Wikidata, then a hash.
  const kit = kits.clubs[uid];
  const official = geo.clubs[uid]?.colours;
  let colours: PackClub['colours'];
  if (kit) {
    const h = kit.home;
    const second = [h.sleeves, h.shorts, h.socks].find((x) => x !== h.body);
    colours = [h.body, second ?? (h.body === '#ffffff' ? '#000000' : '#ffffff')];
    if (!second) est('club colours: kit is one colour, second colour assumed');
  } else if (official?.length) {
    colours = [official[0]!, official[1] ?? (official[0] === '#ffffff' ? '#000000' : '#ffffff')];
  } else {
    est('club colours: hash fallback, not the real colours');
    colours = [colourOf(uid, 0), colourOf(uid, 1)];
  }
  const body = estimatedBody(r, strength, 'inferred', 'low');
  {
    // Structure from real signals; what has none keeps the reputation estimate above.
    const id = `fm-c${uid}`;
    const squad = squadOfClub.get(id) ?? [];
    let total = 0;
    let academy = 0;
    for (const p of squad) {
      const m = minutesAt.get(`${p.id}|${id}`) ?? 0;
      total += m;
      if (p.origin?.clubId === id) academy += m;
    }
    const academyShare = total >= 5000 ? academy / total : null;
    const code = facilityCode.get(uid) ?? null;
    const certified = isCertified([c.name, c.short_name], CBF_FORMADORES);
    if (code) structure.facilities++;
    if (certified) structure.certified++;
    body.facilities = facilitiesFrom({
      repLevel: lvl,
      corporateCode: code,
      certified,
      academyShare,
    });
    const rates = styleRates.get(uid);
    if (rates) {
      structure.style++;
      body.profile.playingStyle = styleFrom(rates, styleCohort);
      body.profile.confidence = 'medium';
    } else est('profile: playing style kept as the reputation draw (no season stats)');
    if (academyShare !== null) {
      structure.youth++;
      body.profile.youthPolicy = youthPolicyFrom(academyShare);
    }
    if (squad.length >= 11) {
      const yr = (p: PackPlayer) => Number(p.birthDate.slice(0, 4));
      const age = squad.reduce((s, p) => s + (SEASON - yr(p)), 0) / squad.length;
      body.profile.market = marketFrom(
        age,
        squad.filter((p) => p.nationality !== 'BR').length / squad.length,
        squad.filter((p) => p.origin?.clubId !== id).length / squad.length,
      );
    }
  }
  const club: PackClub = {
    id: `fm-c${uid}`,
    name: c.name.slice(0, 80),
    shortName: (c.short_name || c.name).slice(0, 24),
    cityId: cityKey,
    colours,
    ...(kit ? { kits: { home: kit.home, ...(kit.away ? { away: kit.away } : {}) } } : {}),
    stadium,
    reputation: clamp(100 * Math.sqrt(Math.min(rep, 8000) / 8000), 0, 100),
    initialCash,
    initialDebt,
    ...body,
    sponsors: sp.map((s) => ({
      name: SPONSOR_NAME[s.kind] ?? 'Patrocinador',
      annual: brl(num(s.annual_value)),
      until: s.end,
    })),
    rivals: [],
  };
  clubs.push(club);

  const own = staffing(
    r,
    club,
    strength,
    goalOf.get(uid) ?? 10,
    clubs.length - 1,
    modelOf(c.name, c.short_name || c.name, cities.get(cityKey)?.state),
  );
  const hc = headCoachOf.get(uid);
  if (hc && /^\d{4}-\d{2}-\d{2}$/.test(hc.birth_date) && !usedCoach.has(hc.uid)) {
    usedCoach.add(hc.uid); // the save lists some people at two clubs: one job each
    // The real man replaces the generated one; the draw above still happened, so the stream and
    // the assignment's calibrated wage and clause do not move.
    own.coach = realCoach(hc);
    own.assignment.staffId = own.coach.id;
    coachStats.real++;
  } else coachStats.generated++;
  staff.push(own.coach);
  assignments.push(own.assignment);
  governance.push(own.governance);
}
if (!clubs.length) throw new Error('no clubs');

// ── Pack ─────────────────────────────────────────────────────────────────────────────────────────

const ids = (list: string[]) => list.map((u) => `fm-c${u}`);

/**
 * Stadium operation (mapa de conhecimento §2.11): `fans.demand` is the share of seats a club fills
 * on an ordinary league day and `fans.priceSensitivity` sets its ticket against the tier's
 * (match/stadium.ts). From data/attendance.json (Brasileirão 2025, ge and mktesportivo) where the
 * club is there; else the median of the researched clubs of its 2027 division. Série C has a
 * league average only (3.466 paying a match in 2025, DGABC): its clubs fill the share of seats
 * that gives it over their median stadium. Série D has none published: the same share as C, a
 * confirmar.
 */
const ATTENDANCE = (
  JSON.parse(readFileSync(new URL('./data/attendance.json', import.meta.url), 'utf8')) as {
    clubs: {
      club: string;
      state: string;
      aliases: string[];
      division2025: 'A' | 'B' | 'C' | 'D';
      avgAttendance: number;
      avgTicket: number | null;
    }[];
  }
).clubs;
// The survey ratio (fans per paying head) only holds for the A and B averages.
const ATTENDANCE_AB = ATTENDANCE.filter((x) => x.division2025 === 'A' || x.division2025 === 'B');
const TIER_TICKET: Record<number, number> = { 1: 51, 2: 26 };
/** Série C 2025, paying public a match (DGABC). */
const SERIE_C_AVERAGE = 3466;
let attendanceResearched = 0;
{
  const tierOfUid = new Map<string, number>();
  [a27, b27, c27, d27].forEach((list, i) => list.forEach((u) => tierOfUid.set(`fm-c${u}`, i + 1)));
  const found = new Map<PackClub, (typeof ATTENDANCE)[number]>();
  for (const club of clubs) {
    const names = [fold(club.name), fold(club.shortName)];
    const state = cities.get(club.cityId)?.state;
    const a = ATTENDANCE.find(
      (x) => x.state === state && [x.club, ...x.aliases].some((n) => names.includes(fold(n))),
    );
    if (a && club.stadium.capacity > 0) found.set(club, a);
  }
  const byTier = new Map<number, number[]>();
  for (const [club, a] of found) {
    const demand = clamp(Math.round((100 * a.avgAttendance) / club.stadium.capacity), 1, 100);
    club.fans.demand = demand;
    const tierTicket = TIER_TICKET[a.division2025 === 'A' ? 1 : 2]!;
    // ticket = tier's × (200 − 2 × sensitivity) / 100 (match/stadium.ts)
    if (a.avgTicket)
      club.fans.priceSensitivity = clamp(Math.round(100 - (50 * a.avgTicket) / tierTicket), 0, 87);
    const t = tierOfUid.get(club.id) ?? 4;
    (byTier.get(t) ?? byTier.set(t, []).get(t)!).push(demand);
    attendanceResearched++;
  }
  const median = (xs: number[]) => [...xs].sort((x, y) => x - y)[xs.length >> 1]!;
  const capC = median(
    clubs
      .filter((c) => tierOfUid.get(c.id) === 3 && c.stadium.capacity > 0)
      .map((c) => c.stadium.capacity),
  );
  const lowerShare = clamp(Math.round((100 * SERIE_C_AVERAGE) / Math.max(1, capC)), 1, 100);
  for (const club of clubs) {
    if (found.has(club)) continue;
    const t = tierOfUid.get(club.id) ?? 4;
    // A and B by their researched clubs; below, the Série C average.
    const known = t <= 2 ? byTier.get(t) : undefined;
    club.fans.demand = known?.length ? median(known) : lowerShare;
    est(
      known?.length
        ? 'fans: demand is the median of researched clubs of the division'
        : t === 3
          ? 'fans: demand from the Série C 2025 average over the median stadium'
          : 'fans: demand as Série C, a confirmar (no published Série D average)',
    );
  }
}
/**
 * Fan base (`fans.size`, supporters across the country): the Ipsos-Ipec survey of 2025 for the
 * twenty clubs it lists (data/fans.json, 0.5% of Brazilians or more). Below that, a club with a
 * researched 2025 public (data/attendance.json) gets it times the median ratio of the listed
 * clubs, under the survey's floor; the rest, Série C and D mostly, by reputation, squared, under
 * a fifth of it. Estimates, flagged.
 */
const FANS = JSON.parse(readFileSync(new URL('./data/fans.json', import.meta.url), 'utf8')) as {
  population: number;
  floor: number;
  clubs: { club: string; state: string; aliases: string[]; share: number }[];
};
let fansResearched = 0;
{
  const base = FANS.population;
  const floor = (base * FANS.floor) / 100;
  const find = <T extends { club: string; state: string; aliases: string[] }>(
    list: T[],
    club: PackClub,
  ) => {
    const names = [fold(club.name), fold(club.shortName)];
    const state = cities.get(club.cityId)?.state;
    return list.find(
      (x) => x.state === state && [x.club, ...x.aliases].some((n) => names.includes(fold(n))),
    );
  };
  const ratios: number[] = [];
  const rest: PackClub[] = [];
  for (const club of clubs) {
    const f = find(FANS.clubs, club);
    if (!f) {
      rest.push(club);
      continue;
    }
    club.fans.size = Math.round((base * f.share) / 100);
    fansResearched++;
    const a = find(ATTENDANCE_AB, club);
    if (a) ratios.push(club.fans.size / a.avgAttendance);
  }
  const ratio = [...ratios].sort((x, y) => x - y)[ratios.length >> 1] ?? 0;
  for (const club of rest) {
    const a = find(ATTENDANCE_AB, club);
    if (a && ratio) {
      club.fans.size = Math.round(Math.min(floor * 0.9, a.avgAttendance * ratio));
      est('fans: size from the 2025 public, by the ratio of the surveyed clubs');
      continue;
    }
    const r = Math.max(0, club.reputation - 30) / 60;
    club.fans.size = Math.max(1000, Math.round((floor * Math.min(1, r * r)) / 5));
    est('fans: size from reputation, under a fifth of the survey floor');
  }
}
const competitions = realDivisions(SEASON, [a27, b27, c27, d27].map(ids));

// Rivals: the curated derbies of data/rivals.json (name + UF, intensity 1-3, strongest first) where
// a club has one; else HEURISTIC, the up to three best-reputed other clubs of the same FM city_id
// (Wikidata has no rivalry property, checked 2026-11-17: only "Rivals.com ID").
const byFmCity = new Map<string, string[]>();
for (const c of clubs) {
  const k = clubById.get(c.id.slice(4))!.city_id!;
  (byFmCity.get(k) ?? byFmCity.set(k, []).get(k)!).push(c.id);
}
const repOf = new Map(clubs.map((c) => [c.id, c.reputation]));
const byNameState = new Map<string, string>();
for (const c of clubs) {
  const st = cities.get(c.cityId)?.state;
  for (const n of [c.shortName, c.name]) byNameState.set(`${fold(n)}|${st}`, c.id);
}
const curated = resolveRivals(
  parseDerbies(JSON.parse(readFileSync(new URL('./data/rivals.json', import.meta.url), 'utf8'))),
  (n, st) => byNameState.get(`${fold(n)}|${st}`),
);
let curatedClubs = 0;
for (const c of clubs) {
  const known = curated.rivals.get(c.id);
  if (known?.length) {
    c.rivals = known.slice(0, 5);
    curatedClubs++;
    continue;
  }
  c.rivals = (byFmCity.get(clubById.get(c.id.slice(4))!.city_id!) ?? [])
    .filter((k) => k !== c.id)
    .sort((a, b) => repOf.get(b)! - repOf.get(a)! || a.localeCompare(b))
    .slice(0, 3);
}
const rivalStats = {
  curatedClubs,
  curatedDerbies: curated.matched,
  curatedDerbiesNotInPack: curated.unmatched.map(([a, sa, b, sb]) => `${a} (${sa}) x ${b} (${sb})`),
  clubsWithRivals: clubs.filter((c) => c.rivals.length).length,
  largestSameCityGroup: Math.max(...[...byFmCity.values()].map((g) => g.length)),
};

const draft: Pack = {
  id: 'br-fm26-1',
  version: 1,
  kind: 'real',
  region: 'BR',
  season: SEASON,
  createdAt: new Date().toISOString(),
  checksum: '0'.repeat(64),
  manifest,
  competitions,
  clubs,
  players,
  staff,
  assignments,
  governance,
  cities: [...cities.values()],
  academies: [],
  youthCompetitions: [],
  youth,
  names: { first: FIRST_NAMES, last: LAST_NAMES, nicknames: NICKNAMES },
};
const t1 = Date.now();
const pack = PackSchema.parse(draft);
console.log(`PackSchema.parse ok in ${Date.now() - t1} ms`);
// Same recipe as packChecksum (sha256 of the JSON with the field blanked), with node:crypto: the
// pure-JS hash of the library is too slow for ~100 MB.
pack.checksum = createHash('sha256')
  .update(JSON.stringify({ ...pack, checksum: '' }))
  .digest('hex');
const json = JSON.stringify(pack);
const gz = gzipSync(json, { level: 9 });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, gz);

// ── Quality report ───────────────────────────────────────────────────────────────────────────────

// Squad validation (03 §1.3 / MC-017, not in club-domain yet): 22..42 seniors, two keepers, the 13
// positions covered at level 2+. Counted per division of 2027 and for the other clubs.
const COVERED = 13;
const tierOf = new Map<string, string>();
competitions.forEach((c) => c.clubIds.forEach((k) => tierOf.set(k, c.name)));
const squadCheck: Record<string, Record<string, number>> = {};
for (const club of clubs) {
  const sq = players.filter((p) => p.clubId === club.id);
  const keepers = sq.filter((p) => p.positions[0]!.position === 'GK').length;
  const covered = new Set(
    sq.flatMap((p) => p.positions.filter((q) => q.level >= 2).map((q) => q.position)),
  );
  const row = (squadCheck[tierOf.get(club.id) ?? 'outside the divisions'] ??= {
    clubs: 0,
    below22: 0,
    above42: 0,
    fewerThan2Keepers: 0,
    lessThan13Positions: 0,
  });
  row.clubs!++;
  if (sq.length < MIN_SQUAD) row.below22!++;
  if (sq.length > MAX_SQUAD) row.above42!++;
  if (keepers < 2) row.fewerThan2Keepers!++;
  if (covered.size < COVERED) row.lessThan13Positions!++;
}

const inDivisions = clubs.filter((c) => tierOf.has(c.id));
const geoQuality = {
  divisionClubs: inDivisions.length,
  withRealCity: inDivisions.filter((c) => !c.cityId.startsWith('fm-city-')).length,
  withKitColours: inDivisions.filter((c) => kits.clubs[c.id.slice(4)]).length,
  withOfficialColours: inDivisions.filter((c) => geo.clubs[c.id.slice(4)]?.colours?.length).length,
  withAnyRealColours: inDivisions.filter(
    (c) => kits.clubs[c.id.slice(4)] || geo.clubs[c.id.slice(4)]?.colours?.length,
  ).length,
};

/** Real colours by division: the home kit, Wikidata only, or the hash fallback. */
const colourCoverage: Record<
  string,
  { clubs: number; kit: number; wikidata: number; hash: number }
> = {};
for (const c of inDivisions) {
  const uid = c.id.slice(4);
  const row = (colourCoverage[tierOf.get(c.id)!] ??= { clubs: 0, kit: 0, wikidata: 0, hash: 0 });
  row.clubs++;
  row[kits.clubs[uid] ? 'kit' : geo.clubs[uid]?.colours?.length ? 'wikidata' : 'hash']++;
}

const unmappedNations = players.filter((p) => p.nationality === 'XX').length;
report.notes.push(
  `nations: ${unmappedNations} players with an unidentified nation (the ${Object.keys(nations).length} ids of fm-nations.json cover every player kept); the pack stores ISO codes only, names are not stored (Intl.DisplayNames('pt-BR') resolves all ${new Set(Object.values(nations)).size} codes when a name is needed)`,
  'regulations (05 §8): A, B, C (24 clubs in 2027, 28 in 2028) and D as realDivisions(); from 2028 C sends six down and D refills from the ranking: PARÂMETRO, not published',
  'squads: FM reserve and U18 slots (team_slot 1 and 2) are out of the senior squads: see drops; clubs below 22 seniors after topping up from reserves have no more players in the save',
  `youth: ${youth.length} boys of the division clubs' under-20 and under-17 teams (up to ${YOUTH_MAX} a club, ${YOUTH_AGE} years old at most) in pack.youth, for the person's academy`,
  'cities: municipal data from data/br-cities.json (fetch-cities.ts): IBGE SIDRA 6579 population and 5938 GDP per capita a month as income, Wikidata P625/P2044 (Open-Meteo elevation where missing), NASA POWER monthly climate 2001-2025; a city the file does not know keeps the neutral climate and flat income (see estimated)',
  'rivals: curated derbies (data/rivals.json, sources inside) where the club has one, else HEURISTIC, the three best-reputed other clubs of the same FM city_id',
  `fans: ${fansResearched} clubs with their supporters from data/fans.json (Ipsos-Ipec 2025), the rest estimated from the public or reputation`,
  `attendance: ${attendanceResearched} clubs with their 2025 average public and ticket from data/attendance.json (ge, mktesportivo); fans.demand is the share of seats filled on an ordinary day, fans.priceSensitivity sets the ticket`,
  `governance: ${governanceResearched} clubs from data/governance.json (researched, a source each, 2026-11-18); the rest from a FM26 legal name with SAF in it, else association`,
  `secondNationality: ${dualKnown} players matched to Wikidata's dual citizenships (data/citizenships.json)`,
  `birthplace: ${bornKnown} players matched to Wikidata's place of birth (data/birthplaces.json, by birth date and name)`,
  `origin: ${formedKnown} players with the club that formed them (FM home_grown_club_uids, first one in the pack)`,
  `structure: ${structure.facilities}/${clubs.length} clubs with an FM facilities rating, ${structure.certified} CBF clube formador, ${structure.style} playing styles from season stats, ${structure.youth} youth policies from academy minutes; departments kept (staff.csv has no job or attributes)`,
  'colours: the home kit of the Wikipedia infobox (data/kits.json, also stored as club.kits with the away kit), else Wikidata P6364 + P465; the rest is a hash pair, NOT the real colours (see estimated)',
  `coaches: ${coachStats.real} head coaches are real FM26 people (best-paid staff outside the club lists, see headCoachOf), ${coachStats.generated} clubs keep a generated one; attributes come from current ability and personality (estimated, low): staff.csv has no job and no coaching attributes. Wage and clause stay the economy's (the assignments feed the club's wage bill); other backroom posts are not imported`,
  `releaseFee: ${clauseStats.found} contracts with a domestic/generic release clause from contracts.clauses (${clauseStats.capped} cut to the Lei Geral do Esporte cap of 2,000 monthly wages), ${clauseStats.noWage} dropped for a zero wage; foreign-only and conditional clauses stay null`,
  `injuryProneness: ${injuryStats.bumped} players raised by their injuries.csv history`,
  'traits: codes 3, 6, 9, 17, 57, 58 are inferred from the players who carry them, not named by the save (see TRAIT_CODE)',
);

const out = {
  pack: pack.id,
  season: pack.season,
  counts: {
    clubs: clubs.length,
    players: players.length,
    staff: staff.length,
    cities: pack.cities.length,
    competitions: competitions.map((c) => `${c.name}: ${c.clubIds.length}`),
    playersByNationality: Object.entries(
      players.reduce<Record<string, number>>(
        (m, p) => ((m[p.nationality] = (m[p.nationality] ?? 0) + 1), m),
        {},
      ),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8),
    onLoan: players.filter((p) => p.loanFromClubId).length,
    noTraits: players.filter((p) => !p.traits.length).length,
  },
  bytes: { json: json.length, gz: gz.length },
  drops: report.drops,
  estimated: report.estimated,
  droppedFmTraits: droppedTraits,
  geography: geoQuality,
  colourCoverage,
  squads: squadCheck,
  rivals: rivalStats,
  notes: report.notes,
  output: OUT,
};
writeFileSync(OUT.replace(/\.json\.gz$/, '') + '.report.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
