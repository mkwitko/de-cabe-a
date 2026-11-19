import { describe, expect, it } from 'vitest';
import { agentOf, commission } from './agents';
import { dayOf } from '../competition/calendar';
import { postEntry } from '../finance/ledger';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { imports } from '../career/development';
import { nationalDivisions } from '../career/start';
import { ABROAD, importFee } from './abroad';
import { clubKnows } from './scouting';
import { bidFee, bidTerms, cannotTalk, myWageRoom, openTalk, openingWage } from './talks';

const pack = generateDevPack();
// A Série A club: the foreign market is priced for the top.
const clubId = nationalDivisions(pack)[0]!.clubIds[5]!;

describe('the foreign market (04 §4.7)', () => {
  it('the person brings a player from abroad at the market price; the fee leaves the league', () => {
    const w = openCareer(structuredClone(pack), 3, clubId);
    w.day = dayOf('2026-02-16');
    // The season's foreign market is in the pack from the start.
    const offer = w.pack.players.filter((x) => x.clubId === ABROAD);
    w.ledger.today = w.day;
    const p = offer
      .filter((x) => cannotTalk(w, x) === null && openingWage(w, x) <= myWageRoom(w))
      .sort((a, b) => importFee(w, a) - importFee(w, b))[0]!;
    expect(p.clubId).toBe(ABROAD);
    // Money for the deal: a sale the club made earlier.
    postEntry(w.ledger, {
      key: 'test:cash',
      kind: 'transfers',
      ref: 'test',
      amount: importFee(w, p) * 2,
      day: w.day,
      dueDay: w.day,
    });
    const cash = w.ledger.cash;
    const talk = openTalk(w, p.id);
    expect(talk.asking).toBe(importFee(w, p));
    // Under the price: it comes down halfway, never below 85% of its first ask.
    expect(bidFee(w, p.id, Math.round(talk.asking / 2)).kind).toBe('counter');
    const asked = w.talks![p.id]!.asking;
    expect(asked).toBeLessThan(talk.asking);
    expect(asked).toBeGreaterThanOrEqual(Math.floor((talk.asking * 85) / 100 / 1000) * 1000);
    const a = bidFee(w, p.id, asked);
    expect(a.kind).toBe('accept');
    const wants = w.talks![p.id]!.wants!;
    const signed = bidTerms(w, p.id, wants);
    expect(signed.kind).toBe('accept');
    expect(w.pack.players.find((x) => x.id === p.id)!.clubId).toBe(clubId);
    expect(w.ledger.cash).toBe(cash - asked - commission(agentOf(w.pack, p), asked, wants.wage));
  });

  it('clubs with a scouting department hear of players abroad; the sold young do not come back', () => {
    const w = openCareer(structuredClone(pack), 3, clubId);
    const [one] = imports(w.pack, 3, w.season.season);
    const scouted = w.pack.clubs.find((c) => c.departments.scouting >= 2)!;
    expect(clubKnows(w, scouted.id, one!)).toBe(true);
    const young = { ...one!, id: 'sold-abroad', birthDate: `${w.season.season - 24}-01-01` };
    expect(clubKnows(w, scouted.id, young)).toBe(false);
  });
});
