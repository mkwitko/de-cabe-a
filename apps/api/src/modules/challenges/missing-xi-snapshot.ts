/**
 * Escalação snapshot (ADR-011): one side's starting XI of a real final (Wikipedia line-ups, see
 * scripts/research/import-lineups.ts) with some linked players hidden.
 */
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';

export const MissingXiParams = z.object({
  matchId: z.string(),
  side: z.enum(['home', 'away']),
});
export type MissingXiParams = z.infer<typeof MissingXiParams>;

const MIN_LINKED = 6;
const TIER_ORDER = { T1: 0, T2: 1, T3: 2, T4: 3 } as const;

/**
 * Which slots to hide: the most notable linked players first (easier to recall), 5 on tier 1,
 * 7 on tier 2, every linked one on tier 3. Ties keep the sheet order (goalkeeper first).
 */
export function pickHidden(
  slots: { playerId: string | null; tier: keyof typeof TIER_ORDER | null }[],
  difficultyTier: 1 | 2 | 3,
): Set<number> {
  const linked = slots
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.playerId)
    .sort((a, b) => TIER_ORDER[a.tier ?? 'T3'] - TIER_ORDER[b.tier ?? 'T3'] || a.i - b.i);
  const n =
    difficultyTier === 3 ? linked.length : Math.min(linked.length, difficultyTier === 1 ? 5 : 7);
  return new Set(linked.slice(0, n).map((s) => s.i));
}

export async function buildMissingXiSnapshot(
  prisma: PrismaClient,
  params: MissingXiParams,
  difficultyTier: 1 | 2 | 3 = 2,
) {
  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: { lineups: { where: { side: params.side, starter: true }, orderBy: { id: 'asc' } } },
  });
  const reasons: string[] = [];
  if (!match || match.source !== 'wikipedia') reasons.push('MATCH_NOT_FOUND');
  const rows = match?.lineups ?? [];
  if (match && rows.length !== 11) reasons.push('LINEUP_NOT_11');
  const ids = rows.map((r) => r.playerId).filter((x): x is string => Boolean(x));
  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { id: true, canonicalName: true, notabilityTier: true },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  if (match && byId.size < MIN_LINKED) reasons.push('TOO_FEW_LINKED');
  if (reasons.length) return { eligible: false, reasons, config: null };
  const hidden = pickHidden(
    rows.map((r) => ({
      playerId: r.playerId && byId.has(r.playerId) ? r.playerId : null,
      tier: (r.playerId && byId.get(r.playerId)?.notabilityTier) || null,
    })),
    difficultyTier,
  );
  return {
    eligible: true,
    reasons,
    config: {
      engine: 'missing-xi' as const,
      engineVersion: 1 as const,
      match: {
        competition: match!.competition,
        season: match!.season,
        stage: match!.stage,
        homeTeam: match!.homeTeam,
        awayTeam: match!.awayTeam,
        homeScore: match!.homeScore,
        awayScore: match!.awayScore,
        source: match!.sourceRef.replace(/^wikipedia:en:/, ''),
      },
      side: params.side,
      slots: rows.map((r, i) => ({
        position: r.position ?? '',
        jersey: r.jersey,
        // Our canonical name for linked players, the sheet's name otherwise.
        name: (r.playerId && byId.get(r.playerId)?.canonicalName) || r.playerName,
        playerId: r.playerId && byId.has(r.playerId) ? r.playerId : null,
        hidden: hidden.has(i),
      })),
      difficultyTier,
    },
  };
}
