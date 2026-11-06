/**
 * Linha do tempo snapshot (ADR-011): 5 rounds, each a verified player with 4 clubs from their
 * verified professional spells, in career order (distinct clubs and start years).
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';

export const TimelineParams = z.object({
  rounds: z.array(z.object({ playerId: z.string() })).length(5),
});
export type TimelineParams = z.infer<typeof TimelineParams>;

const hash = (s: string) => createHash('sha1').update(s).digest('hex');

/** Four clubs of a career in order: the first, the last and the two in between that lasted most. */
export async function timelineClubs(prisma: PrismaClient, playerId: string) {
  const p = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      spells: {
        where: {
          verificationStatus: 'verified',
          spellType: 'professional',
          startDate: { not: null },
        },
        include: { club: { select: { id: true, shortName: true } } },
        orderBy: [{ startDate: 'asc' }, { sortIndex: 'asc' }],
      },
    },
  });
  if (!p || p.verificationStatus !== 'verified') return null;
  // First spell per club, and a start year not shared with another chosen club.
  const seen = new Set<string>();
  const years = new Set<number>();
  const firsts = [];
  for (const s of p.spells) {
    const y = s.startDate!.getUTCFullYear();
    if (seen.has(s.clubId) || years.has(y)) continue;
    seen.add(s.clubId);
    years.add(y);
    firsts.push({
      id: s.clubId,
      name: s.club.shortName,
      from: y,
      to: s.endDate?.getUTCFullYear() ?? null,
      length: (s.endDate?.getTime() ?? Date.now()) - s.startDate!.getTime(),
    });
  }
  if (firsts.length < 4) return null;
  const middle = firsts
    .slice(1, -1)
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);
  const chosen = firsts.filter((c, i) => i === 0 || i === firsts.length - 1 || middle.includes(c));
  return { name: p.canonicalName, clubs: chosen.map(({ length: _l, ...c }) => c) };
}

export async function buildTimelineSnapshot(
  prisma: PrismaClient,
  params: TimelineParams,
  difficultyTier: 1 | 2 | 3 = 2,
) {
  const reasons: string[] = [];
  if (new Set(params.rounds.map((r) => r.playerId)).size !== 5) reasons.push('PLAYER_REPEATED');
  const rounds = [];
  for (const [i, r] of params.rounds.entries()) {
    const t = await timelineClubs(prisma, r.playerId);
    if (!t) {
      reasons.push(`ROUND_${i}_NOT_ENOUGH_CLUBS`);
      continue;
    }
    const ids = t.clubs.map((c) => c.id);
    // Frozen display order, never the answer itself.
    let shuffled = [...ids].sort((a, b) => (hash(r.playerId + a) < hash(r.playerId + b) ? -1 : 1));
    if (shuffled.join() === ids.join()) shuffled = [...shuffled.slice(1), shuffled[0]!];
    rounds.push({ playerId: r.playerId, playerName: t.name, clubs: t.clubs, shuffled });
  }
  return {
    eligible: reasons.length === 0,
    reasons,
    config: reasons.length
      ? null
      : { engine: 'timeline' as const, engineVersion: 1 as const, rounds, difficultyTier },
  };
}
