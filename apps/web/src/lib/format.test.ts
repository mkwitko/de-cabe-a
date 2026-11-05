import { describe, expect, it } from 'vitest';
import { countryName, durationLabel, statsLabel, yearsLabel } from './format';

describe('pt-BR career formatting', () => {
  it('formats years', () => {
    expect(yearsLabel(2009, 2013)).toBe('2009 – 2013');
    expect(yearsLabel(2023, null)).toBe('desde 2023');
    expect(yearsLabel(2013, 2013)).toBe('2013');
    expect(yearsLabel(null, null)).toBe('—');
  });
  it('formats time at the club', () => {
    expect(durationLabel(2009, 2013)).toBe('4 anos');
    expect(durationLabel(2013, 2014)).toBe('1 ano');
    expect(durationLabel(2013, 2013)).toBe('menos de 1 ano');
    expect(durationLabel(2023, null)).toBeNull();
  });
  it('formats games and goals', () => {
    expect(statsLabel(47, 44)).toBe('47 jogos · 44 gols');
    expect(statsLabel(1, 1)).toBe('1 jogo · 1 gol');
    expect(statsLabel(null, null)).toBeNull();
  });
  it('names countries in Portuguese', () => {
    expect(countryName('BR')).toBe('Brasil');
    expect(countryName('ES')).toBe('Espanha');
  });
});
