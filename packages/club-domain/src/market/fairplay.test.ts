import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { nationalDivisions } from '../career/start';
import { embargoed, SQUAD_COST_LIMIT, squadCost, wageRoom } from './books';
import { deductionFor, judgeFairPlay } from './fairplay';

const pack = generateDevPack();
const clubId = nationalDivisions(pack)[1]!.clubIds[4]!;

/** Pushes a club's wages until its squad costs past the limit. */
function overspend(w: ReturnType<typeof openCareer>, id: string) {
  for (const p of w.pack.players)
    if (p.clubId === id && p.contract) p.contract = { ...p.contract, wage: p.contract.wage * 3 };
  expect(squadCost(w, id)).toBeGreaterThan(SQUAD_COST_LIMIT);
}

describe('financial fair play (04 §8.2)', () => {
  it('escalates season after season over the limit: warning, embargo, then points off', () => {
    expect([1, 2, 3, 4, 5, 6].map(deductionFor)).toEqual([0, 0, 3, 6, 9, 9]);
    const w = openCareer(structuredClone(pack), 7, clubId);
    overspend(w, clubId);

    const first = judgeFairPlay(w);
    expect(first.mine.strikes).toBe(1);
    expect(first.board).toBeLessThan(0);
    expect(embargoed(w, clubId)).toBe(false);

    judgeFairPlay(w);
    expect(embargoed(w, clubId)).toBe(true);
    expect(wageRoom(w, clubId)).toBeLessThanOrEqual(0);

    const third = judgeFairPlay(w);
    expect(third.deduct[clubId]).toBe(3);
  });

  it('a season inside the limit clears the record', () => {
    const w = openCareer(structuredClone(pack), 7, clubId);
    overspend(w, clubId);
    judgeFairPlay(w);
    judgeFairPlay(w);
    for (const p of w.pack.players)
      if (p.clubId === clubId && p.contract)
        p.contract = { ...p.contract, wage: Math.round(p.contract.wage / 6) };
    expect(squadCost(w, clubId)).toBeLessThanOrEqual(SQUAD_COST_LIMIT);
    const v = judgeFairPlay(w);
    expect(v.mine.strikes).toBe(0);
    expect(embargoed(w, clubId)).toBe(false);
  });
});
