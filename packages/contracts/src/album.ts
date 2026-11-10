import { z } from 'zod';
import { Sticker, StickerRarity } from './game';

// Sticker schemas live in game.ts (AttemptResponse needs them; avoids an import cycle).
export { Sticker, StickerAward, StickerRarity } from './game';

export const AlbumResponse = z.strictObject({
  total: z.number().int(),
  owned: z.number().int(),
  byRarity: z.record(StickerRarity, z.number().int()),
  stickers: z.array(Sticker),
});
export type AlbumResponse = z.infer<typeof AlbumResponse>;

export const ProfileAlbumResponse = z.strictObject({
  showcase: z.array(Sticker).max(6),
  owned: z.number().int(),
});
export type ProfileAlbumResponse = z.infer<typeof ProfileAlbumResponse>;

export const PromoteRequest = z.strictObject({ playerId: z.string() });
export type PromoteRequest = z.infer<typeof PromoteRequest>;
