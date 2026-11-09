import { describe, expect, it } from 'vitest';
import type { AttemptResponse } from '@decabeca/contracts';
import { hapticFor } from './haptics';

const at = (status: string, stars: number, type?: string) =>
  ({
    attempt: { status, stars },
    ...(type ? { event: { type } } : {}),
  }) as unknown as AttemptResponse;

describe('hapticFor', () => {
  it('ticks right, double-taps wrong, one beat per star at the end', () => {
    expect(hapticFor(at('IN_PROGRESS', 0, 'correct'))).toBe(12);
    expect(hapticFor(at('IN_PROGRESS', 0, 'group_found'))).toBe(12);
    expect(hapticFor(at('IN_PROGRESS', 0, 'miss'))).toEqual([20, 60, 20]);
    expect(hapticFor(at('IN_PROGRESS', 0, 'hint'))).toBeNull();
    expect(hapticFor(at('WON', 3, 'correct'))).toEqual([18, 70, 18, 70, 18]);
    expect(hapticFor(at('LOST', 0, 'lost'))).toEqual([20, 60, 20]);
  });
});
