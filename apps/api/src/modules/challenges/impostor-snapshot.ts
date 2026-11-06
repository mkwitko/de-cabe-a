/**
 * Impostor snapshot (ADR-011): 5 rounds; in each, 3 players with a verified spell at the club and
 * one verified player with no spell there at all (any source, except rejected ones).
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';

export const ImpostorParams = z.object({
  rounds: z
    .array(
      z.object({
        clubId: z.string(),
        memberIds: z.array(z.string()).length(3),
        impostorId: z.string(),
      }),
    )
    .length(5),
});
export type ImpostorParams = z.infer<typeof ImpostorParams>;

const PLAYED = { spellType: { in: ['professional', 'loan'] as ('professional' | 'loan')[] } };

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

export async function buildImpostorSnapshot(
  prisma: PrismaClient,
  params: ImpostorParams,
  difficultyTier: 1 | 2 | 3 = 2,
) {
  const reasons: string[] = [];
  const ids = params.rounds.flatMap((r) => [...r.memberIds, r.impostorId]);
  if (new Set(ids).size !== ids.length) reasons.push('PLAYER_REPEATED');
  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    include: { spells: { where: { verificationStatus: { not: 'rejected' }, ...PLAYED } } },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  const rounds = [];
  for (const [i, r] of params.rounds.entries()) {
    const club = await prisma.club.findUnique({
      where: { id: r.clubId },
      include: { country: true },
    });
    if (!club) {
      reasons.push(`ROUND_${i}_CLUB_NOT_FOUND`);
      continue;
    }
    for (const id of r.memberIds) {
      const p = byId.get(id);
      if (p?.verificationStatus !== 'verified') reasons.push(`ROUND_${i}_MEMBER_NOT_VERIFIED`);
      else if (!p.spells.some((s) => s.clubId === r.clubId && s.verificationStatus === 'verified'))
        reasons.push(`ROUND_${i}_MEMBER_DID_NOT_PLAY`);
    }
    const imp = byId.get(r.impostorId);
    if (imp?.verificationStatus !== 'verified') reasons.push(`ROUND_${i}_IMPOSTOR_NOT_VERIFIED`);
    else if (imp.spells.some((s) => s.clubId === r.clubId))
      reasons.push(`ROUND_${i}_IMPOSTOR_PLAYED`);
    rounds.push({
      clubId: club.id,
      clubName: club.shortName,
      clubCountryCode: club.country.isoCode,
      players: shuffle(
        [...r.memberIds, r.impostorId].map((id) => ({
          id,
          name: byId.get(id)?.canonicalName ?? '?',
        })),
        club.id,
      ),
      impostorId: r.impostorId,
    });
  }
  return {
    eligible: reasons.length === 0,
    reasons,
    config: reasons.length
      ? null
      : { engine: 'impostor' as const, engineVersion: 1 as const, rounds, difficultyTier },
  };
}
