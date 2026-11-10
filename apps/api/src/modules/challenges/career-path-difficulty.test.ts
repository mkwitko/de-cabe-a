import { describe, expect, it } from 'vitest';
import {
  type CareerLevelFacts,
  orderTrack,
  scoreCareerLevel,
  tierFor,
} from './career-path-difficulty';

const club = (
  clubName: string,
  countryCode = 'BR',
  toYear: number | null = 2010,
  appearances = 50,
) => ({ clubName, countryCode, toYear, appearances });

const facts = (over: Partial<CareerLevelFacts> = {}): CareerLevelFacts => ({
  id: 'a',
  number: 1,
  notability: 'T2',
  brazilian: true,
  selecao: false,
  trajectory: [club('Santos'), club('Barcelona', 'ES')],
  clubFame: [0.9, 1],
  openingShared: 2,
  ...over,
});

describe('scoreCareerLevel', () => {
  it('ranks a famous Brazilian icon well below an obscure foreign journeyman', () => {
    const icon = scoreCareerLevel(facts({ notability: 'T1', selecao: true }), 2026).score;
    const journeyman = scoreCareerLevel(
      facts({
        notability: 'T3',
        brazilian: false,
        trajectory: Array.from({ length: 11 }, (_, i) => club(`C${i}`, 'NO', 1995, 20)),
        clubFame: Array(11).fill(0.1),
        openingShared: 0,
      }),
      2026,
    ).score;
    expect(icon).toBeLessThan(20);
    expect(journeyman).toBeGreaterThan(70);
  });

  it('each factor alone makes a level harder', () => {
    const base = scoreCareerLevel(facts(), 2026).score;
    const harder = (over: Partial<CareerLevelFacts>) =>
      expect(scoreCareerLevel(facts(over), 2026).score).toBeGreaterThan(base);
    harder({ notability: 'T3' });
    harder({ brazilian: false, trajectory: [club('Ajax', 'NL'), club('Barcelona', 'ES')] });
    harder({ clubFame: [0.1, 0.2] });
    harder({ trajectory: [club('Santos', 'BR', 1985), club('Barcelona', 'ES', 1990)] });
    harder({ openingShared: 40 });
  });

  it('counts only the clubs a player can see (the first 6)', () => {
    const hidden = (fame: number) =>
      scoreCareerLevel(facts({ clubFame: [...Array(6).fill(0.5), fame] }), 2026).score;
    expect(hidden(0)).toBe(hidden(1));
  });

  it('treats an active player as current', () => {
    const active = facts({ trajectory: [club('Santos'), club('PSG', 'FR', null)] });
    expect(scoreCareerLevel(active, 2026).parts.era).toBe(0);
  });
});

describe('orderTrack', () => {
  const level = (id: string, number: number, score: number, notability = 'T2' as const) => ({
    ...facts({ id, number, notability }),
    score,
  });

  it('sorts free levels easiest first and keeps pinned numbers', () => {
    const out = orderTrack(
      [level('x', 1, 80), level('y', 2, 10), level('z', 3, 50), level('w', 4, 5)],
      new Set([1]),
    );
    expect(out.map((p) => [p.id, p.to])).toEqual([
      ['x', 1],
      ['w', 2],
      ['y', 3],
      ['z', 4],
    ]);
    expect(out[0]!.pinned).toBe(true);
  });

  it('keeps T3 out of the first 20 and T4 out of the first 59', () => {
    const levels = Array.from({ length: 80 }, (_, i) =>
      level(`p${i}`, i + 1, i < 10 ? 1 : 50 + i, i < 10 ? ('T4' as never) : 'T2'),
    );
    const out = orderTrack(levels, new Set());
    expect(out.filter((p) => p.to < 60).every((p) => !p.id.match(/^p\d$/))).toBe(true);
  });

  it('is idempotent: a second run moves nothing', () => {
    const levels = [level('a', 1, 30), level('b', 2, 10), level('c', 3, 20)];
    const first = orderTrack(levels, new Set());
    const again = orderTrack(
      levels.map((l) => ({ ...l, number: first.find((p) => p.id === l.id)!.to })),
      new Set(),
    );
    expect(again.every((p) => p.from === p.to)).toBe(true);
  });

  it('never lets the tier fall along the free levels', () => {
    expect(tierFor(90)).toBe(3);
    // 20 is tier 1 by rule; the easy T4 cannot sit at 59, so it lands at 60 after a hard level
    const levels = [level('a', 20, 60), level('b', 59, 60), level('c', 60, 10, 'T4' as never)];
    const out = orderTrack(levels, new Set());
    expect(out.map((p) => [p.id, p.to, p.tier])).toEqual([
      ['a', 20, 1],
      ['b', 59, 3],
      ['c', 60, 3],
    ]);
  });
});
