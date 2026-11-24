import { expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision } from './advance';
import { nationalDivisions } from './start';

it("names a scorer for every goal of the person's match, league or cup", () => {
  const pack = generateDevPack();
  const w = openCareer(pack, 11, nationalDivisions(pack)[2]!.clubIds[0]!);
  for (let i = 0; i < 15; i++) {
    const d = nextDecision(w);
    if (d.kind !== 'match') continue;
    const o = playDecision(w, d);
    expect(w.scorers!.map((s) => s.length)).toEqual(o.goals);
  }
});
