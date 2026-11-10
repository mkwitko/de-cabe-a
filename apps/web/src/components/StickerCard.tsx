import type { Ref } from 'react';
import type { Sticker } from '@decabeca/contracts';
import { RARITY_STYLE } from './rarity';
import { POSITION_LABEL } from '../lib/format';

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
            className={`leading-[0.88] font-black tracking-tight [overflow-wrap:anywhere] uppercase transition-opacity duration-400 ${sticker.photo ? (lg ? 'text-3xl' : 'text-base') : lg ? 'text-4xl' : 'text-lg'} ${showName ? 'opacity-100' : 'opacity-0'}`}
          >
            {sticker.name}
          </p>
          {sticker.positionGroup && (
            <p
              className={`font-extrabold tracking-[0.12em] uppercase opacity-80 ${lg ? 'mt-1 text-xs' : 'mt-0.5 text-[8px]'}`}
            >
              {POSITION_LABEL[sticker.positionGroup]}
            </p>
          )}
        </div>
        {sticker.photo && (
          // Portrait under the name; the credit rides on title and alt text, as the CC licences
          // ask for it where the photo shows.
          <img
            src={sticker.photo}
            alt={sticker.photoCredit ? `${sticker.name}. ${sticker.photoCredit}` : sticker.name}
            title={sticker.photoCredit ?? undefined}
            loading="lazy"
            decoding="async"
            draggable={false}
            className={`min-h-0 w-full flex-1 bg-(--edge) object-cover object-[50%_20%] ${lg ? 'my-2 rounded-md border-2' : 'my-1 rounded-[3px] border'} border-(--ink)/40`}
          />
        )}
        <p
          className={`font-extrabold tracking-[0.16em] uppercase ${lg ? 'text-[11px]' : 'text-[8px]'}`}
        >
          {sticker.nationality}
        </p>
        <div
          ref={stripRef}
          aria-hidden="true"
          className="holo pointer-events-none absolute inset-y-0 -left-full w-[300%] bg-(image:--holo) opacity-80 mix-blend-soft-light"
        />
      </div>
    </div>
  );
}
