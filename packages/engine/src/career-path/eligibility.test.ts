import { describe, expect, it } from 'vitest';
import { checkCareerPathEligibility, type EligibilityPlayer } from './eligibility';
import type { TrajectorySpell } from './trajectory';

const spells = (n: number, over: Partial<TrajectorySpell> = {}): TrajectorySpell[] =>
  Array.from({ length: n }, (_, i) => ({
    clubId: `c${i}`,
    clubName: `C${i}`,
    countryCode: 'BR',
    spellType: 'professional' as const,
    startDate: new Date(Date.UTC(2000 + i, 0, 1)),
    endDate: new Date(Date.UTC(2001 + i, 0, 1)),
    sortIndex: 0,
    verificationStatus: 'verified' as const,
    ...over,
  }));

const player = (over: Partial<EligibilityPlayer> = {}): EligibilityPlayer => ({
  verificationStatus: 'verified',
  notabilityTier: 'T1',
  spells: spells(5),
  ...over,
});

describe('checkCareerPathEligibility (CAREER_PATH.md §5, without the 180-day rule)', () => {
  it('accepts a verified T1 player with 5 clubs for daily', () => {
    expect(checkCareerPathEligibility(player(), 'daily')).toEqual({ eligible: true, reasons: [] });
  });

  it('requires the player to be verified', () => {
    expect(
      checkCareerPathEligibility(player({ verificationStatus: 'imported' }), 'daily').reasons,
    ).toEqual(['PLAYER_NOT_VERIFIED']);
  });

  it.each([
    [2, ['TRAJECTORY_TOO_SHORT']],
    [3, []],
    [12, []],
    [13, ['TRAJECTORY_TOO_LONG']],
  ])('trajectory with %i clubs -> %j', (n, reasons) => {
    expect(checkCareerPathEligibility(player({ spells: spells(n) }), 'daily').reasons).toEqual(
      reasons,
    );
  });

  it('youth spells do not count towards the trajectory length', () => {
    const p = player({ spells: [...spells(2), ...spells(3, { spellType: 'youth', clubId: 'y' })] });
    expect(checkCareerPathEligibility(p, 'daily').reasons).toEqual(['TRAJECTORY_TOO_SHORT']);
  });

  it('an unverified professional or loan spell blocks the challenge', () => {
    const p = player({
      spells: [...spells(4), ...spells(1, { clubId: 'x', verificationStatus: 'imported' })],
    });
    expect(checkCareerPathEligibility(p, 'daily').reasons).toEqual(['UNVERIFIED_SPELL']);
  });

  it('an unverified youth spell does not block', () => {
    const p = player({
      spells: [...spells(4), ...spells(1, { spellType: 'youth', verificationStatus: 'imported' })],
    });
    expect(checkCareerPathEligibility(p, 'daily').eligible).toBe(true);
  });

  it('tier T4 is practice only', () => {
    expect(checkCareerPathEligibility(player({ notabilityTier: 'T4' }), 'daily').reasons).toEqual([
      'TIER_PRACTICE_ONLY',
    ]);
    expect(checkCareerPathEligibility(player({ notabilityTier: 'T4' }), 'practice').eligible).toBe(
      true,
    );
  });
});
