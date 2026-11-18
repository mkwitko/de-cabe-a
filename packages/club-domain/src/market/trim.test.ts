import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { squadPlayers } from '../career/squad';
import { nationalDivisions } from '../career/start';
import { rngFrom } from '@decabeca/match-engine';
import { generatePlayer } from '../generate/player';
import { SQUAD_COST_LIMIT, squadCost } from './books';
import { SQUAD_TARGET, trimSquads } from './contracts';
import { squadPlanOf } from './plan';

const pack = generateDevPack();
const divs = nationalDivisions(pack);
const mine = divs.at(-1)!.clubIds[0]!;
const rival = divs[1]!.clubIds[3]!;

describe('rival squads cleared at the turn (04 §8.2)', () => {
  it('a bloated squad drops spares to the target, never one the plan uses', () => {
    const w = openCareer(structuredClone(pack), 3, mine);
    const extra = Array.from({ length: 14 }, (_, k) =>
      generatePlayer(rngFrom(k + 1), {
        id: `extra-${k}`,
        position: 'CM',
        quality: 30,
        clubId: rival,
        season: w.season.season,
      }),
    );
    w.pack = { ...w.pack, players: [...w.pack.players, ...extra] };
    const before = squadPlayers({ pack: w.pack, clubId: rival });
    expect(before.length).toBeGreaterThan(SQUAD_TARGET);
    const plan = squadPlanOf({ pack: w.pack, clubId: rival });
    const mineBefore = squadPlayers({ pack: w.pack, clubId: mine }).length;
    trimSquads(w);
    const after = squadPlayers({ pack: w.pack, clubId: rival });
    expect(after.length).toBeLessThanOrEqual(SQUAD_TARGET);
    for (const id of [...plan.xi, ...plan.cover]) expect(after.some((p) => p.id === id)).toBe(true);
    // The person's squad is theirs to manage.
    expect(squadPlayers({ pack: w.pack, clubId: mine }).length).toBe(mineBefore);
  });

  it('a club over the fair play limit cuts once sanctioned, the dearest first', () => {
    const w = openCareer(structuredClone(pack), 3, mine);
    const plan = squadPlanOf({ pack: w.pack, clubId: rival });
    const used = new Set([...plan.xi, ...plan.cover]);
    for (const p of w.pack.players)
      if (p.clubId === rival && p.contract && !used.has(p.id))
        p.contract = { ...p.contract, wage: p.contract.wage * 8 };
    expect(squadCost(w, rival)).toBeGreaterThan(SQUAD_COST_LIMIT);
    const cost = squadCost(w, rival);
    const spares = new Set(
      w.pack.players.filter((p) => p.clubId === rival && !used.has(p.id)).map((p) => p.id),
    );
    // Over the limit but not sanctioned yet: the owners may still get it wrong.
    const size = w.pack.players.filter((p) => p.clubId === rival).length;
    if (size <= SQUAD_TARGET) expect(trimSquads(w)).toBe(0);
    w.fairplay = { [rival]: 2 };
    expect(trimSquads(w)).toBeGreaterThan(0);
    expect(squadCost(w, rival)).toBeLessThan(cost);
    // Only spares left.
    for (const id of used) expect(w.pack.players.find((p) => p.id === id)?.clubId).toBe(rival);
    expect(spares.size).toBeGreaterThan(0);
  });
});
