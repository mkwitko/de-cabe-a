import { describe, expect, it } from 'vitest';
import { next, rngFrom } from '@decabeca/match-engine';
import {
  advanceLedger,
  cashFromEntries,
  checkLedger,
  createLedger,
  openItems,
  postEntry,
  resultBetween,
  reverseEntry,
  type LedgerEntry,
} from './ledger';

const e = (
  key: string,
  amount: number,
  day: number,
  dueDay = day,
  kind = 'tickets',
): LedgerEntry => ({
  key,
  kind,
  ref: `match-${key}`,
  amount,
  day,
  dueDay,
});

describe('club ledger (MC-175)', () => {
  it('cash is the sum of what is due, at every advance, over a random season', () => {
    const r = rngFrom(42);
    const l = createLedger(0, [e('start', 5_000_000, 0)]);
    for (let day = 1; day <= 365; day++) {
      for (let k = 0; k < 4; k++) {
        const amount = Math.round((next(r) - 0.55) * 400_000);
        const due = day + Math.floor(next(r) * 3) * 30; // now, in 30 or in 60 days
        postEntry(l, e(`d${day}k${k}`, amount, day, due));
        // A retry of the same entry changes nothing.
        expect(postEntry(l, e(`d${day}k${k}`, amount, day, due))).toBe(false);
      }
      advanceLedger(l, day);
      expect(l.cash).toBe(cashFromEntries(l));
    }
    expect(checkLedger(l)).toEqual([]);
    const { receivable, payable } = openItems(l);
    const all = l.entries.reduce((s, x) => s + x.amount, 0);
    expect(l.cash + receivable - payable).toBe(all);
  });

  it('a sale in instalments counts for the result at once and enters the cash part by part', () => {
    const l = createLedger(10);
    [0, 1, 2].forEach((i) => postEntry(l, e(`sale-${i}`, 1_000_000, 10, 10 + i * 90, 'transfer')));
    expect(l.cash).toBe(1_000_000);
    expect(openItems(l).receivable).toBe(2_000_000);
    expect(resultBetween(l, 0, 30).byKind.transfer).toBe(3_000_000);
    advanceLedger(l, 100);
    expect(l.cash).toBe(2_000_000);
  });

  it('a correction is a new entry that cancels the old one, once', () => {
    const l = createLedger(5, [e('bonus', -200_000, 5)]);
    reverseEntry(l, 'bonus', 'bonus-undo', 6);
    expect(l.cash).toBe(-200_000); // the reversal is due on day 6
    advanceLedger(l, 6);
    expect(l.cash).toBe(0);
    expect(l.entries).toHaveLength(2);
    expect(() => reverseEntry(l, 'bonus', 'bonus-undo-2', 7)).toThrow(/already reversed/);
  });

  it('refuses a reused key with other content, an entry without origin and fractions of a real', () => {
    const l = createLedger(0, [e('a', 100, 0)]);
    expect(() => postEntry(l, e('a', 101, 0))).toThrow(/other content/);
    expect(() => postEntry(l, { ...e('b', 1, 0), ref: '' })).toThrow(/origin/);
    expect(() => postEntry(l, e('c', 0.5, 0))).toThrow(/whole reais/);
    expect(() => advanceLedger(l, -1)).toThrow(/forward/);
  });

  it('the check finds a cache that drifted from the entries', () => {
    const l = createLedger(0, [e('a', 100, 0)]);
    l.cash += 1;
    expect(checkLedger(l)).toEqual(['cash cache 101 differs from the sum 100']);
  });
});
