import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision, startNextSeason } from './advance';
import { bridgeAfter, bridgeBefore } from './bridge';
import { nationalDivisions } from './start';

const pack = generateDevPack();

describe('season bridge', () => {
  it('reads three short lists from the state, with the board goal and the cash it carries', () => {
    const w = openCareer(pack, 51, nationalDivisions(pack)[2]!.clubIds[3]!);
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
    const before = bridgeBefore(w);
    startNextSeason(w);
    const b = bridgeAfter(w, before);
    for (const list of [b.happened, b.carried, b.ahead]) expect(list.length).toBeLessThanOrEqual(3);
    expect(b.happened[0]?.k).toBe('season');
    expect(b.carried.find((f) => f.k === 'cash')).toEqual({
      k: 'cash',
      from: before.cash,
      to: w.ledger.cash,
    });
    expect(b.ahead.find((f) => f.k === 'goal')).toBeTruthy();
  });
});
