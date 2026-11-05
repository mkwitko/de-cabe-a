import { describe, expect, it } from 'vitest';
import { snapshotHash } from './hash';

describe('snapshotHash', () => {
  it('is stable for equal snapshots regardless of key order', () => {
    expect(snapshotHash({ a: 1, b: { c: [1, { d: 2, e: 3 }] } })).toBe(
      snapshotHash({ b: { c: [1, { e: 3, d: 2 }] }, a: 1 }),
    );
  });
  it('changes when content changes, including array order', () => {
    expect(snapshotHash({ a: [1, 2] })).not.toBe(snapshotHash({ a: [2, 1] }));
  });
});
