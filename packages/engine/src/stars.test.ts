import { describe, expect, it } from 'vitest';
import { starsFor, titleFor } from './stars';

describe('starsFor (ADR-007)', () => {
  it.each([
    [60, 3],
    [50, 3],
    [40, 2],
    [30, 2],
    [20, 1],
    [10, 1],
    [0, 0],
  ])('Career Path score %i -> %i stars', (score, stars) =>
    expect(starsFor('career-path', score)).toBe(stars),
  );
  it.each([
    [9, 3],
    [8, 2],
    [6, 2],
    [5, 1],
    [3, 1],
    [2, 0],
    [0, 0],
  ])('Grid %i cells -> %i stars', (score, stars) =>
    expect(starsFor('football-grid', score)).toBe(stars),
  );
});

describe('starsFor with hints', () => {
  it('using a grid hint caps the level at 2 stars', () => {
    expect(starsFor('football-grid', 9, { hintsUsed: 1 })).toBe(2);
    expect(starsFor('football-grid', 4, { hintsUsed: 3 })).toBe(1);
    expect(starsFor('football-grid', 9, { hintsUsed: 0 })).toBe(3);
  });
});

describe('titleFor', () => {
  it.each([
    [0, 'Peneira'],
    [9, 'Peneira'],
    [10, 'Base'],
    [25, 'Reserva'],
    [50, 'Titular'],
    [99, 'Titular'],
    [100, 'Capitão'],
    [175, 'Craque'],
    [275, 'Ídolo'],
    [400, 'Lenda'],
    [600, 'Imortal'],
    [900, 'Rei da Bola'],
    [1200, 'Rei da Bola'],
  ])('%i stars -> %s', (stars, title) => expect(titleFor(stars).name).toBe(title));
  it('says how many stars to the next title', () => {
    expect(titleFor(4)).toEqual({ name: 'Peneira', next: { name: 'Base', missing: 6 } });
    expect(titleFor(900).next).toBeNull();
  });
});
