import { expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision } from './advance';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

it('every match leaves at most three facts, each one signed and not negligible', () => {
  const w = openCareer(structuredClone(pack), 3, clubId);
  for (let i = 0; i < 4; i++) {
    const d = nextDecision(w);
    if (d.kind !== 'match') break;
    playDecision(w, d);
    expect(w.report).toBeDefined();
    expect(w.report!.length).toBeLessThanOrEqual(3);
    for (const f of w.report!) {
      expect([1, -1]).toContain(f.side);
      expect(f.impact).toBeGreaterThanOrEqual(0.05);
    }
  }
});

it('a signing better than the eleven takes a place and says whose; a weak one only sits', async () => {
  const { signingEffect } = await import('./preview');
  const { bestRoles } = await import('../player/ratings');
  const w = openCareer(structuredClone(pack), 3, clubId);
  const others = w.pack.players.filter((p) => p.clubId && p.clubId !== w.clubId);
  const rate = (p: (typeof others)[number]) => bestRoles(p.attributes, 1)[0]!.rating;
  const sorted = [...others].sort((a, b) => rate(b) - rate(a));
  const star = signingEffect(w, sorted[0]!.id);
  const scrub = signingEffect(w, sorted.at(-1)!.id);
  expect(star.enters).toBe(true);
  expect(star.displaced).not.toBeNull();
  expect(star.displaced!.rating).toBeLessThanOrEqual(star.rating);
  expect(scrub.enters).toBe(false);
  expect(scrub.displaced).toBeNull();
});
