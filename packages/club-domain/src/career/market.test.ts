import { describe, expect, it } from 'vitest';
import { dayOf } from '../competition/calendar';
import { generateDevPack } from '../generate/pack';
import { windowOf, windowOpen, withMoves } from './market';

describe('transfers in the world (07)', () => {
  it("windows: the CBF's first, domestic and second", () => {
    expect(windowOf(dayOf('2026-01-01'))).toBe('first');
    expect(windowOf(dayOf('2026-03-03'))).toBe('first');
    expect(windowOf(dayOf('2026-03-04'))).toBe('domestic');
    expect(windowOf(dayOf('2026-03-27'))).toBe('domestic');
    expect(windowOpen(dayOf('2026-03-28'))).toBe(false);
    expect(windowOpen(dayOf('2026-07-19'))).toBe(false);
    expect(windowOf(dayOf('2026-07-20'))).toBe('second');
    expect(windowOf(dayOf('2026-09-11'))).toBe('second');
    expect(windowOpen(dayOf('2026-09-12'))).toBe(false);
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
