import { useEffect } from 'react';
import type { StickerAward } from '@decabeca/contracts';
import { buzz } from '../lib/haptics';
import { play } from '../lib/sound';
import { Lamps, reducedMotion } from './Broadcast';
import { RARITY_STYLE } from './rarity';
import { StickerCard } from './StickerCard';
import { useFinish } from '../lib/cosmetics';
import { useNextFrame } from '../lib/progressive';

/**
 * One short step: the card, its name and the Nota De Cabeça appear together under a 150 ms fade,
 * over a light in the rarity colour. The card is about 44% of the screen height (60% of a phone's
 * width). No pack, spin, rays or tilt.
 */
export function StickerReveal({ award, onDone }: { award: StickerAward; onDone: () => void }) {
  const finishOf = useFinish();
  const { sticker, upgradedFrom, isNew } = award;
  const style = RARITY_STYLE[sticker.rarity];
  const cardOn = useNextFrame();

  useEffect(() => {
    play('rarity');
    play('stamp');
    if (!reducedMotion()) buzz(30);
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Figurinha nova"
      className={`screen-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-[clamp(0.75rem,2.5vh,1.75rem)] overflow-hidden pb-24 bg-[#070b14] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white motion-safe:animate-[fade-in_150ms_both] ${style.className}`}
    >
      <Lamps on={3} />
      {/* the rarity's light behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[44%] left-1/2 aspect-square w-[max(120vmin,560px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--rc)_70%,transparent),color-mix(in_srgb,var(--rc)_22%,transparent)_45%,transparent)]"
      />
      <p className="relative text-center text-sm font-black tracking-[0.4em] text-(--rc) uppercase sm:text-base">
        {isNew ? 'Figurinha ' : upgradedFrom ? 'Upgrade · ' : ''}
        {style.label}
      </p>
      <div className="relative aspect-[3/4] w-[min(62vw,33vh)]">
        {cardOn && <StickerCard sticker={sticker} size="lg" finish={finishOf(sticker.playerId)} />}
      </div>
      <div className="relative flex flex-col items-center gap-1 px-5 text-center">
        <p className="font-condensed max-w-[18ch] text-[clamp(2.25rem,6.5vh,4.5rem)] leading-[0.9] font-black text-balance uppercase">
          {sticker.name}
        </p>
        {sticker.rating !== undefined && (
          <p className="font-condensed flex items-baseline gap-2 text-sm font-extrabold tracking-[0.2em] text-white/75 uppercase sm:text-base">
            Nota De Cabeça
            <span className="tabular text-[clamp(1.75rem,4.5vh,3rem)] leading-none font-black tracking-normal text-(--rc)">
              {sticker.rating}
            </span>
          </p>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {`Figurinha ${style.label}: ${sticker.name}${sticker.rating === undefined ? '' : `, Nota De Cabeça ${sticker.rating}`}`}
      </p>
      <button
        type="button"
        onClick={onDone}
        className="font-condensed absolute inset-x-5 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto min-h-14 max-w-md rounded-xl bg-cover text-xl font-black tracking-wide text-ink uppercase shadow-[0_10px_24px_-8px_rgb(0_0_0/0.7)]"
      >
        Continuar
      </button>
    </div>
  );
}
