import { describe, expect, it } from 'vitest';
import { streaks } from './streak';

describe('streaks', () => {
  it('counts consecutive days ending today', () => {
    expect(streaks(['2026-11-03', '2026-11-04', '2026-11-05'], '2026-11-05')).toEqual({
      current: 3,
      max: 3,
    });
  });
  it('a streak ending yesterday is still current (today not played yet)', () => {
    expect(streaks(['2026-11-03', '2026-11-04'], '2026-11-05')).toEqual({ current: 2, max: 2 });
  });
  it('3 days in a row then a missed day -> current 0, max 3', () => {
    expect(streaks(['2026-11-01', '2026-11-02', '2026-11-03'], '2026-11-05')).toEqual({
      current: 0,
      max: 3,
    });
  });
  it('handles gaps, duplicates and month boundaries', () => {
    expect(
      streaks(
        ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-01', '2026-11-04', '2026-11-05'],
        '2026-11-05',
      ),
    ).toEqual({ current: 2, max: 3 });
    expect(streaks([], '2026-11-05')).toEqual({ current: 0, max: 0 });
  });
});
