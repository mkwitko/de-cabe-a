import { describe, expect, it } from 'vitest';
import { DRAFT_SLOTS, draft, type DraftConfig } from './engine';

const config: DraftConfig = {
  engine: 'draft',
  engineVersion: 1,
  difficultyTier: 1,
  rounds: DRAFT_SLOTS.map((slot, i) => ({
    slot,
    match: {
      competition: 'FIFA World Cup',
      season: '2002',
      stage: 'Final',
      team: 'Brazil',
      opponent: 'Germany',
      teamScore: 2,
      opponentScore: 0,
    },
    players: ['a', 'b', 'c', 'd'].map((x) => ({ id: `${x}${i}`, name: `${x}${i}` })),
    answerId: `a${i}`,
  })),
};

describe('draft engine', () => {
  it('scores right picks over 11 rounds and shares the XI as a pitch', () => {
    let s = draft.createInitialState(config);
    expect(() => draft.submit(s, { kind: 'pick', playerId: 'a5' }, config)).toThrow();
    for (let i = 0; i < 11; i++)
      s = draft.submit(s, { kind: 'pick', playerId: i < 9 ? `a${i}` : `b${i}` }, config).state;
    expect(draft.isCompleted(s)).toBe(true);
    expect(draft.score(s, config)).toBe(9);
    expect(draft.buildShareText(s, config, { label: 'Draft · Fase 1', url: 'u' })).toBe(
      'De Cabeça F.C. · Draft · Fase 1 · 9/11\n🟩🟥🟥\n🟩🟩🟩\n🟩🟩🟩🟩\n🟩\nu',
    );
    expect(() => draft.submit(s, { kind: 'pick', playerId: 'a0' }, config)).toThrow();
  });

  it('rejects a config whose slots break the 4-3-3', () => {
    const bad = { ...config, rounds: [...config.rounds].reverse() };
    expect(() => draft.validateConfig(bad)).toThrow();
  });
});
