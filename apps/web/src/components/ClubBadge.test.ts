import { describe, expect, it } from 'vitest';
import { clubInitials } from './ClubBadge';

describe('clubInitials', () => {
  it.each([
    ['Real Madrid', 'RM'],
    ['PSV', 'PSV'],
    ['Flamengo', 'FLA'],
    ['Inter de Milão', 'IM'],
    ['Atlético-MG', 'AM'],
  ])('%s -> %s', (name, initials) => expect(clubInitials(name)).toBe(initials));
});
