import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision, startNextSeason } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { nationalDivisions } from '../career/start';
import { dayOf } from '../competition/calendar';
import { borrow, borrowerFor, cannotBorrow, listForLoan, loanFee } from './loans';
import { squadPlanOf } from './plan';
import { marketRound } from './rounds';
import { cannotTalk, listPlayer, openRenewal } from './talks';

const pack = generateDevPack();
// A second-division club: strong enough to lend, small enough to borrow from above.
const clubId = nationalDivisions(pack)[1]!.clubIds[4]!;
const mine = (p: { clubId: string | null }) => p.clubId === clubId;

describe('loans (07 §4)', () => {
  it('a club lends who it does not start, to where he will play; the borrower pays fee and wage', () => {
    const w = openCareer(pack, 99, clubId);
    const can = w.pack.players.filter(
      (p) => p.clubId && !mine(p) && cannotBorrow(w, p, clubId) === null,
    );
    expect(can.length).toBeGreaterThan(0);
    for (const p of can)
      expect(squadPlanOf({ pack: w.pack, clubId: p.clubId! }).xi).not.toContain(p.id);
    const starter = w.pack.players.find(
      (p) =>
        p.clubId && !mine(p) && squadPlanOf({ pack: w.pack, clubId: p.clubId }).xi.includes(p.id),
    )!;
    expect(cannotBorrow(w, starter, clubId)).toBe('starter');

    const p = can[0]!;
    const cash = w.ledger.cash;
    const fee = loanFee(w, p);
    const size = w.pack.players.filter(mine).length;
    borrow(w, p.id);
    expect(w.ledger.cash).toBe(cash - fee);
    expect(w.pack.players.filter(mine).length).toBe(size + 1);
    const here = w.pack.players.find((x) => x.id === p.id)!;
    expect(here.contract).toMatchObject({ wage: p.contract!.wage, until: p.contract!.until });
    expect(w.loans![p.id]).toMatchObject({ owner: p.clubId, season: 2026 });
    expect(w.inbox!.at(-1)).toMatchObject({ kind: 'loanIn', club: p.clubId, fee });
    // He is not the person's to sell, list or renew.
    expect(cannotTalk(w, here)).not.toBeNull();
    expect(() => listPlayer(w, p.id, true)).toThrow(/loan/);
    expect(() => openRenewal(w, p.id)).toThrow(/onLoan/);
    expect(cannotBorrow(w, here, clubId)).toBe('onLoan');
    expect(loadCareer(pack, 99, clubId, saveCareer(w)).loans).toEqual(w.loans);
  });

  it('a player offered on loan goes, in the next round, to a club that will play him', () => {
    const w = openCareer(pack, 99, clubId);
    const plan = squadPlanOf({ pack: w.pack, clubId });
    const spare = w.pack.players
      .filter((p) => mine(p) && !plan.xi.includes(p.id))
      .find((p) => borrowerFor(w, p) !== null);
    if (!spare) return;
    const to = borrowerFor(w, spare)!;
    const cash = w.ledger.cash;
    const fee = loanFee(w, spare);
    listForLoan(w, spare.id, true);
    expect(w.forLoan).toEqual([spare.id]);
    marketRound(w, dayOf('2026-04-16'));
    expect(w.pack.players.find((p) => p.id === spare.id)!.clubId).toBe(to);
    expect(w.ledger.cash).toBeGreaterThanOrEqual(cash + fee);
    expect(w.loans![spare.id]).toMatchObject({ owner: clubId });
    expect(w.forLoan).toEqual([]);
    expect(w.inbox!.some((n) => n.kind === 'loanOut' && n.club === to)).toBe(true);
  });

  it("at the season's end everyone on loan goes back on the contract he left", () => {
    const w = openCareer(pack, 99, clubId);
    const p = w.pack.players.find(
      (x) => x.clubId && !mine(x) && cannotBorrow(w, x, clubId) === null,
    )!;
    borrow(w, p.id);
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
    if (w.board?.fired) return;
    startNextSeason(w);
    const back = w.pack.players.find((x) => x.id === p.id)!;
    expect(back.clubId).toBe(p.clubId);
    expect(back.contract).toMatchObject({ wage: p.contract!.wage, until: p.contract!.until });
    expect(w.loans).toBeUndefined();
    expect(w.inbox!.some((n) => n.kind === 'loanBack')).toBe(true);
  }, 120_000);
});
