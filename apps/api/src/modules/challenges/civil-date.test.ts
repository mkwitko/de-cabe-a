import { describe, expect, it } from 'vitest';
import { addDays, civilDate } from './civil-date';

describe('civilDate (America/Sao_Paulo, UTC-3)', () => {
  it('rolls over at local midnight, not UTC midnight', () => {
    expect(civilDate(new Date('2026-11-06T02:59:00Z'))).toBe('2026-11-05'); // 23:59 local
    expect(civilDate(new Date('2026-11-06T03:01:00Z'))).toBe('2026-11-06'); // 00:01 local
  });
  it('adds days across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-05', -180)).toBe('2026-05-09');
  });
});
