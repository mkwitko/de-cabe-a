import { useEffect, useState } from 'react';

/**
 * 0 → `total` in steps, one step per idle period after the first paint: a long list mounts in
 * slices instead of one long task.
 */
export function useProgressive(total: number, step: number) {
  // server-rendered (tests, previews): everything at once
  const [n, setN] = useState(typeof window === 'undefined' ? total : 0);
  useEffect(() => {
    if (n >= total) return;
    const idle = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 50));
    const id = idle(() => setN((v) => Math.min(total, v + step)), { timeout: 1500 });
    return () => (window.cancelIdleCallback ?? clearTimeout)(id);
  }, [n, total, step]);
  return Math.min(n, total);
}

/**
 * False on the first render, true from the next frame: a heavy child (a sticker card) paints a
 * frame after its screen, so the tap that opened the screen is not the one that pays for it.
 */
export function useNextFrame() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(f);
  }, []);
  return on;
}
