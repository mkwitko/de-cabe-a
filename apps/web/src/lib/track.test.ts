import { describe, expect, it } from 'vitest';
import { nextLevel } from './track';

const lv = (level: number, state: 'locked' | 'open' | 'in_progress' | 'done') => ({
  level,
  state,
  stars: 0,
  score: 0,
  difficultyTier: 1,
});

describe('nextLevel', () => {
  it('is null while loading, for an empty track and when everything is done', () => {
    expect(nextLevel(undefined)).toBeNull();
    expect(nextLevel({ levels: [] })).toBeNull();
    expect(nextLevel({ levels: [lv(1, 'done'), lv(2, 'done')] })).toBeNull();
  });
  it('is the first open level, never a locked one', () => {
    expect(nextLevel({ levels: [lv(1, 'done'), lv(2, 'open'), lv(3, 'locked')] })).toEqual({
      level: 2,
      inProgress: false,
    });
    expect(nextLevel({ levels: [lv(1, 'locked')] })).toBeNull();
  });
  it('prefers the level in progress', () => {
    expect(nextLevel({ levels: [lv(1, 'done'), lv(2, 'open'), lv(3, 'in_progress')] })).toEqual({
      level: 3,
      inProgress: true,
    });
  });
});
