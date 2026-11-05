import { describe, expect, it } from 'vitest';
import { normalizeName } from './normalize';

describe('normalizeName (DATA_QUALITY.md §3)', () => {
  it.each([
    ['Zé Roberto', 'ze roberto'],
    ['Müller', 'muller'],
    ["O'Neil", 'o neil'],
    ['Ronaldinho Gaúcho', 'ronaldinho gaucho'],
    ['  Kaká  ', 'kaka'],
    ['R9', 'r9'],
    ['Juninho  Pernambucano', 'juninho pernambucano'],
    ['Sócrates', 'socrates'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});
