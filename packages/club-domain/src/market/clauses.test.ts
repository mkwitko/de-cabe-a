import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { todoOf } from '../career/todo';
import { nationalDivisions } from '../career/start';
import { dayOf } from '../competition/calendar';
import { book } from './books';
import { answerBid, bidTerms, buyBackFor, listPlayer, openBuyBack, openOption } from './talks';
import { borrow, cannotBorrow, listForLoan, returnLoans } from './loans';
import { marketRound } from './rounds';
import { answerRequest, unrestTurn } from './unrest';
import { clausedFee, clausesOf, type SaleClauses } from './clauses';

const pack = generateDevPack();
const ROUND = dayOf('2026-02-16');
const bigId = nationalDivisions(pack)[0]!.clubIds[8]!;
const mine = (p: { clubId: string | null }) => p.clubId === bigId;

/** A career where a bid for one of the person's players is waiting. */
const withBid = (seed: number) => {
  const w = openCareer(pack, seed, bigId);
  for (const p of w.pack.players.filter(mine)) listPlayer(w, p.id, true);
  for (let k = 0; k < 4 && !w.bids?.length; k++) marketRound(w, ROUND + k * 14);
  return w;
};
/** Sells to the first bidder with clauses; the world and the sold player. */
function sold(clauses: SaleClauses) {
  for (let seed = 96; seed < 110; seed++) {
    const w = withBid(seed);
    const bid = w.bids?.[0];
    if (!bid) continue;
    const a = answerBid(w, bid.id, { kind: 'accept', clauses });
    if (a.kind === 'sold')
      return { w, bid, fee: a.fee, p: w.pack.players.find((x) => x.id === bid.player)! };
  }
  throw new Error('no sale');
}

describe('sell-on and buy-back (clauses.ts)', () => {
  it('a sell-on lowers the fee and is paid to the person when the buyer resells', () => {
    const { w, bid, fee, p } = sold({ sellOn: 20 });
    expect(fee).toBe(clausedFee(bid.fee, { sellOn: 20 }));
    expect(fee).toBeLessThan(bid.fee);
    expect(clausesOf(w, p.id)?.sellOn).toEqual({ holder: bigId, pct: 20 });
    const again = loadCareer(pack, 0, bigId, saveCareer(w));
    expect(again.clauses).toEqual(w.clauses);
    const cash = w.ledger.cash;
    const other = w.pack.clubs.find((c) => c.id !== bigId && c.id !== bid.from)!.id;
    book(w, bid.from, other, 50_000_000, p);
    expect(w.ledger.cash).toBe(cash + 10_000_000);
    expect(w.inbox!.some((n) => n.kind === 'sellOn' && n.fee === 10_000_000)).toBe(true);
    // Once: a second resale pays nothing more.
    book(w, other, bid.from, 50_000_000, p);
    expect(w.ledger.cash).toBe(cash + 10_000_000);
  });

  it('a buy-back takes him back at the fixed price, if he accepts', () => {
    const { w, fee, p } = sold({ buyBack: { price: 150, seasons: 2 } });
    const bb = clausesOf(w, p.id)!.buyBack!;
    expect(bb.price).toBe(Math.round((fee * 150) / 100 / 1000) * 1000);
    w.day = ROUND;
    w.ledger.cash = Math.max(w.ledger.cash, bb.price + 1_000_000_000);
    expect(buyBackFor(w, p)).toEqual({ price: bb.price, no: null });
    const talk = openBuyBack(w, p.id);
    expect(talk).toMatchObject({ stage: 'terms', fee: bb.price });
    const cash = w.ledger.cash;
    expect(bidTerms(w, p.id, talk.wants!).kind).toBe('accept');
    expect(w.pack.players.find((x) => x.id === p.id)!.clubId).toBe(bigId);
    expect(w.ledger.cash).toBeLessThan(cash - bb.price + 1);
    expect(clausesOf(w, p.id)).toBeUndefined();
  });
});

describe('loans with a purchase clause', () => {
  const loanable = (seed: number) => {
    const w = openCareer(pack, seed, bigId);
    w.day = ROUND;
    const p = w.pack.players.find(
      (x) => x.clubId && !mine(x) && cannotBorrow(w, x, bigId) === null,
    )!;
    return { w, p };
  };

  it('the person borrows with an option and buys through a talk', () => {
    const { w, p } = loanable(99);
    borrow(w, p.id, 'option');
    const opt = w.loans![p.id]!.option!;
    expect(opt.kind).toBe('option');
    w.ledger.cash += opt.price;
    const talk = openOption(w, p.id);
    expect(talk.fee).toBe(opt.price);
    expect(bidTerms(w, p.id, talk.wants!).kind).toBe('accept');
    expect(w.loans?.[p.id]).toBeUndefined();
  });

  it('an obligation met by starts is bought at the end of the loan', () => {
    const { w, p } = loanable(99);
    borrow(w, p.id, 'obligation');
    const price = w.loans![p.id]!.option!.price;
    w.starts = { [p.id]: 15 };
    const cash = w.ledger.cash;
    returnLoans(w);
    expect(w.pack.players.find((x) => x.id === p.id)!.clubId).toBe(bigId);
    expect(w.ledger.cash).toBe(cash - price);
    expect(w.inbox!.some((n) => n.kind === 'optionBought')).toBe(true);
  });

  it('the AI borrower takes up its option for a player who started for it', () => {
    let done = 0;
    for (let seed = 90; seed < 96 && !done; seed++) {
      const w = openCareer(pack, seed, bigId);
      for (const p of w.pack.players.filter(mine)) listForLoan(w, p.id, true, 'option');
      for (let k = 0; k < 4; k++) marketRound(w, ROUND + k * 14);
      // Budgets here are small beside a starter's value: make the price one a club can pay.
      for (const l of Object.values(w.loans ?? {})) if (l.option) l.option.price = 1000;
      const cash = w.ledger.cash;
      returnLoans(w);
      done += (w.inbox ?? []).filter((n) => n.kind === 'optionSold').length;
      if (done) expect(w.ledger.cash).toBeGreaterThan(cash);
    }
    expect(done).toBeGreaterThan(0);
  });
});

describe('unhappy players (unrest.ts)', () => {
  it('a benched starter grows unhappy, asks to leave, and the answer is remembered', () => {
    const w = openCareer(pack, 7, bigId);
    w.played = 20;
    w.starts = {};
    w.day = ROUND;
    unrestTurn(w, w.day);
    expect(Object.keys(w.unhappy ?? {}).length).toBeGreaterThan(0);
    expect(w.inbox!.some((n) => n.kind === 'unhappy')).toBe(true);
    unrestTurn(w, w.day + 61);
    const asked = Object.entries(w.unhappy!).filter(([, u]) => u.asked);
    expect(asked.length).toBeGreaterThan(0);
    expect(todoOf(w).some((t) => t.kind === 'leaveRequest')).toBe(true);
    const [a, b] = asked.map(([id]) => id);
    answerRequest(w, a!, 'promise');
    expect(w.unhappy![a!]!.promise).toBeDefined();
    // Nothing started for him in the next matches: the promise is broken and he asks again.
    w.played = 30;
    unrestTurn(w, w.day + 90);
    expect(w.unhappy![a!]).toMatchObject({ asked: true, grudge: 1 });
    expect(() => answerRequest(w, a!, 'promise')).toThrow();
    answerRequest(w, a!, 'refuse');
    expect(w.unhappy![a!]!.grudge).toBe(2);
    if (b) {
      answerRequest(w, b, 'list');
      expect(w.listed).toContain(b);
      expect(w.unhappy?.[b]).toBeUndefined();
    }
    const again = loadCareer(pack, 7, bigId, saveCareer(w));
    expect(again.unhappy).toEqual(w.unhappy);
  });
});
