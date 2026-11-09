import { describe, expect, it } from 'vitest';
import { season, seasonAt } from './seasons';

describe('seasons', () => {
  it('runs 4 weeks from Monday 2026-11-09 in Brasília', () => {
    expect(seasonAt(new Date('2026-11-09T02:59:00Z')).number).toBe(1); // before launch
    expect(seasonAt(new Date('2026-11-09T03:00:00Z')).number).toBe(1);
    expect(seasonAt(new Date('2026-12-07T02:59:59Z')).number).toBe(1);
    expect(seasonAt(new Date('2026-12-07T03:00:00Z')).number).toBe(2);
    expect(season(2).start.toISOString()).toBe('2026-12-07T03:00:00.000Z');
    expect(season(5).theme).toBe(season(1).theme);
  });
});
