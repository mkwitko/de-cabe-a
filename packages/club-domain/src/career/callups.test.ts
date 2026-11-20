import { describe, expect, it } from 'vitest';
import { dayOf } from '../competition/calendar';
import { realDivisions } from '../generate/competitions';
import { ruleOn } from '../rules/registry';
import { depthOf, fifaWindowOn } from './callups';
import { windowOf } from './market';

describe('FIFA windows (FIFA 2026 calendar)', () => {
  it('finds the window a day is in and its first day', () => {
    expect(fifaWindowOn(dayOf('2026-03-27'))).toBe(dayOf('2026-03-23'));
    expect(fifaWindowOn(dayOf('2026-06-30'))).toBe(dayOf('2026-06-01')); // World Cup
    expect(fifaWindowOn(dayOf('2026-09-21'))).toBe(dayOf('2026-09-21'));
    expect(fifaWindowOn(dayOf('2026-11-17'))).toBe(dayOf('2026-11-09'));
    expect(fifaWindowOn(dayOf('2026-04-10'))).toBeNull();
    expect(fifaWindowOn(dayOf('2027-06-30'))).toBeNull(); // no World Cup in 2027
  });
  it('calls Brazil only its very best and a small nation its one or two', () => {
    expect(depthOf('BR', 15000)).toBe(8);
    expect(depthOf('AR', 100)).toBe(5);
    expect(depthOf('XX', 3)).toBe(1);
  });
});

describe('CBF 2026 and 2027 calendars as season-versioned data', () => {
  it('keeps each year its own transfer windows', () => {
    expect(ruleOn('windows', '2026-07-01').second).toEqual(['07-20', '09-11']);
    expect(ruleOn('windows', '2027-07-01').second).toEqual(['07-19', '09-10']);
    expect(ruleOn('windows', '2027-07-01').first).toEqual(['01-01', '03-02']);
    expect(windowOf(dayOf('2027-09-10'))).toBe('second');
    expect(windowOf(dayOf('2027-09-11'))).toBeNull();
  });
  it('plays the 2027 series inside the CBF dates', () => {
    const divs = realDivisions(2027, [[], [], [], []]);
    const span = (id: string, season = 2027) => {
      const c = divs.find((x) => x.id === id && x.season === season)!;
      return [
        c.phases.map((p) => p.dates.start).sort()[0],
        c.phases
          .map((p) => p.dates.end)
          .sort()
          .reverse()[0],
      ];
    };
    expect(span('div-1')).toEqual(['2027-01-27', '2027-12-01']);
    expect(span('div-2')).toEqual(['2027-03-20', '2027-11-27']);
    expect(span('div-3')).toEqual(['2027-04-04', '2027-10-31']);
    expect(span('div-4')).toEqual(['2027-04-04', '2027-09-12']);
  });
  it('Série D: 16 groups, four advance, quarter-final losers play off, six go up', () => {
    const d = realDivisions(2027, [[], [], [], []]).find((x) => x.id === 'div-4')!;
    const groups = d.phases.find((p) => p.id === 'grupos')!;
    expect(groups.kind === 'grupos' && groups.groups).toBe(16);
    const up = d.phases
      .flatMap((p) => p.outcomes)
      .filter((o) => o.kind === 'promotion')
      .map((o) => o.positions[1] - o.positions[0] + 1);
    expect(up.reduce((a, b) => a + b, 0)).toBe(6);
  });
});
