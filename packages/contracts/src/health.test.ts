import { describe, expect, it } from 'vitest';
import { HealthResponse } from './index';

describe('HealthResponse', () => {
  it('accepts { ok: true }', () => {
    expect(HealthResponse.parse({ ok: true })).toEqual({ ok: true });
  });

  it('rejects any other shape', () => {
    expect(HealthResponse.safeParse({ ok: false }).success).toBe(false);
    expect(HealthResponse.safeParse({ ok: true, extra: 1 }).success).toBe(false);
  });
});
