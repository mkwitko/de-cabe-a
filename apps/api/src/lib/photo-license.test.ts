import { describe, expect, it } from 'vitest';
import { cleanArtist, isFreeLicense } from '../../../../scripts/research/lib/photo-license';

describe('isFreeLicense', () => {
  it.each([
    'CC BY 2.0',
    'CC BY-SA 3.0',
    'CC BY-SA 4.0',
    'CC0',
    'Public domain',
    'PD-US-expired',
    'CC-BY-4.0',
  ])('accepts %s', (l) => expect(isFreeLicense(l)).toBe(true));
  it.each([
    'CC BY-NC 2.0',
    'CC BY-ND 4.0',
    'CC BY-NC-SA 3.0',
    'GFDL',
    'Fair use',
    '',
    null,
    undefined,
  ])('rejects %s', (l) => expect(isFreeLicense(l)).toBe(false));
});

describe('cleanArtist', () => {
  it('strips html and decodes entities', () => {
    expect(
      cleanArtist('<a href="//x" title="User:A">Marcos&nbsp;Corr&#234;a</a>/PR &amp; co'),
    ).toBe('Marcos Corrêa/PR & co');
  });
  it('handles empty and long input', () => {
    expect(cleanArtist(null)).toBe('');
    expect(cleanArtist('<b>x</b>'.repeat(300)).length).toBe(200);
  });
});
