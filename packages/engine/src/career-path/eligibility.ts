import { buildTrajectory, type TrajectorySpell } from './trajectory';

export interface EligibilityPlayer {
  verificationStatus: 'draft' | 'imported' | 'verified' | 'rejected';
  notabilityTier: 'T1' | 'T2' | 'T3' | 'T4';
  spells: TrajectorySpell[];
}

export type IneligibilityReason =
  | 'PLAYER_NOT_VERIFIED'
  | 'TRAJECTORY_TOO_SHORT'
  | 'TRAJECTORY_TOO_LONG'
  | 'UNVERIFIED_SPELL'
  | 'TIER_PRACTICE_ONLY';

export const MIN_CLUBS = 3;
export const MAX_CLUBS = 12;

/**
 * CAREER_PATH.md §5. The "not used in a daily in the last 180 days" rule needs the
 * database and lives in the API.
 */
export function checkCareerPathEligibility(
  p: EligibilityPlayer,
  kind: 'daily' | 'practice',
): { eligible: boolean; reasons: IneligibilityReason[] } {
  const reasons: IneligibilityReason[] = [];
  if (p.verificationStatus !== 'verified') reasons.push('PLAYER_NOT_VERIFIED');
  const clubs = buildTrajectory(p.spells).length;
  if (clubs < MIN_CLUBS) reasons.push('TRAJECTORY_TOO_SHORT');
  if (clubs > MAX_CLUBS) reasons.push('TRAJECTORY_TOO_LONG');
  if (p.spells.some((s) => s.spellType !== 'youth' && s.verificationStatus !== 'verified'))
    reasons.push('UNVERIFIED_SPELL');
  if (kind === 'daily' && p.notabilityTier === 'T4') reasons.push('TIER_PRACTICE_ONLY');
  return { eligible: reasons.length === 0, reasons };
}
