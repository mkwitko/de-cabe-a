import { describe, expect, it } from 'vitest';
import { ATTRIBUTES, ROLES, type Attributes } from '@decabeca/match-engine';
import { ROLE_WEIGHTS, bestRoles, roleRating, summaries } from './ratings';

const flat = (v: number) => Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Attributes;

describe('MC-012 rating per role', () => {
  it('weights of every role sum to 1', () => {
    for (const r of ROLES) {
      const s = ROLE_WEIGHTS[r].reduce((a, [, w]) => a + w, 0);
      expect(s).toBeCloseTo(1, 9);
    }
  });

  it('flat attributes give the same rating for every role', () => {
    for (const r of ROLES) expect(roleRating(flat(60), r)).toBe(60);
  });

  it('the rating moves with the attribute the role weighs, and only with it', () => {
    const a = flat(60);
    const b = { ...a, finishing: 90 };
    expect(roleRating(b, 'advancedForward')).toBeGreaterThan(roleRating(a, 'advancedForward'));
    expect(roleRating(b, 'anchor')).toBe(roleRating(a, 'anchor'));
    const c = { ...a, reflexes: 95 };
    expect(roleRating(c, 'goalkeeper')).toBeGreaterThan(60);
    expect(roleRating(c, 'centreBack')).toBe(60);
  });

  it('best roles and six summaries', () => {
    const a = { ...flat(50), passing: 85, vision: 85, firstTouch: 80 };
    expect(['deepPlaymaker', 'playmaker']).toContain(bestRoles(a, 1)[0]!.role);
    expect(summaries(flat(55))).toEqual({
      technical: 55,
      mental: 55,
      physical: 55,
      attack: 55,
      defence: 55,
      goalkeeping: 55,
    });
  });
});
