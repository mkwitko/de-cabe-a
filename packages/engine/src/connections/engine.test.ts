import { describe, expect, it } from 'vitest';
import { EngineRuleError } from '../contract';
import { starsFor } from '../stars';
import { connections, MAX_MISTAKES, type ConnectionsConfig } from './engine';

const ids = (g: number) => [0, 1, 2, 3].map((i) => `g${g}p${i}`);
const cfg: ConnectionsConfig = {
  engine: 'connections',
  engineVersion: 1,
  groups: [0, 1, 2, 3].map((g) => ({
    label: `Grupo ${g}`,
    playerIds: ids(g),
  })),
  tiles: [0, 1, 2, 3].flatMap((g) => ids(g).map((id) => ({ id, name: `Nome ${id}` }))).reverse(),
  difficultyTier: 1,
};
const pick = (playerIds: string[]) => ({ kind: 'group' as const, playerIds });

describe('connections engine', () => {
  it('finds a group; a miss says when three of four are right', () => {
    let s = connections.createInitialState(cfg);
    let out = connections.submit(s, pick(ids(2)), cfg);
    expect(out.event).toEqual({ type: 'group_found', group: 2 });
    s = out.state;
    out = connections.submit(s, pick([...ids(0).slice(0, 3), 'g1p0']), cfg);
    expect(out.event).toEqual({ type: 'miss', oneAway: true, mistakesLeft: MAX_MISTAKES - 1 });
    s = out.state;
    out = connections.submit(s, pick(['g0p0', 'g0p1', 'g1p0', 'g1p1']), cfg);
    expect(out.event).toMatchObject({ type: 'miss', oneAway: false });
    expect(() => connections.submit(out.state, pick(ids(2)), cfg)).toThrow(EngineRuleError);
    expect(() =>
      connections.submit(out.state, pick(['g0p0', 'g0p0', 'g0p1', 'g0p2']), cfg),
    ).toThrow();
  });

  it('wins with all four groups; 3 stars with at most one mistake', () => {
    let s = connections.createInitialState(cfg);
    s = connections.submit(s, pick(['g0p0', 'g0p1', 'g1p0', 'g1p1']), cfg).state;
    for (const g of [0, 1, 2, 3]) s = connections.submit(s, pick(ids(g)), cfg).state;
    expect(s.status).toBe('WON');
    const score = connections.score(s, cfg);
    expect(starsFor('connections', score)).toBe(3);
  });

  it(`loses after ${MAX_MISTAKES} mistakes; the view never shows unfound groups`, () => {
    let s = connections.createInitialState(cfg);
    s = connections.submit(s, pick(ids(0)), cfg).state;
    const view = JSON.stringify(connections.toPublicView(s, cfg));
    expect(view).toContain('Grupo 0');
    expect(view).not.toContain('Grupo 1');
    const misses = [
      ['g1p0', 'g1p1', 'g2p0', 'g2p1'],
      ['g1p0', 'g1p1', 'g2p0', 'g3p1'],
      ['g1p0', 'g2p1', 'g2p0', 'g3p1'],
      ['g3p0', 'g1p1', 'g2p0', 'g3p1'],
    ];
    for (const m of misses.slice(0, MAX_MISTAKES)) s = connections.submit(s, pick(m), cfg).state;
    expect(s.status).toBe('LOST');
    expect(starsFor('connections', connections.score(s, cfg))).toBe(0);
  });

  it('stars: all four groups = 2, two or three = 1', () => {
    expect(starsFor('connections', 40)).toBe(2);
    expect(starsFor('connections', 20)).toBe(1);
    expect(starsFor('connections', 30)).toBe(1);
    expect(starsFor('connections', 10)).toBe(0);
  });
});
