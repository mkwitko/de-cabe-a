import { describe, expect, it } from 'vitest';
import { EngineRuleError } from '../contract';
import { starsFor } from '../stars';
import { MAX_WRONG, missingXi, type MissingXiConfig } from './engine';

const cfg: MissingXiConfig = {
  engine: 'missing-xi',
  engineVersion: 1,
  match: {
    competition: 'FIFA World Cup',
    season: '2002',
    stage: 'Final',
    homeTeam: 'Germany',
    awayTeam: 'Brazil',
    homeScore: 0,
    awayScore: 2,
    source: '2002 FIFA World Cup final',
  },
  side: 'away',
  slots: Array.from({ length: 11 }, (_, i) => ({
    position: i === 0 ? 'GK' : 'MF',
    jersey: i + 1,
    name: `Jogador ${i}`,
    playerId: `p${i}`,
    // Slots 0–2 are shown; 3–10 are to find.
    hidden: i >= 3,
  })),
  difficultyTier: 1,
};
const guess = (playerId: string) => ({ kind: 'guess' as const, playerId });

describe('missing-xi engine', () => {
  it('finds hidden players; unknown players count as wrong; repeats and shown players rejected', () => {
    let s = missingXi.createInitialState(cfg);
    let out = missingXi.submit(s, guess('p5'), cfg);
    expect(out.event).toEqual({ type: 'found', slot: 5 });
    s = out.state;
    out = missingXi.submit(s, guess('x9'), cfg);
    expect(out.event).toEqual({ type: 'wrong', wrongLeft: MAX_WRONG - 1 });
    s = out.state;
    expect(() => missingXi.submit(s, guess('p5'), cfg)).toThrow(EngineRuleError);
    expect(() => missingXi.submit(s, guess('x9'), cfg)).toThrow(EngineRuleError);
    expect(() => missingXi.submit(s, guess('p0'), cfg)).toThrow(EngineRuleError);
    expect(missingXi.isCompleted(s)).toBe(false);
  });

  it('completes when all hidden are found: score 100, 3 stars', () => {
    let s = missingXi.createInitialState(cfg);
    for (let i = 3; i < 11; i++) s = missingXi.submit(s, guess(`p${i}`), cfg).state;
    expect(missingXi.isCompleted(s)).toBe(true);
    expect(missingXi.score(s, cfg)).toBe(100);
    expect(starsFor('missing-xi', 100)).toBe(3);
  });

  it(`ends after ${MAX_WRONG} wrong guesses; score is the found share`, () => {
    let s = missingXi.createInitialState(cfg);
    for (const p of ['p3', 'p4', 'p5', 'p6']) s = missingXi.submit(s, guess(p), cfg).state;
    for (let i = 0; i < MAX_WRONG; i++) s = missingXi.submit(s, guess(`x${i}`), cfg).state;
    expect(missingXi.isCompleted(s)).toBe(true);
    expect(missingXi.score(s, cfg)).toBe(50);
    expect(starsFor('missing-xi', 50)).toBe(1);
    expect(starsFor('missing-xi', 75)).toBe(2);
    expect(starsFor('missing-xi', 25)).toBe(0);
  });

  it('public view hides names of slots not found yet; reveal shows all', () => {
    let s = missingXi.createInitialState(cfg);
    s = missingXi.submit(s, guess('p4'), cfg).state;
    const v = missingXi.toPublicView(s, cfg) as {
      slots: { name: string | null; found: boolean }[];
    };
    expect(v.slots[0]!.name).toBe('Jogador 0');
    expect(v.slots[3]!.name).toBeNull();
    expect(v.slots[4]).toMatchObject({ name: 'Jogador 4', found: true });
    expect(JSON.stringify(v)).not.toContain('p3');
    const r = missingXi.toRevealView(s, cfg) as { slots: { name: string }[] };
    expect(r.slots[3]!.name).toBe('Jogador 3');
  });

  it('give up ends the level; share text shows found / hidden', () => {
    let s = missingXi.createInitialState(cfg);
    s = missingXi.submit(s, guess('p3'), cfg).state;
    s = missingXi.submit(s, { kind: 'give_up' }, cfg).state;
    expect(missingXi.isCompleted(s)).toBe(true);
    expect(missingXi.buildShareText(s, cfg, { label: 'Escalação 1', url: 'u' })).toBe(
      'De Cabeça · Escalação 1 · 1/8\n🟩⬛⬛⬛⬛⬛⬛⬛\nu',
    );
  });

  it('rejects configs whose hidden slots have no player id', () => {
    const bad = {
      ...cfg,
      slots: cfg.slots.map((x, i) => (i === 4 ? { ...x, playerId: null } : x)),
    };
    expect(() => missingXi.validateConfig(bad)).toThrow();
  });
});
