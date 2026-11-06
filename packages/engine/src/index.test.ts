import { describe, expect, it } from 'vitest';
import { ENGINE_IDS } from './index';

describe('engine package', () => {
  it('lists the engine ids (GAME_ENGINE_CONTRACT.md §2, ADR-011)', () => {
    expect(ENGINE_IDS).toEqual([
      'career-path',
      'football-grid',
      'impostor',
      'timeline',
      'higher-lower',
    ]);
  });
});
