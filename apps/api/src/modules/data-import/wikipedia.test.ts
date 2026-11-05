import { describe, expect, it } from 'vitest';
import { parseInfoboxCareer } from './wikipedia';

const WIKITEXT = `{{Info/Futebol
|nome              = Ronaldo
|base-ano1         = 1989
|base-clube1       = [[Valqueire Tênis Clube|Valqueire]] (futsal)
|ano1              = 1993–1994
|clube1            = {{Futebol Cruzeiro}}
|jogos1            = 47
|gols1             = 44
|ano2              = 1994–1996
|clube2            = [[PSV Eindhoven|PSV]]<ref name="x"/>
|ano10             = 2014
|clube10           = → [[São Paulo Futebol Clube|São Paulo]] (emp.)
|ano3              = 2009–
|clube3            = {{Futebol Corinthians}}
|seleção-ano1      = 1993
|seleção1          = [[Seleção Brasileira de Futebol Sub-17|Brasil Sub-17]]
}}
Texto do artigo.`;

describe('parseInfoboxCareer (pt.wikipedia Info/Futebol)', () => {
  it('reads senior club entries in numeric order, ignoring youth and national teams', () => {
    expect(parseInfoboxCareer(WIKITEXT)?.map(({ link: _l, ...e }) => e)).toEqual([
      {
        index: 1,
        fromYear: 1993,
        toYear: 1994,
        club: 'Cruzeiro',
        isLoan: false,
        appearances: 47,
        goals: 44,
      },
      {
        index: 2,
        fromYear: 1994,
        toYear: 1996,
        club: 'PSV',
        isLoan: false,
        appearances: null,
        goals: null,
      },
      {
        index: 3,
        fromYear: 2009,
        toYear: null,
        club: 'Corinthians',
        isLoan: false,
        appearances: null,
        goals: null,
      },
      {
        index: 10,
        fromYear: 2014,
        toYear: 2014,
        club: 'São Paulo',
        isLoan: true,
        appearances: null,
        goals: null,
      },
    ]);
  });

  it('reads indented numbered fields', () => {
    const text =
      '{{Info/Futebol\n |nome = Zico\n |ano1              = 1971–1983\n |clube1            = {{Futebol Flamengo}}\n |ano2 = 1983–1985\n |clube2 = {{Futebol Udinese}}\n}}';
    expect(parseInfoboxCareer(text)?.map((e) => [e.club, e.fromYear, e.toYear])).toEqual([
      ['Flamengo', 1971, 1983],
      ['Udinese', 1983, 1985],
    ]);
  });

  it('reads the Info/Futebolista list format (ano / clubes with <br>)', () => {
    const text =
      '{{Info/Futebolista\n|jovemanos = 1991–1992\n|jovemclubes = {{Futebol Sport}}\n|ano = 1993–1995<br>1995–2001<br>2013\n|clubes = {{Futebol Sport}}<br>{{Futebol Vasco}}<br>→ {{Futebol New York Red Bulls}} (emp.)\n|jogos = 61<br>182 (3)<br>\n|gols = 9<br>{{0}}37\n}}';
    expect(parseInfoboxCareer(text)?.map(({ link: _l, ...e }) => e)).toEqual([
      {
        index: 1,
        fromYear: 1993,
        toYear: 1995,
        club: 'Sport',
        isLoan: false,
        appearances: 61,
        goals: 9,
      },
      {
        index: 2,
        fromYear: 1995,
        toYear: 2001,
        club: 'Vasco',
        isLoan: false,
        appearances: 182,
        goals: 37,
      },
      {
        index: 3,
        fromYear: 2013,
        toYear: 2013,
        club: 'New York Red Bulls',
        isLoan: true,
        appearances: null,
        goals: null,
      },
    ]);
  });

  it('reads years wrapped in templates and open spells', () => {
    const text =
      '{{Info/Futebol\n|ano1 = {{0}}2004–2021\n|clube1 = {{Futebol Barcelona}}\n|ano2 = 2023–\n|clube2 = {{Futebol Inter Miami}}\n}}';
    expect(parseInfoboxCareer(text)?.map((e) => [e.fromYear, e.toYear])).toEqual([
      [2004, 2021],
      [2023, null],
    ]);
  });

  it('reads loans marked with {{seta fut}} / {{emp fut}}', () => {
    const text =
      '{{Info/Futebolista\n|ano = 2000<br />2000\n|clubes = [[Società Sportiva Calcio Napoli|Napoli]]<br />{{seta fut}} [[Associazione Calcio Bellinzona|Bellinzona]] {{emp fut}}\n}}';
    expect(parseInfoboxCareer(text)?.map((e) => [e.club, e.isLoan])).toEqual([
      ['Napoli', false],
      ['Bellinzona', true],
    ]);
  });

  it('reads the combined jogos(golos) list', () => {
    const text =
      '{{Info/Futebolista\n|ano = 1997–1999<br />1999–2001\n|clubes = [[Nacional Atlético Clube (São Paulo)|Nacional]]<br /> Türkgücü München\n|jogos(golos) = {{0|00}}36 {{0|000}}(19)<br />{{0|00}}31 {{0|0000}}(7)\n}}';
    expect(parseInfoboxCareer(text)?.map((e) => [e.club, e.appearances, e.goals])).toEqual([
      ['Nacional', 36, 19],
      ['Türkgücü München', 31, 7],
    ]);
  });

  it('reads the English football biography infobox', () => {
    const text =
      '{{Infobox football biography\n| years1 = 1993–1994 | clubs1 = [[Cruzeiro Esporte Clube|Cruzeiro]] | caps1 = 14 | goals1 = 12\n| years2 = 2014\n| clubs2 = → [[São Paulo FC|São Paulo]] (loan)\n}}';
    expect(parseInfoboxCareer(text)?.map(({ link: _l, ...e }) => e)).toEqual([
      {
        index: 1,
        fromYear: 1993,
        toYear: 1994,
        club: 'Cruzeiro',
        isLoan: false,
        appearances: 14,
        goals: 12,
      },
      {
        index: 2,
        fromYear: 2014,
        toYear: 2014,
        club: 'São Paulo',
        isLoan: true,
        appearances: null,
        goals: null,
      },
    ]);
  });

  it('keeps the linked page of the club cell', () => {
    expect(parseInfoboxCareer(WIKITEXT)?.map((e) => e.link)).toEqual([null, 'PSV Eindhoven', null, 'São Paulo Futebol Clube']);
  });

  it('returns null when there is no football infobox', () => {
    expect(parseInfoboxCareer('Sem infobox')).toBeNull();
  });
});
