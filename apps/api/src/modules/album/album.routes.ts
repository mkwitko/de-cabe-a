import { AlbumResponse, ProfileAlbumResponse, StickerRarity } from '@decabeca/contracts';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { publicProfileOwner } from '../account/account.routes';
import { effectivePks } from '../leagues/leagues';
import { rank } from './rarity';
import { applyRoundUpgrades } from './round-upgrade';

/** Best sticker per footballer across the pks, best first, then oldest. */
async function bestStickers(prisma: PrismaClient, pks: string[]) {
  const rows = await prisma.sticker.findMany({
    where: { pk: { in: pks } },
    include: { player: { include: { nationality: true } } },
  });
  const best = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const cur = best.get(r.playerId);
    if (!cur || rank(r.rarity) > rank(cur.rarity)) best.set(r.playerId, r);
  }
  return [...best.values()]
    .sort((a, b) => rank(b.rarity) - rank(a.rarity) || +a.earnedAt - +b.earnedAt)
    .map((r) => ({
      playerId: r.playerId,
      name: r.player.canonicalName,
      positionGroup: r.player.primaryPositionGroup,
      nationality: r.player.nationality.name,
      rarity: r.rarity,
      mode: r.mode,
      earnedAt: r.earnedAt.toISOString(),
    }));
}

/** The effective account plus every guest session linked to it (stickers keep their old pk). */
async function ownedPks(prisma: PrismaClient, req: { sessionId: string; userId: string | null }) {
  const eff = await effectivePks(prisma, [req.userId ?? req.sessionId]);
  const linked = await prisma.guestSession.findMany({
    where: { userId: { in: eff } },
    select: { id: true },
  });
  return [...new Set([...eff, req.sessionId, ...linked.map((s) => s.id)])];
}

export const albumRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;

  app.get('/me/album', { schema: { response: { 200: AlbumResponse } } }, async (req) => {
    const pks = await ownedPks(prisma, req);
    await applyRoundUpgrades(prisma, pks, now());
    const [stickers, total] = await Promise.all([
      bestStickers(prisma, pks),
      prisma.player.count({ where: { verificationStatus: 'verified' } }),
    ]);
    const byRarity = Object.fromEntries(StickerRarity.options.map((r) => [r, 0])) as Record<
      StickerRarity,
      number
    >;
    for (const s of stickers) byRarity[s.rarity]++;
    return { total, owned: stickers.length, byRarity, stickers };
  });

  app.get(
    '/profiles/:nickname/album',
    {
      schema: {
        params: z.object({ nickname: z.string().max(40) }),
        response: { 200: ProfileAlbumResponse },
      },
    },
    async (req) => {
      const owner = await publicProfileOwner(prisma, req.params.nickname);
      if (!owner) throw new AppError(404, 'NOT_FOUND', 'Perfil não encontrado ou privado.');
      const stickers = await bestStickers(prisma, owner.pks);
      return { showcase: stickers.slice(0, 6), owned: stickers.length };
    },
  );
};
