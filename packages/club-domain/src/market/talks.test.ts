import { describe, expect, it } from 'vitest';
import { dayOf } from '../competition/calendar';
import { checkLedger } from '../finance/ledger';
import { generateDevPack } from '../generate/pack';
import { openCareer, type CareerWorld } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers, nationalDivisions } from '../career/start';
import { sellerStance } from './deals';
import { marketRound } from './rounds';
import { answerBid, bidFee, bidTerms, cannotTalk, listPlayer, openTalk } from './talks';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const ROUND = dayOf('2026-04-16');
const mine = (p: { clubId: string | null }) => p.clubId === clubId;

/** A player the person can open a talk for and afford at the asking price. */
const target = (w: CareerWorld) =>
  w.pack.players
    .filter((p) => p.clubId && !mine(p) && cannotTalk(w, p) === null)
    .map((p) => ({ p, s: sellerStance({ pack: w.pack, clubId: p.clubId! }, p, clubId, 2026) }))
    .filter((x) => x.s.asking <= w.ledger.cash && x.s.floor > 0)
    .sort((a, b) => b.s.asking - a.s.asking || (a.p.id < b.p.id ? -1 : 1))[0]!;

describe('the person buys at two tables', () => {
  it('the club counters down toward its floor and takes the fee that reaches it', () => {
    const w = openCareer(pack, 95, clubId);
    const { p, s } = target(w);
    const talk = openTalk(w, p.id);
    expect(talk).toMatchObject({ stage: 'fee', asking: s.asking, mood: s.mood, round: 0 });
    const low = Math.round((s.floor * 0.8) / 1000) * 1000;
    const first = bidFee(w, p.id, low);
    expect(first.kind).toBe('counter');
    expect(w.talks![p.id]!.asking).toBeLessThan(s.asking);
    expect(w.talks![p.id]!.asking).toBeGreaterThanOrEqual(s.floor);
    expect(bidFee(w, p.id, s.floor)).toEqual({ kind: 'accept', fee: s.floor });
    expect(w.talks![p.id]).toMatchObject({ stage: 'terms', fee: s.floor, round: 0 });
    // Nothing is paid until the player signs.
    expect(w.pack.players.find((x) => x.id === p.id)!.clubId).toBe(p.clubId);
    expect(w.ledger.entries.some((e) => e.kind === 'transfers')).toBe(false);
  });

  it('the contract closes the deal: fee paid, player moved, both clubs booked', () => {
    const w = openCareer(pack, 95, clubId);
    const { p, s } = target(w);
    openTalk(w, p.id);
    bidFee(w, p.id, s.asking);
    const wants = w.talks![p.id]!.wants!;
    const cash = w.ledger.cash;
    // A low wage draws a counter under his opening ask; his ask is always enough.
    const counter = bidTerms(w, p.id, { ...wants, wage: Math.round(wants.wage * 0.7) });
    expect(counter.kind).toBe('counter');
    const ask = w.talks![p.id]!.wants!;
    expect(ask.wage).toBeLessThanOrEqual(wants.wage);
    expect(bidTerms(w, p.id, ask)).toEqual({ kind: 'accept', terms: ask });
    const moved = w.pack.players.find((x) => x.id === p.id)!;
    expect(moved.clubId).toBe(clubId);
    expect(moved.contract).toMatchObject({ wage: ask.wage, until: `${2026 + ask.years}-12-31` });
    expect(w.ledger.cash).toBe(cash - s.asking);
    expect(checkLedger(w.ledger)).toEqual([]);
    expect(w.talks![p.id]).toBeUndefined();
    expect(w.books![p.clubId!]!.earned).toBe(s.asking);
    expect(w.inbox!.at(-1)).toMatchObject({ kind: 'bought', fee: s.asking });
    expect(cannotTalk(w, moved)).not.toBeNull();
  });

  it('an offer over the cash is not made at all', () => {
    const w = openCareer(pack, 95, clubId);
    const { p } = target(w);
    openTalk(w, p.id);
    expect(() => bidFee(w, p.id, w.ledger.cash + 1000)).toThrow(/cash/);
    expect(w.talks![p.id]).toMatchObject({ stage: 'fee', round: 0 });
  });

  it('an insulting offer shuts the door for the season; talks survive the save', () => {
    const w = openCareer(pack, 95, clubId);
    const { p, s } = target(w);
    openTalk(w, p.id);
    const again = loadCareer(pack, 95, clubId, saveCareer(w));
    expect(again.talks).toEqual(w.talks);
    expect(bidFee(w, p.id, Math.floor(s.floor / 3))).toEqual({ kind: 'refuse', reason: 'insult' });
    expect(w.talks![p.id]).toBeUndefined();
    expect(cannotTalk(w, p)).toBe('cold');
    expect(() => openTalk(w, p.id)).toThrow(/cold/);
  });
});

describe("other clubs bid for the person's players", () => {
  // A first-division club: its players are wanted. The weakest club's are not.
  const bigId = nationalDivisions(pack)[0]!.clubIds[3]!;
  const mine = (p: { clubId: string | null }) => p.clubId === bigId;
  /** Rounds until a bid lands, listing the whole squad to draw one. */
  const withBid = (seed: number) => {
    const w = openCareer(pack, seed, bigId);
    for (const p of w.pack.players.filter(mine)) listPlayer(w, p.id, true);
    for (let k = 0; k < 4 && !w.bids?.length; k++) marketRound(w, ROUND + k * 14);
    return w;
  };

  it("a bid arrives in the inbox and waits; nobody is taken without the person's yes", () => {
    const w = withBid(96);
    expect(w.bids!.length).toBeGreaterThan(0);
    const bid = w.bids![0]!;
    expect(w.pack.players.find((p) => p.id === bid.player)!.clubId).toBe(bigId);
    expect(w.inbox!.some((n) => n.kind === 'bid' && n.fee === bid.fee)).toBe(true);
    expect(bid.fee).toBeLessThanOrEqual(bid.most);
    expect(new Set(w.bids!.map((b) => b.player)).size).toBe(w.bids!.length);
  });

  it("accepting sells him: the fee comes in and the buyer's budget pays", () => {
    const w = withBid(96);
    const bid = w.bids![0]!;
    const cash = w.ledger.cash;
    const a = answerBid(w, bid.id, { kind: 'accept' });
    if (a.kind === 'withdrawn') {
      // The player said no: the bid is gone and that club does not come back for him.
      expect(w.bids!.some((b) => b.id === bid.id)).toBe(false);
      expect(w.cold![`${bid.from}:${bid.player}`]).toBe(2026);
      return;
    }
    expect(a).toEqual({ kind: 'sold', fee: bid.fee });
    expect(w.ledger.cash).toBe(cash + bid.fee);
    expect(w.pack.players.find((p) => p.id === bid.player)!.clubId).toBe(bid.from);
    expect(w.books![bid.from]!.spent).toBeGreaterThanOrEqual(bid.fee);
    expect(w.deals!.at(-1)).toMatchObject({ player: bid.player, from: bigId, to: bid.from });
    expect(w.listed).not.toContain(bid.player);
  });

  it("a counter inside the club's limit sells at that price; past it the club comes half-way, then leaves", () => {
    const w = withBid(96);
    const bid = w.bids![0]!;
    if (bid.most > bid.fee) {
      const a = answerBid(w, bid.id, { kind: 'counter', fee: bid.most });
      expect(['sold', 'withdrawn']).toContain(a.kind);
      if (a.kind === 'sold') expect(a.fee).toBe(bid.most);
    }
    const v = withBid(96);
    const b = v.bids![0]!;
    const raised = answerBid(v, b.id, { kind: 'counter', fee: b.most * 3 + 1000 });
    if (b.most > b.fee) {
      expect(raised.kind).toBe('raised');
      expect(v.bids!.find((x) => x.id === b.id)!.fee).toBeGreaterThan(b.fee);
    } else expect(raised).toEqual({ kind: 'withdrawn', reason: 'tooDear' });
    expect(answerBid(withBid(96), b.id, { kind: 'refuse' })).toEqual({
      kind: 'withdrawn',
      reason: 'tooDear',
    });
  });

  it('bids expire after two weeks', () => {
    const w = withBid(96);
    const day = w.bids![0]!.day;
    marketRound(w, day + 21);
    expect(w.bids!.every((b) => b.day > day)).toBe(true);
  });
});
