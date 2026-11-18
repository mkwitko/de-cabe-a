/**
 * What the person's club knows of each player (ADR-021, step 4). Knowledge is a percentage:
 *
 * - a player any club would know (judgement.ts `knows`, or a club it meets this season) starts
 *   at BASE; the rest at 0, out of the market list;
 * - a scout's report (a trip to a state or a division, MISSION_DAYS long) adds REPORT_GAIN, a
 *   match against his club adds MATCH_GAIN;
 * - it fades a point every FADE_DAYS since it last grew, never under the base: players change.
 *
 * The more it knows, the nearer the level and ceiling it reads are to the truth and the narrower
 * their band: at 100 it reads him exactly. Only what grew past the base is kept in the save
 * (`w.scouting.known`). Every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { nationalDivisions } from '../career/start';
import { squadPlayers } from '../career/squad';
import { WHOLE, cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { ABROAD } from './abroad';
import { tierOfClub } from './books';
import { eyeOf, eyeSpread, knows, levelError, seenCeiling, seenLevel } from './judgement';
import { readingsOf } from './value';

/** A scout away: where to, and the day he reports. */
export interface Mission {
  /** A state (`RS`) or a national division (`tier:2`). */
  area: string;
  from: number;
  until: number;
}

/** What the club knows of a player past the base: the percentage, and the day it last grew. */
export interface Knowledge {
  k: number;
  day: number;
}

export interface Scouting {
  /** By player id; only players known past the base. */
  known: Record<string, Knowledge>;
  missions: Mission[];
}

/** Days a scout spends in an area before reporting. */
export const MISSION_DAYS = 28;
/** Scouts the club can have away at once, by scouting department 1..5. */
const SCOUTS = [1, 1, 2, 2, 3] as const;
/** Level from which a player without a club is known to every club. PARÂMETRO. */
const FAMOUS = 63;
/** Knowledge of a player any club would know, in percent. */
export const BASE = 25;
/** Points a report adds, by scouting department 1..5. */
const REPORT_GAIN = [20, 25, 30, 35, 40] as const;
/** Points a match against his club adds to each of its players. */
export const MATCH_GAIN = 8;
/** Days for knowledge to fade by one point. */
export const FADE_DAYS = 10;

/** The base: what the club knows of him without looking. */
const baseOf = (w: CareerWorld, p: PackPlayer) => (clubKnows(w, w.clubId, p) ? BASE : 0);

/** What the person's club knows of him on `day`, 0..100; 100 for its own players. */
export function knowledgeOf(w: CareerWorld, p: PackPlayer, day = w.day): number {
  if (p.clubId === w.clubId) return 100;
  const base = baseOf(w, p);
  const got = w.scouting?.known[p.id];
  if (typeof got !== 'object') return base;
  return Math.max(base, got.k - Math.floor((day - got.day) / FADE_DAYS));
}

/** Adds what the club just learned of him on `day`. */
function learn(
  w: CareerWorld,
  known: Record<string, Knowledge>,
  p: PackPlayer,
  gain: number,
  day: number,
) {
  known[p.id] = { k: Math.min(100, knowledgeOf(w, p, day) + gain), day };
}

/**
 * What the person's club reads of a player of another club: the level and ceiling its eye sees,
 * pulled toward the truth by what it knows, with a band that narrows as it knows more.
 */
export function personReading(
  w: CareerWorld,
  p: PackPlayer,
): { rating: number; range: [number, number]; potential: [number, number]; knowledge: number } {
  const k = knowledgeOf(w, p);
  const r = readingsOf(w.pack).get(p.id)!;
  const doubt = 100 - k;
  const { level, ceiling } = eyeSpread(w.pack, w.clubId);
  const rating = Math.max(
    1,
    Math.min(99, r.level + Math.round((levelError(w.pack, w.clubId, p) * doubt) / 100)),
  );
  const top = Math.max(
    rating,
    Math.min(
      99,
      r.ceiling + Math.round(((seenCeiling(w.pack, w.clubId, p) - r.ceiling) * doubt) / 100),
    ),
  );
  const spread = Math.ceil((level * doubt) / 100);
  const cspread = Math.ceil((ceiling * doubt) / 100);
  return {
    rating,
    range: [Math.max(1, rating - spread), Math.min(99, rating + spread)],
    potential: [Math.max(1, top - cspread), Math.min(99, top + cspread)],
    knowledge: k,
  };
}

/** Players a scout reports from one trip, by scouting department 1..5. */
const REPORTS = [6, 9, 12, 16, 20] as const;

export const scoutsOf = (w: CareerWorld) => SCOUTS[eyeOf(w.pack, w.clubId).scouting - 1]!;

/** Each club's state, by its city. */
export const stateOf = (pack: Pack, clubId: string) =>
  cached(pack, 'clubStates', WHOLE, () => {
    const cities = new Map(pack.cities.map((c) => [c.id, c.state]));
    return new Map(pack.clubs.map((c) => [c.id, cities.get(c.cityId)]));
  }).get(clubId);

/** Whether the person's club knows him at all: anything above 0. */
export const personKnows = (w: CareerWorld, p: PackPlayer) =>
  p.clubId !== ABROAD && knowledgeOf(w, p) > 0;

/** Each club's opponents this season: every club it shares a competition with. */
const rivals = new WeakMap<object, Map<string, Set<string>>>();
function rivalsOf(w: CareerWorld, clubId: string): Set<string> {
  let by = rivals.get(w.season);
  if (!by) {
    by = new Map();
    for (const ids of Object.values(w.season.members))
      for (const id of ids) {
        let set = by.get(id);
        if (!set) by.set(id, (set = new Set()));
        for (const other of ids) set.add(other);
      }
    rivals.set(w.season, by);
  }
  return by.get(clubId) ?? new Set();
}

/**
 * Whether a club knows a player without a report: its own; every player of a club it meets in a
 * competition this season (it studies its opponents); the rest by judgement.ts `knows`.
 */
export function clubKnows(w: CareerWorld, clubId: string, p: PackPlayer): boolean {
  if (p.clubId === clubId) return true;
  if (p.clubId === ABROAD) return false;
  // A good player without a club is news (a star home from abroad, a veteran let go): all know.
  if (p.clubId === null)
    return readingsOf(w.pack).get(p.id)!.level >= FAMOUS || knows(w.pack, clubId, p, null, false);
  if (rivalsOf(w, clubId).has(p.clubId)) return true;
  return knows(
    w.pack,
    clubId,
    p,
    tierOfClub(w, p.clubId),
    stateOf(w.pack, p.clubId) === stateOf(w.pack, clubId),
  );
}

/** The areas a scout can be sent to: the national divisions, then every state with a club. */
export function scoutAreas(w: CareerWorld): string[] {
  const tiers = nationalDivisions(w.pack).map((d) => `tier:${d.tier}`);
  const states = new Set<string>();
  for (const c of w.pack.clubs) {
    const s = stateOf(w.pack, c.id);
    if (s) states.add(s);
  }
  return [...new Set(tiers), ...[...states].sort()];
}

const inArea = (w: CareerWorld, area: string, clubId: string) =>
  area.startsWith('tier:')
    ? tierOfClub(w, clubId) === Number(area.slice(5))
    : stateOf(w.pack, clubId) === area;

export type ScoutNo = 'busy' | 'area' | 'already';

/** Sends a scout to an area from `day`; the reason it cannot, or null. */
export function sendScout(w: CareerWorld, area: string, day: number): ScoutNo | null {
  if (!scoutAreas(w).includes(area)) return 'area';
  const s = w.scouting ?? { known: {}, missions: [] };
  if (s.missions.some((m) => m.area === area)) return 'already';
  if (s.missions.length >= scoutsOf(w)) return 'busy';
  w.scouting = { ...s, missions: [...s.missions, { area, from: day, until: day + MISSION_DAYS }] };
  return null;
}

/**
 * Brings home every scout due by `day`, their reports into the club's files, and drops from the
 * files what has faded back to the base.
 */
export function scoutingDay(w: CareerWorld, day: number): void {
  const s = w.scouting;
  if (!s) return;
  // Faded knowledge is swept once a month; scouts come home on their day.
  if (!s.missions.some((m) => m.until <= day) && day % 30 !== 0) return;
  const byId = new Map(w.pack.players.map((p) => [p.id, p]));
  const known: Record<string, Knowledge> = {};
  for (const [id, got] of Object.entries(s.known)) {
    const p = byId.get(id);
    if (p && typeof got === 'object' && knowledgeOf(w, p, day) > baseOf(w, p)) known[id] = got;
  }
  const gain = REPORT_GAIN[eyeOf(w.pack, w.clubId).scouting - 1]!;
  const reports = REPORTS[eyeOf(w.pack, w.clubId).scouting - 1]!;
  for (const m of s.missions) {
    if (m.until > day) continue;
    // The best players there the club knows least of (under half), as its own eye ranks them.
    const found = w.pack.players
      .filter(
        (p) =>
          p.clubId !== null &&
          p.clubId !== w.clubId &&
          p.clubId !== ABROAD &&
          inArea(w, m.area, p.clubId) &&
          knowledgeOf(w, p, m.until) < 50,
      )
      .map((p) => ({ p, seen: seenLevel(w.pack, w.clubId, p) }))
      .sort((a, b) => b.seen - a.seen || (a.p.id < b.p.id ? -1 : 1))
      .slice(0, reports);
    w.scouting = { known, missions: s.missions };
    for (const f of found) learn(w, known, f.p, gain, m.until);
    note(w, { day: m.until, kind: 'scouted', area: m.area, players: found.length });
  }
  w.scouting = { known, missions: s.missions.filter((m) => m.until > day) };
}

/** The person's club played this club on `day`: it learns a little of every player there. */
export function facedClub(w: CareerWorld, clubId: string, day: number): void {
  const s = w.scouting ?? { known: {}, missions: [] };
  const known = { ...s.known };
  w.scouting = { ...s, known };
  for (const p of squadPlayers({ pack: w.pack, clubId })) learn(w, known, p, MATCH_GAIN, day);
}
