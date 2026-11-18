import { describe, expect, it } from 'vitest';
import { buildSpells, countryIso, parseCsv, positionGroup } from './transfermarkt-mapper';

const t = (date: string, from: [string, string], to: [string, string]) => ({
  transfer_date: date,
  from_club_id: from[0],
  from_club_name: from[1],
  to_club_id: to[0],
  to_club_name: to[1],
});

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and newlines in fields', () => {
    expect(parseCsv('a,b\r\n"x, ""y""","l1\nl2"\n,z\n')).toEqual([
      { a: 'x, "y"', b: 'l1\nl2' },
      { a: '', b: 'z' },
    ]);
  });
});

describe('mapping helpers', () => {
  it('maps country names and positions', () => {
    expect(countryIso('Brazil')).toBe('BR');
    expect(countryIso('Cote d Ivoire')).toBe('CI');
    expect(countryIso('Korea, South')).toBe('KR');
    expect(positionGroup('Attack')).toBe('FW');
    expect(positionGroup('missing')).toBeNull();
  });
});

describe('buildSpells', () => {
  const S: [string, string] = ['1', 'Santos'];
  const B: [string, string] = ['2', 'Barcelona'];
  const L: [string, string] = ['3', 'Girona'];
  it('chains transfers into spells, origin first with unknown start', () => {
    const s = buildSpells([t('2014-07-01', S, B), t('2020-07-01', B, ['4', 'PSG'])], '2026-01-01');
    expect(s.map((x) => [x.clubName, x.start, x.end])).toEqual([
      ['Santos', null, '2014-07-01'],
      ['Barcelona', '2014-07-01', '2020-07-01'],
      ['PSG', '2020-07-01', null],
    ]);
  });
  it('infers a loan from a round trip and keeps the lender', () => {
    const s = buildSpells([t('2015-07-01', B, L), t('2016-06-30', L, B)], '2026-01-01');
    expect(s.find((x) => x.clubName === 'Girona')).toMatchObject({
      spellType: 'loan',
      loanFromClubId: '2',
      end: '2016-06-30',
    });
  });
  it('closes the spell on retirement and ignores future dates', () => {
    const s = buildSpells(
      [t('2010-01-01', S, B), t('2018-01-01', B, ['9', 'Retired']), t('2030-06-30', B, L)],
      '2026-01-01',
    );
    expect(s.find((x) => x.clubName === 'Barcelona')?.end).toBe('2018-01-01');
    expect(s.some((x) => x.clubName === 'Girona')).toBe(false);
  });
});
