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
  it('no claim at the safe line; claims at 40% with a grudge in some seeds', () => {
    const safe = world(IMAGE_SAFE);
    settleImageClaims(safe.w);
    expect(safe.w.inbox).toBeUndefined();
    let claims = 0;
    for (let seed = 0; seed < 50; seed++) {
      const { w } = world(40, true, seed);
      settleImageClaims(w);
      claims += w.inbox?.length ?? 0;
    }
    expect(claims).toBeGreaterThan(5);
    expect(claims).toBeLessThan(50);
  });
});
