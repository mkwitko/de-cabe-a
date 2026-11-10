import type { PrismaClient } from '../../generated/prisma/client';
import { addDays, civilDate } from '../challenges/civil-date';
import { roundRows } from '../daily/daily';
import { weekStart } from '../progression/ranking';
import { RARITY_ORDER, rank } from './rarity';

const TOP = 10;
const ROUND_DAYS = 5;
const LOWER = RARITY_ORDER.slice(0, rank('destaque_rodada'));

/**
 * Lazy "Destaque da Rodada": stickers earned in a closed round (Mon-Fri passed) where the player
 * finished top 10 rise to destaque_rodada unless already better. Idempotent.
 */
export async function applyRoundUpgrades(prisma: PrismaClient, pks: string[], now: Date) {
  const today = civilDate(now);
  const rows = await prisma.sticker.findMany({
    where: { pk: { in: pks }, rarity: { in: [...LOWER] } },
    select: { earnedAt: true },
  });
  const mondays = new Set(rows.map((r) => civilDate(weekStart(r.earnedAt))));
  for (const monday of mondays) {
    if (addDays(monday, ROUND_DAYS) > today) continue; // round still open
    const ranked = (await roundRows(prisma, monday)).sort(
      (a, b) => b.stars - a.stars || b.score - a.score || a.pk.localeCompare(b.pk),
    );
    const top = ranked.slice(0, TOP).some((r) => pks.includes(r.pk));
    if (!top) continue;
    const from = weekStart(new Date(`${monday}T12:00:00Z`));
    await prisma.sticker.updateMany({
      where: {
        pk: { in: pks },
        rarity: { in: [...LOWER] },
        earnedAt: { gte: from, lt: new Date(from.getTime() + 7 * 86400_000) },
      },
      data: { rarity: 'destaque_rodada' },
    });
  }
}
