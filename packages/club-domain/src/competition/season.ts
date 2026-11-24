/**
 * Season of every competition, without the user (MC-179; ADR-016 items 5–6).
 * Pure and step by step: the caller asks for the next day, plays that day's
 * matches however it likes (the engine through its contract, in parallel or
 * not) and records the outcomes; phases open as soon as their clubs are known.
 * Player state (injuries, suspensions, fatigue) is not carried between
 * matches yet: every club fields its best eleven.
 */
import { fork, next, rngFrom } from '@decabeca/match-engine';
import type { Pack } from '../pack/schema';
import {
  baseDates,
  emptyCalendar,
  isoOf,
  place,
  restDays,
  take,
  type Calendar,
  type Scheduled,
} from './calendar';
import { COPA_ID, copaDoBrasil, copaField, copaMembers } from './copa';
import {
  conmebolClubs,
  conmebolField,
  foreignEntrants,
  libertadores,
  sudamericana,
  type ConmebolField,
} from './conmebol';
import { drawGroups, groupFixtures, select } from './groups';
import {
  advance,
  bracketTable,
  decideTie,
  legsOf,
  startBracket,
  type Bracket,
  type LegResult,
  type TieDecision,
} from './knockout';
import { roundRobin, standings, type Played, type Row, type TableRules } from './league';
import { applyOutcomes, regulationsFor, type Results } from './outcomes';
import { estadualCompetitions } from './estaduais';
import { finalists, regionalCompetitions, supercopa, supercopaPair } from './regionais';
import {
  CENTRO_OESTE_ID,
  NORDESTE_ID,
  NORTE_ID,
  SUL_SUDESTE_ID,
  SUPERCOPA_ID,
  VERDE_ID,
} from './regionais-data';
import type { Competition, Phase } from './schema';

/** Clubs entering a phase, from the regulation alone (selector widths). */
function entrantCount(c: Competition, p: Phase, sizes: Map<string, { tables: number }>): number {
  let n = 0;
  for (const e of p.entrants) {
    if (e.from === 'members') n += c.size;
    else if (e.from === 'list') n += e.clubIds.length;
    else if (e.from === 'ranking') n += e.count;
    else if (e.from === 'slots') throw new Error('slot entrants are not known in advance');
    else {
      const tables = e.from === 'phase' && e.table === undefined ? sizes.get(e.phaseId)!.tables : 1;
      const width = (e.positions[1] - e.positions[0] + 1) * tables;
      n += e.best ?? width;
    }
  }
  return n;
}

/** Matches a regulation produces in a season. */
export function matchCount(c: Competition): number {
  const sizes = new Map<string, { tables: number }>();
  let total = 0;
  for (const p of c.phases) {
    const n = entrantCount(c, p, sizes);
    if (p.kind === 'liga') total += ((n * (n - 1)) / 2) * p.legs;
    else if (p.kind === 'grupos') {
      if (p.opponents === 'other') total += (n / 2) * (n / 2) * p.legs;
      else
        for (let g = 0; g < p.groups; g++) {
          const k = Math.floor(n / p.groups) + (g < n % p.groups ? 1 : 0);
          total += ((k * (k - 1)) / 2) * p.legs;
        }
    } else total += (n - p.survivors) * p.legs;
    sizes.set(p.id, { tables: p.kind === 'grupos' ? p.groups : 1 });
  }
  return total;
}

// ── Running a season ────────────────────────────────────────────────────────

/** What the season needs from a match: goals, shoot-out and cards (from the engine's `MatchResult`). */
export interface Outcome {
  goals: [number, number];
  shootout: [number, number] | null;
  cards: [[number, number], [number, number]];
}

interface Meta {
  id: string;
  competitionId: string;
  phaseId: string;
  home: string;
  away: string;
  /** Bracket round, tie and leg; absent in table phases. */
  ko?: { round: number; tie: number; leg: number };
}

type Run =
  | { kind: 'table'; groups: string[][]; fixtures: string[] }
  | { kind: 'bracket'; bracket: Bracket; dates: number[]; fixtures: string[][] };

export interface Decision extends TieDecision {
  competitionId: string;
  phaseId: string;
  a: string;
  b: string;
}

export interface SeasonState {
  season: number;
  seed: number;
  competitions: Competition[];
  members: Record<string, string[]>;
  ranking: string[];
  regionOf: Record<string, string>;
  slots: Record<string, Record<string, string[]>>;
  previous: Results;
  running: Map<string, Run>;
  results: Results;
  meta: Map<string, Meta>;
  outcomes: Map<string, Outcome>;
  played: Map<string, Played[]>;
  calendar: Calendar;
  decisions: Decision[];
  /** Points each club starts its national division without (financial fair play). */
  deduct?: Record<string, number>;
  /** Last day a match was played: a phase that opens late is not scheduled before it. */
  today?: number;
}

export interface SeasonOptions {
  seed: number;
  /** Season to play; defaults to the pack's. */
  season?: number;
  /** Members by competition; defaults to the regulations' club lists (the pack's season). */
  members?: Record<string, string[]>;
  ranking?: string[];
  slots?: Record<string, Record<string, string[]>>;
  /** Last season's results, for `{ from: 'competition', season: 'previous' }`. */
  previous?: Results;
  deduct?: Record<string, number>;
  /** Also play the state championships, regional cups and Supercopa (the career does; the competition tests do not). */
  estaduais?: boolean;
}

const POINTS = { win: 3, draw: 1, loss: 0 };
const key = (c: string, p: string) => `${c}/${p}`;
export const seedOf = (seed: number, label: string) =>
  Math.floor(next(fork(rngFrom(seed), label)) * 0x7fffffff);

export function startSeason(pack: Pack, opts: SeasonOptions): SeasonState {
  const season = opts.season ?? pack.season;
  const competitions = regulationsFor(pack.competitions, season);
  const members: Record<string, string[]> = {
    ...(opts.members ?? Object.fromEntries(competitions.map((c) => [c.id, c.clubIds]))),
  };
  if (opts.estaduais) {
    // National tier of each club this season: the state championships take those clubs first.
    const tier = new Map<string, number>();
    for (const c of competitions)
      if (c.tier !== null) for (const k of members[c.id] ?? []) tier.set(k, c.tier);
    const est = estadualCompetitions(pack, season, (k) => tier.get(k));
    competitions.push(...est.competitions);
    Object.assign(members, est.members);
    // The CONMEBOL cups, whose Brazilian clubs play no Copa do Nordeste or Copa Sul-Sudeste.
    const conmebol = conmebolOf(
      pack,
      competitions,
      members,
      opts.previous ?? {},
      season,
      opts.seed,
    );
    for (const c of conmebol?.cups ?? []) {
      competitions.push(c);
      members[c.id] = c.clubIds;
    }
    const reg = regionalCompetitions(
      pack,
      season,
      opts.previous ?? {},
      conmebol ? conmebolClubs(conmebol.field) : new Set(),
    );
    competitions.push(...reg.competitions);
    Object.assign(members, reg.members);
  }
  const cityState = new Map(pack.cities.map((c) => [c.id, c.state]));
  const s: SeasonState = {
    season,
    seed: opts.seed,
    competitions,
    members,
    ranking:
      opts.ranking ?? [...pack.clubs].sort((a, b) => b.reputation - a.reputation).map((c) => c.id),
    regionOf: Object.fromEntries(pack.clubs.map((c) => [c.id, cityState.get(c.cityId) ?? ''])),
    slots: opts.slots ?? {},
    previous: opts.previous ?? {},
    running: new Map(),
    results: {},
    meta: new Map(),
    outcomes: new Map(),
    played: new Map(),
    calendar: emptyCalendar(),
    decisions: [],
    ...(opts.deduct && Object.keys(opts.deduct).length > 0 && { deduct: opts.deduct }),
  };
  addCopa(s);
  if (opts.estaduais) addSupercopa(s);
  openReady(s);
  return s;
}

/**
 * The season's CONMEBOL cups (conmebol.ts): Brazil's places from last season's Série A, Copa do
 * Brasil and the cups themselves, beside the 2026 foreign entrants. Null without a full Série A.
 */
function conmebolOf(
  pack: Pack,
  competitions: readonly Competition[],
  members: Record<string, string[]>,
  previous: Results,
  season: number,
  seed: number,
): { field: ConmebolField; cups: Competition[] } | null {
  const serie = competitions.find((c) => c.tier === 1 && c.scope === 'nacional');
  if (!serie) return null;
  const ranking = [...pack.clubs]
    .sort((a, b) => b.reputation - a.reputation || (a.id < b.id ? -1 : 1))
    .map((c) => c.id);
  const field = conmebolField(
    members[serie.id] ?? [],
    ranking,
    previous,
    serie.id,
    serie.phases.at(-1)!.id,
  );
  if (!field) return null;
  const foreign = foreignEntrants(season, seed);
  return {
    field,
    cups: [libertadores(season, field, foreign), sudamericana(season, field, foreign)],
  };
}

/**
 * The Copa do Brasil joins the season when the divisions' members make the real field (copa.ts);
 * its clubs follow the divisions every season, so they are read here, never carried.
 */
function addCopa(s: SeasonState): void {
  const tiers = s.competitions
    .filter((c) => c.scope === 'nacional' && c.tier !== null && c.category === 'profissional')
    .map((c) => ({ tier: c.tier!, clubIds: s.members[c.id] ?? [] }));
  // Last season's Copa do Nordeste and Copa Verde champions take group 2 places (copa.ts).
  const field = copaField(
    tiers,
    s.ranking,
    {
      nordeste: finalists(s.previous, NORDESTE_ID),
      verde: finalists(s.previous, VERDE_ID),
      norte: finalists(s.previous, NORTE_ID),
      centroOeste: finalists(s.previous, CENTRO_OESTE_ID),
      sulSudeste: finalists(s.previous, SUL_SUDESTE_ID),
    },
    s.season,
  );
  if (!field) return;
  const cup = copaDoBrasil(s.season, field);
  s.competitions.push(cup);
  s.members[COPA_ID] = copaMembers(field);
}

/** The Supercopa joins when the top division is there: last season's two champions (regionais.ts). */
function addSupercopa(s: SeasonState): void {
  const serie = s.competitions.find(
    (c) => c.scope === 'nacional' && c.tier === 1 && c.category === 'profissional',
  );
  const pair = serie && supercopaPair(serie, s.members[serie.id] ?? [], s.ranking, s.previous);
  if (!pair) return;
  s.competitions.push(supercopa(s.season, pair));
  s.members[SUPERCOPA_ID] = [...pair];
}

export const tableRules = (s: SeasonState, c: Competition, p: Phase): TableRules =>
  p.kind === 'liga' || p.kind === 'grupos'
    ? {
        points: p.points,
        tieBreakers: p.tieBreakers,
        seed: seedOf(s.seed, key(c.id, p.id)),
        // A sanction is served in the national division, from its first phase.
        ...(s.deduct &&
          c.scope === 'nacional' &&
          c.tier !== null &&
          c.phases[0]!.id === p.id && { deduct: s.deduct }),
      }
    : { points: POINTS, tieBreakers: [], seed: seedOf(s.seed, key(c.id, p.id)) };

/** The phase's clubs, or null while a phase they come from is not over. */
function entrants(s: SeasonState, c: Competition, p: Phase): string[] | null {
  const out: string[] = [];
  for (const e of p.entrants) {
    if (e.from === 'members') out.push(...(s.members[c.id] ?? []));
    else if (e.from === 'list') out.push(...e.clubIds);
    else if (e.from === 'slots') out.push(...(s.slots[c.id]?.[p.id] ?? []));
    else if (e.from === 'ranking')
      out.push(...s.ranking.filter((k) => !out.includes(k)).slice(0, e.count));
    else {
      const source =
        e.from === 'phase'
          ? s.results[c.id]
          : e.season === 'same'
            ? s.results[e.competitionId]
            : s.previous[e.competitionId];
      const r = source?.[e.phaseId];
      if (!r) {
        if (e.from === 'competition' && e.season === 'previous')
          throw new Error(
            `${c.id}/${p.id}: no previous result for ${e.competitionId}/${e.phaseId}`,
          );
        return null;
      }
      out.push(...select(r.tables, e, r.rules));
    }
  }
  return out;
}

function openReady(s: SeasonState): void {
  for (let changed = true; changed;) {
    changed = false;
    for (const c of s.competitions)
      for (const p of c.phases) {
        if (s.running.has(key(c.id, p.id)) || s.results[c.id]?.[p.id]) continue;
        const clubs = entrants(s, c, p);
        if (!clubs) continue;
        open(s, c, p, clubs);
        changed = true;
      }
  }
}

function fixture(s: SeasonState, c: Competition, m: Meta, base: number, after?: number): void {
  s.meta.set(m.id, m);
  place(s.calendar, {
    id: m.id,
    competitionId: c.id,
    priority: c.priority,
    home: m.home,
    away: m.away,
    // A knockout whose clubs were decided late (matches moved) is not placed in the past.
    base: Math.max(base, (s.today ?? -Infinity) + 1),
    rest: restDays(c.matchRules.minRestHours),
    ...(after === undefined ? {} : { after }),
  });
}

/**
 * The Série A stops for a World Cup (every four years from 2026, FIFA's 11 June to 19 July):
 * in 2026 its 18th round closed on 31 May and the 19th, first set for 22 July, was brought
 * forward to 16 July for the CONMEBOL cups (Band, Itatiaia, Jul 2026). Later World Cups keep
 * the first plan, back on 22 July (PARÂMETRO). The other series and cups keep their own dates.
 */
export function worldCupPause(season: number): { start: string; end: string } | null {
  if (season % 4 !== 2) return null;
  return { start: `${season}-06-01`, end: season === 2026 ? '2026-07-15' : `${season}-07-21` };
}

/** A phase's base dates, the top division's with the World Cup pause taken out. */
function datesOf(s: SeasonState, c: Competition, p: Phase, n: number): number[] {
  const pause = c.tier === 1 && c.scope === 'nacional' ? worldCupPause(s.season) : null;
  if (!pause) return baseDates(p.dates, n);
  const all = { ...pause, weekdays: [0, 1, 2, 3, 4, 5, 6] };
  return baseDates({ ...p.dates, exclude: [...(p.dates.exclude ?? []), all] }, n);
}

function open(s: SeasonState, c: Competition, p: Phase, clubs: string[]): void {
  const seed = seedOf(s.seed, key(c.id, p.id));
  if (p.kind === 'liga' || p.kind === 'grupos') {
    const groups =
      p.kind === 'liga'
        ? [clubs]
        : drawGroups(clubs, p.groups, p.draw, seed, (k) => s.regionOf[k] ?? '');
    const rounds =
      p.kind === 'liga'
        ? roundRobin(clubs, p.legs, seed)
        : groupFixtures(groups, p.legs, p.opponents, seed);
    const days = datesOf(s, c, p, rounds.length);
    const run: Run = { kind: 'table', groups, fixtures: [] };
    s.running.set(key(c.id, p.id), run);
    rounds.forEach((pairs, r) =>
      pairs.forEach(([home, away]) => {
        const id = `${c.id}/${p.id}/r${r}/${home}-${away}`;
        run.fixtures.push(id);
        fixture(s, c, { id, competitionId: c.id, phaseId: p.id, home, away }, days[r]!);
      }),
    );
    return;
  }
  const ratio = clubs.length / p.survivors;
  // Whole powers of two only, with exact arithmetic (ADR-020: no Math.log2).
  let rounds = 0;
  for (let size = 1; size < ratio; size *= 2) rounds++;
  if (1 << rounds !== ratio || rounds < 1)
    throw new Error(`${c.id}/${p.id}: ${clubs.length} clubs cannot leave ${p.survivors}`);
  const run: Run = {
    kind: 'bracket',
    bracket: startBracket(clubs, p.pairing, seed),
    dates: datesOf(s, c, p, rounds * p.legs),
    fixtures: [],
  };
  s.running.set(key(c.id, p.id), run);
  scheduleRound(s, c, p, run);
}

/** Better campaign in the whole competition so far: points, goal difference, goals for, then seed. */
function better(s: SeasonState, c: Competition, seeds: string[]) {
  return (x: string, y: string) => {
    const rows = standings([x, y], s.played.get(c.id) ?? [], {
      points: POINTS,
      tieBreakers: ['goalDifference', 'goalsFor'],
      seed: 0,
    });
    const [r0, r1] = rows as [Row, Row];
    const level =
      r0.points === r1.points &&
      r0.goalsFor - r0.goalsAgainst === r1.goalsFor - r1.goalsAgainst &&
      r0.goalsFor === r1.goalsFor;
    return level ? (seeds.indexOf(x) < seeds.indexOf(y) ? x : y) : r0.clubId;
  };
}

function scheduleRound(
  s: SeasonState,
  c: Competition,
  p: Phase,
  run: Extract<Run, { kind: 'bracket' }>,
) {
  if (p.kind === 'liga' || p.kind === 'grupos') return;
  const round = run.bracket.rounds.length - 1;
  const host = better(s, c, run.bracket.seeds);
  // A round decided late (its clubs' matches moved) keeps the spacing of its legs: every leg
  // moves by the days the first one lost, so the second does not follow the first next day.
  const first = run.dates[round * p.legs]!;
  const late = s.today === undefined ? 0 : Math.max(0, s.today + 1 - first);
  run.fixtures = run.bracket.rounds[round]!.map((t, tie) => {
    const legs = legsOf(
      t,
      p.legs,
      p.host,
      seedOf(s.seed, `${c.id}/${p.id}/host/${t.a}/${t.b}`),
      host,
    );
    let prev: number | undefined;
    return legs.map(([home, away], leg) => {
      const id = `${c.id}/${p.id}/r${round}/t${tie}/l${leg}`;
      fixture(
        s,
        c,
        { id, competitionId: c.id, phaseId: p.id, home, away, ko: { round, tie, leg } },
        run.dates[round * p.legs + leg]! + late,
        prev,
      );
      prev = s.calendar.matches.get(id)!.day;
      return id;
    });
  });
}

/** The next day with a match to play, or null when the season is over. */
export function nextDay(s: SeasonState): number | null {
  let best: number | null = null;
  for (const m of s.calendar.matches.values())
    if (!m.played && (best === null || m.day < best)) best = m.day;
  return best;
}

/**
 * Matches of the day. A second leg whose first leg moved past it is moved
 * after the first leg (the postponement is recorded by the calendar).
 */
export function matchesOn(s: SeasonState, day: number): string[] {
  const out: string[] = [];
  // The day's matches first, without copying the season: a move below only lands on a later day.
  const today: Scheduled[] = [];
  for (const m of s.calendar.matches.values()) if (!m.played && m.day === day) today.push(m);
  for (const m of today) {
    const ko = s.meta.get(m.id)!.ko;
    if (ko && ko.leg > 0) {
      const first = s.calendar.matches.get(m.id.replace(/l\d+$/, `l${ko.leg - 1}`))!;
      if (!first.played || first.day >= m.day) {
        if (first.day >= m.day) {
          take(s.calendar, m);
          place(s.calendar, { ...m, after: first.day }, first.day + 1);
          s.calendar.postponements.push({
            matchId: m.id,
            from: m.day,
            to: s.calendar.matches.get(m.id)!.day,
            reason: 'clash',
          });
        }
        continue;
      }
    }
    out.push(m.id);
  }
  return out.sort();
}

export function record(s: SeasonState, id: string, o: Outcome): void {
  const m = s.meta.get(id);
  const scheduled = s.calendar.matches.get(id);
  if (!m || !scheduled) throw new Error(`unknown match ${id}`);
  if (scheduled.played) throw new Error(`match ${id} already played`);
  scheduled.played = true;
  if (scheduled.day > (s.today ?? -Infinity)) s.today = scheduled.day;
  s.outcomes.set(id, o);
  const list = s.played.get(m.competitionId) ?? [];
  list.push({ home: m.home, away: m.away, goals: o.goals, cards: o.cards });
  s.played.set(m.competitionId, list);
  progress(s, m.competitionId, m.phaseId);
}

function progress(s: SeasonState, cid: string, pid: string): void {
  const run = s.running.get(key(cid, pid))!;
  const c = s.competitions.find((x) => x.id === cid)!;
  const p = c.phases.find((x) => x.id === pid)!;
  const rules = tableRules(s, c, p);
  const done = (ids: string[]) => ids.every((id) => s.outcomes.has(id));
  if (run.kind === 'table') {
    if (!done(run.fixtures)) return;
    const games = run.fixtures.map((id) => {
      const m = s.meta.get(id)!;
      const o = s.outcomes.get(id)!;
      return { home: m.home, away: m.away, goals: o.goals, cards: o.cards };
    });
    const carry =
      (p.kind === 'liga' || p.kind === 'grupos') && p.carryFrom
        ? s.results[cid]![p.carryFrom]!.tables.flat()
        : undefined;
    const tables = run.groups.map((g) =>
      standings(g, games, { ...rules, ...(carry ? { carry } : {}) }),
    );
    finishPhase(s, cid, pid, tables, rules);
    return;
  }
  if (p.kind === 'liga' || p.kind === 'grupos' || !done(run.fixtures.flat())) return;
  const round = run.bracket.rounds.at(-1)!;
  round.forEach((t, i) => {
    const legs: LegResult[] = run.fixtures[i]!.map((id) => {
      const m = s.meta.get(id)!;
      const o = s.outcomes.get(id)!;
      return { home: m.home, away: m.away, goals: o.goals, shootout: o.shootout };
    });
    const d = decideTie(t, legs, p.tieBreakers, seedOf(s.seed, `${run.fixtures[i]![0]}/tie`));
    t.winner = d.winner;
    s.decisions.push({ ...d, competitionId: cid, phaseId: pid, a: t.a, b: t.b });
  });
  const next = advance(run.bracket, p.survivors);
  if (next !== run.bracket) {
    run.bracket = next;
    scheduleRound(s, c, p, run);
    return;
  }
  // Ranked by the bracket; rows carry the campaign for later selections.
  const campaign = standings(run.bracket.seeds, s.played.get(cid) ?? [], {
    ...rules,
    tieBreakers: [],
  });
  const rows = bracketTable(run.bracket).map((k) => campaign.find((r) => r.clubId === k)!);
  finishPhase(s, cid, pid, [rows], rules);
}

function finishPhase(s: SeasonState, cid: string, pid: string, tables: Row[][], rules: TableRules) {
  s.running.delete(key(cid, pid));
  (s.results[cid] ??= {})[pid] = { tables, rules };
  openReady(s);
}

/** Plays the season day by day; `playDay` gets the day's match ids and returns their outcomes. */
export async function runSeason(
  s: SeasonState,
  playDay: (ids: string[], s: SeasonState) => Promise<Outcome[]>,
): Promise<void> {
  for (let day = nextDay(s); day !== null; day = nextDay(s)) {
    const ids = matchesOn(s, day);
    const outcomes = await playDay(ids, s);
    ids.forEach((id, i) => record(s, id, outcomes[i]!));
  }
}

export const isOver = (s: SeasonState) =>
  s.running.size === 0 &&
  s.competitions.every((c) => c.phases.every((p) => s.results[c.id]?.[p.id]));

/** Next season's members, titles and places (MC-172). */
export const finishSeason = (s: SeasonState, next: Competition[]) => {
  // The Copa is not in the pack's regulations: next season's has the same size (startSeason
  // draws its clubs again from the new divisions).
  const cup = s.competitions.find((c) => c.id === COPA_ID);
  return applyOutcomes({
    competitions: s.competitions,
    members: s.members,
    results: s.results,
    next: cup ? [...next, { ...cup, season: s.season + 1 }] : next,
    ranking: s.ranking,
  });
};

/**
 * Season checks of TEST_STRATEGY §6: every phase over and every match played;
 * nobody plays twice a day; rest kept; every moved match recorded; second
 * legs after first legs; division clubs in one division only.
 */
export function checkSeason(s: SeasonState): string[] {
  const problems: string[] = [];
  if (!isOver(s)) problems.push('season not over');
  const matches = [...s.calendar.matches.values()];
  if (matches.some((m) => !m.played)) problems.push('unplayed matches');
  const byClub = new Map<string, Scheduled[]>();
  for (const m of matches)
    for (const k of [m.home, m.away]) byClub.set(k, [...(byClub.get(k) ?? []), m]);
  for (const [club, list] of byClub) {
    list.sort((a, b) => a.day - b.day);
    for (let i = 1; i < list.length; i++) {
      const gap = list[i]!.day - list[i - 1]!.day;
      if (gap === 0) problems.push(`${club} plays twice on ${isoOf(list[i]!.day)}`);
      else if (gap < Math.max(list[i]!.rest, list[i - 1]!.rest))
        problems.push(`${club} rests ${gap} day(s) before ${list[i]!.id}`);
    }
  }
  const recorded = new Set(s.calendar.postponements.map((p) => p.matchId));
  for (const m of matches)
    if (m.day !== m.base && !recorded.has(m.id)) problems.push(`${m.id} moved without a record`);
  for (const m of matches) {
    const ko = s.meta.get(m.id)!.ko;
    if (ko && ko.leg > 0) {
      const first = s.calendar.matches.get(m.id.replace(/l\d+$/, `l${ko.leg - 1}`))!;
      if (first.day >= m.day) problems.push(`${m.id} before its first leg`);
    }
  }
  const divisionClubs = s.competitions
    .filter((c) => c.tier !== null)
    .flatMap((c) => s.members[c.id] ?? []);
  if (new Set(divisionClubs).size !== divisionClubs.length) problems.push('club in two divisions');
  return problems;
}
