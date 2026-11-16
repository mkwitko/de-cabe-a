/**
 * Global calendar (MC-173; 05 §4; ADR-016 item 5). The unit is the day
 * (days since 1970-01-01, from the ISO date by arithmetic, no clock). A phase
 * spreads its rounds over the base dates of its window; when one club would
 * play twice too close, the lower priority match moves to the next free day
 * and the move is recorded. A match already played never moves.
 */
import type { DateWindow } from './schema';

const MS_PER_DAY = 86_400_000;

export const dayOf = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
};
export const isoOf = (day: number): string => new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
/** 0 = Sunday. 1970-01-01 was a Thursday. */
export const weekday = (day: number): number => (((day + 4) % 7) + 7) % 7;
/** Minimum rest in whole days: 66 h is three days (Sunday to Wednesday). */
export const restDays = (hours: number): number => Math.max(1, Math.ceil(hours / 24));

/**
 * PARÂMETRO: how far past its base date a match may be postponed before the
 * calendar gives up (05 §4 "janela de adiamento"; no source, generous).
 */
export const POSTPONE_LIMIT_DAYS = 60;

/** `rounds` base dates on the window's weekdays, spread evenly from the first one. */
export function baseDates(w: DateWindow, rounds: number): number[] {
  const free: number[] = [];
  for (let d = dayOf(w.start); d <= dayOf(w.end); d++)
    if (w.weekdays.includes(weekday(d))) free.push(d);
  if (free.length < rounds)
    throw new Error(`window ${w.start}..${w.end} has ${free.length} dates for ${rounds} rounds`);
  return Array.from({ length: rounds }, (_, i) => free[Math.floor((i * free.length) / rounds)]!);
}

export interface Fixture {
  id: string;
  competitionId: string;
  priority: number;
  home: string;
  away: string;
  /** Base day from the phase window. */
  base: number;
  /** Minimum days between two matches of one club (`restDays`). */
  rest: number;
  /** Must be strictly after this day (second leg after the first). */
  after?: number;
}
export interface Scheduled extends Fixture {
  day: number;
  played: boolean;
}
export interface Postponement {
  matchId: string;
  from: number;
  to: number;
  /** clash: same day; rest: too close; priority: a higher competition took the date. */
  reason: 'clash' | 'rest' | 'priority';
}
export interface Calendar {
  matches: Map<string, Scheduled>;
  byClub: Map<string, Set<Scheduled>>;
  postponements: Postponement[];
}

export const emptyCalendar = (): Calendar => ({
  matches: new Map(),
  byClub: new Map(),
  postponements: [],
});

/** Matches of either club too close to `day` for this fixture. */
function blockers(cal: Calendar, f: Fixture, day: number): Scheduled[] {
  const out: Scheduled[] = [];
  for (const club of [f.home, f.away])
    for (const m of cal.byClub.get(club) ?? [])
      if (m.id !== f.id && Math.abs(m.day - day) < Math.max(f.rest, m.rest)) out.push(m);
  return out;
}

function put(cal: Calendar, m: Scheduled): void {
  cal.matches.set(m.id, m);
  for (const club of [m.home, m.away]) {
    let set = cal.byClub.get(club);
    if (!set) cal.byClub.set(club, (set = new Set()));
    set.add(m);
  }
}
function take(cal: Calendar, m: Scheduled): void {
  cal.matches.delete(m.id);
  for (const club of [m.home, m.away]) cal.byClub.get(club)?.delete(m);
}

/**
 * Places a fixture on its base day or the first free day after it and returns
 * the day. A second leg's base moves past the first leg (`after`); that is not
 * a postponement. `from` is used when a bumped match is placed again.
 */
export function place(cal: Calendar, fixture: Fixture, from?: number): number {
  const f = { ...fixture, base: Math.max(fixture.base, (fixture.after ?? -Infinity) + 1) };
  const start = Math.max(from ?? f.base, f.base);
  const at = blockers(cal, f, start);
  // A higher priority match takes the date from unplayed lower priority ones.
  if (at.length > 0 && at.every((m) => !m.played && m.priority < f.priority)) {
    put(cal, { ...f, day: start, played: false });
    for (const m of at) {
      take(cal, m);
      const to = place(cal, m, m.day + 1);
      cal.postponements.push({ matchId: m.id, from: m.day, to, reason: 'priority' });
    }
    return start;
  }
  for (let d = start; d <= f.base + POSTPONE_LIMIT_DAYS; d++) {
    if ((d === start ? at : blockers(cal, f, d)).length > 0) continue;
    put(cal, { ...f, day: d, played: false });
    // A bumped match (`from` given) already has its 'priority' record.
    if (from === undefined && d !== f.base) {
      const clash = at.some((m) => m.day === start);
      cal.postponements.push({
        matchId: f.id,
        from: f.base,
        to: d,
        reason: clash ? 'clash' : 'rest',
      });
    }
    return d;
  }
  throw new Error(`no date for ${f.id} within ${POSTPONE_LIMIT_DAYS} days of ${isoOf(f.base)}`);
}
