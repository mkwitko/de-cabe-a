import { describe, expect, it } from 'vitest';
import { ART } from './lottie-art';

type Layer = { ip: number; op: number; ks: Record<string, { a: number; k: { t: number }[] }> };

describe('lottie-art', () => {
  it.each(Object.keys(ART) as (keyof typeof ART)[])('%s: layers live inside the comp', (name) => {
    const c = ART[name](['#f5c400', 'rgb(240, 245, 239)']) as { op: number; layers: Layer[] };
    expect(c.layers.length).toBeGreaterThan(0);
    for (const l of c.layers) {
      expect(l.ip).toBeLessThan(l.op);
      expect(l.op).toBeLessThanOrEqual(c.op);
      for (const p of Object.values(l.ks))
        if (p.a) expect(p.k.every((k, i) => i === 0 || k.t > p.k[i - 1]!.t)).toBe(true);
    }
  });

  it('colours the pack in the rarity colour', () => {
    expect(JSON.stringify(ART.packBurst(['#ff0000']))).toContain('[1,0,0,1]');
    expect(JSON.stringify(ART.goal(['rgb(0, 0, 255)']))).toContain('[0,0,1,1]');
  });
});
