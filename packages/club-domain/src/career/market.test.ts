import { describe, expect, it } from 'vitest';
import { dayOf } from '../competition/calendar';
import { generateDevPack } from '../generate/pack';
import { checkLedger } from '../finance/ledger';
import { nextDecision, openCareer, playDecision } from './advance';
import {
  askingPrice,
  buy,
  offerFor,
  cannotBuy,
  cannotSell,
  marketValue,
  sell,
  windowOpen,
} from './market';
import { loadCareer, saveCareer } from './save';
import { lineupOf, setLineup } from './squad';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const mine = (p: { clubId: string | null }) => p.clubId === clubId;

describe('transfer market (07, corte 1)', () => {
  it('windows: the start of the year to April, and July', () => {
    expect(windowOpen(dayOf('2026-01-15'))).toBe(true);
    expect(windowOpen(dayOf('2026-04-30'))).toBe(true);
    expect(windowOpen(dayOf('2026-05-01'))).toBe(false);
    expect(windowOpen(dayOf('2026-07-31'))).toBe(true);
    expect(windowOpen(dayOf('2026-08-01'))).toBe(false);
  });

  it('a younger player on the same wage is worth more; asking is above, selling below', () => {
    const p = pack.players.find((x) => x.clubId && x.contract)!;
    const young = { ...p, birthDate: '2005-01-01' };
    const old = { ...p, birthDate: '1992-01-01' };
    expect(marketValue(young, 2026)).toBeGreaterThan(marketValue(old, 2026));
    expect(askingPrice(p, 2026)).toBeGreaterThan(marketValue(p, 2026));
    expect(marketValue(p, 2026) % 1000).toBe(0);
  });

  it('selling moves the player, pays the club and gives the eleven back to the coach', () => {
    const w = openCareer(pack, 61, clubId);
    setLineup(w, lineupOf(w));
    const p = w.pack.players.find((x) => mine(x) && lineupOf(w).xi.indexOf(x.id) > 0)!;
    const cash = w.ledger.cash;
    const size = w.pack.players.filter(mine).length;
    expect(cannotSell(w, p)).toBeNull();
    const deal = sell(w, p.id);
    expect(deal).toEqual(offerFor(openCareer(pack, 61, clubId), p));
    expect(deal.fee).toBeLessThan(marketValue(p, 2026));
    expect(w.ledger.cash).toBe(cash + deal.fee);
    expect(checkLedger(w.ledger)).toEqual([]);
    expect(w.pack.players.find((x) => x.id === p.id)!.clubId).toBe(deal.buyer);
    expect(w.pack.players.filter(mine).length).toBe(size - 1);
    expect(w.lineup).toBeUndefined();
    expect(lineupOf(w).xi).not.toContain(p.id);
    // The pack the career was opened with is untouched.
    expect(pack.players.find((x) => x.id === p.id)!.clubId).toBe(clubId);
    expect(() => sell(w, p.id)).toThrow();
  });

  it('buying takes the asking price, raises the wage bill and survives the save', () => {
    const w = openCareer(pack, 61, clubId);
    const target = w.pack.players
      .filter((x) => x.clubId && !mine(x) && cannotBuy(w, x) === null)
      .sort((a, b) => askingPrice(a, 2026) - askingPrice(b, 2026) || (a.id < b.id ? -1 : 1))[0]!;
    const cash = w.ledger.cash;
    const seller = target.clubId!;
    const before = w.strength.get(seller)!;
    buy(w, target.id);
    expect(w.ledger.cash).toBe(cash - askingPrice(target, 2026));
    const moved = w.pack.players.find((x) => x.id === target.id)!;
    expect(moved.clubId).toBe(clubId);
    expect(moved.contract!.wage).toBe(Math.round((target.contract!.wage * 110) / 100));
    expect(w.strength.get(seller)).toBeLessThanOrEqual(before);
    expect(() => buy(w, target.id)).toThrow();

    const again = loadCareer(pack, 61, clubId, saveCareer(w));
    expect(again.pack.players.find((x) => x.id === target.id)!.clubId).toBe(clubId);
    expect(again.ledger.cash).toBe(w.ledger.cash);
    expect(again.strength.get(seller)).toBe(w.strength.get(seller));
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    expect(playDecision(again, nextDecision(again) as typeof d)).toEqual(playDecision(w, d));
  });

  it('a club buys only a player it has a use for, and pays more for a starter', () => {
    const w = openCareer(pack, 61, clubId);
    const squad = w.pack.players.filter(mine);
    const offers = squad.map((p) => ({ p, offer: offerFor(w, p) }));
    const round = (x: number) => Math.round(x / 1000) * 1000;
    for (const { p, offer } of offers) {
      if (!offer) continue;
      const value = marketValue(p, 2026);
      expect([round((value * 90) / 100), round((value * 60) / 100)]).toContain(offer.fee);
    }
    // Selling everyone a club wants is worth well under a year of the squad's wages.
    const wages = squad.reduce((s, p) => s + (p.contract?.wage ?? 0), 0);
    expect(offers.reduce((s, x) => s + (x.offer?.fee ?? 0), 0)).toBeLessThan(wages * 12);
  });

  it('refuses outside the window, without the money and when a squad would be left thin', () => {
    const w = openCareer(pack, 61, clubId);
    const dear = w.pack.players
      .filter((x) => x.clubId && !mine(x))
      .sort((a, b) => askingPrice(b, 2026) - askingPrice(a, 2026))[0]!;
    expect(cannotBuy(w, dear)).toBe('cash');
    expect(() => buy(w, dear.id)).toThrow(/cash/);
    // Sell down to the smallest squad allowed: the next sale is refused.
    for (let guard = 0; guard < 40; guard++) {
      const p = w.pack.players.find((x) => mine(x) && cannotSell(w, x) === null);
      if (!p) break;
      sell(w, p.id);
    }
    // Either the squad reached its floor, or nobody has a use for the players left.
    const left = w.pack.players.filter(mine);
    expect(left.length).toBeGreaterThanOrEqual(20);
    expect(left.every((x) => ['squadThin', 'noBuyer'].includes(cannotSell(w, x)!))).toBe(true);
    // Past April the window is shut.
    while (windowOpen(w.day)) {
      const d = nextDecision(w);
      if (d.kind !== 'match') break;
      playDecision(w, d);
    }
    expect(windowOpen(w.day)).toBe(false);
    expect(cannotBuy(w, dear)).toBe('window');
    expect(cannotSell(w, w.pack.players.find(mine)!)).toBe('window');
  });
});
