import type { Sticker } from '@decabeca/contracts';
import { StickerCard } from './StickerCard';
import { RARITY_ORDER } from './rarity';

/** The best stickers first: highest rarity, then the newest. */
export const bestFirst = (stickers: Sticker[]) =>
  [...stickers].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
      b.earnedAt.localeCompare(a.earnedAt),
  );

/** Glass case: up to six stickers on a dark shelf, a shelf line under each row. */
export function Showcase({
  stickers,
  cols = 'grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-6',
}: {
  stickers: Sticker[];
  cols?: string;
}) {
  const shelf = stickers.length > 3 ? 6 : 3;
  return (
    <ul
      className={`obj-dark grid gap-x-3 gap-y-5 rounded-xl border-4 border-chalk-soft/40 bg-pitch-deep p-3 shadow-[inset_0_0_30px_rgb(0_0_0/0.45)] ${cols}`}
    >
      {stickers.slice(0, 6).map((s) => (
        <li key={s.playerId} className="aspect-[3/4] shadow-[0_8px_0_-4px_rgb(255_255_255/0.2)]">
          <StickerCard sticker={s} size="sm" />
        </li>
      ))}
      {/* Empty slots up to a full shelf (3 or 6); the odd last one hides on the 2-column phone. */}
      {Array.from({ length: Math.max(0, shelf - stickers.length) }, (_, i) => (
        <li
          key={i}
          aria-hidden="true"
          className={`aspect-[3/4] rounded-[8px] border-2 border-dashed border-chalk-soft/30 ${shelf === 3 && i === shelf - stickers.length - 1 ? 'max-[479px]:hidden' : ''}`}
        />
      ))}
    </ul>
  );
}
