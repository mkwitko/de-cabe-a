/**
 * Temporadas (GROWTH_PLAN.md 2.6): back-to-back 4-week seasons from a fixed Monday, each with a
 * theme. The season ranking starts at zero; a podium place in a finished season is a trophy kept
 * forever. Nothing is stored: a season is a date range over attempts, which are never deleted.
 */
import type { PrismaClient } from '../../generated/prisma/client';
import { rankRows } from './ranking';

/** Season 1 starts Monday 2026-11-09, 00:00 in Brasília. */
const EPOCH = Date.parse('2026-11-09T03:00:00Z');
const LENGTH = 28 * 86400_000;
const THEMES = ['Copa do Mundo', 'Brasileirão', 'Libertadores', 'Craques da Europa'];
export const PODIUM = 3;

export function season(number: number) {
  const start = new Date(EPOCH + (number - 1) * LENGTH);
  return {
    number,
    theme: THEMES[(number - 1) % THEMES.length]!,
    start,
    end: new Date(start.getTime() + LENGTH),
  };
}

export const seasonAt = (now: Date) =>
  season(Math.max(0, Math.floor((now.getTime() - EPOCH) / LENGTH)) + 1);

/** Podium places of `pk` in every finished season, oldest first. */
export async function trophies(prisma: PrismaClient, pk: string, now: Date) {
  const out: { season: number; theme: string; position: number }[] = [];
  // ponytail: one ranking query per finished season; store podiums when seasons pile up.
  for (let n = 1; n < seasonAt(now).number; n++) {
    const s = season(n);
    const listed = (await rankRows(prisma, s.start, false, s.end)).filter((r) => r.nickname);
    const i = listed.slice(0, PODIUM).findIndex((r) => r.pk === pk);
    if (i >= 0) out.push({ season: n, theme: s.theme, position: i + 1 });
  }
  return out;
}
