import { describe, expect, it } from 'vitest';
import { achievementOpen, closedRoute, isModeLaunched, isPageLaunched } from './launch';

describe('launch', () => {
  it('opens Career Path and its levels, closes the other modes', () => {
    expect(closedRoute('/career-path', false)).toBeNull();
    expect(closedRoute('/career-path/3', false)).toBeNull();
    expect(closedRoute('/grid/1', false)).toEqual({ name: '', mode: 'FOOTBALL_GRID' });
    expect(closedRoute('/linha-do-tempo', false)?.mode).toBe('TIMELINE');
    expect(isModeLaunched('DRAFT', false)).toBe(false);
  });

  it('closes the gated pages, keeps the open ones and unknown paths untouched', () => {
    expect(closedRoute('/d/hoje', false)?.name).toBe('Desafio do Dia');
    expect(closedRoute('/ranking', false)?.name).toBe('Ranking');
    expect(closedRoute('/liga/ABC', false)?.name).toBe('Ligas');
    expect(closedRoute('/carreira', false)?.name).toBe('Modo Carreira');
    expect(closedRoute('/clube', false)?.name).toBe('Clube');
    expect(closedRoute('/presente/ABCD-EFGH-JKLM', false)?.name).toBe('Clube');
    expect(isPageLaunched('daily', false)).toBe(false);
    for (const p of ['/', '/album', '/stats', '/conta', '/privacidade', '/como-jogar', '/nada'])
      expect(closedRoute(p, false)).toBeNull();
  });

  it('opens everything with the flag', () => {
    expect(closedRoute('/grid/1', true)).toBeNull();
    expect(closedRoute('/d/hoje', true)).toBeNull();
    expect(isModeLaunched('IMPOSTOR', true)).toBe(true);
    expect(isPageLaunched('ranking', true)).toBe(true);
  });

  it('hides achievements of closed games and pages, keeps the rest', () => {
    for (const id of ['estreia', 'titular', 'lenda', 'faro-de-gol'])
      expect(achievementOpen(id, false)).toBe(true);
    for (const id of ['oito-jogos', 'grid-perfeito', 'relogio', 'fregues', 'resenha'])
      expect(achievementOpen(id, false)).toBe(false);
    expect(achievementOpen('resenha', true)).toBe(true);
  });
});
