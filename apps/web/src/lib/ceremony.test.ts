import { afterEach, describe, expect, it, vi } from 'vitest';
import { ceremonyLength, markCeremony, recentCompletion } from './ceremony';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
});
afterEach(() => store.clear());

describe('ceremony', () => {
  it('first ceremony of the day is full', () => {
    expect(ceremonyLength('CAREER_PATH', '2026-11-09')).toBe('full');
  });
  it('second is short', () => {
    markCeremony('CAREER_PATH', '2026-11-09');
    expect(ceremonyLength('CAREER_PATH', '2026-11-09')).toBe('short');
    expect(ceremonyLength('CAREER_PATH', '2026-11-10')).toBe('full');
    expect(ceremonyLength('DRAFT', '2026-11-09')).toBe('full');
  });
  it('works without storage', () => {
    const boom = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom });
    expect(ceremonyLength('CAREER_PATH', '2026-11-09')).toBe('full');
    expect(() => markCeremony('CAREER_PATH', '2026-11-09')).not.toThrow();
  });
});

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
