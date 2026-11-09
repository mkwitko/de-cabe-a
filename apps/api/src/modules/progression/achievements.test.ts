import { describe, expect, it } from 'vitest';
import { achievements, type AchievementInput } from './achievements';

const a = (over: Partial<AchievementInput['attempts'][number]> = {}) => ({
  gameMode: 'CAREER_PATH' as const,
  stars: 3,
  score: 60,
  timed: false,
  daily: null,
  ...over,
});
const done = (input: AchievementInput) =>
  achievements(input)
    .filter((x) => x.done)
    .map((x) => x.id);

describe('achievements (GROWTH_PLAN.md 2.3)', () => {
  it('14 achievements in 3 groups; a new player has none', () => {
    const items = achievements({ attempts: [], dailyModes: new Map(), biggestLeague: 0 });
    expect(items).toHaveLength(14);
    expect(new Set(items.map((x) => x.category)).size).toBe(3);
    expect(items.every((x) => !x.done && x.progress === 0)).toBe(true);
  });

  it('progress stops at the goal; each rule reads only its own facts', () => {
    const input: AchievementInput = {
      attempts: [
        ...Array.from({ length: 12 }, () => a()),
        a({ gameMode: 'FOOTBALL_GRID', score: 9, daily: '2026-11-09' }),
        a({ gameMode: 'IMPOSTOR', stars: 0, score: 1, timed: true, daily: '2026-11-09' }),
      ],
      dailyModes: new Map([['2026-11-09', 2]]),
      biggestLeague: 3,
    };
    expect(done(input)).toEqual(['estreia', 'faro-de-gol', 'dia-completo']);
    const byId = Object.fromEntries(achievements(input).map((x) => [x.id, x]));
    expect(byId.titular).toMatchObject({ progress: 39, goal: 50 });
    expect(byId['faro-de-gol']).toMatchObject({ progress: 10, goal: 10 });
    expect(byId.relogio!.progress).toBe(0);
    expect(byId.resenha).toMatchObject({ progress: 3, done: false });
    expect(byId.fregues!.progress).toBe(1);
  });
});
