import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/wikidata.json';
import { mapClub, mapPlayer, parseWikidataTime, type Lookups } from './wikidata-mapper';
import type { WikidataEntity } from './wikidata-client';

const players = fixtures.players as unknown as WikidataEntity[];
const lookups: Lookups = {
  clubs: Object.fromEntries((fixtures.clubs as unknown as WikidataEntity[]).map((c) => [c.id, c])),
  countryIso: Object.fromEntries(
    fixtures.countries.map((c) => [
      c.id,
      (c.claims.P297?.[0]?.mainsnak.datavalue?.value as string) ?? '',
    ]),
  ),
  positionLabels: Object.fromEntries(
    fixtures.positions.map((p) => [p.id, p.labels.en?.value ?? '']),
  ),
};
const byId = (id: string) =>
  mapPlayer(
    players.find((p) => p.id === id)!,
    lookups,
  );

describe('parseWikidataTime', () => {
  it('handles year, month and day precision, normalising missing parts to 1', () => {
    expect(parseWikidataTime({ time: '+2002-00-00T00:00:00Z', precision: 9 })).toEqual({
      date: new Date(Date.UTC(2002, 0, 1)),
      precision: 'year',
    });
    expect(parseWikidataTime({ time: '+2013-07-00T00:00:00Z', precision: 10 })).toEqual({
      date: new Date(Date.UTC(2013, 6, 1)),
      precision: 'month',
    });
    expect(parseWikidataTime({ time: '+1976-09-22T00:00:00Z', precision: 11 })).toEqual({
      date: new Date(Date.UTC(1976, 8, 22)),
      precision: 'day',
    });
  });
});

describe('mapPlayer (real fixtures)', () => {
  it('maps Ronaldo: names, birth, nationality, position', () => {
    const r = byId('Q529207');
    expect(r.player).toMatchObject({
      wikidataId: 'Q529207',
      canonicalName: 'Ronaldo Nazário',
      fullName: 'Ronaldo Luís Nazário de Lima',
      birthDate: new Date(Date.UTC(1976, 8, 18)), // preferred-rank claim
      birthDatePrecision: 'day',
      nationalityIso: 'BR',
      primaryPositionGroup: 'FW',
    });
    expect(r.aliases.map((a) => [a.alias, a.kind])).toEqual([
      ['Ronaldo Nazário', 'canonical'],
      ['Ronaldo Luís Nazário de Lima', 'full'],
      ['Ronaldo Fenômeno', 'variant'],
      ['R9', 'variant'],
    ]);
    expect(r.aliases[0]).toMatchObject({ normalized: 'ronaldo nazario', isPrimary: true });
  });

  it('drops national teams and keeps club spells with dates', () => {
    const r = byId('Q529207');
    expect(r.spells.map((s) => s.clubQid).sort()).toEqual(
      ['Q7156', 'Q1543', 'Q631', 'Q11938', 'Q35933', 'Q188277', 'Q8682'].sort(),
    );
    expect(r.spells.find((s) => s.clubQid === 'Q8682')).toMatchObject({
      spellType: 'professional',
      startDate: new Date(Date.UTC(2002, 0, 1)),
      startPrecision: 'year',
      endDate: new Date(Date.UTC(2007, 0, 1)),
    });
  });

  it('maps a loan and infers the lending club from the spell open at its start', () => {
    const loan = byId('Q531814').spells.find((s) => s.spellType === 'loan');
    expect(loan).toMatchObject({ clubQid: 'Q38568', loanFromClubQid: 'Q15214308' });
  });

  it('keeps repeated passages at the same club as separate spells', () => {
    expect(byId('Q203451').spells.filter((s) => s.clubQid === 'Q5014111')).toHaveLength(3);
  });

  it('maps midfielder to MF', () => {
    expect(byId('Q203451').player.primaryPositionGroup).toBe('MF');
    expect(byId('Q531814').player.primaryPositionGroup).toBe('FW'); // winger
  });
});

describe('mapClub', () => {
  it('maps label, country and inception', () => {
    expect(mapClub(lookups.clubs['Q35933']!, lookups)).toEqual({
      wikidataId: 'Q35933',
      name: 'Sport Club Corinthians Paulista',
      shortName: 'Sport Club Corinthians Paulista',
      countryIso: 'BR',
      foundedYear: 1910,
    });
  });
});
