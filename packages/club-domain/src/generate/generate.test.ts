import { describe, expect, it } from 'vitest';
import { rngFrom } from '@decabeca/match-engine';
import { roleRating } from '../player/ratings';
import { PackSchema } from '../pack/schema';
import { SQUAD, generatePlayer, generateSquad } from './player';
import { matchCount } from '../competition/season';
import { realDivisions } from './competitions';
import { CompetitionSchema } from '../competition/schema';
import { regulationsFor } from '../competition/outcomes';
import { generateDevPack, generateMiniPack, packChecksum, slimPack } from './pack';
import { nextDecision, openCareer, playDecision } from '../career/advance';

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

describe('MC-014 br-dev-1', () => {
  const p = generateDevPack();

  it('is identical byte for byte between runs, with a valid checksum', () => {
    expect(JSON.stringify(generateDevPack())).toBe(JSON.stringify(p));
    expect(packChecksum(p)).toBe(p.checksum);
    expect(PackSchema.safeParse(p).success).toBe(true);
    expect(p.id).toBe('br-dev-1');
  });

  it('four divisions with the real sizes (05 §8): 20, 20, 20 and 96 clubs', () => {
    const div = p.competitions.filter((c) => c.tier !== null).sort((a, b) => a.tier! - b.tier!);
    expect(div.map((c) => c.clubIds.length)).toEqual([20, 20, 20, 96]);
    expect(p.clubs).toHaveLength(156);
    expect(new Set(div.flatMap((c) => c.clubIds)).size).toBe(156);
    expect(new Set(p.clubs.map((c) => c.name)).size).toBe(156);
  });

  it('one competition phase of each kind', () => {
    const kinds = new Set(p.competitions.flatMap((c) => c.phases.map((x) => x.kind)));
    expect([...kinds].sort()).toEqual(['final', 'grupos', 'liga', 'mata-mata']);
  });

  it('match volumes within 20% of the real ones (05 §8)', () => {
    const real: Record<number, number> = { 1: 380, 2: 384, 3: 216, 4: 610 };
    for (const c of p.competitions.filter((x) => x.tier !== null)) {
      const n = matchCount(c);
      expect(Math.abs(n - real[c.tier!]!) / real[c.tier!]!).toBeLessThanOrEqual(0.2);
    }
  });

  it('divisions get weaker going down; squads cover every club', () => {
    const strength = (tier: number) => {
      const ids = new Set(p.competitions.find((c) => c.tier === tier)!.clubIds);
      const st = p.players.filter((x) => ids.has(x.clubId!) && x.positions[0]!.position === 'ST');
      return st.reduce((s, x) => s + roleRating(x.attributes, 'advancedForward'), 0) / st.length;
    };
    expect(strength(1)).toBeGreaterThan(strength(2));
    expect(strength(2)).toBeGreaterThan(strength(3));
    expect(strength(3)).toBeGreaterThan(strength(4));
    expect(p.players).toHaveLength(156 * SQUAD.length);
  });
});

describe('MC-014 mini pack competitions', () => {
  it('a short league, a play-off and a final', () => {
    const c = generateMiniPack().competitions[0]!;
    expect(c.phases.map((x) => x.kind)).toEqual(['liga', 'mata-mata', 'final']);
    expect(matchCount(c)).toBe(28 + 2 + 1);
  });
});

describe('realDivisions (05 §8, 2027 formats)', () => {
  const ids = (n: number, p: string) => Array.from({ length: n }, (_, i) => `${p}${i}`);
  const comps = realDivisions(2027, [ids(20, 'a'), ids(20, 'b'), ids(24, 'c'), ids(96, 'd')]);

  it('parses; Série C has 24 clubs in 2027 and 28 in 2028, D refills from the ranking', () => {
    comps.forEach((c) => CompetitionSchema.parse(c));
    const sizes = comps.map((c) => `${c.id}@${c.season}:${c.size}/${c.clubIds.length}`);
    expect(sizes).toEqual([
      'div-1@2027:20/20',
      'div-2@2027:20/20',
      'div-3@2027:24/24',
      'div-3@2028:28/0',
      'div-4@2027:96/96',
    ]);
    expect(comps.find((c) => c.id === 'div-4')!.refill).toBe('ranking');
  });

  it('every window keeps at least two match dates in any year (weekday windows move with the calendar)', () => {
    for (const year of [2027, 2028, 2029, 2030]) {
      for (const c of regulationsFor(comps, year))
        for (const p of c.phases) {
          const days = new Set<number>();
          for (let t = Date.parse(p.dates.start); t <= Date.parse(p.dates.end); t += 864e5)
            if (p.dates.weekdays.includes(new Date(t).getUTCDay())) days.add(t);
          const legs = p.kind === 'liga' || p.kind === 'grupos' ? 2 : p.legs;
          expect(days.size, `${c.id} ${p.id} ${year}`).toBeGreaterThanOrEqual(legs);
        }
    }
  });
});

describe('slimPack', () => {
  it('keeps the checksum, is smaller, and plays the same career as the full pack', () => {
    const pack = generateDevPack();
    const slim = slimPack(pack);
    expect(slim.checksum).toBe(pack.checksum);
    expect(JSON.stringify(slim).length).toBeLessThan(JSON.stringify(pack).length);
    const play = (p: typeof pack) => {
      const w = openCareer(p, 7, p.clubs[0]!.id);
      const d = nextDecision(w);
      if (d.kind === 'match') playDecision(w, d);
      const { pack: _a, origin: _b, ...rest } = w;
      return JSON.stringify(rest);
    };
    expect(play(slim)).toBe(play(pack));
  });
});
