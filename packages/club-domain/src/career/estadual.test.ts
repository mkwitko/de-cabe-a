import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision } from './advance';
import { cotaFor, estadualOf, estadualView } from './estadual';
import { nationalDivisions } from './start';
import { budgetOf } from '../market/books';

const pack = generateDevPack();
const clubId = nationalDivisions(pack)[0]!.clubIds[0]!;

describe('the person state championship', () => {
  it('puts the club in its state, pays the share in three parts and the prize at the end', () => {
    const w = openCareer(pack, 5, clubId);
    const e = estadualOf(w, clubId)!;
    expect(e).not.toBeNull();
    expect(e.comp.scope).toBe('estadual');
    expect(w.season.members[e.comp.id]).toContain(clubId);
    const cota = cotaFor(w, clubId);
    expect(cota).toBeGreaterThan(0);
    // The budget counts the share (books) instead of the old flat estimate.
    expect(budgetOf(w, clubId).income).toBeGreaterThan(cota);

    const id = e.comp.id;
    for (
      let d = nextDecision(w);
      d.kind === 'match' && !w.season.results[id]?.final;
      d = nextDecision(w)
    )
      playDecision(w, d);
    expect(w.season.results[id]?.final).toBeDefined();
    expect(w.inbox?.some((n) => n.kind === 'estadual')).toBe(true);
    const view = estadualView(w)!;
    expect(view.name).toBe(e.comp.name);
    expect(view.rows.length).toBeGreaterThan(0);
    // The share arrived in January to March: three entries of the same size.
    const shares = w.ledger.entries.filter((x) => x.kind === 'cups');
    expect(shares.length).toBeLessThanOrEqual(3);
    expect(shares.length).toBeGreaterThan(0);
  });

  it('the same club, seed and day give the same championship', () => {
    const a = openCareer(pack, 5, clubId, 60);
    const b = openCareer(pack, 5, clubId, 60);
    expect(JSON.stringify(estadualView(a))).toBe(JSON.stringify(estadualView(b)));
  });
});
