import type { PrismaClient } from '../../generated/prisma/client';
import { addDays, civilDate, dateColumn } from '../challenges/civil-date';
import { roundRows } from '../daily/daily';
import { weekStart } from '../progression/ranking';
import { RARITY_ORDER, rank } from './rarity';

const TOP = 10;
const ROUND_DAYS = 5;
const iso = (d: Date) => d.toISOString().slice(0, 10); // @db.Date columns
const LOWER = RARITY_ORDER.slice(0, rank('destaque_rodada'));

/**
 * Lazy "Destaque da Rodada": a sticker earned from a daily-pick level (Mon-Fri) of a closed round
 * where the player finished top 10 rises to destaque_rodada unless already better. Each closed
 * round is checked once per pk (RoundCheck).
 */
export async function applyRoundUpgrades(prisma: PrismaClient, pks: string[], now: Date) {
  const today = civilDate(now);
  const [rows, checked] = await Promise.all([
    prisma.sticker.findMany({
      where: { pk: { in: pks }, rarity: { in: [...LOWER] } },
      select: { pk: true, playerId: true, earnedAt: true, challengeId: true },
    }),
    prisma.roundCheck.findMany({ where: { pk: { in: pks } } }),
  ]);
  const done = new Set(checked.map((c) => `${c.pk}|${iso(c.monday)}`));
  const open = rows
    .map((r) => ({ ...r, monday: civilDate(weekStart(r.earnedAt)), day: civilDate(r.earnedAt) }))
    .filter((r) => addDays(r.monday, ROUND_DAYS) <= today && r.day < addDays(r.monday, ROUND_DAYS))
    .filter((r) => !done.has(`${r.pk}|${r.monday}`));
  if (!open.length) return;

  const challenges = await prisma.challenge.findMany({
    where: { id: { in: [...new Set(open.map((r) => r.challengeId))] } },
    select: { id: true, gameMode: true, publicNumber: true },
  });
  const byId = new Map(challenges.map((c) => [c.id, c]));
  const topByMonday = new Map<string, boolean>();
  for (const monday of new Set(open.map((r) => r.monday))) {
    const ranked = (await roundRows(prisma, monday))
      .filter((r) => r.account)
      .sort((a, b) => b.stars - a.stars || b.score - a.score || a.pk.localeCompare(b.pk));
    topByMonday.set(
      monday,
      ranked.slice(0, TOP).some((r) => pks.includes(r.pk)),
    );
  }
  const mondays = [...topByMonday.keys()].sort();
  const picks = await prisma.dailyPick.findMany({
    where: {
      day: { gte: dateColumn(mondays[0]!), lt: dateColumn(addDays(mondays.at(-1)!, ROUND_DAYS)) },
    },
  });
  const isPick = (monday: string, challengeId: string) => {
    const c = byId.get(challengeId);
    return (
      !!c?.publicNumber &&
      picks.some(
        (p) =>
          p.gameMode === c.gameMode &&
          p.level === c.publicNumber &&
          iso(p.day) >= monday &&
          iso(p.day) < addDays(monday, ROUND_DAYS),
      )
    );
  };
  const upgrade = open.filter((r) => topByMonday.get(r.monday) && isPick(r.monday, r.challengeId));
  if (upgrade.length)
    await prisma.sticker.updateMany({
      where: {
        OR: upgrade.map((r) => ({ pk: r.pk, playerId: r.playerId })),
        rarity: { in: [...LOWER] },
      },
      data: { rarity: 'destaque_rodada' },
    });
  const keys = new Set(open.map((r) => `${r.pk}|${r.monday}`));
  await prisma.roundCheck.createMany({
    data: [...keys].map((k) => {
      const [pk, monday] = k.split('|');
      return { pk: pk!, monday: dateColumn(monday!) };
    }),
    skipDuplicates: true,
  });
}
