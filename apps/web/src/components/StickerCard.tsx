import type { Ref } from 'react';
import type { Sticker } from '@decabeca/contracts';
import { RARITY_STYLE } from './rarity';

export const POSITION = { GK: 'GOL', DF: 'DEF', MF: 'MEI', FW: 'ATA' } as const;

/**
 * The sticker itself: paper frame, rarity face, holo strip. Fills its parent (which sets the
 * 3:4 box); `size` only scales the type. The reveal passes `stripRef` to move the strip and
 * `showName={false}` until the name is announced.
 */
export function StickerCard({
  sticker,
  size,
  showName = true,
  stripRef,
}: {
  sticker: Sticker;
  size: 'sm' | 'lg';
  showName?: boolean;
  stripRef?: Ref<HTMLDivElement>;
}) {
  const lg = size === 'lg';
  return (
    <div
      className={`${RARITY_STYLE[sticker.rarity].className} h-full w-full bg-(--edge) shadow-[12px_20px_30px_rgb(0_0_0/0.5)] ${lg ? 'rounded-[14px] p-2' : 'rounded-[8px] p-1 shadow-[4px_6px_10px_rgb(0_0_0/0.4)]'}`}
    >
      <div
        className={`relative flex h-full flex-col justify-between overflow-hidden bg-(image:--face) text-(--ink) ${lg ? 'rounded-lg p-3' : 'rounded-[5px] p-1.5'}`}
      >
        <div>
          <p
            className={`font-extrabold tracking-[0.16em] uppercase ${lg ? 'text-[11px]' : 'text-[8px]'}`}
          >
            Figurinha
          </p>
          <p
            className={`leading-[0.85] font-black tracking-tighter ${lg ? 'text-5xl' : 'text-2xl'}`}
          >
            {sticker.positionGroup ? POSITION[sticker.positionGroup] : '—'}
          </p>
        </div>
        <div>
          <p
            className={`leading-[0.92] font-black tracking-tight uppercase transition-opacity duration-400 ${lg ? 'text-2xl' : 'text-[13px]'} ${showName ? 'opacity-100' : 'opacity-0'}`}
          >
            {sticker.name}
          </p>
          <p
            className={`font-extrabold tracking-[0.16em] uppercase ${lg ? 'mt-1 text-[11px]' : 'mt-0.5 text-[8px]'}`}
          >
            {sticker.nationality}
          </p>
        </div>
        <div
          ref={stripRef}
          aria-hidden="true"
          className="holo pointer-events-none absolute inset-y-0 -left-full w-[300%] bg-(image:--holo) opacity-80 mix-blend-soft-light"
        />
      </div>
    </div>
  );
}
