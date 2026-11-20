import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { attribute } from '../match/scorers';
import { nextDecision, openCareer, playDecision, type CareerWorld } from './advance';
import { loadCareer, saveCareer } from './save';
import { jobOffers } from './start';
import { squadPlayers } from './squad';
import { topScorers } from './scoring';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[1]!.clubId;
const play = (w: CareerWorld, n: number) => {
  for (let i = 0; i < n; i++) {
    const d = nextDecision(w);
    if (d.kind !== 'match') return;
    playDecision(w, d);
  }
};

describe('goal attribution', () => {
  const squad = squadPlayers({ pack, clubId });

  it('is the same for the same seed and never changes the count', () => {
    const a = attribute(123, 5, squad);
    expect(attribute(123, 5, squad)).toEqual(a);
    expect(a).toHaveLength(5);
    expect(attribute(123, 0, squad)).toEqual([]);
    for (const g of a) expect(g.assist).not.toBe(g.scorer);
  });

  it('gives strikers more goals than defenders, and never to a keeper', () => {
    const by: Record<string, number> = {};
    const pos = new Map(squad.map((p) => [p.id, p.positions[0]!.position]));
    for (let s = 0; s < 3000; s++)
      for (const g of attribute(s, 2, squad)) {
        const k = pos.get(g.scorer)!;
        by[k] = (by[k] ?? 0) + 1;
      }
    expect(by.GK ?? 0).toBe(0);
    const fwd = (by.ST ?? 0) + (by.LW ?? 0) + (by.RW ?? 0) + (by.SS ?? 0);
    const def = (by.CB ?? 0) + (by.LB ?? 0) + (by.RB ?? 0);
    expect(fwd).toBeGreaterThan(def * 2);
  });

  it('tallies league goals and keeps them across a save', () => {
    const w = openCareer(pack, 41, clubId);
    play(w, 20);
    const total = Object.values(w.scored ?? {}).reduce((s, [g]) => s + g, 0);
    expect(total).toBeGreaterThan(0);
    const loaded = loadCareer(pack, 41, clubId, saveCareer(w));
    expect(loaded.scored).toEqual(w.scored);
    expect(topScorers(loaded, 'goals', 3)).toEqual(topScorers(w, 'goals', 3));
  });
});
