/**
 * Player autocomplete (CAREER_PATH.md §6, DATA_QUALITY.md §3): normalized prefix match on
 * any token of any alias, verified players only, ordered by notability then primary alias.
 */
import type { PlayerRef } from '@decabeca/contracts';
import { normalizeName } from '@decabeca/engine';
import type { PrismaClient } from '../../generated/prisma/client';

const TIER = { T1: 0, T2: 1, T3: 2, T4: 3 } as const;

export async function searchPlayers(
  prisma: PrismaClient,
  q: string,
  limit: number,
): Promise<PlayerRef[]> {
  const term = normalizeName(q);
  if (term.length < 2) return [];
  const aliases = await prisma.playerAlias.findMany({
    where: {
      player: { verificationStatus: 'verified' },
      OR: [{ normalized: { startsWith: term } }, { normalized: { contains: ` ${term}` } }],
    },
    include: {
      player: {
        include: {
          spells: {
            where: { verificationStatus: 'verified', spellType: { in: ['professional', 'loan'] } },
            include: { club: true },
          },
        },
      },
    },
    take: 200,
  });
  const best = new Map<string, (typeof aliases)[number]>();
  for (const a of aliases) {
    const prev = best.get(a.playerId);
    if (!prev || (a.isPrimary && !prev.isPrimary)) best.set(a.playerId, a);
  }
  const ranked = [...best.values()]
    .sort(
      (a, b) =>
        TIER[a.player.notabilityTier] - TIER[b.player.notabilityTier] ||
        Number(b.isPrimary) - Number(a.isPrimary) ||
        a.player.canonicalName.localeCompare(b.player.canonicalName),
    )
    .slice(0, limit);

  const nameCount = new Map<string, number>();
  for (const r of ranked)
    nameCount.set(r.player.canonicalName, (nameCount.get(r.player.canonicalName) ?? 0) + 1);

  return ranked.map(({ player }) => {
    // Homonyms get "birth year · longest club" so the player can tell them apart.
    let disambiguation: string | null = null;
    if ((nameCount.get(player.canonicalName) ?? 0) > 1) {
      const span = (s: (typeof player.spells)[number]) =>
        (s.endDate ?? new Date()).getTime() - (s.startDate?.getTime() ?? 0);
      const main = [...player.spells].sort((a, b) => span(b) - span(a))[0];
      disambiguation =
        [player.birthDate?.getUTCFullYear(), main?.club.shortName].filter(Boolean).join(' · ') ||
        null;
    }
    return { id: player.id, name: player.canonicalName, disambiguation };
  });
}
