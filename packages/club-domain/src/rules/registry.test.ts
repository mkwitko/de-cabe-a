import { describe, expect, it } from 'vitest';
import { RULES, ruleOn } from './registry';

describe('regulations as data (mapa de conhecimento §2.7)', () => {
  it('every rule has a source and its versions do not overlap', () => {
    for (const versions of Object.values(RULES)) {
      for (const r of versions) expect(r.source.length).toBeGreaterThan(10);
      for (let i = 1; i < versions.length; i++) {
        const before = versions[i - 1]!;
        expect(before.until).toBeDefined();
        expect(before.until! < versions[i]!.from).toBe(true);
      }
    }
  });

  it('a change applies from its date, never before', () => {
    expect(ruleOn('loans', '2023-01-15').atOnce).toBe(8);
    expect(ruleOn('loans', '2024-01-15').atOnce).toBe(7);
    expect(ruleOn('loans', '2026-03-01').atOnce).toBe(6);
    expect(ruleOn('foreignersPerMatch', '2026-06-01')).toBe(9);
    expect(ruleOn('foreignersPerMatch', '2027-06-01')).toBe(8);
    expect(ruleOn('foreignersPerMatch', '2031-06-01')).toBe(5);
  });
});
