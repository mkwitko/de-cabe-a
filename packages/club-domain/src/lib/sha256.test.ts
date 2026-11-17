import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from './sha256';

describe('sha256Hex', () => {
  it('matches node:crypto, empty, multi-block, accents and a big text', () => {
    const big = 'clube '.repeat(200_000) + 'ção ⚽';
    for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'ção ⚽', big])
      expect(sha256Hex(s)).toBe(createHash('sha256').update(s).digest('hex'));
  });
});
