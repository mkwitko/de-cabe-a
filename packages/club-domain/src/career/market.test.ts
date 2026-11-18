import { describe, expect, it } from 'vitest';
import { dayOf } from '../competition/calendar';
import { generateDevPack } from '../generate/pack';
import { windowOpen, withMoves } from './market';

describe('transfers in the world (07)', () => {
  it('windows: the start of the year to April, and July', () => {
    expect(windowOpen(dayOf('2026-01-15'))).toBe(true);
    expect(windowOpen(dayOf('2026-04-30'))).toBe(true);
    expect(windowOpen(dayOf('2026-05-01'))).toBe(false);
    expect(windowOpen(dayOf('2026-07-31'))).toBe(true);
    expect(windowOpen(dayOf('2026-08-01'))).toBe(false);
  });

  it('a move gives a new pack and leaves the one it came from untouched', () => {
    const pack = generateDevPack();
    const p = pack.players.find((x) => x.clubId)!;
    const to = pack.clubs.find((c) => c.id !== p.clubId)!.id;
    const moved = withMoves(pack, { [p.id]: { clubId: to, wage: 1234, until: '2029-12-31' } });
    expect(moved).not.toBe(pack);
    expect(moved.players.find((x) => x.id === p.id)).toMatchObject({
      clubId: to,
      contract: { wage: 1234, until: '2029-12-31', releaseFee: null },
    });
    expect(pack.players.find((x) => x.id === p.id)!.clubId).toBe(p.clubId);
    expect(withMoves(pack, {})).toBe(pack);
  });
});
