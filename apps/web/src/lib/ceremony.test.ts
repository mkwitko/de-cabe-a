import { describe, expect, it } from 'vitest';
import { recentCompletion } from './ceremony';

describe('recentCompletion', () => {
  const now = Date.parse('2026-11-09T12:00:00Z');
  it('recent completion plays', () => {
    expect(recentCompletion('2026-11-09T11:59:10Z', now)).toBe(true);
  });
  it('old completion skips', () => {
    expect(recentCompletion('2026-11-09T11:50:00Z', now)).toBe(false);
    expect(recentCompletion(null, now)).toBe(false);
  });
});
