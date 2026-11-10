import { describe, expect, it } from 'vitest';
import { levelRarity, rank, RARITY_ORDER } from './rarity';

describe('levelRarity', () => {
  it('easy level, unknown player, 1 star is bronze', () =>
    expect(
      levelRarity({
        stars: 1,
        fame: 'T4',
        difficulty: 1,
        retired: false,
        streakDays: 0,
        flawless: false,
      }),
    ).toBe('bronze'));
  it('3 stars on a medium level with a famous player is ouro', () =>
    expect(
      levelRarity({
        stars: 3,
        fame: 'T2',
        difficulty: 2,
        retired: false,
        streakDays: 0,
        flawless: false,
      }),
    ).toBe('ouro'));
  it('3 stars, hard level, famous player is ouro_brilhante', () =>
    expect(
      levelRarity({
        stars: 3,
        fame: 'T2',
        difficulty: 3,
        retired: false,
        streakDays: 0,
        flawless: false,
      }),
    ).toBe('ouro_brilhante'));
  it('retired T1, 3 stars, hard is idolo', () =>
    expect(
      levelRarity({
        stars: 3,
        fame: 'T1',
        difficulty: 3,
        retired: true,
        streakDays: 2,
        flawless: false,
      }),
    ).toBe('idolo'));
  it('idolo plus 7-day streak and flawless is lenda', () =>
    expect(
      levelRarity({
        stars: 3,
        fame: 'T1',
        difficulty: 3,
        retired: true,
        streakDays: 7,
        flawless: true,
      }),
    ).toBe('lenda'));
  it('rank orders the 8 levels', () => {
    expect(RARITY_ORDER).toHaveLength(8);
    expect(rank('lenda')).toBeGreaterThan(rank('idolo'));
    expect(rank('destaque_rodada')).toBeGreaterThan(rank('ouro_brilhante'));
  });
  it('easy levels never exceed ouro', () => {
    for (const fame of ['T1', 'T2', 'T3', 'T4'] as const)
      for (const stars of [1, 2, 3] as const)
        expect(
          rank(
            levelRarity({
              stars,
              fame,
              difficulty: 1,
              retired: false,
              streakDays: 0,
              flawless: false,
            }),
          ),
        ).toBeLessThanOrEqual(rank('ouro'));
  });
});
