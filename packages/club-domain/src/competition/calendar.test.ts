import { describe, expect, it } from 'vitest';
import {
  baseDates,
  dayOf,
  emptyCalendar,
  isoOf,
  place,
  restDays,
  weekday,
  type Fixture,
} from './calendar';

const fx = (
  id: string,
  home: string,
  away: string,
  base: string,
  extra: Partial<Fixture> = {},
): Fixture => ({
  id,
  competitionId: 'liga',
  priority: 1,
  home,
  away,
  base: dayOf(base),
  rest: 3,
  ...extra,
});

describe('MC-173 days', () => {
  it('ISO dates and days round-trip; weekdays from the calendar', () => {
    expect(isoOf(dayOf('2026-11-16'))).toBe('2026-11-16');
    expect(weekday(dayOf('2026-11-16'))).toBe(1); // Monday
    expect(dayOf('2027-01-01') - dayOf('2026-01-01')).toBe(365);
    expect(restDays(66)).toBe(3);
  });

  it('base dates: listed weekdays, spread over the window, too few is an error', () => {
    const w = { start: '2026-02-01', end: '2026-03-31', weekdays: [0, 3] };
    const days = baseDates(w, 10);
    expect(days).toHaveLength(10);
    expect(days.every((d) => [0, 3].includes(weekday(d)))).toBe(true);
    expect(isoOf(days[0]!)).toBe('2026-02-01');
    expect(days.every((d, i) => i === 0 || d > days[i - 1]!)).toBe(true);
    expect(isoOf(days.at(-1)!) <= '2026-03-31').toBe(true);
    expect(() => baseDates(w, 30)).toThrow();
  });
});

describe('MC-173 placing matches', () => {
  it('nobody plays twice in a day: the clash is postponed and recorded', () => {
    const cal = emptyCalendar();
    place(cal, fx('m1', 'a', 'b', '2026-03-01'));
    place(cal, fx('m2', 'a', 'c', '2026-03-01'));
    expect(isoOf(cal.matches.get('m2')!.day)).toBe('2026-03-04');
    expect(cal.postponements).toEqual([
      { matchId: 'm2', from: dayOf('2026-03-01'), to: dayOf('2026-03-04'), reason: 'clash' },
    ]);
  });

  it('minimum rest: a match too close to the last one moves to the first rested day', () => {
    const cal = emptyCalendar();
    place(cal, fx('m1', 'a', 'b', '2026-03-01'));
    place(cal, fx('m2', 'c', 'b', '2026-03-02'));
    expect(isoOf(cal.matches.get('m2')!.day)).toBe('2026-03-04');
    expect(cal.postponements[0]!.reason).toBe('rest');
  });

  it('a match moved for one between the same two clubs is moved once, and kept once', () => {
    const cal = emptyCalendar();
    place(cal, fx('liga1', 'a', 'b', '2026-03-01'));
    place(cal, fx('copa1', 'b', 'a', '2026-03-01', { competitionId: 'copa', priority: 5 }));
    for (const club of ['a', 'b']) {
      const ids = [...cal.byClub.get(club)!].map((m) => m.id).sort();
      expect(ids).toEqual(['copa1', 'liga1']);
    }
    expect(cal.byClub.get('a')!.has(cal.matches.get('liga1')!)).toBe(true);
    expect(cal.postponements.filter((p) => p.matchId === 'liga1')).toHaveLength(1);
  });

  it('a window can leave weekdays out between two dates', () => {
    const days = baseDates(
      {
        start: '2026-01-25',
        end: '2026-03-15',
        weekdays: [0, 3],
        exclude: [{ start: '2026-01-01', end: '2026-03-08', weekdays: [0] }],
      },
      8,
    );
    expect(days.filter((d) => isoOf(d) <= '2026-03-08').every((d) => weekday(d) === 3)).toBe(true);
    expect(days.map(isoOf)).toContain('2026-03-15');
  });

  it('priority: the higher competition keeps the date, the lower one is moved', () => {
    const cal = emptyCalendar();
    place(cal, fx('liga1', 'a', 'b', '2026-03-01'));
    place(cal, fx('copa1', 'a', 'z', '2026-03-01', { competitionId: 'copa', priority: 5 }));
    expect(isoOf(cal.matches.get('copa1')!.day)).toBe('2026-03-01');
    expect(isoOf(cal.matches.get('liga1')!.day)).toBe('2026-03-04');
    expect(cal.postponements).toEqual([
      { matchId: 'liga1', from: dayOf('2026-03-01'), to: dayOf('2026-03-04'), reason: 'priority' },
    ]);
  });

  it('a played match never moves; a second leg stays after the first', () => {
    const cal = emptyCalendar();
    place(cal, fx('m1', 'a', 'b', '2026-03-01'));
    cal.matches.get('m1')!.played = true;
    place(cal, fx('copa', 'a', 'z', '2026-03-01', { priority: 9 }));
    expect(isoOf(cal.matches.get('m1')!.day)).toBe('2026-03-01');
    expect(isoOf(cal.matches.get('copa')!.day)).toBe('2026-03-04');
    place(cal, fx('leg2', 'q', 'w', '2026-03-02', { after: dayOf('2026-03-05') }));
    expect(isoOf(cal.matches.get('leg2')!.day)).toBe('2026-03-06');
  });

  it('a busy season keeps every rule: no club twice a day, rest kept, every move recorded', () => {
    const cal = emptyCalendar();
    const clubs = ['a', 'b', 'c', 'd', 'e', 'f'];
    let n = 0;
    for (let w = 0; w < 10; w++)
      for (let i = 0; i < clubs.length; i += 2) {
        const day = isoOf(dayOf('2026-03-01') + w * 3);
        place(cal, fx(`l${n++}`, clubs[i]!, clubs[(i + 1 + 2 * w) % 6]!, day));
        place(cal, fx(`c${n++}`, clubs[i]!, `x${n}`, day, { priority: 2 }));
      }
    const all = [...cal.matches.values()];
    for (const m of all)
      for (const o of all)
        if (m !== o && [m.home, m.away].some((k) => k === o.home || k === o.away))
          expect(Math.abs(m.day - o.day)).toBeGreaterThanOrEqual(3);
    const moved = all
      .filter((m) => m.day !== m.base)
      .map((m) => m.id)
      .sort();
    expect([...new Set(cal.postponements.map((p) => p.matchId))].sort()).toEqual(moved);
  });
});

describe('a club too busy for a rested slot', () => {
  it('still gets a date (one match a day) instead of failing: the SP final behind cup and league', () => {
    const cal = emptyCalendar();
    const start = dayOf('2027-04-01');
    // Two clubs with a match every 4 days for 150 days: no gap of six days for the 3-day rest.
    for (let i = 0; i < 38; i++) {
      place(cal, { ...fx(`a${i}`, 'A', 'X', '2027-04-01', { priority: 2 }), base: start + i * 4 });
      place(cal, {
        ...fx(`b${i}`, 'B', 'Y', '2027-04-01', { priority: 2 }),
        base: start + 2 + i * 4,
      });
    }
    const final = fx('est-SP/final/l0', 'A', 'B', '2027-04-04', { priority: 0 });
    const day = place(cal, final);
    expect(day).toBeGreaterThanOrEqual(final.base);
    const clubs = [...cal.matches.values()].filter((m) => m.home === 'A' || m.away === 'A');
    expect(new Set(clubs.map((m) => m.day)).size).toBe(clubs.length);
  });
});
