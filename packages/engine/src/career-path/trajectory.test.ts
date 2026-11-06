import { describe, expect, it } from 'vitest';
import { buildTrajectory, type TrajectorySpell } from './trajectory';

const sp = (over: Partial<TrajectorySpell> & Pick<TrajectorySpell, 'clubId'>): TrajectorySpell => ({
  clubName: over.clubId.toUpperCase(),
  countryCode: 'BR',
  spellType: 'professional',
  startDate: new Date('2000-01-01'),
  endDate: new Date('2001-01-01'),
  sortIndex: 0,
  verificationStatus: 'verified',
  ...over,
});
const y = (year: number, month = 1) => new Date(Date.UTC(year, month - 1, 1));
const clubs = (t: { clubId: string }[]) => t.map((e) => e.clubId);

describe('buildTrajectory (CAREER_PATH.md §4)', () => {
  it('orders by start date and maps years', () => {
    const t = buildTrajectory([
      sp({ clubId: 'psv', countryCode: 'NL', startDate: y(1994), endDate: y(1996) }),
      sp({ clubId: 'cru', startDate: y(1993), endDate: y(1994) }),
    ]);
    expect(t).toEqual([
      {
        clubId: 'cru',
        clubName: 'CRU',
        countryCode: 'BR',
        fromYear: 1993,
        toYear: 1994,
        isLoan: false,
        appearances: null,
        goals: null,
        loanFromName: null,
      },
      {
        clubId: 'psv',
        clubName: 'PSV',
        countryCode: 'NL',
        fromYear: 1994,
        toYear: 1996,
        isLoan: false,
        appearances: null,
        goals: null,
        loanFromName: null,
      },
    ]);
  });

  it('keeps an open spell with toYear null', () => {
    expect(
      buildTrajectory([sp({ clubId: 'a', startDate: y(2020), endDate: null })])[0]?.toYear,
    ).toBeNull();
  });

  it('excludes youth spells and unverified spells', () => {
    const t = buildTrajectory([
      sp({ clubId: 'base', spellType: 'youth', startDate: y(1990) }),
      sp({ clubId: 'imp', verificationStatus: 'imported', startDate: y(1991) }),
      sp({ clubId: 'pro', startDate: y(1992) }),
    ]);
    expect(clubs(t)).toEqual(['pro']);
  });

  it('carries games, goals and the lending club of a loan', () => {
    const [entry] = buildTrajectory([
      sp({ clubId: 'b', spellType: 'loan', appearances: 20, goals: 7, loanFromName: 'Milan' }),
    ]);
    expect(entry).toMatchObject({ isLoan: true, appearances: 20, goals: 7, loanFromName: 'Milan' });
  });

  it('marks loans as their own entry', () => {
    const t = buildTrajectory([
      sp({ clubId: 'a', startDate: y(2000), endDate: y(2004) }),
      sp({ clubId: 'b', spellType: 'loan', startDate: y(2001, 7), endDate: y(2002, 6) }),
    ]);
    expect(t.map((e) => [e.clubId, e.isLoan])).toEqual([
      ['a', false],
      ['b', true],
    ]);
  });

  it('a return from loan inside one continuous contract is a single entry', () => {
    const t = buildTrajectory([
      sp({ clubId: 'a', startDate: y(2000), endDate: y(2004) }),
      sp({ clubId: 'b', spellType: 'loan', startDate: y(2001, 7), endDate: y(2002, 6) }),
    ]);
    expect(clubs(t)).toEqual(['a', 'b']);
  });

  it('two separate contracts at the same club are two entries in chronological place', () => {
    const t = buildTrajectory([
      sp({ clubId: 'a', startDate: y(2000), endDate: y(2001) }),
      sp({ clubId: 'b', startDate: y(2001), endDate: y(2003) }),
      sp({ clubId: 'a', startDate: y(2003), endDate: y(2005) }),
    ]);
    expect(clubs(t)).toEqual(['a', 'b', 'a']);
  });

  it('breaks start-date ties by end date, then by sortIndex', () => {
    const byEnd = buildTrajectory([
      sp({ clubId: 'late', startDate: y(2000), endDate: y(2003) }),
      sp({ clubId: 'early', startDate: y(2000), endDate: y(2001) }),
    ]);
    expect(clubs(byEnd)).toEqual(['early', 'late']);
    const bySort = buildTrajectory([
      sp({ clubId: 'second', startDate: y(2000), endDate: y(2001), sortIndex: 2 }),
      sp({ clubId: 'first', startDate: y(2000), endDate: y(2001), sortIndex: 1 }),
    ]);
    expect(clubs(bySort)).toEqual(['first', 'second']);
  });

  it('an open spell sorts after a closed one with the same start', () => {
    const t = buildTrajectory([
      sp({ clubId: 'open', startDate: y(2000), endDate: null }),
      sp({ clubId: 'closed', startDate: y(2000), endDate: y(2001) }),
    ]);
    expect(clubs(t)).toEqual(['closed', 'open']);
  });

  it('keeps overlapping spells ordered by start date', () => {
    const t = buildTrajectory([
      sp({ clubId: 'b', startDate: y(2001), endDate: y(2004) }),
      sp({ clubId: 'a', startDate: y(2000), endDate: y(2002) }),
    ]);
    expect(clubs(t)).toEqual(['a', 'b']);
  });

  it('year-only dates are normalised to 1 January and resolved by sortIndex', () => {
    const t = buildTrajectory([
      sp({ clubId: 'x', startDate: y(1999), endDate: y(1999), sortIndex: 1 }),
      sp({ clubId: 'w', startDate: y(1999), endDate: y(1999), sortIndex: 0 }),
    ]);
    expect(clubs(t)).toEqual(['w', 'x']);
  });
});
