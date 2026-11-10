/**
 * LGPD data rights: export everything held about a player and erase it in one transaction.
 * A player is an account (user id) plus every guest session linked to it, or one guest session;
 * stickers, leagues, etc. are keyed by `pk` = user id or session id, so both are covered.
 */
import type { PrismaClient } from '../../generated/prisma/client';

export const DELETED = 'deleted';

type Who = { sessionId: string; userId: string | null };

async function owner(prisma: Pick<PrismaClient, 'guestSession'>, who: Who) {
  const sessions = await prisma.guestSession.findMany({
    where: who.userId ? { userId: who.userId } : { id: who.sessionId },
  });
  const sids = sessions.map((s) => s.id);
  return { sessions, sids, pks: who.userId ? [who.userId, ...sids] : sids };
}

export async function exportData(prisma: PrismaClient, who: Who, exportedAt: Date) {
  const { sessions, sids, pks } = await owner(prisma, who);
  const byPk = { where: { pk: { in: pks } } };
  const bySession = { where: { sessionId: { in: sids } } };
  const [
    user,
    authSessions,
    signInMethods,
    attempts,
    careers,
    memberships,
    stickers,
    fantasySquads,
    copaRuns,
    communityLevels,
    communityVotes,
    communityReports,
    levelReactions,
    levelReports,
    leagueReports,
    seasonPromotions,
    pushSubscriptions,
  ] = await Promise.all([
    who.userId ? prisma.user.findUnique({ where: { id: who.userId } }) : null,
    who.userId
      ? prisma.authSession.findMany({
          where: { userId: who.userId },
          select: { ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
        })
      : [],
    // How the account signs in, never the tokens or the password hash.
    who.userId
      ? prisma.account.findMany({
          where: { userId: who.userId },
          select: { providerId: true, createdAt: true },
        })
      : [],
    prisma.attempt.findMany({
      ...bySession,
      include: {
        actions: { orderBy: { seq: 'asc' } },
        challenge: { select: { publicNumber: true } },
      },
    }),
    prisma.careerPlayer.findMany({
      ...bySession,
      include: { training: true, seasons: { include: { matches: true } } },
    }),
    prisma.leagueMember.findMany({ ...byPk, include: { league: true } }),
    prisma.sticker.findMany(byPk),
    prisma.fantasySquad.findMany(byPk),
    prisma.copaRun.findMany(byPk),
    prisma.communityLevel.findMany({ where: { authorPk: { in: pks } } }),
    prisma.communityVote.findMany(byPk),
    prisma.communityReport.findMany(byPk),
    prisma.levelReaction.findMany(byPk),
    prisma.levelReport.findMany(bySession),
    prisma.leagueReport.findMany(byPk),
    prisma.seasonPromotion.findMany(byPk),
    prisma.pushSubscription.findMany(byPk),
  ]);
  return {
    exportedAt: exportedAt.toISOString(),
    account: user && {
      email: user.email,
      emailVerified: user.emailVerified,
      nickname: user.nickname,
      image: user.image,
      publicProfile: user.publicProfile,
      createdAt: user.createdAt,
      signInMethods,
      signIns: authSessions,
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      publicProfile: s.publicProfile,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
    })),
    attempts: attempts.map(({ challenge, ...a }) => ({ ...a, level: challenge.publicNumber })),
    stickers,
    leagues: memberships.map((m) => ({
      code: m.league.code,
      name: m.league.name,
      joinedAt: m.joinedAt,
    })),
    careers,
    fantasySquads,
    copaRuns,
    communityLevels,
    communityVotes,
    communityReports,
    levelReactions,
    levelReports,
    leagueReports,
    seasonPromotions,
    // Push keys are secrets of the browser, not data about the player: only the preferences.
    pushSubscriptions: pushSubscriptions.map((p) => ({
      daily: p.daily,
      league: p.league,
      createdAt: p.createdAt,
    })),
  };
}

/** Erases or anonymises everything of the player in one transaction. */
export async function deleteData(prisma: PrismaClient, who: Who) {
  await prisma.$transaction(async (tx) => {
    // Resolved inside the transaction, so a session linked meanwhile is not left behind.
    const { sids, pks } = await owner(tx, who);
    const byPk = { where: { pk: { in: pks } } };
    await tx.attemptAction.deleteMany({ where: { attempt: { sessionId: { in: sids } } } });
    await tx.attempt.deleteMany({ where: { sessionId: { in: sids } } });
    await tx.careerPlayer.deleteMany({ where: { sessionId: { in: sids } } }); // cascades to seasons, matches, training
    await tx.levelReport.deleteMany({ where: { sessionId: { in: sids } } });
    await tx.levelReaction.deleteMany(byPk);
    await tx.leagueMember.deleteMany(byPk);
    await tx.leagueReport.deleteMany(byPk);
    await tx.pushSubscription.deleteMany(byPk);
    await tx.fantasySquad.deleteMany(byPk);
    await tx.copaRun.deleteMany(byPk);
    await tx.communityVote.deleteMany(byPk);
    await tx.communityReport.deleteMany(byPk);
    await tx.sticker.deleteMany(byPk);
    await tx.seasonPromotion.deleteMany(byPk);
    await tx.roundCheck.deleteMany(byPk);
    // Shared things stay for the others, without the name: leagues (closed when empty) and Oficina levels.
    await tx.league.updateMany({ where: { createdBy: { in: pks } }, data: { createdBy: DELETED } });
    await tx.league.deleteMany({ where: { members: { none: {} } } });
    await tx.communityLevel.updateMany({
      where: { authorPk: { in: pks } },
      data: { authorPk: DELETED },
    });
    for (const pk of pks)
      await tx.challenge.updateMany({
        where: { createdBy: `oficina:${pk}` },
        data: { createdBy: `oficina:${DELETED}` },
      });
    await tx.guestSession.deleteMany({ where: { id: { in: sids } } });
    if (who.userId) {
      const user = await tx.user.findUnique({ where: { id: who.userId } });
      if (user) await tx.verification.deleteMany({ where: { identifier: user.email } });
      await tx.user.delete({ where: { id: who.userId } }); // cascades to Better Auth sessions and accounts
    }
  });
}
