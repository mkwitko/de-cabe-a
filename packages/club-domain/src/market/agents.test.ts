import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers } from '../career/start';
import { dayOf } from '../competition/calendar';
import {
  affinity,
  agentOf,
  agentOffers,
  agentsOf,
  commission,
  dealtWith,
  networkOf,
  seenTraits,
} from './agents';
import { answerTerms, playerStance } from './deals';
import { knowledgeOf } from './scouting';
import { readingsOf } from './value';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('agents (ADR-022)', () => {
  it('every player has one; the big agencies hold the best players', () => {
    const read = readingsOf(pack);
    for (const p of pack.players.slice(0, 500)) expect(agentOf(pack, p)).toBeDefined();
    const top = pack.players.filter((p) => read.get(p.id)!.level >= 66);
    for (const p of top) expect(agentOf(pack, p).size).toBe('big');
    // Fixed per pack: the same agent every time.
    const p = pack.players[0]!;
    expect(agentOf(pack, p).id).toBe(agentOf(pack, p).id);
    for (const a of agentsOf(pack).values()) {
      expect(a.greed).toBeGreaterThanOrEqual(5);
      expect(a.greed).toBeLessThanOrEqual(15);
      expect(networkOf(pack, a).size).toBe(a.influence * 3);
    }
  });

  it('commission: a share of the fee, or months of wage for a player without a club', () => {
    const a = { ...[...agentsOf(pack).values()][0]!, greed: 10 };
    expect(commission(a, 1_000_000, 50_000)).toBe(100_000);
    expect(commission(a, 0, 50_000)).toBe(200_000);
  });

  it('past his patience the agent asks more each round, and says so', () => {
    const w = openCareer(pack, 3, clubId);
    const p = w.pack.players.find((x) => x.clubId && x.clubId !== clubId)!;
    const club = w.pack.clubs.find((c) => c.id === clubId)!;
    const s = { ...playerStance(w.pack, p, null, club, 2026), no: null, fair: 'starter' as const };
    const low = { wage: Math.round(s.wage * 0.5), years: s.years, role: 'starter' as const };
    const calm = answerTerms(s, low, 2, { patience: 3, greed: 10 });
    const sharp = answerTerms(s, low, 2, { patience: 1, greed: 10 });
    expect(calm).toMatchObject({ kind: 'counter' });
    expect(calm).not.toHaveProperty('impatient');
    expect(sharp).toMatchObject({ kind: 'counter', impatient: true });
    if (calm.kind === 'counter' && sharp.kind === 'counter')
      expect(sharp.terms.wage).toBeGreaterThan(calm.terms.wage);
  });

  it('dealing with an agent moves the standing and shows his traits, one per deal', () => {
    const w = openCareer(pack, 3, clubId);
    const a = [...agentsOf(pack).values()][3]!;
    const base = affinity(w, a);
    expect(seenTraits(w, a)).toEqual({});
    dealtWith(w, a, true);
    expect(affinity(w, a)).toBe(base + 10);
    expect(seenTraits(w, a)).toEqual({ greed: a.greed });
    dealtWith(w, a, false);
    dealtWith(w, a, true);
    expect(seenTraits(w, a)).toEqual({
      greed: a.greed,
      patience: a.patience,
      influence: a.influence,
    });
    for (let i = 0; i < 10; i++) dealtWith(w, a, true);
    expect(affinity(w, a)).toBe(base + 30);
    expect(loadCareer(pack, 3, clubId, saveCareer(w)).agents).toEqual(w.agents);
  });

  it('agents who work with the club offer players that fit, twice a round at most, once a season', async () => {
    const w = openCareer(pack, 3, clubId);
    // Every agent stands well with the club.
    w.agents = {
      affinity: Object.fromEntries([...agentsOf(pack).keys()].map((id) => [id, 20])),
      dealt: {},
    };
    const day = dayOf('2026-02-16');
    const first = agentOffers(w, day);
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThanOrEqual(2);
    w.day = day;
    for (const p of first) {
      expect(knowledgeOf(w, p)).toBeGreaterThanOrEqual(40);
      expect(p.clubId).not.toBe(clubId);
    }
    expect(w.inbox!.filter((n) => n.kind === 'agentOffer')).toHaveLength(first.length);
    // The to-do follows the player by id: a namesake in the squad does not close it.
    const { todoOf } = await import('../career/todo');
    const offered = first[0]!;
    const mine = w.pack.players.find((x) => x.clubId === clubId)!;
    mine.knownAs = offered.knownAs ?? offered.name;
    expect(todoOf(w).some((t) => t.kind === 'agentOffer' && t.player === mine.knownAs)).toBe(true);
    const again = agentOffers(w, day + 14);
    for (const p of again) expect(first.map((x) => x.id)).not.toContain(p.id);
  });
});
