import { describe, expect, it } from 'vitest';
import { EngineRuleError } from '../contract';
import { starsFor } from '../stars';
import { timeline, type TimelineConfig } from './engine';

const round = (i: number) => ({
  playerId: `p${i}`,
  playerName: `Jogador ${i}`,
  // Chronological order; `shuffled` is the display order frozen at build time.
  clubs: ['a', 'b', 'c', 'd'].map((c, k) => ({
    id: `${c}${i}`,
    name: `Clube ${c}${i}`,
    from: 2000 + k,
    to: 2001 + k,
  })),
  shuffled: [`c${i}`, `a${i}`, `d${i}`, `b${i}`],
});
const cfg: TimelineConfig = {
  engine: 'timeline',
  engineVersion: 1,
  rounds: [0, 1, 2, 3, 4].map(round),
  difficultyTier: 1,
};
const right = (i: number) => ({
  kind: 'order' as const,
  clubIds: ['a', 'b', 'c', 'd'].map((c) => `${c}${i}`),
});

describe('timeline engine', () => {
  it('one order per round; finished after 5 rounds; score = rounds in the right order', () => {
    let s = timeline.createInitialState(cfg);
    const wrong = { kind: 'order' as const, clubIds: ['b1', 'a1', 'c1', 'd1'] };
    const events = [];
    for (const input of [right(0), wrong, right(2), right(3), right(4)]) {
      const out = timeline.submit(s, input, cfg);
      s = out.state;
      events.push(out.event);
    }
    expect(events[0]).toMatchObject({ type: 'correct', round: 0 });
    expect(events[1]).toMatchObject({ type: 'wrong', round: 1, order: ['a1', 'b1', 'c1', 'd1'] });
    expect(s.status).toBe('COMPLETED');
    expect(timeline.score(s, cfg)).toBe(4);
    expect(starsFor('timeline', 4)).toBe(2);
    expect(timeline.buildShareText(s, cfg, { label: 'Linha do tempo · Fase 1', url: 'x.br' })).toBe(
      'De Cabeça · Linha do tempo · Fase 1 · 4/5\n✅❌✅✅✅\nx.br',
    );
  });

  it('shows the current round shuffled and without years; past rounds with years', () => {
    const s0 = timeline.createInitialState(cfg);
    const v0 = timeline.toPublicView(s0, cfg) as { current: { clubs: { id: string }[] } };
    expect(v0.current.clubs.map((c) => c.id)).toEqual(['c0', 'a0', 'd0', 'b0']);
    expect(JSON.stringify(v0)).not.toContain('"from"');
    const s1 = timeline.submit(s0, right(0), cfg).state;
    expect(timeline.toPublicView(s1, cfg)).toMatchObject({
      round: 1,
      rounds: [
        {
          playerName: 'Jogador 0',
          correct: true,
          clubs: expect.arrayContaining([expect.objectContaining({ id: 'a0', from: 2000 })]),
        },
      ],
    });
  });

  it('rejects an order that is not a permutation of the round clubs; give_up ends the level', () => {
    const s0 = timeline.createInitialState(cfg);
    expect(() =>
      timeline.submit(s0, { kind: 'order', clubIds: ['a0', 'a0', 'c0', 'd0'] }, cfg),
    ).toThrow(EngineRuleError);
    const out = timeline.submit(s0, { kind: 'give_up' }, cfg);
    expect(out.state.status).toBe('COMPLETED');
    expect(timeline.score(out.state, cfg)).toBe(0);
  });
});
