import { describe, expect, it } from 'vitest';
import { toJson } from '../bench/world';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision, type CareerWorld } from './advance';
import { CAREER_RULES_VERSION, loadCareer, saveCareer } from './save';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[1]!.clubId;
const play = (w: CareerWorld, n: number) => {
  for (let i = 0; i < n; i++) {
    const d = nextDecision(w);
    if (d.kind !== 'match') return;
    playDecision(w, d);
  }
};

describe('career snapshot', () => {
  it('a loaded snapshot goes on exactly like the world that never stopped', () => {
    const w = openCareer(pack, 41, clubId);
    play(w, 7);
    const json = saveCareer(w);
    const loaded = loadCareer(pack, 41, clubId, json);
    expect(toJson(loaded.season)).toBe(toJson(w.season));
    expect(loaded.ledger.cash).toBe(w.ledger.cash);
    play(w, 40);
    play(loaded, 40);
    expect(toJson(loaded.season)).toBe(toJson(w.season));
    expect(loaded.day).toBe(w.day);
  });

  it('refuses a snapshot from a newer rules version', () => {
    const json = saveCareer(openCareer(pack, 41, clubId)).replace(
      `"v":${CAREER_RULES_VERSION}`,
      `"v":${CAREER_RULES_VERSION + 1}`,
    );
    expect(() => loadCareer(pack, 41, clubId, json)).toThrow(/newer/);
  });
});
