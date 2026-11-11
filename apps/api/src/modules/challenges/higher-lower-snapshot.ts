/**
 * Quem fez mais? snapshot (ADR-011): 5 rounds, each two real spells (player at club, all their
 * verified spells there added up) compared by league goals or games: a clear winner, but close.
 */
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';

const SideParam = z.object({ playerId: z.string(), clubId: z.string() });
export const HigherLowerParams = z.object({
  rounds: z
    .array(z.object({ metric: z.enum(['goals', 'games']), a: SideParam, b: SideParam }))
    .length(5),
  /** Track level the duels are drawn for: early levels allow a bigger gap (see maxRatio). */
  level: z.number().int().positive().optional(),
});
export type HigherLowerParams = z.infer<typeof HigherLowerParams>;

/** League goals and games of a player at a club (verified spells only), or null when unknown. */
export async function spellTotals(prisma: PrismaClient, playerId: string, clubId: string) {
  const spells = await prisma.careerSpell.findMany({
    where: {
      playerId,
      clubId,
      verificationStatus: 'verified',
      spellType: { in: ['professional', 'loan'] },
      player: { verificationStatus: 'verified' },
    },
    include: {
      player: { select: { canonicalName: true, primaryPositionGroup: true } },
      club: { select: { shortName: true } },
    },
  });
  if (!spells.length || spells.some((s) => s.appearances === null || s.goals === null)) return null;
  return {
    playerName: spells[0]!.player.canonicalName,
    position: spells[0]!.player.primaryPositionGroup,
    clubName: spells[0]!.club.shortName,
    games: spells.reduce((t, s) => t + s.appearances!, 0),
    goals: spells.reduce((t, s) => t + s.goals!, 0),
  };
}

/**
 * A fair round. Infobox numbers are sometimes league-only and sometimes all competitions (Totti:
 * 619 league games for Roma, 786 in all), about +20–30%. Requiring the bigger value to be at
 * least 40% above the smaller (and 5 more) keeps the right answer right either way.
 */
export const clearWinner = (x: number, y: number) => {
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return hi - lo >= 5 && hi >= lo * 1.4;
};

/**
 * ...but not so far apart that the answer is obvious (a striker's 200 goals against a goalkeeper's
 * 0): the bigger value is at most 2.5× the smaller on levels 1-20, 2× on 21-60, 1.8× after.
 */
export const maxRatio = (level: number) => (level <= 20 ? 2.5 : level <= 60 ? 2 : 1.8);
export const evenDuel = (x: number, y: number, level: number) =>
  clearWinner(x, y) && Math.max(x, y) <= maxRatio(level) * Math.min(x, y);

type Position = 'GK' | 'DF' | 'MF' | 'FW' | null;
/** Goals are compared only between players of the same position, never goalkeepers, 5+ goals each. */
export const comparableGoals = (
  a: { position: Position; goals: number },
  b: { position: Position; goals: number },
) =>
  a.position !== null &&
  a.position === b.position &&
  a.position !== 'GK' &&
  Math.min(a.goals, b.goals) >= 5;

export async function buildHigherLowerSnapshot(
  prisma: PrismaClient,
  params: HigherLowerParams,
  difficultyTier: 1 | 2 | 3 = 2,
) {
  const reasons: string[] = [];
  const rounds = [];
  // Without a level, the strictest closeness applies.
  const level = params.level ?? 61;
  for (const [i, r] of params.rounds.entries()) {
    const [a, b] = await Promise.all([
      spellTotals(prisma, r.a.playerId, r.a.clubId),
      spellTotals(prisma, r.b.playerId, r.b.clubId),
    ]);
    if (!a || !b) {
      reasons.push(`ROUND_${i}_NO_STATS`);
      continue;
    }
    const va = r.metric === 'goals' ? a.goals : a.games;
    const vb = r.metric === 'goals' ? b.goals : b.games;
    if (!clearWinner(va, vb)) reasons.push(`ROUND_${i}_TOO_CLOSE`);
    else if (!evenDuel(va, vb, level)) reasons.push(`ROUND_${i}_TOO_FAR`);
    if (r.metric === 'goals' && !comparableGoals(a, b)) reasons.push(`ROUND_${i}_GOALS_MISMATCH`);
    rounds.push({
      metric: r.metric,
      a: { playerId: r.a.playerId, playerName: a.playerName, clubName: a.clubName, value: va },
      b: { playerId: r.b.playerId, playerName: b.playerName, clubName: b.clubName, value: vb },
    });
  }
  return {
    eligible: reasons.length === 0,
    reasons,
    config: reasons.length
      ? null
      : { engine: 'higher-lower' as const, engineVersion: 1 as const, rounds, difficultyTier },
  };
}
