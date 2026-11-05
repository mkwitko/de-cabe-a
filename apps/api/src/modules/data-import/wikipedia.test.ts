import { describe, expect, it } from 'vitest';
import { parseInfoboxCareer } from './wikipedia';

const WIKITEXT = `{{Info/Futebol
|nome              = Ronaldo
|base-ano1         = 1989
|base-clube1       = [[Valqueire Tênis Clube|Valqueire]] (futsal)
|ano1              = 1993–1994
|clube1            = {{Futebol Cruzeiro}}
|jogos1            = 47
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
    expect(parseInfoboxCareer(WIKITEXT)).toEqual([
      { index: 1, fromYear: 1993, toYear: 1994, club: 'Cruzeiro', isLoan: false },
      { index: 2, fromYear: 1994, toYear: 1996, club: 'PSV', isLoan: false },
      { index: 3, fromYear: 2009, toYear: null, club: 'Corinthians', isLoan: false },
      { index: 10, fromYear: 2014, toYear: 2014, club: 'São Paulo', isLoan: true },
    ]);
  });

  it('returns null when there is no football infobox', () => {
    expect(parseInfoboxCareer('Sem infobox')).toBeNull();
  });
});
