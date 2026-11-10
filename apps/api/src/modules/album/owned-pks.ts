import type { PrismaClient } from '../../generated/prisma/client';
import { effectivePks } from '../leagues/leagues';

/** The effective account plus every guest session linked to it (stickers keep their old pk). */
export async function ownedPks(
  prisma: PrismaClient,
  req: { sessionId: string; userId: string | null },
) {
  const eff = await effectivePks(prisma, [req.userId ?? req.sessionId]);
  const linked = await prisma.guestSession.findMany({
    where: { userId: { in: eff } },
    select: { id: true },
  });
  return [...new Set([...eff, req.sessionId, ...linked.map((s) => s.id)])];
}
