// The reviewed data fixes for what players see in Career Path and Mais ou Menos, one file per audit
// round (live-data-fixes.json, live-data-fixes-2.json), applied by fix-live-data.ts.
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
    to: [number | null, number | null];
  }[];
  /** Careers whose club sequence was broken (a club merged into another, a club missing), rebuilt
   * from the English infobox: they replace the player's senior spells. */
  careers: {
    playerId: string;
    player: string;
    sourceRef: string;
    /** The senior spells it replaces (an earlier round's fixes to them no longer apply). */
    replaces?: string[];
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
  /** Display names shared by verified players, with the main club added ("Alex (Coritiba)"). */
  playerNames?: { id: string; from: string; to: string; why: string }[];
  /** Search aliases that are infobox noise ("Pantera NegraKing"). */
  aliasDeletes?: { id: string; playerId: string; alias: string; why: string }[];
  /** Spells whose league games/goals the English infobox confirms (Mais ou Menos uses only these). */
  leagueConfirmed: string[];
  /** Spells an earlier round confirmed by mistake. */
  leagueUnconfirmed?: string[];
}

const load = (file: string) =>
  JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')) as LiveDataFixes;
export const FIX_FILES = ['live-data-fixes.json', 'live-data-fixes-2.json'];
export const loadFixes = load;
/** Union of every round's confirmations, minus the ones a later round withdrew. */
export const leagueConfirmed = (() => {
  const rounds = FIX_FILES.map(load);
  const out = new Set(rounds.flatMap((r) => r.leagueConfirmed));
  for (const r of rounds) for (const id of r.leagueUnconfirmed ?? []) out.delete(id);
  return out;
})();
