import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nationalDivisions } from '../career/start';
import { MAX_ROUNDS, answerFee, answerTerms, fairRole, playerStance, sellerStance } from './deals';
import { planOf } from './plan';
import { ageOf, goingWage, goingWages, levelIn, marketValue, readingsOf } from './value';

const pack = generateDevPack();
const divs = nationalDivisions(pack);
const top = divs[0]!.clubIds[0]!;
const low = divs.at(-1)!.clubIds[0]!;
const club = (id: string) => pack.clubs.find((c) => c.id === id)!;
const squad = (id: string) => pack.players.filter((p) => p.clubId === id);
const read = readingsOf(pack);

describe('value (07 §1)', () => {
  it('the going wage never falls as the level rises, and follows the pack', () => {
    const table = goingWages(pack);
    for (let l = 1; l < 100; l++) expect(table[l]).toBeGreaterThanOrEqual(table[l - 1]!);
    expect(goingWage(pack, 80)).toBeGreaterThan(goingWage(pack, 40) * 5);
  });

  it('youth, room to grow and a long contract raise the value; none of them alone sets it', () => {
    const p = squad(top).find((x) => ageOf(x, 2026) >= 25 && ageOf(x, 2026) <= 27)!;
    const value = marketValue(pack, p, 2026);
    const one = (x: typeof p) => marketValue({ ...pack, players: [x] }, x, 2026);
    expect(value % 1000).toBe(0);
    expect(one({ ...p, birthDate: '2006-01-01' })).toBeGreaterThan(
      one({ ...p, birthDate: '1993-01-01' }),
    );
    expect(one({ ...p, contract: { ...p.contract!, until: '2026-12-31' } })).toBeLessThan(
      one({ ...p, contract: { ...p.contract!, until: '2030-12-31' } }),
    );
    const grown = { technical: 99, mental: 99, physical: 99 };
    const kid = { ...p, birthDate: '2006-01-01' };
    expect(one({ ...kid, potential: { ...p.potential, ceiling: grown } })).toBeGreaterThan(
      one(kid),
    );
  });

  it('a young player is expected to rise, an old one to slide', () => {
    const young = pack.players.find(
      (x) => ageOf(x, 2026) <= 20 && read.get(x.id)!.ceiling > read.get(x.id)!.level + 5,
    )!;
    const old = pack.players.find((x) => ageOf(x, 2026) >= 33)!;
    expect(levelIn(pack, young, 2026, 3)).toBeGreaterThan(read.get(young.id)!.level);
    expect(levelIn(pack, old, 2026, 3)).toBeLessThan(read.get(old.id)!.level);
  });
});

describe('squad plan (04 §8.1)', () => {
  it('names an eleven, its cover and what is left over, for every club', () => {
    for (const c of pack.clubs) {
      const plan = planOf({ pack, clubId: c.id });
      expect(new Set(plan.xi).size).toBe(11);
      const covering = plan.cover.filter((x): x is string => x !== null);
      expect(new Set(covering).size).toBe(covering.length);
      expect(covering.some((id) => plan.xi.includes(id))).toBe(false);
      expect(plan.surplus.some((id) => plan.xi.includes(id) || covering.includes(id))).toBe(false);
      expect(plan.xi.length + covering.length + plan.surplus.length).toBe(squad(c.id).length);
      for (const n of plan.needs) expect(n.urgency).toBeGreaterThan(0);
    }
  });

  it('a slot emptied of its cover becomes a need', () => {
    const plan = planOf({ pack, clubId: top });
    const slot = plan.cover.findIndex((x) => x !== null);
    const without = { ...pack, players: pack.players.filter((p) => p.id !== plan.cover[slot]) };
    const after = planOf({ pack: without, clubId: top });
    // Another reserve may step in; if none does, the need appears.
    if (after.cover[slot] === null)
      expect(after.needs.some((n) => n.slot === slot && n.kind === 'cover')).toBe(true);
    expect(after.xi).toEqual(plan.xi);
  });
});

describe('the fee table (07 §2)', () => {
  const seller = { pack, clubId: top };
  const plan = planOf(seller);
  const starter = pack.players.find((p) => p.id === plan.xi[5])!;
  const spare = pack.players.find((p) => p.id === plan.surplus[0])!;

  it('a starter costs more than his value, a spare less; a rival pays more', () => {
    const a = sellerStance(seller, starter, low, 2026);
    const b = sellerStance(seller, spare, low, 2026);
    expect(a.mood).toBe('starter');
    expect(a.floor).toBeGreaterThan(a.value);
    expect(b.mood).toBe('surplus');
    expect(b.floor).toBeLessThan(b.value);
    expect(a.asking).toBeGreaterThan(a.floor);
    const rival = club(top).rivals[0];
    if (rival) expect(sellerStance(seller, starter, rival, 2026).floor).toBeGreaterThan(a.floor);
  });

  it('answers yes at the floor, counters lower each round, and takes offence at a lowball', () => {
    const s = sellerStance(seller, starter, low, 2026);
    expect(answerFee(s, s.floor, 1)).toEqual({ kind: 'accept', fee: s.floor });
    expect(answerFee(s, Math.floor(s.floor / 2), 1)).toEqual({ kind: 'refuse', reason: 'insult' });
    const fee = Math.round(s.floor * 0.8);
    const counters = [1, 2, 3].map((r) => answerFee(s, fee, r));
    expect(counters.every((c) => c.kind === 'counter')).toBe(true);
    const fees = counters.map((c) => (c.kind === 'counter' ? c.fee : 0));
    expect(fees[0]).toBeGreaterThan(fees[1]!);
    expect(fees[1]).toBeGreaterThan(fees[2]!);
    expect(fees[2]).toBeGreaterThanOrEqual(s.floor);
    expect(answerFee(s, fee, MAX_ROUNDS)).toEqual({ kind: 'refuse', reason: 'final' });
  });
});

describe('the contract table (07 §2)', () => {
  const plan = planOf({ pack, clubId: low });
  const starter = pack.players.find((p) => p.id === plan.xi[5])!;

  it('a step up makes him cheaper and a step down dearer; the stance explains itself', () => {
    const calm = { ...starter, personality: { ...starter.personality, loyalty: 5, ambition: 8 } };
    const up = playerStance(pack, calm, club(low), club(top), 2026);
    const side = playerStance(
      pack,
      calm,
      club(low),
      { ...club(top), reputation: club(low).reputation },
      2026,
    );
    expect(up.why.step).toBe(-10);
    expect(up.wage).toBeLessThan(side.wage);
    expect(up.wage).toBeGreaterThanOrEqual(calm.contract!.wage);
  });

  it('the loyal stay, the ambitious do not step down, and nobody leaves to sit', () => {
    const loyal = { ...starter, personality: { ...starter.personality, loyalty: 18, ambition: 5 } };
    const sameLevel = { ...club(top), reputation: club(low).reputation + 5 };
    expect(playerStance(pack, loyal, club(low), sameLevel, 2026).no).toBe('loyal');
    const star = pack.players.find((p) => p.id === planOf({ pack, clubId: top }).xi[9])!;
    const proud = { ...star, personality: { ...star.personality, loyalty: 5, ambition: 18 } };
    expect(playerStance(pack, proud, club(top), club(low), 2026).no).toBe('stepDown');
    // A fourth-division starter is a backup at a first-division club: with a small step, no.
    const calm = { ...starter, personality: { ...starter.personality, loyalty: 5, ambition: 5 } };
    expect(fairRole({ pack, clubId: top }, calm, 2026)).toBe('backup');
    const near = { ...club(top), reputation: club(low).reputation + 10 };
    expect(playerStance(pack, calm, club(low), near, 2026).no).toBe('role');
  });

  it('answers yes at his wage, meets the club part of the way, and trades wage for role', () => {
    const free = { ...starter, personality: { ...starter.personality, loyalty: 5, ambition: 8 } };
    const to = { ...club(low), id: club(low).id, reputation: club(low).reputation + 12 };
    const s = playerStance(pack, free, club(low), to, 2026);
    expect(s.no).toBeNull();
    const fair = { wage: s.wage, years: s.years, role: s.wants };
    expect(answerTerms(s, fair, 1)).toEqual({ kind: 'accept', terms: fair });
    const low1 = answerTerms(s, { ...fair, wage: Math.round(s.wage * 0.8) }, 1);
    const low3 = answerTerms(s, { ...fair, wage: Math.round(s.wage * 0.8) }, 3);
    expect(low1.kind).toBe('counter');
    expect(low3.kind).toBe('counter');
    if (low1.kind === 'counter' && low3.kind === 'counter')
      expect(low1.terms.wage).toBeGreaterThan(low3.terms.wage);
    expect(answerTerms(s, { ...fair, wage: 1 }, MAX_ROUNDS)).toEqual({
      kind: 'refuse',
      reason: 'final',
    });
    // Promised a starting place, he takes less.
    const promised = { wage: Math.round(s.wage * 0.93), years: s.years, role: 'starter' as const };
    if (s.wants !== 'starter') expect(answerTerms(s, promised, 1).kind).toBe('accept');
  });
});
