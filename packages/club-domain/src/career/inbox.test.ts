import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision, startNextSeason } from './advance';
import { positionOf } from './board';
import { sellerStance } from '../market/deals';
import { bidFee, bidTerms, cannotTalk, openTalk } from '../market/talks';
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
    // A signing closed at the two tables is told too.
    const target = w.pack.players
      .filter(
        (x) =>
          x.clubId && x.clubId !== 'abroad' && x.clubId !== clubId && cannotTalk(w, x) === null,
      )
      .map((x) => ({
        x,
        ask: sellerStance({ pack: w.pack, clubId: x.clubId! }, x, clubId, 2026).asking,
      }))
      .filter((t) => t.ask > 0 && t.ask <= w.ledger.cash)
      .sort((a, b) => a.ask - b.ask || (a.x.id < b.x.id ? -1 : 1))[0]!.x;
    const talk = openTalk(w, target.id);
    bidFee(w, target.id, talk.asking);
    bidTerms(w, target.id, w.talks![target.id]!.wants!);
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
    // Elections and club sales elsewhere in the division may come too (clubs.ts).
    const kinds = w.inbox!.map((n) => n.kind).filter((k) => k !== 'directors');
    // The turn tells, in order: the goal, the prize, the season, and the academy's boys.
    expect(kinds.slice(-4)).toEqual(['goal', 'prize', 'season', 'crop']);
    const prize = w.inbox!.find((n) => n.kind === 'prize')!;
    expect(prize).toMatchObject({ position });
    expect(w.ledger.cash).toBe(cash + (prize.kind === 'prize' ? prize.amount : 0));
    expect(w.ledger.entries.filter((e) => e.kind === 'prize')).toHaveLength(1);
    expect(w.inbox!.some((n) => n.kind === 'window')).toBe(true);
    expect(w.inbox!.length).toBeLessThanOrEqual(40);
  });
});
