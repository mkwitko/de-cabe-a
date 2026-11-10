import { describe, expect, it } from 'vitest';
import {
  canSilence,
  dismissed,
  due,
  HOME_EVERY,
  levelMoment,
  levelsDone,
  OFFER_EVERY,
  offerMoment,
  shown,
  silenced,
  started,
  type NudgeState,
} from './nudges';

const s0: NudgeState = { seen: [], dismissed: 0 };
const T = 1_700_000_000_000;

describe('nudges', () => {
  it('home never nudges before its clock starts, then once every 3 days', () => {
    expect(due(s0, 'home', T)).toBe(false);
    const s = started(s0, T);
    expect(due(s, 'home', T + HOME_EVERY - 1)).toBe(false);
    expect(due(s, 'home', T + HOME_EVERY)).toBe(true);
    const after = shown(s, 'home', T + HOME_EVERY);
    expect(due(after, 'home', T + HOME_EVERY + 1)).toBe(false);
    expect(due(after, 'home', T + 2 * HOME_EVERY)).toBe(true);
    expect(started(after, T + 5 * HOME_EVERY).last).toBe(T + HOME_EVERY);
  });

  it('a milestone speaks once and pushes the home nudge back', () => {
    const s = shown(started(s0, T), 'sticker', T + HOME_EVERY);
    expect(due(s, 'sticker', T + 10 * HOME_EVERY)).toBe(false);
    expect(due(s, 'promotion', T)).toBe(true);
    expect(due(s, 'home', T + HOME_EVERY + 1)).toBe(false);
  });

  it('the end of a level picks one milestone: promotion, sticker, then 5th level', () => {
    const e = { promoted: true, sticker: true, levelsDone: 5 };
    expect(levelMoment(s0, e, T)).toBe('promotion');
    const s1 = shown(s0, 'promotion', T);
    expect(levelMoment(s1, e, T)).toBe('sticker');
    const s2 = shown(s1, 'sticker', T);
    expect(levelMoment(s2, e, T)).toBe('level5');
    expect(levelMoment(s0, { promoted: false, sticker: false, levelsDone: 4 }, T)).toBeNull();
    expect(levelMoment(shown(s2, 'level5', T), e, T)).toBeNull();
  });

  it('offers "não mostrar de novo" after 2 dismissals, which silences everything', () => {
    const s = dismissed(dismissed(s0));
    expect(canSilence(dismissed(s0))).toBe(false);
    expect(canSilence(s)).toBe(true);
    const off = silenced(started(s, T));
    expect(due(off, 'home', T + 10 * HOME_EVERY)).toBe(false);
    expect(levelMoment(off, { promoted: true, sticker: true, levelsDone: 9 }, T)).toBeNull();
  });

  it('counts finished levels across modes', () => {
    expect(
      levelsDone({ totalStars: 9, CAREER_PATH: { completed: 3 }, FOOTBALL_GRID: { completed: 2 } }),
    ).toBe(5);
  });
});

describe('Clube offers', () => {
  const day = 24 * 60 * 60 * 1000;
  it('speaks after a promotion or a rare sticker, then waits 14 days', () => {
    expect(offerMoment({}, { promoted: true }, T)).toBe('promotion');
    expect(offerMoment({}, { promoted: false, rarity: 'lenda' }, T)).toBe('rare');
    expect(offerMoment({}, { promoted: false, rarity: 'bronze' }, T)).toBeNull();
    expect(offerMoment({ last: T }, { promoted: true }, T + 13 * day)).toBeNull();
    expect(offerMoment({ last: T }, { promoted: true }, T + OFFER_EVERY)).toBe('promotion');
    expect(offerMoment({ never: true }, { promoted: true }, T)).toBeNull();
  });
});
