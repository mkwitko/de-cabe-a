import { describe, expect, it } from 'vitest';
import { dayOf } from '../competition/calendar';
import { generateDevPack } from '../generate/pack';
import { checkLedger } from '../finance/ledger';
import { nextDecision, openCareer, playDecision } from './advance';
import {
  askingPrice,
  buy,
  buyerFor,
  cannotBuy,
  cannotSell,
  marketValue,
  sell,
  sellingPrice,
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
    expect(sellingPrice(p, 2026)).toBeLessThan(marketValue(p, 2026));
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
    expect(deal).toEqual({
      buyer: buyerFor(openCareer(pack, 61, clubId), p),
      fee: sellingPrice(p, 2026),
    });
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
    expect(w.pack.players.filter(mine).length).toBe(20);
    expect(cannotSell(w, w.pack.players.find(mine)!)).toBe('squadThin');
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
