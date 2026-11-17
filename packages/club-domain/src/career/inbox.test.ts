import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision, startNextSeason } from './advance';
import { positionOf } from './board';
import { cannotBuy, buy, askingPrice } from './market';
import { loadCareer, saveCareer } from './save';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('the inbox', () => {
  it('opens with a welcome, takes each result and a transfer, and rides in the snapshot', () => {
    const w = openCareer(pack, 81, clubId);
    expect(w.inbox).toEqual([{ day: 0, kind: 'welcome' }]);
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    const o = playDecision(w, d);
    const atHome = d.home === clubId;
    expect(w.inbox!.at(-1)).toEqual({
      day: d.day,
      kind: 'result',
      opponent: atHome ? d.away : d.home,
      goals: atHome ? o.goals : [o.goals[1], o.goals[0]],
    });
    const target = w.pack.players
      .filter((x) => x.clubId && x.clubId !== clubId && cannotBuy(w, x) === null)
      .sort((a, b) => askingPrice(a, 2026) - askingPrice(b, 2026) || (a.id < b.id ? -1 : 1))[0]!;
    buy(w, target.id);
    expect(w.inbox!.at(-1)).toMatchObject({ kind: 'bought', club: target.clubId, day: w.day });
    expect(loadCareer(pack, 81, clubId, saveCareer(w)).inbox).toEqual(w.inbox);
  });

  it('the season ends with the goal judged, a prize in the ledger and the turn told', () => {
    const w = openCareer(pack, 81, clubId);
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
    if (w.board?.fired) return;
    const position = positionOf(w);
    const cash = w.ledger.cash;
    startNextSeason(w);
    const kinds = w.inbox!.map((n) => n.kind);
    expect(kinds.slice(-3)).toEqual(['goal', 'prize', 'season']);
    const prize = w.inbox!.find((n) => n.kind === 'prize')!;
    expect(prize).toMatchObject({ position });
    expect(w.ledger.cash).toBe(cash + (prize.kind === 'prize' ? prize.amount : 0));
    expect(w.ledger.entries.filter((e) => e.kind === 'prize')).toHaveLength(1);
    expect(w.inbox!.some((n) => n.kind === 'window')).toBe(true);
    expect(w.inbox!.length).toBeLessThanOrEqual(40);
  });
});
