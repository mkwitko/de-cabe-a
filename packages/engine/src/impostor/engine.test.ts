import { describe, expect, it } from 'vitest';
import { EngineRuleError } from '../contract';
import { starsFor } from '../stars';
import { impostor, type ImpostorConfig } from './engine';

const round = (i: number) => ({
  clubId: `club${i}`,
  clubName: `Clube ${i}`,
  clubCountryCode: 'BR',
  players: ['a', 'b', 'c', 'x'].map((p) => ({ id: `${p}${i}`, name: `Jogador ${p}${i}` })),
  impostorId: `x${i}`,
});
const cfg: ImpostorConfig = {
  engine: 'impostor',
  engineVersion: 1,
  rounds: [0, 1, 2, 3, 4].map(round),
  difficultyTier: 1,
};
const pick = (playerId: string) => ({ kind: 'pick' as const, playerId });

describe('impostor engine', () => {
  it('one pick per round; right and wrong; finished after 5 rounds with score = right picks', () => {
    let s = impostor.createInitialState(cfg);
    const events = [];
    for (const [i, id] of ['x0', 'a1', 'x2', 'x3', 'x4'].entries()) {
      const out = impostor.submit(s, pick(id), cfg);
      s = out.state;
      events.push(out.event);
      expect(impostor.isCompleted(s)).toBe(i === 4);
    }
    expect(events[0]).toEqual({ type: 'correct', round: 0, impostorId: 'x0' });
    expect(events[1]).toEqual({ type: 'wrong', round: 1, impostorId: 'x1' });
    expect(s.status).toBe('COMPLETED');
    expect(impostor.score(s, cfg)).toBe(4);
    expect(starsFor('impostor', 4)).toBe(2);
    expect(starsFor('impostor', 5)).toBe(3);
    expect(starsFor('impostor', 3)).toBe(1);
    expect(starsFor('impostor', 2)).toBe(0);
    expect(impostor.buildShareText(s, cfg, { label: 'Impostor · Fase 1', url: 'x.br' })).toBe(
      'De Cabeça F.C. · Impostor · Fase 1 · 4/5\n✅❌✅✅✅\nx.br',
    );
  });

  it('never shows the impostor of the current round; past rounds show it', () => {
    const s0 = impostor.createInitialState(cfg);
    const v0 = impostor.toPublicView(s0, cfg) as { current: unknown; rounds: unknown[] };
    expect(JSON.stringify(v0)).not.toContain('impostorId');
    const s1 = impostor.submit(s0, pick('a0'), cfg).state;
    expect(impostor.toPublicView(s1, cfg)).toMatchObject({
      round: 1,
      rounds: [{ clubName: 'Clube 0', picked: 'a0', impostorId: 'x0', correct: false }],
      current: { clubName: 'Clube 1', players: expect.any(Array) },
    });
  });

  it('rejects a player outside the round and plays after the end; give_up ends the level', () => {
    const s0 = impostor.createInitialState(cfg);
    expect(() => impostor.submit(s0, pick('x1'), cfg)).toThrow(EngineRuleError);
    const out = impostor.submit(s0, { kind: 'give_up' }, cfg);
    expect(out.state.status).toBe('COMPLETED');
    expect(impostor.score(out.state, cfg)).toBe(0);
    expect(() => impostor.submit(out.state, pick('x0'), cfg)).toThrow(EngineRuleError);
  });
});
