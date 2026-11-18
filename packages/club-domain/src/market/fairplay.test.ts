import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { clubsOf } from '../career/clubs';
import { nationalDivisions } from '../career/start';
import { costLimitOf, embargoed, squadCost, wageRoom } from './books';
import { deductionFor, judgeFairPlay } from './fairplay';

const pack = generateDevPack();
const divs = nationalDivisions(pack);
const clubId = divs[1]!.clubIds[4]!;
const rival = divs[1]!.clubIds[6]!;

/** A career whose season is `year`, past the rule's transition by default. */
function careerIn(year = 2028) {
  const w = openCareer(structuredClone(pack), 7, clubId);
  w.season = { ...w.season, season: year };
  return w;
}

/** Judges the season, then moves the career a year on, as the turn does. */
function judgeYear(w: ReturnType<typeof openCareer>) {
  const v = judgeFairPlay(w);
  w.season = { ...w.season, season: w.season.season + 1 };
  return v;
}

/** Pushes a club's wages until its squad costs past the limit. */
function overspend(w: ReturnType<typeof openCareer>, id: string) {
  for (const p of w.pack.players)
    if (p.clubId === id && p.contract) p.contract = { ...p.contract, wage: p.contract.wage * 3 };
  expect(squadCost(w, id)).toBeGreaterThan(costLimitOf(w, id)!);
}

describe('financial fair play, the CBF rule (04 §4.5)', () => {
  it('limits by division and exercise: Série A and B only', () => {
    const w = careerIn(2026);
    const a = divs[0]!.clubIds[0]!;
    expect(costLimitOf(w, a, 2026)).toBe(90);
    expect(costLimitOf(w, a, 2027)).toBe(80);
    expect(costLimitOf(w, a, 2030)).toBe(70);
    expect(costLimitOf(w, clubId, 2027)).toBe(80);
    expect(costLimitOf(w, divs[2]!.clubIds[0]!, 2030)).toBe(null);
  });

  it('escalates: warning, fine, fine and ban, then points', () => {
    expect([1, 2, 3, 4, 5].map(deductionFor)).toEqual([0, 0, 0, 3, 3]);
    const w = careerIn();
    overspend(w, clubId);
    overspend(w, rival);
    const cash = clubsOf(w)[rival]!.cash;

    const first = judgeYear(w);
    expect(first.mine).toMatchObject({ strikes: 1, fine: 0 });
    expect(first.board).toBeLessThan(0);
    expect(embargoed(w, clubId)).toBe(false);

    const second = judgeYear(w);
    expect(second.mine.fine).toBeGreaterThan(0);
    expect(w.ledger.entries.some((e) => e.kind === 'fine')).toBe(true);
    expect(clubsOf(w)[rival]!.cash).toBeLessThan(cash);
    expect(embargoed(w, clubId)).toBe(false);

    judgeYear(w);
    expect(embargoed(w, clubId)).toBe(true);
    expect(wageRoom(w, clubId)).toBeLessThanOrEqual(0);

    const fourth = judgeYear(w);
    expect(fourth.deduct[clubId]).toBe(3);
  });

  it('the transition only warns', () => {
    const w = careerIn(2026);
    overspend(w, clubId);
    for (let k = 0; k < 4; k++)
      expect(judgeFairPlay(w).mine).toMatchObject({ strikes: 1, fine: 0 });
    expect(embargoed(w, clubId)).toBe(false);
  });

  it('a season inside the limit clears the record', () => {
    const w = careerIn();
    overspend(w, clubId);
    judgeFairPlay(w);
    judgeFairPlay(w);
    for (const p of w.pack.players)
      if (p.clubId === clubId && p.contract)
        p.contract = { ...p.contract, wage: Math.round(p.contract.wage / 6) };
    expect(squadCost(w, clubId)).toBeLessThanOrEqual(costLimitOf(w, clubId)!);
    expect(judgeFairPlay(w).mine.strikes).toBe(0);
  });
});
