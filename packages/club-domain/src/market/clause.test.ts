import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { withMoves } from '../career/market';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers, nationalDivisions } from '../career/start';
import { dayOf } from '../competition/calendar';
import { CLAUSE_TIMES, answerFee, answerTerms, playerStance, sellerStance } from './deals';
import { ceilingRange, eyeOf, levelRange } from './judgement';
import { marketRound } from './rounds';
import { bidFee, bidTerms, cannotTalk, myWageRoom, openTalk } from './talks';
import { marketValue, readingsOf } from './value';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('release clauses (07 §2)', () => {
  it('a fee that meets the clause cannot be refused, whatever the club asks', () => {
    const seller = pack.clubs.find((c) => c.id !== clubId)!.id;
    const p = pack.players.find((x) => x.clubId === seller)!;
    const clause = 5000;
    const own = withMoves(pack, {
      [p.id]: { clubId: seller, wage: p.contract!.wage, until: '2029-12-31', release: clause },
    });
    const now = own.players.find((x) => x.id === p.id)!;
    const stance = sellerStance({ pack: own, clubId: seller }, now, clubId, 2026);
    expect(stance.release).toBe(clause);
    expect(stance.floor).toBeGreaterThan(clause);
    expect(answerFee(stance, clause, 1)).toEqual({ kind: 'accept', fee: clause });
    expect(answerFee(stance, clause - 1000, 1).kind).not.toBe('accept');
  });

  it('a clause he could leave by is worth wage to the player; a far one is not', () => {
    const p = pack.players.find((x) => x.clubId && x.clubId !== clubId)!;
    const from = pack.clubs.find((c) => c.id === p.clubId)!;
    const to = { ...pack.clubs.find((c) => c.id === clubId)!, reputation: from.reputation + 12 };
    const calm = { ...p, personality: { ...p.personality, loyalty: 5, ambition: 8 } };
    const s = { ...playerStance(pack, calm, from, to, 2026), no: null };
    const base = { wage: Math.round(s.wage * 0.96), years: s.years, role: s.wants };
    expect(answerTerms(s, base, 1).kind).toBe('counter');
    expect(answerTerms(s, { ...base, release: s.value * 2 }, 1).kind).toBe('accept');
    expect(answerTerms(s, { ...base, release: s.value * 10 }, 1).kind).toBe('counter');
  });

  it('clubs write their clause into what they sign, and the snapshot keeps it', () => {
    const w = openCareer(pack, 101, clubId);
    const deals = marketRound(w, dayOf('2026-04-16'));
    expect(deals.length).toBeGreaterThan(0);
    for (const d of deals) {
      const p = w.pack.players.find((x) => x.id === d.player)!;
      expect(p.contract!.releaseFee).toBeGreaterThan(0);
      expect(p.contract!.releaseFee! % 1000).toBe(0);
    }
    const again = loadCareer(pack, 101, clubId, saveCareer(w));
    const id = deals[0]!.player;
    expect(again.pack.players.find((x) => x.id === id)!.contract).toEqual(
      w.pack.players.find((x) => x.id === id)!.contract,
    );
    expect(CLAUSE_TIMES).toBe(3);
  });

  it('the person writes a clause into a signing, and it stays in his contract', () => {
    const w = openCareer(pack, 101, clubId);
    const target = w.pack.players
      .filter(
        (p) =>
          p.clubId && p.clubId !== 'abroad' && p.clubId !== clubId && cannotTalk(w, p) === null,
      )
      .map((p) => ({ p, s: sellerStance({ pack: w.pack, clubId: p.clubId! }, p, clubId, 2026) }))
      .filter((x) => x.s.asking <= w.ledger.cash && (x.p.contract?.wage ?? 0) * 2 <= myWageRoom(w))
      .sort((a, b) => a.s.asking - b.s.asking || (a.p.id < b.p.id ? -1 : 1))[0];
    if (!target) return;
    const talk = openTalk(w, target.p.id);
    bidFee(w, target.p.id, talk.asking);
    const wants = w.talks![target.p.id]!.wants!;
    const clause = marketValue(w.pack, target.p, 2026) * 2;
    expect(bidTerms(w, target.p.id, { ...wants, release: clause }).kind).toBe('accept');
    expect(w.pack.players.find((x) => x.id === target.p.id)!.contract!.releaseFee).toBe(clause);
  });
});

describe('what an eye sees (06 §2.3)', () => {
  it('the true level and ceiling always sit inside the band; a better eye gives a narrower one', () => {
    const read = readingsOf(pack);
    const top = nationalDivisions(pack)[0]!.clubIds;
    const sharp = pack.clubs.find((c) => top.includes(c.id) && eyeOf(pack, c.id).scouting >= 4)!.id;
    const dull = pack.clubs.find((c) => eyeOf(pack, c.id).scouting <= 2)!.id;
    const sample = pack.players
      .filter((p) => p.clubId && p.clubId !== sharp && p.clubId !== dull)
      .slice(0, 300);
    const width = (clubId: string) => {
      let sum = 0;
      for (const p of sample) {
        const [lo, hi] = levelRange(pack, clubId, p);
        const [clo, chi] = ceilingRange(pack, clubId, p);
        const r = read.get(p.id)!;
        expect(lo).toBeLessThanOrEqual(r.level);
        expect(hi).toBeGreaterThanOrEqual(r.level);
        expect(chi).toBeGreaterThanOrEqual(Math.min(99, r.ceiling));
        expect(clo).toBeLessThanOrEqual(Math.max(r.ceiling, lo));
        sum += hi - lo;
      }
      return sum / sample.length;
    };
    expect(width(sharp)).toBeLessThan(width(dull));
  });
});
