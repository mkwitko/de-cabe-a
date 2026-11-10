import { describe, expect, it } from 'vitest';
import { installKind } from './install';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile';

describe('installKind', () => {
  it('offers the browser prompt when Chrome gave one', () => {
    expect(installKind({ ua: ANDROID, touchPoints: 5, standalone: false, prompt: true })).toBe(
      'prompt',
    );
  });
  it('gives iPhone and iPad the Share hint, not a desktop Mac', () => {
    expect(installKind({ ua: IPHONE, touchPoints: 5, standalone: false, prompt: false })).toBe(
      'ios',
    );
    expect(installKind({ ua: IPAD, touchPoints: 5, standalone: false, prompt: false })).toBe('ios');
    expect(installKind({ ua: IPAD, touchPoints: 0, standalone: false, prompt: false })).toBe(null);
  });
  it('says nothing once installed or without a way to install', () => {
    expect(installKind({ ua: IPHONE, touchPoints: 5, standalone: true, prompt: false })).toBe(null);
    expect(installKind({ ua: ANDROID, touchPoints: 5, standalone: false, prompt: false })).toBe(
      null,
    );
  });
});
