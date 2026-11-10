import { describe, expect, it } from 'vitest';
import type { EntitlementsResponse } from '@decabeca/contracts';
import { finishOf } from './cosmetics';

const ents = (equipped: Partial<EntitlementsResponse['equipped']>) =>
  ({
    equipped: { finish: null, passport: null, crowd: null, stickers: {}, ...equipped },
  }) as EntitlementsResponse;

describe('finishOf', () => {
  it('uses the sticker’s own finish, then the default; none keeps it plain', () => {
    const e = ents({
      finish: 'acabamento_cromado',
      stickers: { a: 'acabamento_holografico', b: 'none' },
    });
    expect(finishOf(e, 'a')).toBe('acabamento_holografico');
    expect(finishOf(e, 'b')).toBeNull();
    expect(finishOf(e, 'c')).toBe('acabamento_cromado');
    expect(finishOf(null, 'a')).toBeNull();
  });
});
