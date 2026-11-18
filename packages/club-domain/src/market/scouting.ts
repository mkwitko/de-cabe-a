/**
 * The person's scouts (ADR-021, step 4). The person's club starts out knowing what any club
 * knows (judgement.ts `knows`: its own squad, most of the elite, its own state); the rest of
 * the country it learns by sending scouts. A scout sent to a state or a division comes back
 * after MISSION_DAYS with the best players there the club did not know, and the club keeps
 * them in its files (`w.scouting.known`) for good. Every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { nationalDivisions } from '../career/start';
import { WHOLE, cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { ABROAD } from './abroad';
import { tierOfClub } from './books';
import { eyeOf, knows, seenLevel } from './judgement';

/** A scout away: where to, and the day he reports. */
export interface Mission {
  /** A state (`RS`) or a national division (`tier:2`). */
  area: string;
  from: number;
  until: number;
}

export interface Scouting {
  /** Players in the club's files, with the day each was first reported. */
  known: Record<string, number>;
  missions: Mission[];
}

/** Days a scout spends in an area before reporting. */
export const MISSION_DAYS = 28;
/** Scouts the club can have away at once, by scouting department 1..5. */
const SCOUTS = [1, 1, 2, 2, 3] as const;
/** Players a scout reports from one trip, by scouting department 1..5. */
const REPORTS = [6, 9, 12, 16, 20] as const;

export const scoutsOf = (w: CareerWorld) => SCOUTS[eyeOf(w.pack, w.clubId).scouting - 1]!;

/** Each club's state, by its city. */
export const stateOf = (pack: Pack, clubId: string) =>
  cached(pack, 'clubStates', WHOLE, () => {
    const cities = new Map(pack.cities.map((c) => [c.id, c.state]));
    return new Map(pack.clubs.map((c) => [c.id, cities.get(c.cityId)]));
  }).get(clubId);

/** Whether the person's club knows him: its own, a player in its files, or one any club knows. */
export function personKnows(w: CareerWorld, p: PackPlayer): boolean {
  if (p.clubId === w.clubId || w.scouting?.known[p.id] !== undefined) return true;
  if (p.clubId === ABROAD) return false;
  return p.clubId === null
    ? knows(w.pack, w.clubId, p, null, false)
    : knows(
        w.pack,
        w.clubId,
        p,
        tierOfClub(w, p.clubId),
        stateOf(w.pack, p.clubId) === stateOf(w.pack, w.clubId),
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

/** Brings home every scout due by `day`: their reports go into the club's files. */
export function scoutingDay(w: CareerWorld, day: number): void {
  const s = w.scouting;
  if (!s?.missions.some((m) => m.until <= day)) return;
  const known = { ...s.known };
  const reports = REPORTS[eyeOf(w.pack, w.clubId).scouting - 1]!;
  for (const m of s.missions) {
    if (m.until > day) continue;
    // The best players there that the club did not know, as its own eye ranks them.
    const found = w.pack.players
      .filter(
        (p) =>
          p.clubId !== null &&
          p.clubId !== w.clubId &&
          p.clubId !== ABROAD &&
          inArea(w, m.area, p.clubId) &&
          !personKnows(w, p) &&
          known[p.id] === undefined,
      )
      .map((p) => ({ id: p.id, seen: seenLevel(w.pack, w.clubId, p) }))
      .sort((a, b) => b.seen - a.seen || (a.id < b.id ? -1 : 1))
      .slice(0, reports);
    for (const f of found) known[f.id] = m.until;
    note(w, { day: m.until, kind: 'scouted', area: m.area, players: found.length });
  }
  w.scouting = { known, missions: s.missions.filter((m) => m.until > day) };
}
