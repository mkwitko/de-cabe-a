import { describe, expect, it } from 'vitest';
import { ENGINE_IDS } from './index';

describe('engine package', () => {
  it('lists the two MVP engine ids from GAME_ENGINE_CONTRACT.md §2', () => {
    expect(ENGINE_IDS).toEqual(['career-path', 'football-grid']);
  });
});
