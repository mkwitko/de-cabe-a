import { cardInclude, nationalRecords, stickerFace } from './nota';
import {
  type Finish,
  AlbumResponse,
  ProfileAlbumResponse,
  PromoteRequest,
  StickerRarity,
} from '@decabeca/contracts';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { publicProfileOwner } from '../account/account.routes';
import { entitlements } from '../billing/billing';
import { ownedPks } from './owned-pks';
import { trophies } from '../progression/seasons';
import { RARITY_ORDER, rank } from './rarity';
import { applyRoundUpgrades } from './round-upgrade';

/** Best sticker per footballer across the pks, best first, then oldest. */
async function bestStickers(prisma: PrismaClient, pks: string[], now: Date) {
  const rows = await prisma.sticker.findMany({
    where: { pk: { in: pks } },
    include: { player: { include: cardInclude } },
  });
  const best = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const cur = best.get(r.playerId);
    if (!cur || rank(r.rarity) > rank(cur.rarity)) best.set(r.playerId, r);
  }
  const national = await nationalRecords(prisma, [...best.keys()]);
  return [...best.values()]
    .sort((a, b) => rank(b.rarity) - rank(a.rarity) || +a.earnedAt - +b.earnedAt)
    .map((r) => ({
      ...stickerFace(r.player, national.get(r.playerId), now.getUTCFullYear()),
      rarity: r.rarity,
      mode: r.mode,
      earnedAt: r.earnedAt.toISOString(),
    }));
}

export const albumRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;

  /** Podium seasons of the player (any owned pk) whose promotion is still unused, oldest first. */
  async function openPromotions(pks: string[]) {
    const [won, used] = await Promise.all([
      Promise.all(pks.map((pk) => trophies(prisma, pk, now()))),
      prisma.seasonPromotion.findMany({ where: { pk: { in: pks } }, select: { season: true } }),
    ]);
    const spent = new Set(used.map((u) => u.season));
    const open = new Map(won.flat().map((t) => [t.season, t]));
    return [...open.values()]
      .filter((t) => !spent.has(t.season))
      .sort((a, b) => a.season - b.season)
      .map(({ season, theme }) => ({ season, theme }));
  }

  async function album(pks: string[]) {
    await applyRoundUpgrades(prisma, pks, now());
    const [stickers, total, promotions] = await Promise.all([
      bestStickers(prisma, pks, now()),
      prisma.player.count({ where: { verificationStatus: 'verified' } }),
      openPromotions(pks),
    ]);
    const byRarity = Object.fromEntries(StickerRarity.options.map((r) => [r, 0])) as Record<
      StickerRarity,
      number
    >;
    for (const s of stickers) byRarity[s.rarity]++;
    return { total, owned: stickers.length, byRarity, stickers, promotions };
  }

  app.get('/me/album', { schema: { response: { 200: AlbumResponse } } }, async (req) =>
    album(await ownedPks(prisma, req)),
  );

  app.post(
    '/me/album/promote',
    { schema: { body: PromoteRequest, response: { 200: AlbumResponse } } },
    async (req) => {
      const pks = await ownedPks(prisma, req);
      const rows = await prisma.sticker.findMany({
        where: { pk: { in: pks }, playerId: req.body.playerId },
      });
      const best = rows.reduce<(typeof rows)[number] | undefined>(
        (m, r) => (!m || rank(r.rarity) > rank(m.rarity) ? r : m),
        undefined,
      );
      if (!best) throw new AppError(404, 'NOT_FOUND', 'Você não tem essa figurinha.');
      const [open] = await openPromotions(pks);
      if (!open) throw new AppError(409, 'NO_PROMOTION', 'Nenhuma promoção disponível.');
      try {
        await prisma.$transaction([
          prisma.seasonPromotion.create({
            data: { pk: req.userId ?? req.sessionId, season: open.season, playerId: best.playerId },
          }),
          // A rarity above Seleção da Temporada stays; the season is consumed anyway.
          ...(rank(best.rarity) < rank('selecao_temporada')
            ? [
                prisma.sticker.updateMany({
                  where: {
                    pk: best.pk,
                    playerId: best.playerId,
                    rarity: { in: RARITY_ORDER.slice(0, rank('selecao_temporada')) },
                  },
                  data: { rarity: 'selecao_temporada' },
                }),
              ]
            : []),
        ]);
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err;
        throw new AppError(409, 'NO_PROMOTION', 'Nenhuma promoção disponível.');
      }
      return album(pks);
    },
  );

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
      const stickers = await bestStickers(prisma, owner.pks, now());
      const showcase = stickers.slice(0, 6);
      // finishes only for accounts, and only the ones still owned (wearing() inside entitlements)
      const finishes: Record<string, Finish> = {};
      if (owner.who.userId) {
        const { equipped } = await entitlements(prisma, owner.who.userId, now());
        for (const s of showcase) {
          const own = equipped.stickers[s.playerId];
          const f = own === 'none' ? null : (own ?? equipped.finish);
          if (f) finishes[s.playerId] = f;
        }
      }
      return { showcase, owned: stickers.length, finishes };
    },
  );
};
