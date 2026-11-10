import { describe, expect, it } from 'vitest';
import { candidatePlayerIds } from './award';

describe('candidatePlayerIds', () => {
  it('single-answer modes give their answer', () => {
    expect(candidatePlayerIds('CAREER_PATH', { answerPlayerId: 'p1' }, {})).toEqual(['p1']);
    expect(candidatePlayerIds('MYSTERY_PLAYER', { answer: { playerId: 'p2' } }, {})).toEqual([
      'p2',
    ]);
  });

  it('grid uses the players placed, not the eligible pool', () => {
    const state = { cells: [{ playerId: 'a' }, { playerId: null }, { playerId: 'b' }] };
    expect(
      candidatePlayerIds('FOOTBALL_GRID', { cells: [{ eligiblePlayerIds: ['z'] }] }, state),
    ).toEqual(['a', 'b']);
  });

  it('multi-player modes list everyone once', () => {
    const r2 = (a: string, b: string) => ({ a: { playerId: a }, b: { playerId: b } });
    expect(
      candidatePlayerIds('HIGHER_LOWER', { rounds: [r2('a', 'b'), r2('b', 'c')] }, {}),
    ).toEqual(['a', 'b', 'c']);
    expect(candidatePlayerIds('TIMELINE', { rounds: [{ playerId: 'a' }] }, {})).toEqual(['a']);
    expect(
      candidatePlayerIds('MISSING_XI', { slots: [{ playerId: 'a' }, { playerId: null }] }, {}),
    ).toEqual(['a']);
    expect(
      candidatePlayerIds('IMPOSTOR', { rounds: [{ players: [{ id: 'a' }, { id: 'b' }] }] }, {}),
    ).toEqual(['a', 'b']);
    expect(candidatePlayerIds('CONNECTIONS', { groups: [{ playerIds: ['a', 'b'] }] }, {})).toEqual([
      'a',
      'b',
    ]);
    expect(candidatePlayerIds('DRAFT', { rounds: [{ answerId: 'a' }] }, {})).toEqual(['a']);
  });
});
