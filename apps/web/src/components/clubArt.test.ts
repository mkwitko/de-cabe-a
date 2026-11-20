import { describe, expect, it } from 'vitest';
import { crestSvg, kitSvg, KIT_PATTERNS, type Kit } from './clubArt';

const kit: Kit = { body: '#cc0000', sleeves: '#000000', shorts: '#ffffff', socks: '#000000' };
const hexes = (svg: string) => [...svg.matchAll(/(?:fill|stroke)="(#[^"]*)"/g)].map((m) => m[1]!);

describe('club art', () => {
  it('crest is deterministic and picks the shape by hash of the name', () => {
    const a = crestSvg('Flamengo', ['#cc0000', '#000000']);
    expect(crestSvg('Flamengo', ['#cc0000', '#000000'])).toBe(a);
    const shapes = new Set(
      ['Flamengo', 'Bahia', 'Santos', 'Vitória', 'Remo', 'Ceará', 'Sport', 'Fluminense'].map(
        (n) => /<path d="([^"]+)"\/>/.exec(crestSvg(n, ['#cc0000', '#000000']))![1],
      ),
    );
    expect(shapes.size).toBeGreaterThan(1);
  });

  it.each(KIT_PATTERNS)('crest and kit with pattern %s draw only valid colours', (pattern) => {
    for (const svg of [
      crestSvg('Bahia', ['#0000ff', '#ff0000'], pattern),
      kitSvg({ ...kit, pattern }),
    ])
      for (const c of hexes(svg)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('an invalid colour never reaches the markup', () => {
    expect(kitSvg({ ...kit, body: '"><script>x</script>' })).not.toContain('script');
    expect(crestSvg('X', ['red', 'url(#a)'])).not.toContain('url(#a)"');
  });

  it('kit is deterministic and the crest shows the initials', () => {
    expect(kitSvg(kit)).toBe(kitSvg({ ...kit }));
    expect(crestSvg('Flamengo', ['#cc0000', '#000000'])).toContain('>FLA<');
  });
});
