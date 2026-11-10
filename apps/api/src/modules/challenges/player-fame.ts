/**
 * Player fame (Player.notabilityTier) from the Brazilian fan's point of view (PRODUCT.md: Brazilian
 * football first). Pure: the evidence comes from scripts/research/player-fame.ts (Wikidata + our
 * database). It drives Career Path difficulty and sticker rarity, so the rubric is explicit:
 *
 * - T1 household name: any Brazilian knows him (Pelé, Ronaldo, Neymar, Messi, Cafu).
 * - T2 well-known: stars of world football, idols of the grandes, Seleção regulars (Raí, Makélélé).
 * - T3 known to regular fans: capped players, long spells at a grande, World Cup players.
 * - T4 obscure: journeymen nobody outside the club remembers.
 *
 * Each tier is a list of criteria; the first tier with a criterion met wins. Evidence is never
 * subtracted: missing data can only make a player look less famous, never more.
 */

import type { Notability } from './career-path-difficulty';

export interface FameEvidence {
  /** Wikipedia editions with an article (Wikidata sitelinks, wikis only); null = no entity. */
  sitelinks: number | null;
  /** Ballon d'Or / FIFA World Player / The Best / World Cup Golden Ball (Wikidata P166). */
  topAwards: number;
  brazilian: boolean;
  /** Senior Brazil caps: Wikidata P54 Q83459 P1350, or the Brazil lineups we hold, the larger. */
  selecaoCaps: number;
  /** Senior caps for any national team (Wikidata), Brazil included. */
  nationalCaps: number;
  /** World Cups with a lineup we hold (any country). */
  worldCups: number;
  /** In a lineup of the team that won that World Cup. */
  worldCupWinner: boolean;
  /** League games at one of the 12 grandes, summed, and at the one he played most for. */
  bigClubApps: number;
  bigClubTopApps: number;
  /** Last year of the career (latest spell start or end); null = unknown. */
  lastYear: number | null;
}

/**
 * Era: a player who stopped before 1970 (before TV made the Seleção a weekly show) and has neither
 * a World Cup title nor a footprint abroad is known to historians, not fans: at most T3.
 */
export const OLD_ERA = { before: 1970, sitelinks: 40 } as const;

type Rule = [reason: string, met: (e: FameEvidence) => boolean];
const links = (e: FameEvidence) => e.sitelinks ?? 0;

/** Ordered T1..T3; T4 is everyone else. Thresholds are the rubric (see the report). */
export const RUBRIC: Record<Exclude<Notability, 'T4'>, Rule[]> = {
  T1: [
    ['global icon: 100+ Wikipedias', (e) => links(e) >= 100],
    ["Ballon d'Or / FIFA best player and 90+ Wikipedias", (e) => e.topAwards > 0 && links(e) >= 90],
    ["Brazilian Ballon d'Or / FIFA best player", (e) => e.brazilian && e.topAwards > 0],
    [
      'Brazil World Cup winner with 50+ caps and 50+ Wikipedias',
      (e) => e.brazilian && e.worldCupWinner && e.selecaoCaps >= 50 && links(e) >= 50,
    ],
    ['Seleção mainstay: 90+ caps', (e) => e.selecaoCaps >= 90],
    [
      'Seleção star with a name abroad: 50+ caps and 60+ Wikipedias',
      (e) => e.selecaoCaps >= 50 && links(e) >= 60,
    ],
    [
      'Seleção star and idol of a grande: 60+ caps and 400+ games at one',
      (e) => e.selecaoCaps >= 60 && e.bigClubTopApps >= 400,
    ],
  ],
  T2: [
    ['world star: 70+ Wikipedias', (e) => links(e) >= 70],
    ["Ballon d'Or / FIFA best player", (e) => e.topAwards > 0],
    ['Seleção regular: 20+ caps', (e) => e.selecaoCaps >= 20],
    ['Brazil World Cup winner', (e) => e.brazilian && e.worldCupWinner],
    ['idol of a grande: 300+ games at one', (e) => e.bigClubTopApps >= 300],
    [
      'national team regular with a name abroad: 45+ caps and 45+ Wikipedias',
      (e) => e.nationalCaps >= 45 && links(e) >= 45,
    ],
    ['World Cup winner and 50+ Wikipedias', (e) => e.worldCupWinner && links(e) >= 50],
  ],
  T3: [
    ['known abroad: 35+ Wikipedias', (e) => links(e) >= 35],
    ['capped by Brazil', (e) => e.selecaoCaps >= 1],
    ['50+ games at the grandes', (e) => e.bigClubApps >= 50],
    ['played a World Cup', (e) => e.worldCups >= 1],
    ['national team regular: 30+ caps', (e) => e.nationalCaps >= 30],
  ],
};

const TIERS = ['T1', 'T2', 'T3'] as const;

/** The tier the evidence supports and the criterion that placed him there. */
export function fameTier(e: FameEvidence): { tier: Notability; reason: string } {
  const oldEra =
    e.lastYear !== null &&
    e.lastYear < OLD_ERA.before &&
    !e.worldCupWinner &&
    links(e) < OLD_ERA.sitelinks;
  for (const tier of TIERS) {
    const hit = RUBRIC[tier].find(([, met]) => met(e));
    if (hit && oldEra && tier !== 'T3')
      return { tier: 'T3', reason: `${hit[0]}, capped at T3: pre-1970 career` };
    if (hit) return { tier, reason: hit[0] };
  }
  return { tier: 'T4', reason: 'no criterion met' };
}

const scale = (e: FameEvidence, k: number): FameEvidence => ({
  ...e,
  sitelinks: e.sitelinks === null ? null : Math.round(e.sitelinks * k),
  selecaoCaps: Math.round(e.selecaoCaps * k),
  nationalCaps: Math.round(e.nationalCaps * k),
  bigClubApps: Math.round(e.bigClubApps * k),
  bigClubTopApps: Math.round(e.bigClubTopApps * k),
});

const RANK: Record<Notability, number> = { T1: 1, T2: 2, T3: 3, T4: 4 };

export interface FameProposal {
  tier: Notability;
  reason: string;
  /** Tiers the evidence allows with every number 15% lower / higher: the margin of the rubric. */
  range: [best: Notability, worst: Notability];
  /** Change the current tier: it lies outside the range, so the evidence clearly disagrees. */
  change: boolean;
  /** For a human: the change is borderline, a 2+ tier jump, a T1 demotion, or no Wikidata. */
  review: boolean;
}

/**
 * Proposed tier for a player. A tier inside the margin of the rubric is kept (no churn on a
 * borderline call); one outside it changes, flagged for review when the call is not clear-cut.
 */
export function proposeFame(e: FameEvidence, current: Notability): FameProposal {
  const { tier, reason } = fameTier(e);
  const best = fameTier(scale(e, 1.15)).tier;
  const worst = fameTier(scale(e, 0.85)).tier;
  const keep = RANK[current] >= RANK[best] && RANK[current] <= RANK[worst];
  const change = !keep && tier !== current;
  const review =
    change &&
    (best !== worst ||
      Math.abs(RANK[tier] - RANK[current]) >= 2 ||
      current === 'T1' ||
      e.sitelinks === null);
  return { tier: change ? tier : current, reason, range: [best, worst], change, review };
}
