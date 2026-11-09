import { describe, expect, it } from 'vitest';
import { Nickname } from '@decabeca/contracts';
import { suggestNickname } from './nickname';

describe('suggestNickname', () => {
  it('always gives a valid nickname', () => {
    for (let i = 0; i < 500; i++) expect(Nickname.safeParse(suggestNickname()).success).toBe(true);
  });
});
