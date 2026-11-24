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
import { homeOf, isBase } from '../career/bases';
import { COPA_ID } from '../competition/copa';
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { postEntry } from '../finance/ledger';
import { nationalDivisions } from '../career/start';
import { squadPlayers } from '../career/squad';
import { WHOLE, cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { ABROAD, onMarket } from './abroad';
import { tierOfClub } from './books';
import {
  drawsOf,
  eyeOf,
  eyeSpread,
  knows,
  levelError,
  reach,
  seenCeiling,
  seenLevel,
} from './judgement';
import { readingsOf } from './value';
import { fitsFocus, gradeOf, scoutStaff, scoutWorth, type Focus } from './scouts';

/** A scout away: where to, and the day he reports. */
export interface Mission {
  /** A state (`RS`), a national division (`tier:2`), a competition (`comp:<id>`), `abroad`. */
  area: string;
  from: number;
  until: number;
  /** Which of the club's scouts (scouts.ts); missing in careers from before scouts had names. */
  scout?: string;
  /** What he looks for there: an age, a position. */
  focus?: Focus;
}

/** A scout's report: what he found on a trip, each player with his word on him (scouts.ts). */
export interface Report {
  day: number;
  area: string;
  scout?: string;
  focus?: Focus;
  players: { id: string; grade: 'A' | 'B' | 'C' }[];
}

/** Reports the club keeps, the newest first. */
const REPORTS_KEPT = 12;

/** What the club knows of a player past the base: the percentage, and the day it last grew. */
export interface Knowledge {
  k: number;
  day: number;
}

export interface Scouting {
  /** By player id; only players known past the base. */
  known: Record<string, Knowledge>;
  missions: Mission[];
  /** The latest reports, newest first. */
  reports?: Report[];
}

/** Scouting department level from which agents bring a club the players abroad. */
const FOREIGN_EYE = 2;
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
export const FADE_DAYS = 20;

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

/** What an agent told the club of his player: knowledge up to `floor` (his pitch). */
export function hearOf(w: CareerWorld, p: PackPlayer, floor: number, day: number): void {
  if (knowledgeOf(w, p, day) >= floor) return;
  const s = w.scouting ?? { known: {}, missions: [] };
  w.scouting = { ...s, known: { ...s.known, [p.id]: { k: floor, day } } };
}

/**
 * What the person's club reads of a player of another club: the level and ceiling its eye sees,
 * pulled toward the truth by what it knows, with a band that narrows as it knows more.
 */
export function personReading(
  w: CareerWorld,
  p: PackPlayer,
): {
  rating: number;
  range: [number, number];
  potential: [number, number];
  knowledge: number;
  /** The last day the club learned of him (a report, a match); null when it never looked. */
  seen: number | null;
} {
  const k = knowledgeOf(w, p);
  const r = readingsOf(w.pack).get(p.id)!;
  const doubt = 100 - k;
  const { level, ceiling } = eyeSpread(w.pack, w.clubId, p);
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
    seen: typeof w.scouting?.known[p.id] === 'object' ? w.scouting.known[p.id]!.day : null,
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
  (p.clubId !== ABROAD || onMarket(w, p)) && knowledgeOf(w, p) > 0;

/** Each club's opponents this season: every club it shares a competition with. */
const rivals = new WeakMap<object, Map<string, Set<string>>>();
function rivalsOf(w: CareerWorld, clubId: string): Set<string> {
  let by = rivals.get(w.season);
  if (!by) {
    by = new Map();
    // The Copa's 126 clubs are not all each other's opponents: only the drawn ones meet.
    for (const [cid, ids] of Object.entries(w.season.members))
      for (const id of cid === COPA_ID ? [] : ids) {
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
export function clubKnows(w: CareerWorld, clubId: string, player: PackPlayer): boolean {
  // A boy of a club's academy is known as its players are (bases.ts).
  const p = isBase(player.clubId) ? { ...player, clubId: homeOf(player.clubId) } : player;
  if (p.clubId === clubId) return true;
  // Abroad, agents bring the year's foreign market to clubs with a scouting department past
  // the first level; the rest come home by themselves (abroad.ts `homecoming`).
  if (p.clubId === ABROAD) return onMarket(w, p) && eyeOf(w.pack, clubId).scouting >= FOREIGN_EYE;
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

/**
 * `clubKnows` for one club over many players: a club's reach of the players of another club is
 * the same for all of them, so it is read once per club, not per player.
 */
export function knowerOf(w: CareerWorld, clubId: string): (p: PackPlayer) => boolean {
  const draw = drawsOf(w.pack, clubId);
  const reachOf = new Map<string, number>();
  return (p) => {
    const at = homeOf(p.clubId);
    if (at === clubId) return true;
    if (at === null || at === ABROAD) return clubKnows(w, clubId, p);
    let r = reachOf.get(at);
    if (r === undefined) {
      // 101: past any draw, as an opponent's players are always known.
      r = rivalsOf(w, clubId).has(at)
        ? 101
        : reach(
            eyeOf(w.pack, clubId).scouting,
            tierOfClub(w, at),
            stateOf(w.pack, at) === stateOf(w.pack, clubId),
          );
      reachOf.set(at, r);
    }
    return draw(p.id) < r;
  };
}

/**
 * The areas a scout can be sent to: the national divisions, the season's other competitions (the
 * Copa, the state championships), every state with a club, and the players abroad who can come.
 */
export function scoutAreas(w: CareerWorld): string[] {
  const tiers = nationalDivisions(w.pack).map((d) => `tier:${d.tier}`);
  const comps = w.season.competitions
    .filter((c) => c.tier === null && (w.season.members[c.id]?.length ?? 0) > 0)
    .map((c) => `comp:${c.id}`);
  const states = new Set<string>();
  for (const c of w.pack.clubs) {
    const s = stateOf(w.pack, c.id);
    if (s) states.add(s);
  }
  return [...new Set(tiers), ...comps, ...[...states].sort(), 'abroad'];
}

const inArea = (w: CareerWorld, area: string, clubId: string) =>
  area.startsWith('tier:')
    ? tierOfClub(w, clubId) === Number(area.slice(5))
    : area.startsWith('comp:')
      ? (w.season.members[area.slice(5)] ?? []).includes(clubId)
      : stateOf(w.pack, clubId) === area;

export type ScoutNo = 'busy' | 'area' | 'already' | 'cash' | 'scout';

/**
 * What a scout's trip costs (travel and daily allowance), by where he goes: his own state, a
 * division (the country), another state, or one player (a week, near or far). PARÂMETRO.
 */
const TRIP_COST = {
  home: 15_000,
  division: 60_000,
  away: 35_000,
  playerHome: 5_000,
  playerAway: 12_000,
};

/** The cost of a mission to `area` for the person's club. */
export function tripCost(w: CareerWorld, area: string): number {
  const home = stateOf(w.pack, w.clubId);
  const watched = watchedIn(area);
  if (watched !== null) {
    const p = w.pack.players.find((x) => x.id === watched);
    return p?.clubId && stateOf(w.pack, p.clubId) === home
      ? TRIP_COST.playerHome
      : TRIP_COST.playerAway;
  }
  if (area.startsWith('tier:') || area.startsWith('comp:') || area === 'abroad')
    return TRIP_COST.division;
  return area === home ? TRIP_COST.home : TRIP_COST.away;
}

/** A scout watching one player: `player:<id>`. */
export const PLAYER_AREA = 'player:';
/** Days a scout spends watching one player. */
export const WATCH_DAYS = 7;
/** A report on one player is worth this much more than one from a trip, in percent. */
const WATCH_BONUS = 150;

/** The player a mission watches, or null for a trip to an area. */
export const watchedIn = (area: string) =>
  area.startsWith(PLAYER_AREA) ? area.slice(PLAYER_AREA.length) : null;

/**
 * Sends a scout from `day` to an area (a division, a state) or to watch one player
 * (`player:<id>`, another club's); the reason it cannot, or null.
 */
export function sendScout(
  w: CareerWorld,
  area: string,
  day: number,
  /** Which scout (scouts.ts; the first free one by default) and what he looks for. */
  opts: { scout?: string; focus?: Focus } = {},
): ScoutNo | null {
  const watched = watchedIn(area);
  if (watched !== null) {
    const p = w.pack.players.find((x) => x.id === watched);
    if (!p || p.clubId === w.clubId || p.clubId === ABROAD) return 'area';
  } else if (!scoutAreas(w).includes(area)) return 'area';
  const s = w.scouting ?? { known: {}, missions: [] };
  const sameFocus = (m: Mission) =>
    JSON.stringify(m.focus ?? {}) === JSON.stringify(opts.focus ?? {});
  if (s.missions.some((m) => m.area === area && sameFocus(m))) return 'already';
  const staff = scoutStaff(w);
  if (opts.scout !== undefined && !staff.some((x) => x.id === opts.scout)) return 'scout';
  if (s.missions.length >= scoutsOf(w)) return 'busy';
  // Missions from before scouts had names hold the first scouts, in order.
  const away = new Set(s.missions.map((m, i) => m.scout ?? `scout-${i}`));
  const scout = opts.scout ?? staff.find((x) => !away.has(x.id))?.id;
  if (scout === undefined || away.has(scout)) return 'busy';
  const cost = tripCost(w, area);
  if (w.ledger.cash < cost) return 'cash';
  postEntry(w.ledger, {
    key: `scouting:${area}:${day}`,
    kind: 'scouting',
    ref: `scout:${area}`,
    amount: -cost,
    day: w.ledger.today,
    dueDay: w.ledger.today,
  });
  const until = day + (watched !== null ? WATCH_DAYS : MISSION_DAYS);
  const m: Mission = { area, from: day, until, scout, ...(opts.focus && { focus: opts.focus }) };
  w.scouting = { ...s, missions: [...s.missions, m] };
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
  const dept = REPORT_GAIN[eyeOf(w.pack, w.clubId).scouting - 1]!;
  const reports = REPORTS[eyeOf(w.pack, w.clubId).scouting - 1]!;
  const staff = new Map(scoutStaff(w).map((x) => [x.id, x]));
  const made: Report[] = [];
  for (const m of s.missions) {
    if (m.until > day) continue;
    // A named scout's report is worth his eyes; an old mission's, the department's.
    const scout = m.scout === undefined ? undefined : staff.get(m.scout);
    const gain = scout
      ? Math.round(
          (dept * scoutWorth(scout, m.area, m.focus, eyeOf(w.pack, w.clubId).scouting)) / 100,
        )
      : dept;
    const watched = watchedIn(m.area);
    if (watched !== null) {
      // One player, watched for a week: a sharper report than a trip's.
      const p = byId.get(watched);
      w.scouting = { known, missions: s.missions };
      if (p) learn(w, known, p, Math.round((gain * WATCH_BONUS) / 100), m.until);
      note(w, {
        day: m.until,
        kind: 'scouted',
        area: m.area,
        players: p ? 1 : 0,
        ...(scout && { scout: scout.name }),
      });
      continue;
    }
    // The best players there the club knows least of (under half), as its own eye ranks them;
    // for boys, as far as it sees them going.
    const boys = m.focus?.maxAge !== undefined && m.focus.maxAge <= 21;
    const found = w.pack.players
      .filter(
        (p) =>
          p.clubId !== w.clubId &&
          (m.area === 'abroad'
            ? p.clubId === ABROAD && onMarket(w, p)
            : p.clubId !== null && p.clubId !== ABROAD && inArea(w, m.area, homeOf(p.clubId)!)) &&
          fitsFocus(p, m.focus, w.season.season) &&
          knowledgeOf(w, p, m.until) < 50,
      )
      .map((p) => ({
        p,
        seen: boys ? seenCeiling(w.pack, w.clubId, p) : seenLevel(w.pack, w.clubId, p),
      }))
      .sort((a, b) => b.seen - a.seen || (a.p.id < b.p.id ? -1 : 1))
      .slice(0, reports);
    w.scouting = { known, missions: s.missions };
    for (const f of found) learn(w, known, f.p, gain, m.until);
    const squad = squadPlayers(w);
    const graded = found.map((f) => ({ id: f.p.id, grade: gradeOf(w, f.p, squad) }));
    made.push({
      day: m.until,
      area: m.area,
      ...(m.scout !== undefined && { scout: m.scout }),
      ...(m.focus && { focus: m.focus }),
      players: graded,
    });
    note(w, {
      day: m.until,
      kind: 'scouted',
      area: m.area,
      players: found.length,
      ...(scout && { scout: scout.name }),
      recommended: graded.filter((g) => g.grade !== 'C').length,
    });
  }
  const kept = [...made.reverse(), ...(s.reports ?? [])].slice(0, REPORTS_KEPT);
  w.scouting = {
    known,
    missions: s.missions.filter((m) => m.until > day),
    ...(kept.length > 0 && { reports: kept }),
  };
}

/** The person's club played this club on `day`: it learns a little of every player there. */
export function facedClub(w: CareerWorld, clubId: string, day: number): void {
  const s = w.scouting ?? { known: {}, missions: [] };
  const known = { ...s.known };
  w.scouting = { ...s, known };
  for (const p of squadPlayers({ pack: w.pack, clubId })) learn(w, known, p, MATCH_GAIN, day);
}
