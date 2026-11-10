import { describe, expect, it } from 'vitest';
import type { Sticker } from '@decabeca/contracts';
import { albumPages, albumSides, atOfSpread, spreadOf } from './AlbumPage';

const st = (i: number, positionGroup: Sticker['positionGroup']): Sticker => ({
  playerId: `p${i}`,
  name: `P${i}`,
  positionGroup,
  nationality: 'Brasil',
  photo: null,
  cutout: null,
  photoCredit: null,
  rarity: 'bronze',
  mode: 'CAREER_PATH',
  earnedAt: '2026-11-01T00:00:00.000Z',
});

describe('album book', () => {
  it('pages each group in 12 slots, keeping two empty, numbering on', () => {
    const fw = Array.from({ length: 11 }, (_, i) => st(i, 'FW'));
    const pages = albumPages([st(99, 'GK'), ...fw]);
    expect(pages.map((p) => [p.key, p.list.length, p.first, p.n])).toEqual([
      ['GK', 1, 1, 1],
      ['DF', 0, 13, 2],
      ['MF', 0, 25, 3],
      ['FW', 11, 37, 4],
      ['FW', 0, 49, 5],
    ]);
  });

  it('wide spreads start with the shut cover and pad to an even count', () => {
    const pages = albumPages([]);
    expect(pages).toHaveLength(4);
    const wide = albumSides(pages, true);
    expect(wide.slice(0, 3)).toEqual(['blank', 'cover', 'inside']);
    expect(wide).toHaveLength(8);
    expect(wide.at(-1)).toBe('end');
    expect(albumSides(pages, false)).toHaveLength(6);
  });

  it('maps a phone side to the spread showing it and back', () => {
    expect([0, 1, 2, 3, 4].map(spreadOf)).toEqual([0, 1, 1, 2, 2]);
    expect([0, 1, 2].map(atOfSpread)).toEqual([0, 1, 3]);
    for (const v of [0, 1, 2, 3]) expect(spreadOf(atOfSpread(v))).toBe(v);
  });
});
