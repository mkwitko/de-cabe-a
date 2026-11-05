/** One club entry of a Career Path trajectory, as stored in the challenge snapshot. */
export interface TrajectoryEntry {
  clubId: string;
  clubName: string;
  countryCode: string;
  fromYear: number | null;
  toYear: number | null;
  isLoan: boolean;
}

/** A career spell joined with its club, as the snapshot builder loads it. */
export interface TrajectorySpell {
  clubId: string;
  clubName: string;
  countryCode: string;
  spellType: 'professional' | 'loan' | 'youth';
  /** Normalised date: missing month/day already set to 1 January by the import. */
  startDate: Date | null;
  endDate: Date | null;
  sortIndex: number;
  verificationStatus: 'draft' | 'imported' | 'verified' | 'rejected';
}

/** Spells that make up the trajectory: verified professional or loan (youth excluded). */
export const isTrajectorySpell = (s: TrajectorySpell) =>
  s.verificationStatus === 'verified' && s.spellType !== 'youth';

const time = (d: Date | null, missing: number) => d?.getTime() ?? missing;

/**
 * CAREER_PATH.md §4: order by start date, then end date (open spell last), then sortIndex.
 * Each spell is one entry: a loan is its own entry, a return inside a continuous contract
 * adds nothing, two contracts at the same club are two entries.
 */
export function buildTrajectory(spells: TrajectorySpell[]): TrajectoryEntry[] {
  return spells
    .filter(isTrajectorySpell)
    .sort(
      (a, b) =>
        time(a.startDate, Infinity) - time(b.startDate, Infinity) ||
        time(a.endDate, Infinity) - time(b.endDate, Infinity) ||
        a.sortIndex - b.sortIndex,
    )
    .map((s) => ({
      clubId: s.clubId,
      clubName: s.clubName,
      countryCode: s.countryCode,
      fromYear: s.startDate?.getUTCFullYear() ?? null,
      toYear: s.endDate?.getUTCFullYear() ?? null,
      isLoan: s.spellType === 'loan',
    }));
}
