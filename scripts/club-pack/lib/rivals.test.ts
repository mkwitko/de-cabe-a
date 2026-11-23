import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDerbies, resolveRivals } from './rivals';

describe('rivals', () => {
  const file = JSON.parse(readFileSync(new URL('../data/rivals.json', import.meta.url), 'utf8'));

  it('the data file parses and has no repeated pair', () => {
    const rows = parseDerbies(file);
    expect(rows.length).toBeGreaterThanOrEqual(100);
    const keys = rows.map(([a, sa, b, sb]) => [`${a}${sa}`, `${b}${sb}`].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('rejects a malformed row', () => {
    expect(() => parseDerbies({ derbies: [['A', 'SP', 'B', 'SP', 'x', 9]] })).toThrow();
    expect(() => parseDerbies({ derbies: [['A', 'SP', 'A', 'SP', 'x', 2]] })).toThrow();
  });

  it('resolves both ways, strongest derby first, and counts what the pack lacks', () => {
    const ids: Record<string, string> = { 'a|SP': 'A', 'b|SP': 'B', 'c|SP': 'C' };
    const { rivals, matched, unmatched } = resolveRivals(
      parseDerbies({
        derbies: [
          ['a', 'SP', 'b', 'SP', 'ab', 1],
          ['a', 'SP', 'c', 'SP', 'ac', 3],
          ['a', 'SP', 'z', 'SP', 'az', 3],
        ],
      }),
      (n, s) => ids[`${n}|${s}`],
    );
    expect(matched).toBe(2);
    expect(rivals.get('A')).toEqual(['C', 'B']);
    expect(rivals.get('C')).toEqual(['A']);
    expect(unmatched).toHaveLength(1);
  });
});
