import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers } from '../career/start';
import { available, budgetOf, wageRoom } from './books';
import { marketRound, roundsBetween } from './rounds';
import { marketValue, readingsOf } from './value';
import { dayOf } from '../competition/calendar';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const ROUND = dayOf('2026-04-16');

describe('the market between clubs (07 §6, 04 §8)', () => {
  it('rounds fall every fourteen days inside a window and nowhere else', () => {
    const april = roundsBetween(dayOf('2026-04-01'), dayOf('2026-04-30'));
    expect(april.length).toBe(2);
    expect(april.every((d) => d % 14 === 0)).toBe(true);
    expect(roundsBetween(dayOf('2026-05-02'), dayOf('2026-06-28'))).toEqual([]);
    // The turn of the year plays its last four rounds, not every one since December.
    expect(roundsBetween(dayOf('2026-12-06'), dayOf('2027-04-05')).length).toBe(4);
  });

  it('clubs buy for a need, inside their budget, and nobody is left short', () => {
    const w = openCareer(pack, 91, clubId);
    const before = new Map(pack.players.map((p) => [p.id, p.clubId]));
    const deals = [0, 14, 28, 42].flatMap((k) => marketRound(w, ROUND + k));
    expect(deals.length).toBeGreaterThan(20);
    const read = readingsOf(w.pack);
    for (const c of pack.clubs) {
      const squad = w.pack.players.filter((p) => p.clubId === c.id);
      expect(squad.length).toBeGreaterThanOrEqual(20);
      expect(squad.length).toBeLessThanOrEqual(35);
      expect(squad.filter((p) => read.get(p.id)!.keeper).length).toBeGreaterThanOrEqual(2);
      expect(available(w, c.id)).toBeGreaterThanOrEqual(0);
      expect(deals.filter((d) => d.to === c.id).length).toBeLessThanOrEqual(4);
    }
    for (const d of deals) {
      expect(before.get(d.player)).toBe(d.from);
      // Nobody of the person's club is taken without asking, and the person buys for themselves.
      expect([d.from, d.to]).not.toContain(clubId);
      expect(d.why.need).toBeGreaterThanOrEqual(14);
      expect(
        d.why.need + d.why.fit + d.why.growth + d.why.resale - d.why.cost - d.why.wages,
      ).toBeGreaterThanOrEqual(36);
      expect(d.fee).toBeLessThanOrEqual(budgetOf(w, d.to).transfer * 2);
      // The fee stays in reach of what he is worth: from a spare's discount to a key man's premium.
      const value = marketValue(
        pack,
        pack.players.find((p) => p.id === d.player)!,
        2026,
      );
      expect(d.fee).toBeGreaterThanOrEqual(value * 0.55);
      expect(d.fee).toBeLessThanOrEqual(value * 2.1);
    }
    // A player moves once in a season.
    expect(new Set(deals.map((d) => d.player)).size).toBe(deals.length);
    expect(w.deals!.length).toBe(Math.min(80, deals.length));
    expect(pack.clubs.some((c) => wageRoom(w, c.id) < 0)).toBe(false);
  });

  it('the same world gives the same market, and a loaded snapshot goes on the same', () => {
    const a = openCareer(pack, 92, clubId);
    const b = openCareer(pack, 92, clubId);
    expect(marketRound(a, ROUND)).toEqual(marketRound(b, ROUND));
    const c = openCareer(pack, 93, clubId);
    expect(marketRound(c, ROUND).map((d) => d.player)).not.toEqual(a.deals!.map((d) => d.player));

    const w = openCareer(pack, 92, clubId);
    for (let i = 0; i < 3; i++) {
      const d = nextDecision(w);
      if (d.kind !== 'match') throw new Error('no match');
      playDecision(w, d);
    }
    expect(w.deals!.length).toBeGreaterThan(0);
    const again = loadCareer(pack, 92, clubId, saveCareer(w));
    expect(again.deals).toEqual(w.deals);
    expect(again.books).toEqual(w.books);
    expect(again.strength).toEqual(w.strength);
    for (let i = 0; i < 4; i++) {
      const d = nextDecision(w);
      if (d.kind !== 'match') throw new Error('no match');
      expect(playDecision(again, nextDecision(again) as typeof d)).toEqual(playDecision(w, d));
    }
    expect(again.deals).toEqual(w.deals);
  });
});
