import { describe, expect, it } from 'vitest';
import { monthsFromPower, municipalityInClubName, parseSidra, parseWkt } from './cities';

describe('city parsers', () => {
  it('parses SIDRA rows, skipping the header and masked values', () => {
    const m = parseSidra([
      { V: 'Valor', D1C: 'Município (Código)' },
      { V: '11911337', D1C: '3550308' },
      { V: '...', D1C: '1100015' },
    ]);
    expect([...m]).toEqual([['3550308', 11911337]]);
  });

  it('parses a Wikidata point as lat/lon', () => {
    expect(parseWkt('Point(-46.6 -23.5)')).toEqual({ lat: -23.5, lon: -46.6 });
    expect(parseWkt(undefined)).toBeNull();
  });

  it('turns POWER mm/day into mm per month and rejects fill values', () => {
    const m = (v: number) =>
      Object.fromEntries(
        ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(
          (k) => [k, v],
        ),
      );
    const ok = monthsFromPower({
      properties: { parameter: { PRECTOTCORR: m(2), T2M: m(20.04), RH2M: m(80.4) } },
    });
    expect(ok?.[0]).toEqual({ rainMm: 62, tempC: 20, humidity: 80 });
    expect(
      monthsFromPower({
        properties: { parameter: { PRECTOTCORR: m(-999), T2M: m(20), RH2M: m(80) } },
      }),
    ).toBeNull();
  });

  it('names a municipality from a club name only on strong evidence', () => {
    const names = new Map([
      ['porto velho', [{ ibge: '1100205', uf: 'RO' }]],
      ['pelotas', [{ ibge: '4314407', uf: 'RS' }]],
      ['sampaio', [{ ibge: '1', uf: 'TO' }]],
      [
        'guarani',
        [
          { ibge: '2', uf: 'RS' },
          { ibge: '3', uf: 'MG' },
        ],
      ],
    ]);
    expect(municipalityInClubName('Sport Club Genus de Porto Velho', names)).toBe('1100205');
    expect(municipalityInClubName('Esporte Clube Pelotas', names)).toBe('4314407');
    expect(municipalityInClubName('Grêmio Atlético Sampaio', names)).toBeNull();
    expect(municipalityInClubName('Guarani Futebol Clube (MG)', names)).toBe('3');
    expect(municipalityInClubName('Guarani Futebol Clube', names)).toBeNull();
  });
});
