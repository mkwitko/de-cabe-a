/**
 * Club ledger (04 §4.1, MC-175): the only source of a club's money. Cash is the sum of the
 * entries already due; there is no balance stored anywhere else. Entries never change: a
 * correction is a new entry that reverses an old one. Pure and exact (integers only, ADR-020),
 * so the browser career and the server replay give the same cash.
 */

export interface LedgerEntry {
  /** Idempotency key, unique in the ledger: posting the same key twice changes nothing. */
  key: string;
  /** tv, prize, tickets, wage, transfer, reversal… (04 §4.2–4.3). */
  kind: string;
  /** What caused it (match, contract, sale…): no entry without an origin. */
  ref: string;
  /** Whole reais, signed: positive comes in, negative goes out. */
  amount: number;
  /** Competence day: when it counts for the season's result. */
  day: number;
  /** Day the money moves; cash includes it from this day on. A receivable or a debt until then. */
  dueDay: number;
  /** Key of the entry this one reverses. */
  reverses?: string;
}

export interface Ledger {
  entries: LedgerEntry[];
  /** Day the cash cache is valid for. */
  today: number;
  /**
   * Derived cache, never a source: sum of the entries due by `today`. `checkLedger` recomputes
   * it; the world document does not store it (it is rebuilt on load).
   */
  cash: number;
  /** Not yet due, sorted by dueDay: what `advanceLedger` adds to the cash. */
  pending: LedgerEntry[];
  keys: Map<string, LedgerEntry>;
}

export function createLedger(today: number, entries: LedgerEntry[] = []): Ledger {
  const l: Ledger = { entries: [], today, cash: 0, pending: [], keys: new Map() };
  for (const e of entries) postEntry(l, e);
  return l;
}

const same = (a: LedgerEntry, b: LedgerEntry) =>
  a.kind === b.kind &&
  a.ref === b.ref &&
  a.amount === b.amount &&
  a.day === b.day &&
  a.dueDay === b.dueDay &&
  a.reverses === b.reverses;

/**
 * Adds an entry. The same key with the same content is a retry and changes nothing (returns
 * false); the same key with other content is an error, as is an entry without origin or with a
 * fraction of a real.
 */
export function postEntry(l: Ledger, e: LedgerEntry): boolean {
  const seen = l.keys.get(e.key);
  if (seen) {
    if (same(seen, e)) return false;
    throw new Error(`ledger: key ${e.key} already used with other content`);
  }
  if (!e.ref) throw new Error(`ledger: ${e.key} has no origin`);
  if (!Number.isSafeInteger(e.amount)) throw new Error(`ledger: ${e.key} is not whole reais`);
  if (e.reverses !== undefined) {
    const target = l.keys.get(e.reverses);
    if (!target) throw new Error(`ledger: ${e.key} reverses unknown ${e.reverses}`);
    if (e.amount !== -target.amount) throw new Error(`ledger: ${e.key} must cancel ${e.reverses}`);
    if (l.entries.some((x) => x.reverses === e.reverses))
      throw new Error(`ledger: ${e.reverses} already reversed`);
  }
  const entry = { ...e };
  l.entries.push(entry);
  l.keys.set(entry.key, entry);
  if (entry.dueDay <= l.today) l.cash += entry.amount;
  else {
    // Sorted insert: entries arrive mostly in day order, so this is near the end.
    let i = l.pending.length;
    while (i > 0 && l.pending[i - 1]!.dueDay > entry.dueDay) i--;
    l.pending.splice(i, 0, entry);
  }
  return true;
}

/** Cancels an entry with a new one (never an edit). */
export function reverseEntry(l: Ledger, key: string, newKey: string, day: number): boolean {
  const target = l.keys.get(key);
  if (!target) throw new Error(`ledger: unknown ${key}`);
  return postEntry(l, {
    key: newKey,
    kind: 'reversal',
    ref: target.ref,
    amount: -target.amount,
    day,
    // Still pending: cancel on the same due day; already paid: give back from today.
    dueDay: Math.max(day, target.dueDay),
    reverses: key,
  });
}

/** Moves the cash to `day`: entries falling due in between enter the cash. */
export function advanceLedger(l: Ledger, day: number): void {
  if (day < l.today) throw new Error('ledger: time only moves forward');
  let n = 0;
  while (n < l.pending.length && l.pending[n]!.dueDay <= day) l.cash += l.pending[n++]!.amount;
  l.pending.splice(0, n);
  l.today = day;
}

/** Receivable and payable: entries not yet due. */
export function openItems(l: Ledger): { receivable: number; payable: number } {
  let receivable = 0;
  let payable = 0;
  for (const e of l.pending) {
    if (e.amount > 0) receivable += e.amount;
    else payable -= e.amount;
  }
  return { receivable, payable };
}

/** Result by competence between two days (inclusive), by kind: the season's accounts. */
export function resultBetween(l: Ledger, from: number, to: number) {
  const byKind: Record<string, number> = {};
  let income = 0;
  let expense = 0;
  for (const e of l.entries) {
    if (e.day < from || e.day > to) continue;
    byKind[e.kind] = (byKind[e.kind] ?? 0) + e.amount;
    if (e.amount > 0) income += e.amount;
    else expense -= e.amount;
  }
  return { income, expense, result: income - expense, byKind };
}

/** Recomputes the cash from the entries; differs from the cache only if something is broken. */
export function cashFromEntries(l: Ledger): number {
  let sum = 0;
  for (const e of l.entries) if (e.dueDay <= l.today) sum += e.amount;
  return sum;
}

export function checkLedger(l: Ledger): string[] {
  const problems: string[] = [];
  const sum = cashFromEntries(l);
  if (sum !== l.cash) problems.push(`cash cache ${l.cash} differs from the sum ${sum}`);
  if (new Set(l.entries.map((e) => e.key)).size !== l.entries.length) problems.push('repeated key');
  for (const e of l.entries) if (!e.ref) problems.push(`${e.key} has no origin`);
  return problems;
}
