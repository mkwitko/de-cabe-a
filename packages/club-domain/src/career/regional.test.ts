import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import {
  COTAS,
  NORDESTE_BERTHS,
  NORDESTE_ID,
  SUL_SUDESTE_ID,
  SUPERCOPA_ID,
} from '../competition/regionais-data';
import { nextDecision, openCareer, playDecision } from './advance';
import { regionalCotaFor } from './regional';
import { budgetOf } from '../market/books';
import { isoOf, weekday } from '../competition/calendar';

const pack = generateDevPack();
const state = new Map(pack.cities.map((c) => [c.id, c.state]));
const first = pack.clubs.find((c) => state.get(c.cityId)! in NORDESTE_BERTHS)!;

describe('the person regional cup', () => {
  const playToFinal = (clubId: string) => {
    const w = openCareer(pack, 5, clubId);
    for (
      let d = nextDecision(w);
      d.kind === 'match' && !w.season.results[NORDESTE_ID]?.final;
      d = nextDecision(w)
    )
      playDecision(w, d);
    return w;
  };

  it('pays the share in April to June and the prizes by phase reached, with a note', () => {
    const members = openCareer(pack, 5, first.id).season.members[NORDESTE_ID]!;
    // the best club of the cup, in the first block of shares
    const best = members[0]!;
    const w0 = playToFinal(best);
    expect(regionalCotaFor(w0, best)).toBe(2_500_000);
    expect(budgetOf(w0, best).income).toBeGreaterThan(2_500_000);
    // the share arrived in April to June, in equal parts
    const cups = w0.ledger.entries.filter((e) => e.kind === 'cups' && e.ref >= 'month:2026-04');
    expect(cups.length).toBeGreaterThan(0);
    expect(cups.length).toBeLessThanOrEqual(3);
    expect(cups.every((e) => e.amount === cups[0]!.amount)).toBe(true);

    // A finalist of that run as the person (the person's own results differ, so the first of
    // them who gets past the quarter-finals): quarter-final and later money, and the note.
    const finalists = w0.season.results[NORDESTE_ID]!.final!.tables[0]!.map((r) => r.clubId);
    const prizesOf = (x: typeof w0) =>
      x.ledger.entries.filter(
        (e) => e.kind === 'prize' && e.ref.startsWith('regional:') && e.key.includes(NORDESTE_ID),
      );
    let w = w0;
    for (const id of [...finalists, ...members]) {
      w = playToFinal(id);
      if (prizesOf(w).length >= 2) break;
    }
    const table = w.season.results[NORDESTE_ID]!;
    expect(table.quartas!.tables[0]).toHaveLength(8);
    const prizes = prizesOf(w);
    const paid = prizes.reduce((s, e) => s + e.amount, 0);
    expect(prizes.length).toBeGreaterThanOrEqual(2);
    expect(paid).toBeGreaterThan(0);
    const note = w.inbox?.find((n) => n.kind === 'regional' && n.name === 'Copa do Nordeste');
    expect(note?.kind === 'regional' && note.prize).toBe(paid);
    // paying twice is not possible: the keys are the cup, season and prize line
    expect(new Set(prizes.map((e) => e.key)).size).toBe(prizes.length);
  });

  it('pays the Copa Sul-Sudeste share by ranking block: 300, 200, 150 and 100 thousand', () => {
    const w = openCareer(pack, 5, first.id);
    const ids = w.season.members[SUL_SUDESTE_ID] ?? [];
    expect(ids).toHaveLength(12);
    const paid = ids.map((id) => regionalCotaFor(w, id)).sort((a, b) => b - a);
    expect(paid).toEqual(COTAS.sulSudeste.flatMap((c) => [c, c, c]));
  });

  it('puts the Supercopa on the first Sunday of February', () => {
    const w = openCareer(pack, 5, first.id);
    const match = [...w.season.calendar.matches.values()].find(
      (m) => m.competitionId === SUPERCOPA_ID,
    )!;
    expect(weekday(match.day)).toBe(0);
    expect(isoOf(match.day).slice(5)).toMatch(/^02-0[1-7]$/);
  });

  it('the same club, seed and day give the same cup', () => {
    const a = openCareer(pack, 5, first.id, 60);
    const b = openCareer(pack, 5, first.id, 60);
    expect(a.season.members[NORDESTE_ID]).toEqual(b.season.members[NORDESTE_ID]);
  });
});
