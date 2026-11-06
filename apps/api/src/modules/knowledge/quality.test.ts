import { describe, expect, it } from 'vitest';
import {
  checkClub,
  checkPlayer,
  checkTrajectoryClubs,
  findPossibleDuplicates,
  type ClubDq,
  type PlayerDq,
  type SpellDq,
} from './quality';

const d = (iso: string) => new Date(iso);

const spell = (over: Partial<SpellDq> = {}): SpellDq => ({
  id: 's1',
  clubId: 'c1',
  spellType: 'professional',
  startDate: d('1993-01-01'),
  startPrecision: 'year',
  endDate: d('1994-06-30'),
  loanFromClubId: null,
  verificationStatus: 'verified',
  ...over,
});

const player = (over: Partial<PlayerDq> = {}): PlayerDq => ({
  id: 'p1',
  verificationStatus: 'verified',
  wikidataId: 'Q529207',
  sourceRef: null,
  primaryPositionGroup: 'FW',
  birthDate: d('1976-09-18'),
  aliases: [{ normalized: 'ronaldo', kind: 'canonical' }],
  spells: [spell()],
  ...over,
});

const rules = (vs: { rule: string }[]) => vs.map((v) => v.rule).sort();

describe('data quality checks (DATA_QUALITY.md §2)', () => {
  it('a clean verified player has no violations', () => {
    expect(checkPlayer(player())).toEqual([]);
  });

  it('DQ-01 blocks a verified spell without a start date of at least year precision', () => {
    expect(rules(checkPlayer(player({ spells: [spell({ startDate: null })] })))).toEqual(['DQ-01']);
    expect(rules(checkPlayer(player({ spells: [spell({ startPrecision: 'unknown' })] })))).toEqual([
      'DQ-01',
    ]);
    // an imported spell is not held to DQ-01 yet
    expect(
      checkPlayer(player({ spells: [spell({ startDate: null, verificationStatus: 'imported' })] })),
    ).toEqual([]);
  });

  it('DQ-02 blocks a spell that ends before it starts', () => {
    const vs = checkPlayer(player({ spells: [spell({ endDate: d('1990-01-01') })] }));
    expect(vs).toEqual([
      expect.objectContaining({ rule: 'DQ-02', severity: 'block', entityId: 's1' }),
    ]);
  });

  it('DQ-03 blocks a loan without the lending club', () => {
    expect(rules(checkPlayer(player({ spells: [spell({ spellType: 'loan' })] })))).toEqual([
      'DQ-03',
    ]);
    expect(
      checkPlayer(player({ spells: [spell({ spellType: 'loan', loanFromClubId: 'c9' })] })),
    ).toEqual([]);
  });

  it('DQ-04 blocks a verified player without a canonical alias', () => {
    const vs = checkPlayer(player({ aliases: [{ normalized: 'r9', kind: 'nickname' }] }));
    expect(vs).toEqual([
      expect.objectContaining({ rule: 'DQ-04', severity: 'block', entityId: 'p1' }),
    ]);
    expect(checkPlayer(player({ verificationStatus: 'imported', aliases: [] }))).toEqual([]);
  });

  it('DQ-04 blocks a verified player without a position group', () => {
    expect(rules(checkPlayer(player({ primaryPositionGroup: null })))).toEqual(['DQ-04']);
  });

  it('DQ-06 warns on overlapping spells at different clubs when neither is a loan', () => {
    const overlapping = [
      spell({ id: 'a', clubId: 'c1', startDate: d('1994-01-01'), endDate: d('1996-12-31') }),
      spell({ id: 'b', clubId: 'c2', startDate: d('1996-06-01'), endDate: d('1997-06-30') }),
    ];
    expect(checkPlayer(player({ spells: overlapping }))).toEqual([
      expect.objectContaining({ rule: 'DQ-06', severity: 'warn' }),
    ]);
    const withLoan = [
      overlapping[0]!,
      { ...overlapping[1]!, spellType: 'loan' as const, loanFromClubId: 'c1' },
    ];
    expect(checkPlayer(player({ spells: withLoan }))).toEqual([]);
    const sameClub = [overlapping[0]!, { ...overlapping[1]!, clubId: 'c1' }];
    expect(checkPlayer(player({ spells: sameClub }))).toEqual([]);
  });

  it('DQ-06 treats an open spell (no end date) as still running', () => {
    const vs = checkPlayer(
      player({
        spells: [
          spell({ id: 'a', clubId: 'c1', startDate: d('2020-01-01'), endDate: null }),
          spell({ id: 'b', clubId: 'c2', startDate: d('2023-01-01'), endDate: null }),
        ],
      }),
    );
    expect(rules(vs)).toEqual(['DQ-06']);
  });

  it('DQ-07 blocks a player with neither wikidataId nor sourceRef', () => {
    expect(rules(checkPlayer(player({ wikidataId: null })))).toEqual(['DQ-07']);
    expect(
      checkPlayer(player({ wikidataId: null, sourceRef: 'https://pt.wikipedia.org/wiki/Ronaldo' })),
    ).toEqual([]);
  });

  it('DQ-08 blocks a verified club without a country', () => {
    const club: ClubDq = { id: 'c1', verificationStatus: 'verified', countryId: null };
    expect(checkClub(club)).toEqual([
      expect.objectContaining({ rule: 'DQ-08', severity: 'block' }),
    ]);
    expect(checkClub({ ...club, countryId: 'BR' })).toEqual([]);
  });

  it('DQ-05 warns on two verified players with the same alias and birth year', () => {
    const a = player({ id: 'p1' });
    const b = player({ id: 'p2', wikidataId: 'Q1', birthDate: d('1976-01-01') });
    const c = player({ id: 'p3', wikidataId: 'Q2', birthDate: d('1980-01-01') });
    expect(findPossibleDuplicates([a, b, c])).toEqual([
      expect.objectContaining({ rule: 'DQ-05', severity: 'warn', entityId: 'p2' }),
    ]);
    expect(findPossibleDuplicates([a, { ...b, verificationStatus: 'imported' }])).toEqual([]);
  });

  it('DQ-09 blocks a challenge trajectory that uses an unverified club', () => {
    const p = player({
      spells: [
        spell({ clubId: 'c1' }),
        spell({ id: 's2', clubId: 'c2' }),
        spell({ id: 's3', clubId: 'c3', spellType: 'youth' }),
      ],
    });
    const clubs = new Map([
      ['c1', 'verified'],
      ['c2', 'imported'],
      ['c3', 'imported'],
    ] as const);
    expect(checkTrajectoryClubs(p, clubs)).toEqual([
      expect.objectContaining({ rule: 'DQ-09', severity: 'block', entityId: 'c2' }),
    ]);
  });
});
