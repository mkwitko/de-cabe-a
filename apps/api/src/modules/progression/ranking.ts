/**
 * Community ranking (ADR-007). A player is an account (all its sessions) or a guest session.
 * Stars and score count the best attempt per level; only players with a nickname are listed.
 */
import { titleFor } from '@decabeca/engine';
import type { PrismaClient } from '../../generated/prisma/client';
import { civilDate } from '../challenges/civil-date';

export interface RankRow {
  pk: string;
  nickname: string | null;
  stars: number;
  score: number;
}

/** Monday 00:00 in São Paulo (UTC-3, no DST) as an instant. */
export function weekStart(now: Date): Date {
  const today = civilDate(now);
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(Date.parse(`${today}T03:00:00Z`) - dow * 86400_000);
}

export async function rankRows(prisma: PrismaClient, since: Date | null): Promise<RankRow[]> {
  const rows = await prisma.$queryRaw<
    { pk: string; nickname: string | null; stars: bigint; score: bigint }[]
  >`
    WITH best AS (
      SELECT COALESCE(s."userId", s.id) AS pk, a."challengeId", MAX(a.stars) AS stars, MAX(a.score) AS score
      FROM "Attempt" a JOIN "GuestSession" s ON s.id = a."sessionId"
      WHERE a."completedAt" IS NOT NULL AND (${since}::timestamp IS NULL OR a."completedAt" >= ${since}::timestamp)
      GROUP BY 1, 2
    ), totals AS (
      SELECT pk, SUM(stars) AS stars, SUM(score) AS score FROM best GROUP BY pk
    )
    SELECT t.pk, COALESCE(u.nickname, g.nickname) AS nickname, t.stars, t.score
    FROM totals t
    LEFT JOIN "User" u ON u.id = t.pk
    LEFT JOIN "GuestSession" g ON g.id = t.pk
    ORDER BY t.stars DESC, t.score DESC, t.pk`;
  return rows.map((r) => ({
    pk: r.pk,
    nickname: r.nickname,
    stars: Number(r.stars),
    score: Number(r.score),
  }));
}

export function ranking(rows: RankRow[], me: string) {
  const listed = rows.filter((r) => r.nickname);
  const mine = rows.find((r) => r.pk === me);
  const position = listed.findIndex((r) => r.pk === me);
  return {
    entries: listed.slice(0, 50).map((r, i) => ({
      position: i + 1,
      nickname: r.nickname!,
      stars: r.stars,
      score: r.score,
      title: titleFor(r.stars).name,
      isMe: r.pk === me,
    })),
    me: {
      position: position >= 0 ? position + 1 : null,
      stars: mine?.stars ?? 0,
      nickname: mine?.nickname ?? null,
    },
  };
}
