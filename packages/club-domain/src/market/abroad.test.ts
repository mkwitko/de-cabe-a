import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers } from '../career/start';
import { dayOf } from '../competition/calendar';
import { ABROAD, foreignRound, homecoming, isAbroad } from './abroad';
import { booksOf } from './books';
import { roundsBetween } from './rounds';
import { cannotTalk } from './talks';

const pack = generateDevPack();
/** The first market round (every 14 days) on or after a date. */
const firstRound = (year: number, md: string) => Math.ceil(dayOf(`${year}-${md}`) / 14) * 14;
const clubId = jobOffers(pack, 5)[0]!.clubId;
const SEASON = roundsBetween(dayOf('2026-01-01'), dayOf('2026-03-31')).concat(
  roundsBetween(dayOf('2026-07-15'), dayOf('2026-09-15')),
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
      pack.players.filter((p) => p.clubId === clubId).length + (w.academy?.length ?? 0),
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

  it('players come home from their second season, to a club here that needs them', () => {
    const w = openCareer(pack, 91, clubId);
    const gone = new Set(SEASON.flatMap((d) => foreignRound(w, d)).map((d) => d.player));
    // The same season: nobody turns round at once.
    expect(homecoming(w, SEASON.at(-4)!)).toEqual([]);
    // Ten years on, in the January and July windows.
    w.season = { ...w.season, season: 2036 };
    const back = [];
    for (let y = 0; y < 3; y++)
      for (const day of [firstRound(2036 + y, '01-05'), firstRound(2036 + y, '07-20')])
        back.push(...homecoming(w, day));
    expect(back.length).toBeGreaterThan(0);
    for (const d of back) {
      expect(gone.has(d.player)).toBe(true);
      expect(d.from).toBe(ABROAD);
      expect(d.to).not.toBe(clubId);
      expect(w.pack.players.find((p) => p.id === d.player)!.clubId).toBe(d.to);
    }
    // Outside a window's opening fortnight, nobody.
    expect(homecoming(w, firstRound(2036, '01-05') + 14)).toEqual([]);
  });
});
