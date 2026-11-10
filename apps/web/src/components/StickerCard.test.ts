import { describe, expect, it } from 'vitest';
import { shortName } from './StickerCard';

describe('shortName', () => {
  it('keeps short and single names', () => {
    expect(shortName('Pelé')).toBe('Pelé');
    expect(shortName('Casemiro')).toBe('Casemiro');
    expect(shortName('Juan Silva')).toBe('Juan Silva');
  });

  it('turns a long name into initial + surname', () => {
    expect(shortName('Cristiano Ronaldo')).toBe('C. Ronaldo');
    expect(shortName('Johan Cruijff')).toBe('J. Cruijff');
    expect(shortName('Kylian Mbappé')).toBe('K. Mbappé');
  });

  it('falls back to the surname when initial + surname is still long', () => {
    expect(shortName('Pierre-Emerick Aubameyang')).toBe('Aubameyang');
  });
});
