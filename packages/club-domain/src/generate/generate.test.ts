import { describe, expect, it } from 'vitest';
import { rngFrom } from '@decabeca/match-engine';
import { roleRating } from '../player/ratings';
import { PackSchema } from '../pack/schema';
import { SQUAD, generatePlayer, generateSquad } from './player';
import { generateMiniPack, packChecksum } from './pack';

describe('MC-013 generators', () => {
  it('same command, same result', () => {
    const a = generateSquad(rngFrom(7), { clubId: 'x', strength: 60, season: 2026 });
    const b = generateSquad(rngFrom(7), { clubId: 'x', strength: 60, season: 2026 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = generateSquad(rngFrom(8), { clubId: 'x', strength: 60, season: 2026 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('quality shows in the role rating; keepers keep and strikers finish', () => {
    const r = rngFrom(1);
    const p = (position: 'GK' | 'ST', quality: number, id: string) =>
      generatePlayer(r, { id, position, quality, clubId: null, season: 2026 });
    const weak = p('ST', 45, 'a');
    const strong = p('ST', 75, 'b');
    expect(roleRating(strong.attributes, 'advancedForward')).toBeGreaterThan(
      roleRating(weak.attributes, 'advancedForward') + 15,
    );
    const gk = p('GK', 60, 'c');
    expect(gk.attributes.reflexes).toBeGreaterThan(gk.attributes.finishing + 20);
    expect(strong.attributes.reflexes).toBeLessThan(25);
  });

  it('a squad covers the 13 positions at level 2+ and has keepers', () => {
    const s = generateSquad(rngFrom(3), { clubId: 'x', strength: 55, season: 2026 });
    expect(s).toHaveLength(SQUAD.length);
    const covered = new Set(
      s.flatMap((p) => p.positions.filter((q) => q.level >= 2).map((q) => q.position)),
    );
    expect(covered.size).toBe(13);
    expect(s.filter((p) => p.positions[0]!.position === 'GK').length).toBeGreaterThanOrEqual(2);
    const ages = s.map((p) => 2026 - Number(p.birthDate.slice(0, 4)));
    expect(Math.min(...ages)).toBeGreaterThanOrEqual(17);
    expect(Math.max(...ages)).toBeLessThanOrEqual(35);
  });
});

describe('MC-014 mini pack', () => {
  it('is identical byte for byte between runs, with a valid checksum', () => {
    const a = JSON.stringify(generateMiniPack());
    const b = JSON.stringify(generateMiniPack());
    expect(a).toBe(b);
    const p = generateMiniPack();
    expect(packChecksum(p)).toBe(p.checksum);
    expect(PackSchema.safeParse(p).success).toBe(true);
  });

  it('stronger clubs have better starters (favourites and underdogs exist)', () => {
    const p = generateMiniPack();
    const avg = (clubId: string) => {
      const st = p.players.filter((x) => x.clubId === clubId && x.positions[0]!.position === 'ST');
      return roleRating(st[0]!.attributes, 'advancedForward');
    };
    expect(avg(p.clubs.at(-1)!.id)).toBeGreaterThan(avg(p.clubs[0]!.id) + 15);
    expect(p.clubs).toHaveLength(8);
    expect(new Set(p.clubs.map((c) => c.name)).size).toBe(8);
  });
});
