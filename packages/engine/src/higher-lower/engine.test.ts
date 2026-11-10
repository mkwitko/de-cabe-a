import { describe, expect, it } from 'vitest';
import { EngineRuleError } from '../contract';
import { starsFor } from '../stars';
import { higherLower, type HigherLowerConfig } from './engine';

const side = (n: string, v: number) => ({
  playerId: n,
  playerName: n,
  clubName: `Clube ${n}`,
  value: v,
});
const cfg: HigherLowerConfig = {
  engine: 'higher-lower',
  engineVersion: 1,
  rounds: [0, 1, 2, 3, 4].map((i) => ({
    metric: i % 2 ? 'games' : 'goals',
    a: side(`a${i}`, 10 + i),
    b: side(`b${i}`, 50 + i),
  })),
  difficultyTier: 1,
};

describe('higher-lower engine', () => {
  it('one choice per round; values shown after; score = right choices', () => {
    let s = higherLower.createInitialState(cfg);
    const evs = [];
    for (const side of ['b', 'a', 'b', 'b', 'b'] as const) {
      const out = higherLower.submit(s, { kind: 'choose', side }, cfg);
      s = out.state;
      evs.push(out.event);
    }
    expect(evs[0]).toEqual({ type: 'correct', round: 0, values: [10, 50] });
    expect(evs[1]).toEqual({ type: 'wrong', round: 1, values: [11, 51] });
    expect(s.status).toBe('COMPLETED');
    expect(higherLower.score(s, cfg)).toBe(4);
    expect(starsFor('higher-lower', 4)).toBe(2);
    expect(
      higherLower.buildShareText(s, cfg, { label: 'Mais ou Menos · Fase 1', url: 'x.br' }),
    ).toBe('De Cabeça F.C. · Mais ou Menos · Fase 1 · 4/5\n✅❌✅✅✅\nx.br');
  });

  it('never shows the current values; past rounds show them', () => {
    const s0 = higherLower.createInitialState(cfg);
    expect(JSON.stringify(higherLower.toPublicView(s0, cfg))).not.toContain('"value"');
    const s1 = higherLower.submit(s0, { kind: 'choose', side: 'b' }, cfg).state;
    expect(higherLower.toPublicView(s1, cfg)).toMatchObject({
      round: 1,
      rounds: [{ metric: 'goals', a: { value: 10 }, b: { value: 50 }, choice: 'b', correct: true }],
    });
  });

  it('refuses ties at build time; give_up ends; no play after the end', () => {
    expect(() =>
      higherLower.validateConfig({
        ...cfg,
        rounds: cfg.rounds.map((r) => ({ ...r, b: { ...r.b, value: r.a.value } })),
      }),
    ).toThrow();
    const out = higherLower.submit(higherLower.createInitialState(cfg), { kind: 'give_up' }, cfg);
    expect(out.state.status).toBe('COMPLETED');
    expect(() => higherLower.submit(out.state, { kind: 'choose', side: 'a' }, cfg)).toThrow(
      EngineRuleError,
    );
  });
});
