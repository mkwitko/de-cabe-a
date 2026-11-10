import { describe, expect, it, vi } from 'vitest';
import { getConsent, setConsent, subscribeConsent } from './consent';

describe('consent', () => {
  it('starts undecided (nothing optional runs) and notifies on a choice', () => {
    expect(getConsent()).toBeNull();
    const seen = vi.fn();
    const off = subscribeConsent(seen);
    setConsent({ analytics: true, ads: false });
    expect(getConsent()).toEqual({ analytics: true, ads: false });
    expect(seen).toHaveBeenCalledTimes(1);
    off();
  });
});
