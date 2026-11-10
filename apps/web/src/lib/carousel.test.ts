import { describe, expect, it } from 'vitest';
import { cardTransform } from './carousel';

describe('cardTransform', () => {
  it('leaves the centred card flat', () => {
    expect(cardTransform(0)).toEqual({ rotateY: -0, scale: 1, opacity: 1 });
  });
  it('turns neighbours 12 degrees toward the centre and shrinks them to 0.9', () => {
    expect(cardTransform(1)).toMatchObject({ rotateY: -12, scale: 0.9 });
    expect(cardTransform(-1)).toMatchObject({ rotateY: 12, scale: 0.9 });
  });
  it('interpolates halfway and clamps beyond one card', () => {
    expect(cardTransform(0.5)).toMatchObject({ rotateY: -6, scale: 0.95 });
    expect(cardTransform(3)).toEqual(cardTransform(1));
    expect(cardTransform(-7)).toEqual(cardTransform(-1));
  });
});
