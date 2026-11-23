import { describe, expect, it } from 'vitest';
import { IMAGE_SAFE, settleImageClaims, usualShare, wageCost } from './image';
import { createLedger } from '../finance/ledger';
import type { CareerWorld } from '../career/advance';

const world = (share: number, bad = false, seed = 7) => {
  const p = { id: 'p1', name: 'A', clubId: 'c', contract: { wage: 200_000 } };
  const w = {
    seed,
    clubId: 'c',
    day: 1,
    season: { season: 2026 },
    ledger: createLedger(1, []),
    pack: { players: [p] },
    image: { p1: { club: 'c', share, wage: 200_000, bad } },
  } as unknown as CareerWorld;
  return { w, p: p as never };
};

describe('image rights', () => {
  it('usual share rises with wage', () => {
    expect(usualShare(10_000)).toBe(0);
    expect(usualShare(300_000)).toBe(30);
  });
  it('the share lowers the cost by the saved charges (22% of the share)', () => {
    const { w, p } = world(40);
    expect(wageCost(w, p)).toBe(200_000 - 17_600);
  });
  it('claims grow with the share: none at 10%, some at 30%, more at 40% with a grudge', () => {
    const count = (share: number, bad = false) => {
      let claims = 0;
      for (let seed = 0; seed < 200; seed++) {
        const { w } = world(share, bad, seed);
        settleImageClaims(w);
        claims += (w.inbox ?? []).filter((n) => n.kind === 'imageClaim').length;
      }
      return claims;
    };
    expect(count(10)).toBe(0);
    expect(count(IMAGE_SAFE)).toBeGreaterThan(0);
    expect(count(40, true)).toBeGreaterThan(count(IMAGE_SAFE));
  });
});
