import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from './advance';
import { patienceOf } from './board';
import { jobOffers } from './start';
import { budgetOf } from '../market/books';
import type { Pack } from '../pack/schema';

type Model = Pack['governance'][number]['model'];
const base = generateDevPack();
const clubId = jobOffers(base, 5)[0]!.clubId;
/** The same pack with the person's club run as `model`. */
const runAs = (model: Model): Pack => ({
  ...base,
  governance: base.governance.map((g) => (g.clubId === clubId ? { ...g, model } : g)),
});

describe('how a club is run (mapa de conhecimento §2.4)', () => {
  it("a SAF's board is less patient than an association's, from the club's own profile", () => {
    const club = base.clubs.find((c) => c.id === clubId)!;
    expect(patienceOf(openCareer(runAs('association'), 3, clubId))).toBe(club.profile.patience);
    expect(patienceOf(openCareer(runAs('groupSaf'), 3, clubId))).toBe(
      Math.max(0, club.profile.patience - 15),
    );
  });

  it("a SAF's investor puts more into signings, a multi-club group more still", () => {
    const fee = (model: Model) => budgetOf(openCareer(runAs(model), 3, clubId), clubId).transfer;
    expect(fee('groupSaf')).toBeGreaterThan(fee('ownedSaf'));
    expect(fee('ownedSaf')).toBeGreaterThan(fee('association'));
  });
});
