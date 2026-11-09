/**
 * Draft snapshot (GROWTH_PLAN.md 2.4): 11 rounds in a 4-3-3. Each round names a match and a side
 * (Wikipedia line-ups, see scripts/research/import-lineups.ts), the player who started there in
 * that position and 3 wrong options who were not in that match at all.
 */
import { createHash } from 'node:crypto';
import { DRAFT_SLOTS, type DraftSlot } from '@decabeca/engine';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';

export const DraftParams = z.object({
  rounds: z
    .array(
      z.object({
        matchId: z.string(),
        side: z.enum(['home', 'away']),
        playerId: z.string(),
        decoyIds: z.array(z.string()).length(3),
      }),
    )
    .length(DRAFT_SLOTS.length),
});
export type DraftParams = z.infer<typeof DraftParams>;
export { DRAFT_SLOTS };

/** Position group of a Wikipedia line-up code; null when the sheet has none. */
export function slotOf(position: string | null): DraftSlot | null {
  if (!position) return null;
  if (position === 'GK') return 'GK';
  if (['SW', 'CB', 'RB', 'LB', 'DF', 'FB', 'CH', 'RWB', 'LWB'].includes(position)) return 'DF';
  if (['DM', 'CM', 'MF', 'RM', 'LM', 'RH', 'LH', 'HB', 'AM'].includes(position)) return 'MF';
  if (['RW', 'LW', 'SS', 'OL', 'OR', 'IL', 'IR', 'CF', 'FW', 'LF', 'RF'].includes(position))
    return 'FW';
  return null;
}

/** Same order every time for the same round (re-validation rebuilds the same snapshot). */
const shuffle = <T extends { id: string }>(xs: T[], seed: string) =>
  [...xs].sort((a, b) =>
    createHash('sha1')
      .update(seed + a.id)
      .digest('hex') <
    createHash('sha1')
      .update(seed + b.id)
      .digest('hex')
      ? -1
      : 1,
  );

export async function buildDraftSnapshot(
  prisma: PrismaClient,
  params: DraftParams,
  difficultyTier: 1 | 2 | 3 = 2,
) {
  const reasons: string[] = [];
  const ids = params.rounds.flatMap((r) => [r.playerId, ...r.decoyIds]);
  if (new Set(ids).size !== ids.length) reasons.push('PLAYER_REPEATED');
  if (new Set(params.rounds.map((r) => `${r.matchId}|${r.side}`)).size !== params.rounds.length)
    reasons.push('MATCH_REPEATED');
  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { id: true, canonicalName: true },
  });
  const name = new Map(players.map((p) => [p.id, p.canonicalName]));
  if (name.size !== ids.length) reasons.push('PLAYER_NOT_FOUND');

  const rounds = [];
  for (const [i, r] of params.rounds.entries()) {
    const match = await prisma.match.findUnique({
      where: { id: r.matchId },
      include: { lineups: true },
    });
    if (!match || match.source !== 'wikipedia') {
      reasons.push(`ROUND_${i}_MATCH_NOT_FOUND`);
      continue;
    }
    const slot = DRAFT_SLOTS[i]!;
    const row = match.lineups.find((l) => l.playerId === r.playerId);
    if (!row?.starter || row.side !== r.side || slotOf(row.position) !== slot)
      reasons.push(`ROUND_${i}_NOT_THE_STARTER`);
    if (r.decoyIds.some((id) => match.lineups.some((l) => l.playerId === id)))
      reasons.push(`ROUND_${i}_DECOY_IN_MATCH`);
    const home = r.side === 'home';
    rounds.push({
      slot,
      match: {
        competition: match.competition,
        season: match.season,
        stage: match.stage,
        team: home ? match.homeTeam : match.awayTeam,
        opponent: home ? match.awayTeam : match.homeTeam,
        teamScore: home ? match.homeScore : match.awayScore,
        opponentScore: home ? match.awayScore : match.homeScore,
      },
      players: shuffle(
        [r.playerId, ...r.decoyIds].map((id) => ({ id, name: name.get(id) ?? '?' })),
        match.id,
      ),
      answerId: r.playerId,
    });
  }
  return {
    eligible: reasons.length === 0,
    reasons,
    config: reasons.length
      ? null
      : { engine: 'draft' as const, engineVersion: 1 as const, rounds, difficultyTier },
  };
}
