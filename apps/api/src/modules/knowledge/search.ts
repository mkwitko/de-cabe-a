/**
 * Player autocomplete (CAREER_PATH.md §6, DATA_QUALITY.md §3): normalized prefix match on
 * any token of any alias, verified and imported players (never rejected), ordered by notability
 * then primary alias. Grid answers may be any player in the base (FOOTBALL_GRID.md, revision 2026-11-05).
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
      player: { verificationStatus: { in: ['verified', 'imported'] } },
      OR: [{ normalized: { startsWith: term } }, { normalized: { contains: ` ${term}` } }],
    },
    include: {
      player: {
        include: {
          spells: {
            where: {
              verificationStatus: { not: 'rejected' },
              spellType: { in: ['professional', 'loan'] },
            },
            include: { club: true },
          },
        },
      },
    },
    // ponytail: 200 rows cap; the most notable first so short terms still reach the stars.
    orderBy: { player: { notabilityTier: 'asc' } },
    take: 200,
  });
  const best = new Map<string, (typeof aliases)[number]>();
  for (const a of aliases) {
    const prev = best.get(a.playerId);
    const exact = (x: typeof a) => x.normalized === term;
    if (
      !prev ||
      exact(a) > exact(prev) ||
      (exact(a) === exact(prev) && a.isPrimary && !prev.isPrimary)
    )
      best.set(a.playerId, a);
  }
  const ranked = [...best.values()]
    .sort(
      (a, b) =>
        Number(b.normalized === term) - Number(a.normalized === term) ||
        TIER[a.player.notabilityTier] - TIER[b.player.notabilityTier] ||
        Number(b.isPrimary) - Number(a.isPrimary) ||
        a.player.canonicalName.localeCompare(b.player.canonicalName),
    )
    .slice(0, limit);

  const nameCount = new Map<string, number>();
  for (const r of ranked)
    nameCount.set(r.player.canonicalName, (nameCount.get(r.player.canonicalName) ?? 0) + 1);

  return ranked.map(({ player, alias, normalized, isPrimary }) => {
    // Typed exactly a nickname that is not the canonical name (Dida, canonical "Nelson de Jesus
    // Silva"): show the nickname, with the canonical name to confirm who it is.
    if (normalized === term && !isPrimary)
      return { id: player.id, name: alias, disambiguation: player.canonicalName };
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
