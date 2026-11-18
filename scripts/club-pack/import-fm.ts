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
import { devDivisions } from '../../packages/club-domain/src/generate/competitions';
import { FIRST_NAMES, LAST_NAMES, NICKNAMES } from '../../packages/club-domain/src/generate/names';

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

const [, , dirArg, outArg] = process.argv;
if (!dirArg) {
  console.error('usage: import-fm.ts <csv-dir> [out.json.gz]');
  process.exit(1);
}
const DIR = resolve(dirArg);
const OUT = resolve(
  outArg ?? fileURLToPath(new URL('../../apps/api/club-packs/br-fm26-1.json.gz', import.meta.url)),
);

// ── RFC 4180 reader: quoted fields hold JSON with commas, quotes and newlines ────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
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
  const head = rows.shift()!;
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

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
console.log(`read CSVs in ${Date.now() - t0} ms`);

const nations = (
  JSON.parse(readFileSync(new URL('./data/fm-nations.json', import.meta.url), 'utf8')) as {
    map: Record<string, string>;
  }
).map;

// ── Competitions: which clubs play the four national divisions ───────────────────────────────────
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
      (JSON.parse(r.rows) as { team_id: number }[]).map((x) => clubByTeam.get(String(x.team_id))),
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
const inDivision = new Map<string, number>(); // club uid -> tier
[serieA, serieB, serieC, serieD].forEach((d, i) => d.forEach((u) => inDivision.set(u, i + 1)));
if (inDivision.size !== 156) throw new Error(`divisions overlap or repeat: ${inDivision.size}/156`);
// Série D groups are the region the draw keeps together: the save has no state for a city, so a
// city of a Série D club gets the tag of its group ('R0'..'RF'), real regional groups, fake UF.
const regionOfClub = new Map<string, string>();
groupsD.forEach((g, i) =>
  g.forEach((u) => regionOfClub.set(u, 'R' + i.toString(16).toUpperCase())),
);

// ── Clubs in scope ───────────────────────────────────────────────────────────────────────────────

const clubById = new Map(clubRows.map((c) => [c.uid, c]));
const brazilianMen = (u: string) => {
  const c = clubById.get(u);
  return c !== undefined && c.nation_id === BRAZIL && c.gender === 'men';
};
const squadOf = new Map<string, Record<string, string>[]>();
for (const p of playerRows) {
  if (!p.club_uid) drop('player without club');
  else if (!brazilianMen(p.club_uid)) drop('player at a club outside the Brazilian men clubs');
  else (squadOf.get(p.club_uid) ?? squadOf.set(p.club_uid, []).get(p.club_uid)!).push(p);
}
const scope = new Set<string>([...squadOf.keys(), ...inDivision.keys()]);
for (const u of inDivision.keys())
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
 * FM trait -> engine trait. Everything else (killer balls, channels, weaker foot...) is dropped
 * and counted; "unknown" is a trait bit the export could not name.
 */
const TRAIT_MAP: Record<string, (typeof TRAITS)[number]> = {
  shoots_from_distance: 'shootsFromDistance',
  runs_with_ball_often: 'triesDribbles',
  knocks_ball_past_opponent: 'triesDribbles',
  gets_forward_whenever_possible: 'getsIntoBox',
  likes_to_try_to_beat_offside_trap: 'getsIntoBox',
  dives_into_tackles: 'divesIntoTackles',
  dictates_tempo: 'holdsBall',
};
const droppedTraits: Record<string, number> = {};

const CEILING_GAIN = { technical: 0.45, mental: 0.55, physical: 0.3 };

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
  const traits = [
    ...new Set(
      (p.traits ? p.traits.split(';') : []).flatMap((t) => {
        if (TRAIT_MAP[t]) return [TRAIT_MAP[t]!];
        if (t !== '' && t !== 'unknown') droppedTraits[t] = (droppedTraits[t] ?? 0) + 1;
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
      injuryProneness: hid('injury_proneness'),
      adaptability: pers('adaptability'),
      versatility: hid('versatility'),
    },
    traits,
    clubId: `fm-c${clubUid}`,
    contract: { wage: monthlyBrl(num(p.contract_wage)), until, releaseFee: null },
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
/** Colours are not in the save: a deterministic pair from the club uid (not the real colours). */
const colourOf = (uid: string, k: number) =>
  '#' +
  [0, 1, 2]
    .map((i) => (48 + (hashByte(uid, k * 3 + i) % 176)).toString(16).padStart(2, '0'))
    .join('');

const root = rngFrom(20261117);
const cities = new Map<string, Pack['cities'][number]>();
const clubs: PackClub[] = [];
const staff: Pack['staff'] = [];
const assignments: Pack['assignments'] = [];
const governance: Pack['governance'] = [];

// Goal of the board inside a division: rank by reputation, like the dev pack's rank-based goal.
const goalOf = new Map<string, number>();
for (const d of [serieA, serieB, serieC, serieD]) {
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

  // City: FM gives only city_id (no names, no state): one placeholder per (city_id, region).
  const region = regionOfClub.get(uid) ?? 'XX';
  const cityKey = `fm-city-${c.city_id}${region === 'XX' ? '' : '-' + region}`;
  if (!cities.has(cityKey))
    cities.set(cityKey, {
      id: cityKey,
      name: `Cidade ${c.city_id}`,
      state: region,
      population: 0,
      income: 2000,
      altitudeM: 0,
      lat: -15,
      lon: -50,
      // PARÂMETRO: neutral climate for every placeholder city (no source in the save)
      climate: Array.from({ length: 12 }, () => ({ rainMm: 100, tempC: 22, humidity: 70 })),
    });

  // Stadium: the biggest one the club owns or calls home; names are mostly empty in the save.
  const st = (stadiumsOf.get(uid) ?? []).sort(
    (a, b) => num(b.total_capacity) - num(a.total_capacity),
  )[0];
  const capacity = st ? clamp(num(st.total_capacity), 0, 120_000) : 0;
  if (!st || !capacity) est('stadium: capacity estimated from reputation');
  const shared = st && st.home_club_uids.includes(';');
  const stadium: PackClub['stadium'] = {
    name: (st?.name || `Estádio ${c.short_name || c.name}`).slice(0, 80),
    capacity: capacity || money.capacity,
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
  let initialCash = money.payroll * 3;
  let initialDebt = 0;
  if (fin) {
    const balance = brl(num(fin.balance));
    // A negative balance is debt (the pack repays it in instalments); a positive one is cash.
    initialCash = Math.max(0, balance);
    initialDebt = Math.max(0, -balance);
  } else est('finance: no finances row, cash = three months of the economy payroll');

  const sp = (sponsorsOf.get(uid) ?? []).filter((s) => num(s.annual_value) > 0 && s.end);
  if (!sp.length) est('sponsors: none in the save');

  const body = estimatedBody(r, strength, 'inferred', 'low');
  const club: PackClub = {
    id: `fm-c${uid}`,
    name: c.name.slice(0, 80),
    shortName: (c.short_name || c.name).slice(0, 24),
    cityId: cityKey,
    colours: [colourOf(uid, 0), colourOf(uid, 1)],
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
    /\bSAF\b/.test(c.name) ? 'ownedSaf' : 'association',
  );
  staff.push(own.coach);
  assignments.push(own.assignment);
  governance.push(own.governance);
}
if (!clubs.length) throw new Error('no clubs');

// ── Pack ─────────────────────────────────────────────────────────────────────────────────────────

const ids = (list: string[]) => list.map((u) => `fm-c${u}`);
const competitions = devDivisions(SEASON, [serieA, serieB, serieC, serieD].map(ids));
['Série A', 'Série B', 'Série C', 'Série D'].forEach((name, i) => (competitions[i]!.name = name));

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
  notes: report.notes,
  output: OUT,
};
writeFileSync(OUT.replace(/\.json\.gz$/, '') + '.report.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
