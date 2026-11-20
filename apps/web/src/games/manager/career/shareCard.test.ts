import { describe, expect, it } from 'vitest';
import { careerSummary, seasonHeadline, seasonText } from './shareCard';

const base = {
  season: 2026,
  clubId: 'a',
  division: 'Série B',
  position: 1,
  goal: 4,
  met: true,
  move: 'stay',
  champion: false,
  cups: [],
  top: null,
  club: 'FLU',
  places: 20,
  championName: 'X',
  confidence: { from: 50, to: 60 },
  reasons: [],
  record: { won: 20, drawn: 10, lost: 8, for: 60, against: 30 },
  used: [{ name: 'Fulano', starts: 38 }],
  biggestWin: null,
  worstDefeat: null,
};
const r = (o: object) => ({ ...base, ...o }) as never;

describe('shareCard text', () => {
  it('picks the headline by what the season meant', () => {
    expect(seasonHeadline(r({ move: 'promotion' }))).toBe('Acesso histórico!');
    expect(seasonHeadline(r({ champion: true }))).toBe('Campeão da Série B!');
    expect(seasonHeadline(r({ goal: 18, position: 15 }))).toBe('Escapou do rebaixamento');
    expect(seasonHeadline(r({ met: false }))).toBe('Meta não cumprida');
    expect(seasonHeadline(r({ move: 'relegation', met: false }))).toMatch(/Rebaixado/);
  });
  it('builds the share text with record and top player', () => {
    const txt = seasonText(r({}), {
      name: 'Fluminense',
      shortName: 'FLU',
      colours: ['#900', '#fff'],
    });
    expect(txt).toContain('20V 10E 8D');
    expect(txt).toContain('Mais utilizado: Fulano');
  });
  it('sums the career', () => {
    const h = [
      { ...base, season: 1, champion: true, move: 'promotion', club: 'A' },
      { ...base, season: 2, position: 5, club: 'B' },
    ] as never[];
    const s = careerSummary(h);
    expect([s.seasons, s.titles, s.ups, s.clubs.join()]).toEqual([2, 1, 1, 'A,B']);
    expect(s.best?.season).toBe(1);
  });
});
