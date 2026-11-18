import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from './advance';
import { jobOffers } from './start';
import { postMonths } from './finance';
import { dayOf } from '../competition/calendar';
import { sellerStance } from '../market/deals';

const base = generateDevPack();
const clubId = jobOffers(base, 5)[0]!.clubId;

describe('deeper finances (mapa de conhecimento §2.10)', () => {
  it('the old debt carries interest on what is still owed', () => {
    const pack = {
      ...base,
      clubs: base.clubs.map((c) => (c.id === clubId ? { ...c, initialDebt: 60_000_000 } : c)),
    };
    const w = openCareer(pack, 3, clubId);
    postMonths(w, dayOf('2026-01-15'), dayOf('2026-03-15'));
    const interest = w.ledger.entries.filter((e) => e.kind === 'interest').map((e) => -e.amount);
    expect(interest).toHaveLength(2);
    // 10% a year on 60M: 500k the first month, a little less the next.
    expect(interest[0]).toBe(500_000);
    expect(interest[1]).toBeLessThan(interest[0]!);
  });

  it('a club in the red takes less for a player: it lives on selling', () => {
    const w = openCareer(base, 3, clubId);
    const p = w.pack.players.find((x) => x.clubId && x.clubId !== clubId)!;
    const seller = { pack: w.pack, clubId: p.clubId! };
    const calm = sellerStance(seller, p, clubId, 2026);
    const broke = sellerStance(seller, p, clubId, 2026, true);
    expect(broke.floor).toBeLessThan(calm.floor);
    expect(broke.why.broke).toBe(-15);
  });
});
