import { describe, expect, it } from 'vitest';
import {
  clubKey,
  corporateLevel,
  facilitiesFrom,
  isCertified,
  marketFrom,
  styleFrom,
  youthPolicyFrom,
} from './structure';

describe('club structure mappings', () => {
  it('maps the FM corporate code to 1..5', () => {
    expect([0, 1, 4, 8, 11, 20].map((c) => corporateLevel(c))).toEqual([null, 1, 2, 3, 4, 5]);
  });
  it('averages facilities and boosts youth', () => {
    const f = facilitiesFrom({ repLevel: 3, corporateCode: 1, certified: true, academyShare: 0.5 });
    expect(f).toEqual({ training: 2, youth: 4, medical: 2 });
    expect(
      facilitiesFrom({ repLevel: 2, corporateCode: null, certified: false, academyShare: null }),
    ).toEqual({ training: 2, youth: 2, medical: 2 });
  });
  it('matches CBF names to FM names', () => {
    const keys = new Set(['Esporte Clube Bahia SAF', 'Club Athletico Paranaense'].map(clubKey));
    expect(isCertified(['Bahia'], keys)).toBe(true);
    expect(isCertified(['Athletico Paranaense'], keys)).toBe(true);
    expect(isCertified(['Vitória'], keys)).toBe(false);
  });
  it('ranks style by percentile and bounds it', () => {
    const mk = (n: number) => ({
      passes: n, progressive: n / 10, pressures: n, clearances: n, crosses: n, sprints: n, lost: n,
    }); // prettier-ignore
    const cohort = [mk(1), mk(2), mk(3), mk(4)];
    const s = styleFrom(mk(4), cohort);
    expect(s.possession).toBe(90);
    expect(s.block).toBe(10);
  });
  it('maps youth policy and market', () => {
    expect(youthPolicyFrom(0.25)).toBe(50);
    expect(marketFrom(26, 0, 0).readyVsYoung).toBe(50);
  });
});
