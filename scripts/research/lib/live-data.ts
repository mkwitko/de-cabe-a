// The reviewed data fixes for what players see in Career Path and Mais ou Menos
// (live-data-fixes.json, applied by fix-live-data.ts).
import { readFileSync } from 'node:fs';

export interface LiveDataFixes {
  /** Club display names: legal names, wrong-language names, another club's name, reserves. */
  clubNames: { id: string; wikidataId: string | null; from: string; to: string; why: string }[];
  /** Spells attached to the wrong club entity (a senior spell on the reserve side, say). */
  spellClubs: {
    spellId: string;
    player: string;
    years: string;
    fromClubId: string;
    toClubId: string;
    why: string;
  }[];
  /** Loans the source infobox listed as permanent spells (the English one marks them). */
  spellLoans: { spellId: string; player: string; club: string; loanFromClubId: string }[];
  /** League games/goals from the English infobox where the source infobox had another basis. */
  spellStats: {
    spellId: string;
    player: string;
    club: string;
    from: [number | null, number | null];
    to: [number, number];
  }[];
  /** Careers whose club sequence was broken (a club merged into another, a club missing), rebuilt
   * from the English infobox: they replace the player's senior spells. */
  careers: {
    playerId: string;
    player: string;
    sourceRef: string;
    spells: {
      id: string;
      clubId: string;
      loanFromClubId: string | null;
      from: number;
      to: number | null;
      appearances: number | null;
      goals: number | null;
      sortIndex: number;
    }[];
  }[];
  /** Spells whose league games/goals the English infobox confirms (Mais ou Menos uses only these). */
  leagueConfirmed: string[];
}

export const liveDataFixes = JSON.parse(
  readFileSync(new URL('../live-data-fixes.json', import.meta.url), 'utf8'),
) as LiveDataFixes;
export const leagueConfirmed = new Set(liveDataFixes.leagueConfirmed);
