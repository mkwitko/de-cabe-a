/**
 * What the confederation and the broadcasters pay each club, in four lines (CBF 2026 tables and
 * the TV contracts): the participation quota (`quota`), the money for each phase reached
 * (`advance`), the prize of a final (`prize`) and the TV rights (`tv`: an equal part, a part by
 * final position and a part by audience). The person's club and every other club read the same
 * tables here; only the ledger differs. Integers, results from seed and day.
 */
import { dayOf } from '../competition/calendar';
import { seedOf } from '../competition/season';
import { postEntry } from '../finance/ledger';
import type { CareerWorld } from './advance';
import { note } from './inbox';
import { priced, pricesOf } from './prices';
import { nationalDivisions } from './start';

export type Line = 'quota' | 'advance' | 'prize' | 'tv';
export type Source = 'copa' | 'serieC' | 'serieD' | 'tv';

/** A credit due to a club: `phase` counts from 1 inside its source. Amount at base prices. */
export interface Credit {
  line: Line;
  source: Source;
  phase: number;
  amount: number;
  key: string;
}

// ── Série A and B TV ────────────────────────────────────────────────────────

/**
 * Série B 2026: about R$ 14.9 mi net per club in TV rights, equal for all, no cash prize for the
 * champion (press, 2026). PARÂMETRO from a press figure.
 */
export const TV_SERIE_B = 14_900_000;
/**
 * Mean TV money of a Série A club. The league pays no CBF prize by position: the TV money is the
 * whole income. Only the spread is calibrated against club TV revenue 2025 (Flamengo R$ 612 mi,
 * Palmeiras 527, Corinthians 363, São Paulo 245, Grêmio 156, Mirassol 126; press / Sports
 * Value), not these as contract values. PARÂMETRO.
 */
export const TV_SERIE_A = 130_000_000;
/**
 * The two blocs that sell Série A rights, in percent of a club's TV money by part: Libra 40 equal
 * / 30 performance / 30 audience; FFU/LFU 45 / 30 / 25. Membership is real (below); a club in
 * neither list (promoted from a lower division) is FFU, the bloc with most members.
 */
export const BLOCS = {
  libra: { equal: 40, perf: 30, audience: 30 },
  ffu: { equal: 45, perf: 30, audience: 25 },
} as const;
/**
 * Libra's Série A members 2026, pack ids (data/tv-blocs.json: Lance! 2026-01-27, Wikipedia, Band
 * 2026-05-05). Palmeiras left in May 2026 but keeps the Libra contract to 2029. Everyone else: FFU.
 * A pack with none of these ids (the generated dev pack) keeps the old ranking-parity split.
 */
export const LIBRA_CLUB_IDS: ReadonlySet<string> = new Set([
  'fm-c313', // Atlético Mineiro
  'fm-c315', // Bahia
  'fm-c322', // Flamengo
  'fm-c324', // Grêmio
  'fm-c329', // Palmeiras
  'fm-c317', // Red Bull Bragantino
  'fm-c334', // Remo
  'fm-c335', // Santos
  'fm-c337', // São Paulo
  'fm-c340', // Vitória
]);
/**
 * A club's audience weight stops at this many percent of the mean fan base: the broadcasters pay
 * for audience, but not in proportion to a 40-million fan base. PARÂMETRO.
 */
export const AUDIENCE_CAP = 1500;

interface TvShare {
  equal: number;
  audience: number;
  /** Performance money of the middle of the table; the real one is `performanceTv`. */
  perfMean: number;
}

const plans = new WeakMap<object, Map<string, TvShare>>();

/** Série A clubs' TV parts this season, read once (the members do not change in it). */
function tvPlan(w: CareerWorld): Map<string, TvShare> {
  let plan = plans.get(w.season);
  if (plan) return plan;
  plan = new Map();
  plans.set(w.season, plan);
  const div = nationalDivisions(w.pack).find((d) => d.tier === 1);
  const ids = div ? (w.season.members[div.id] ?? []) : [];
  if (!ids.length) return plan;
  const fans = new Map(w.pack.clubs.map((c) => [c.id, c.fans.size]));
  const mean = Math.max(
    1,
    Math.round(ids.reduce((s, id) => s + (fans.get(id) ?? 0), 0) / ids.length),
  );
  // Audience pays more than in proportion to the fan base (the big audiences carry the ad money).
  const weight = (id: string) => {
    const f = Math.min(fans.get(id) ?? 0, Math.round((mean * AUDIENCE_CAP) / 100));
    return Math.round((f * f) / mean) + 1;
  };
  const ranked = new Map(w.season.ranking.map((id, i) => [id, i]));
  const real = w.pack.clubs.some((c) => LIBRA_CLUB_IDS.has(c.id));
  const blocOf = (id: string) =>
    (real ? LIBRA_CLUB_IDS.has(id) : (ranked.get(id) ?? 0) % 2 === 0) ? BLOCS.libra : BLOCS.ffu;
  const total = new Map<object, { sum: number; n: number }>();
  for (const id of ids) {
    const t = total.get(blocOf(id)) ?? { sum: 0, n: 0 };
    total.set(blocOf(id), { sum: t.sum + weight(id), n: t.n + 1 });
  }
  for (const id of ids) {
    const b = blocOf(id);
    const t = total.get(b)!;
    plan.set(id, {
      equal: Math.round((TV_SERIE_A * b.equal) / 100),
      audience: Math.round(
        (((TV_SERIE_A * b.audience) / 100) * weight(id) * t.n) / Math.max(1, t.sum),
      ),
      perfMean: Math.round((TV_SERIE_A * b.perf) / 100),
    });
  }
  return plan;
}

/** The TV parts of a club in a tier this season (zero where no TV money is paid). */
export function tvOf(w: CareerWorld, clubId: string, tier: number): TvShare {
  if (tier === 1)
    return (
      tvPlan(w).get(clubId) ?? {
        equal: Math.round((TV_SERIE_A * BLOCS.ffu.equal) / 100),
        audience: Math.round((TV_SERIE_A * BLOCS.ffu.audience) / 100),
        perfMean: Math.round((TV_SERIE_A * BLOCS.ffu.perf) / 100),
      }
    );
  return { equal: tier === 2 ? TV_SERIE_B : 0, audience: 0, perfMean: 0 };
}

/** Performance money by final position: linear, the champion twice the mean, the last near zero. */
export const performanceTv = (perfMean: number, position: number, places: number) =>
  position < 1 || position > places
    ? 0
    : Math.round((perfMean * 2 * (places + 1 - position)) / (places + 1));

// ── Quotas, state championship ──────────────────────────────────────────────

/**
 * Participation quota per club, by tier. Série D 2026 (CBF): R$ 500 mil to each of 96 clubs in
 * the 1st phase. Série C has no public 2026 table: 2025 reference R$ 1.4 mi participation plus
 * R$ 150 mil extra per club. A and B have none (their TV money is the line).
 */
export const QUOTA: Record<number, number> = { 3: 1_550_000, 4: 500_000 };
/** State championship TV quotas, a season's worth by tier. ESTIMATE (Sport Insider via Lance!). */
export const STATE: Record<number, number> = { 1: 12_500_000, 2: 2_100_000, 3: 1_000_000, 4: 0 };

// ── Copa do Brasil 2026 (CBF) ───────────────────────────────────────────────

/** Paid per phase reached by the Série B group, then by the lower groups (1st to semi-final). */
export const COPA_B = [
  400_000, 1_380_000, 1_530_000, 1_680_000, 2_000_000, 3_000_000, 4_000_000, 9_000_000,
];
export const COPA_LOW = [
  400_000, 830_000, 950_000, 1_070_000, 2_000_000, 3_000_000, 4_000_000, 9_000_000,
];
/** Runner-up and champion, in place of the final phase's quota. */
export const COPA_RUNNER_UP = 34_000_000;
export const COPA_CHAMPION = 78_000_000;
/** Phase where each tier enters: Série A at the 5th, the others by group (0 = 1st phase). */
const COPA_ENTRY: Record<number, number> = { 1: 4, 2: 1, 3: 1, 4: 0 };
/** Month-day each of the nine stages is played (5 phases, round of 16, quarters, semis, final). */
const COPA_DATES = [
  '02-05',
  '02-26',
  '03-26',
  '04-23',
  '05-14',
  '07-30',
  '08-27',
  '09-24',
  '11-08',
];
const FINAL_STAGE = COPA_DATES.length - 1;

/** Stages each club played, by club, plus the champion. Read once per season. */
interface Cup {
  stages: Map<string, number[]>;
  champion: string;
}
const cups = new WeakMap<object, Cup>();

function tierMap(w: CareerWorld): Map<string, number> {
  const by = new Map<string, number>();
  for (const d of nationalDivisions(w.pack))
    for (const id of w.season.members[d.id] ?? []) by.set(id, d.tier);
  return by;
}

/**
 * The season's Copa do Brasil, drawn from the career seed: clubs enter at their group's phase,
 * the pairs come out of a seeded sort, the stronger side (national ranking) wins more often, and
 * a club left without an opponent goes through. Not played on the pitch: only the phase each
 * club reaches matters, for the money.
 */
function copaOf(w: CareerWorld): Cup {
  let cup = cups.get(w.season);
  if (cup) return cup;
  const tiers = tierMap(w);
  const order = new Map(w.season.ranking.map((id, i) => [id, i]));
  const rank = (id: string) => order.get(id) ?? order.size;
  const rating = (id: string) => order.size + 40 - rank(id);
  const rounds: string[][] = [];
  let alive: string[] = [];
  const season = w.season.season;
  for (let i = 0; i <= FINAL_STAGE && (i <= 4 || alive.length > 1); i++) {
    const entering = [...tiers].filter(([, t]) => (COPA_ENTRY[t] ?? 0) === i).map(([id]) => id);
    const pool = [...alive, ...entering];
    rounds.push(pool);
    const sorted = pool
      .map((id) => ({ id, k: seedOf(w.seed, `copa:${season}:${i}:${id}`) }))
      .sort((a, b) => a.k - b.k || a.id.localeCompare(b.id))
      .map((x) => x.id);
    const next: string[] = [];
    if (sorted.length % 2) {
      const bye = sorted.reduce((a, b) => (rank(b) < rank(a) ? b : a));
      sorted.splice(sorted.indexOf(bye), 1);
      next.push(bye);
    }
    for (let j = 0; j < sorted.length; j += 2) {
      const a = sorted[j]!;
      const b = sorted[j + 1]!;
      const roll = seedOf(w.seed, `copa:${season}:${i}:${a}:${b}`) % (rating(a) + rating(b));
      next.push(roll < rating(a) ? a : b);
    }
    alive = next;
  }
  const last = rounds.length;
  // Rounds after the 5th phase count from the final backwards, whatever the pack's size.
  const stageOf = (i: number) => (i <= 4 ? i : FINAL_STAGE - (last - 1 - i));
  const stages = new Map<string, number[]>();
  rounds.forEach((pool, i) => {
    for (const id of pool) stages.set(id, [...(stages.get(id) ?? []), stageOf(i)]);
  });
  cup = { stages, champion: alive.length === 1 ? alive[0]! : '' };
  cups.set(w.season, cup);
  return cup;
}

/** Copa do Brasil money of a club: one credit per phase played, each due the day it is played. */
export function copaCredits(w: CareerWorld, clubId: string): (Credit & { day: number })[] {
  const cup = copaOf(w);
  const tier = tierMap(w).get(clubId) ?? 4;
  const table = tier === 2 ? COPA_B : COPA_LOW;
  const season = w.season.season;
  return (cup.stages.get(clubId) ?? []).map((stage) => {
    const final = stage === FINAL_STAGE;
    return {
      line: final ? 'prize' : 'advance',
      source: 'copa',
      phase: stage + 1,
      amount: final ? (cup.champion === clubId ? COPA_CHAMPION : COPA_RUNNER_UP) : table[stage]!,
      key: `copa:${season}:${stage}`,
      day: dayOf(`${season}-${COPA_DATES[stage]}`),
    };
  });
}

// ── Série C and D phases, TV by position: paid at the season's end ──────────

/** Série C 2025 reference (no 2026 table): each of the 8 quadrangular qualifiers takes this more. */
const SERIE_C_QUADRANGULAR = 344_000;
/** Série D 2026 (CBF): extra per club for each knockout phase it plays, in order. */
const SERIE_D_PHASES = [100_000, 150_000, 180_000, 180_000, 180_000, 180_000];
/** Série D 2026 (CBF): the final. */
const SERIE_D_FINAL = 300_000;

/** What each Série C and D club played, read in one pass once the season is over. */
interface Ladder {
  quadrangular: Set<string>;
  rounds: Map<string, Set<string>>;
  finalists: Set<string>;
}
const ladders = new WeakMap<object, Ladder>();

function ladderOf(w: CareerWorld): Ladder {
  let l = ladders.get(w.season);
  if (l) return l;
  l = { quadrangular: new Set(), rounds: new Map(), finalists: new Set() };
  ladders.set(w.season, l);
  const divs = nationalDivisions(w.pack);
  const comp = (tier: number) =>
    w.season.competitions.find((c) => c.id === divs.find((d) => d.tier === tier)?.id);
  const c = comp(3);
  const d = comp(4);
  const quadrangular = c?.phases[1]?.id;
  const finalPhase = d?.phases.at(-1)?.id;
  for (const m of w.season.meta.values()) {
    const sides = [m.home, m.away];
    if (m.competitionId === c?.id && m.phaseId === quadrangular)
      for (const s of sides) l.quadrangular.add(s);
    if (m.competitionId !== d?.id || !m.ko) continue;
    for (const s of sides) {
      if (m.phaseId === finalPhase) l.finalists.add(s);
      else {
        const set = l.rounds.get(s) ?? new Set<string>();
        set.add(`${m.phaseId}:${m.ko.round}`);
        l.rounds.set(s, set);
      }
    }
  }
  return l;
}

/**
 * What a club is owed when its season ends, at base prices: TV money by final position (Série A),
 * the Série C quadrangular and the Série D phases and final. `position` is in a table of `places`.
 */
export function endCredits(
  w: CareerWorld,
  clubId: string,
  position: number,
  places: number,
): Credit[] {
  const tier = tierMap(w).get(clubId) ?? 4;
  const season = w.season.season;
  const out: Credit[] = [];
  const add = (line: Line, source: Source, phase: number, amount: number) =>
    amount > 0 &&
    out.push({ line, source, phase, amount, key: `${line}:${source}:${season}:${phase}` });
  if (tier === 1) add('tv', 'tv', 1, performanceTv(tvOf(w, clubId, 1).perfMean, position, places));
  if (tier === 3 && ladderOf(w).quadrangular.has(clubId))
    add('advance', 'serieC', 2, SERIE_C_QUADRANGULAR);
  if (tier === 4) {
    const l = ladderOf(w);
    const n = Math.min(l.rounds.get(clubId)?.size ?? 0, SERIE_D_PHASES.length);
    SERIE_D_PHASES.slice(0, n).forEach((a, i) => add('advance', 'serieD', i + 2, a));
    if (l.finalists.has(clubId)) add('prize', 'serieD', 9, SERIE_D_FINAL);
  }
  return out;
}

/** The results money of a club's season at the season's prices that its budget does not count. */
export function resultsIncome(
  w: CareerWorld,
  clubId: string,
  position: number,
  places: number,
): number {
  const tier = tierMap(w).get(clubId) ?? 4;
  const end = endCredits(w, clubId, position, places).reduce((s, c) => s + c.amount, 0);
  const copa = copaCredits(w, clubId).reduce((s, c) => s + c.amount, 0);
  // The budget already counts the mean performance money of a Série A club.
  return priced(end + copa - tvOf(w, clubId, tier).perfMean, pricesOf(w).prices);
}

/** Posts the Copa do Brasil phases of the person's club played in (from, to], with a note each. */
export function postCups(w: CareerWorld, from: number, to: number): void {
  for (const c of copaCredits(w, w.clubId))
    if (c.day > from && c.day <= to) postCredit(w, c, c.day);
}

/** Posts the season-end credits of the person's club. */
export function postSeasonEnd(w: CareerWorld, position: number, places: number): void {
  for (const c of endCredits(w, w.clubId, position, places)) postCredit(w, c, w.ledger.today);
}

function postCredit(w: CareerWorld, c: Credit, day: number): void {
  const amount = priced(c.amount, pricesOf(w).prices);
  const posted = postEntry(w.ledger, {
    key: c.key,
    kind: c.line,
    ref: `${c.source}:${w.season.season}`,
    amount,
    day,
    dueDay: day,
  });
  if (posted)
    note(w, { day: w.day, kind: 'quota', line: c.line, source: c.source, phase: c.phase, amount });
}
