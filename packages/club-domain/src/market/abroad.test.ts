import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers } from '../career/start';
import { dayOf } from '../competition/calendar';
import { ABROAD, foreignRound, isAbroad } from './abroad';
import { booksOf } from './books';
import { roundsBetween } from './rounds';
import { cannotTalk } from './talks';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const SEASON = roundsBetween(dayOf('2026-01-01'), dayOf('2026-04-30')).concat(
  roundsBetween(dayOf('2026-07-01'), dayOf('2026-07-31')),
);

describe('the exodus abroad', () => {
  it('foreign clubs buy from the world, pay its clubs and take the player out of reach', () => {
    const w = openCareer(pack, 91, clubId);
    const deals = SEASON.flatMap((d) => foreignRound(w, d));
    expect(deals.length).toBeGreaterThan(5);
    for (const d of deals) {
      expect(isAbroad(d.to)).toBe(true);
      expect(d.from).not.toBe(clubId);
      const p = w.pack.players.find((x) => x.id === d.player)!;
      expect(p.clubId).toBe(ABROAD);
      expect(cannotTalk(w, p)).toBe('abroad');
      expect(booksOf(w, d.from!).earned).toBeGreaterThanOrEqual(d.fee);
    }
    // The person's club gets bids to answer, never a sale behind its back.
    expect(w.pack.players.filter((p) => p.clubId === clubId).length).toBe(
      pack.players.filter((p) => p.clubId === clubId).length,
    );
    for (const b of w.bids ?? []) expect(isAbroad(b.from)).toBe(true);
  });

  it('is the same for the same seed, and a save keeps who went abroad', () => {
    const a = openCareer(pack, 91, clubId);
    const b = openCareer(pack, 91, clubId);
    const da = SEASON.flatMap((d) => foreignRound(a, d));
    const db = SEASON.flatMap((d) => foreignRound(b, d));
    expect(db).toEqual(da);
    const back = loadCareer(pack, 91, clubId, saveCareer(a));
    for (const d of da)
      expect(back.pack.players.find((p) => p.id === d.player)!.clubId).toBe(ABROAD);
  });
});
