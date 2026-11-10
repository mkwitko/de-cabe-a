import type { PrismaClient } from '../../generated/prisma/client';
import { addDays, civilDate } from '../challenges/civil-date';

/** Consecutive civil days (America/Sao_Paulo) ending today with at least one completed attempt. */
export async function streakDays(prisma: PrismaClient, pks: string[], now: Date): Promise<number> {
  const rows = await prisma.attempt.findMany({
    where: {
      completedAt: { not: null },
      session: { OR: [{ id: { in: pks } }, { userId: { in: pks } }] },
    },
    select: { completedAt: true },
  });
  const days = new Set(rows.map((r) => civilDate(r.completedAt!)));
  let day = civilDate(now);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
