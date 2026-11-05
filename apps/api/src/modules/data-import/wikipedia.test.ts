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
    expect(parseInfoboxCareer(WIKITEXT)?.map((e) => e.link)).toEqual([
      null,
      'PSV Eindhoven',
      null,
      'São Paulo Futebol Clube',
    ]);
  });

  it('returns null when there is no football infobox', () => {
    expect(parseInfoboxCareer('Sem infobox')).toBeNull();
  });
});

describe('parseInfoboxCareer (es / it / de / fr infoboxes)', () => {
  const rows = (text: string) =>
    parseInfoboxCareer(text)?.map((e) => [
      e.club,
      e.fromYear,
      e.toYear,
      e.appearances,
      e.goals,
      e.isLoan,
      e.link,
    ]);

  it('reads the Spanish Ficha de futbolista equipos list', () => {
    const text =
      '{{Ficha de futbolista\n| club = [[Santos Futebol Clube|Santos F. C.]]\n| equipos = * [[Santos Futebol Clube|Santos F. C.]] (2009-13)\n* [[Fútbol Club Barcelona|F. C. Barcelona]] (2013-17)\n* → [[Real Betis Balompié|Betis]] (2018) (cedido)\n* [[Santos Futebol Clube|Santos F. C.]] (2025-act.)\n| medallas = x\n}}';
    expect(rows(text)).toEqual([
      ['Santos F. C.', 2009, 2013, null, null, false, 'Santos Futebol Clube'],
      ['F. C. Barcelona', 2013, 2017, null, null, false, 'Fútbol Club Barcelona'],
      ['Betis', 2018, 2018, null, null, true, 'Real Betis Balompié'],
      ['Santos F. C.', 2025, null, null, null, false, 'Santos Futebol Clube'],
    ]);
  });

  it('reads the Italian Carriera sportivo rows, skipping national teams', () => {
    const text =
      '{{Sportivo\n|SquadreGiovanili = {{Carriera sportivo\n |2003-2008|Santos|\n}}\n|Squadre = {{Carriera sportivo\n|sport = calcio |pos = G\n |2009-2013|[[Santos Futebol Clube|Santos]]|179 (107)\n |2013-2017|{{Calcio Barcellona|G}}|123 (68)\n |2015-2016|→ [[Real Betis Balompié|Betis]]|3 (0)\n |2025-|Santos|33 (16)<ref>42 (19) se...</ref>\n}}\n|SquadreNazionali = {{Carriera sportivo\n |2010-2026|{{Naz|CA|BRA|M}}|130 (80)\n}}\n}}';
    expect(rows(text)).toEqual([
      ['Santos', 2009, 2013, 179, 107, false, 'Santos Futebol Clube'],
      ['Barcellona', 2013, 2017, 123, 68, false, null],
      ['Betis', 2015, 2016, 3, 0, true, 'Real Betis Balompié'],
      ['Santos', 2025, null, 33, 16, false, null],
    ]);
  });

  it('reads the German Team-Station rows of vereine_tabelle only', () => {
    const text =
      '{{Infobox Fußballspieler\n| jugendvereine_tabelle = \n{{Team-Station|2003–2008|[[FC Santos]]}}\n| vereine_tabelle = \n{{Team-Station|2009–2013|[[FC Santos]]|177 (107)}}\n{{Team-Station|2013–2014|AC Mailand|30 {{0}}(7)}}\n{{Team-Station|2014|→&nbsp;[[FC São Paulo]] (Leihe)|19 {{0}}(2)}}\n{{Team-Station|2025–    |[[FC Santos]]|37 {{0}}(17)}}\n| nationalmannschaft_tabelle = \n{{Team-Station|2010–2026|[[Brasilianische Fußballnationalmannschaft|Brasilien]]|130 (80)}}\n}}';
    expect(rows(text)).toEqual([
      ['FC Santos', 2009, 2013, 177, 107, false, 'FC Santos'],
      ['AC Mailand', 2013, 2014, 30, 7, false, null],
      ['FC São Paulo', 2014, 2014, 19, 2, true, 'FC São Paulo'],
      ['FC Santos', 2025, null, 37, 17, false, 'FC Santos'],
    ]);
  });

  it('reads the French parcours senior rows', () => {
    const text =
      '{{Infobox Footballeur\n | parcours junior     = {{deux colonnes\n |[[2003 en football|2003]]-[[2009 en football|2009]]|{{BRA-d}} [[Santos Futebol Clube (Santos)|Santos FC]]\n}}\n | parcours senior     = {{trois colonnes\n |[[2009 en football|2009]]-[[2013 en football|2013]]|{{BRA-d}} [[Santos Futebol Clube (Santos)|Santos FC]]|{{nobr|230 (138)}}\n |[[2017 en football|2017]]-[[2023 en football|2023]]|{{nobr|{{drapeau|France}} [[Paris Saint-Germain Football Club|Paris Saint-Germain]]}}|{{nobr|173 (118)}}\n |[[2023 en football|2023]]-[[2025 en football|2025]]|{{KSA-d}} [[Al-Hilal Football Club|Al-Hilal FC]]|{{nobr|{{0|00}}7 {{0|00}}(1)}}\n |[[2025 en football|2025]]-|{{BRA-d}} [[Santos Futebol Clube (Santos)|Santos FC]]|{{nobr|{{0}}55 {{0}}(21)}}\n}}\n | sélection nationale = {{trois colonnes\n |2010-|Brésil|130 (80)\n}}\n}}';
    expect(rows(text)).toEqual([
      ['Santos FC', 2009, 2013, 230, 138, false, 'Santos Futebol Clube (Santos)'],
      ['Paris Saint-Germain', 2017, 2023, 173, 118, false, 'Paris Saint-Germain Football Club'],
      ['Al-Hilal FC', 2023, 2025, 7, 1, false, 'Al-Hilal Football Club'],
      ['Santos FC', 2025, null, 55, 21, false, 'Santos Futebol Clube (Santos)'],
    ]);
  });
});
