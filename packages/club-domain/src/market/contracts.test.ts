import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision, startNextSeason } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers } from '../career/start';
import { dayOf } from '../competition/calendar';
import { ends, endingSoon, expireContracts } from './contracts';
import { marketRound } from './rounds';
import { bidTerms, cannotTalk, dropTalk, myWageRoom, openTalk } from './talks';
import { readingsOf } from './value';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const mine = (p: { clubId: string | null }) => p.clubId === clubId;
/** The pack's first contracts end with 2027: a world standing at that season's end. */
const at2027 = (seed: number) => {
  const w = openCareer(pack, seed, clubId);
  w.season = { ...w.season, season: 2027 };
  return w;
};

describe('the life of a contract (07 §2, §6)', () => {
  it("at the season's end clubs renew who they use and let the others go; no squad is left short", () => {
    const w = at2027(98);
    const ending = w.pack.players.filter((p) => p.clubId && ends(p, 2027));
    expect(ending.length).toBeGreaterThan(50);
    const out = expireContracts(w);
    expect(out.renewed + out.released).toBe(ending.length);
    expect(out.released).toBeGreaterThan(0);
    expect(out.renewed).toBeGreaterThan(0);
    const read = readingsOf(w.pack);
    for (const c of pack.clubs) {
      const squad = w.pack.players.filter((p) => p.clubId === c.id);
      expect(squad.length).toBeGreaterThanOrEqual(20);
      expect(squad.filter((p) => read.get(p.id)!.keeper).length).toBeGreaterThanOrEqual(2);
      expect(squad.some((p) => ends(p, 2027))).toBe(false);
    }
    const free = w.pack.players.filter(
      (p) => p.clubId === null && ending.some((e) => e.id === p.id),
    );
    expect(free.length).toBe(out.released);
    expect(free.every((p) => p.contract === undefined)).toBe(true);
    // The person is told who left and who was kept a year so the team can still play.
    const told = w.inbox!.filter((n) => n.kind === 'contractEnded' || n.kind === 'contractKept');
    expect(told.length).toBe(out.left.length + out.kept.length);
    expect(endingSoon(w)).toEqual([]);
    // Released players ride in the snapshot as players without a club.
    const again = loadCareer(pack, 98, clubId, saveCareer(w));
    expect(again.pack.players.filter((p) => p.clubId === null).length).toBe(
      w.pack.players.filter((p) => p.clubId === null).length,
    );
  });

  it('a free agent costs no fee: clubs sign them in a round, and so can the person', () => {
    const w = at2027(98);
    expireContracts(w);
    const free = w.pack.players.filter((p) => p.clubId === null);
    const deals = marketRound(w, dayOf('2028-01-13'));
    const signed = deals.filter((d) => d.from === null);
    expect(signed.length).toBeGreaterThan(0);
    expect(signed.every((d) => d.fee === 0 && free.some((p) => p.id === d.player))).toBe(true);
    // The person: no fee table, straight to the contract, in or out of a window.
    // One whose asking wage the board's ceiling takes.
    const cash = w.ledger.cash;
    const willing = w.pack.players.filter((p) => p.clubId === null && cannotTalk(w, p) === null);
    let talk: ReturnType<typeof openTalk> | undefined;
    for (const p of willing) {
      const opened = openTalk(w, p.id);
      if (opened.wants!.wage <= myWageRoom(w)) {
        talk = opened;
        break;
      }
      dropTalk(w, p.id);
    }
    if (!talk) return;
    const target = { id: talk.player };
    expect(talk).toMatchObject({ seller: null, stage: 'terms', fee: 0 });
    const a = bidTerms(w, target.id, talk.wants!);
    expect(a.kind).toBe('accept');
    expect(w.pack.players.find((p) => p.id === target.id)!.clubId).toBe(clubId);
    expect(w.ledger.cash).toBe(cash);
  });

  it('two seasons and their turns: contracts expire at the second, and the third plays', () => {
    const w = openCareer(pack, 98, clubId);
    for (let year = 0; year < 2; year++) {
      for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
      if (w.board?.fired) return;
      startNextSeason(w);
    }
    expect(w.season.season).toBe(2028);
    expect(w.pack.players.some((p) => p.clubId && ends(p, 2027))).toBe(false);
    expect(w.pack.players.filter(mine).length).toBeGreaterThanOrEqual(20);
    expect(w.pack.players.some((p) => p.clubId === null)).toBe(true);
    const d = nextDecision(w);
    expect(d.kind).toBe('match');
    if (d.kind === 'match') expect(playDecision(w, d).goals.length).toBe(2);
  }, 120_000);
});
