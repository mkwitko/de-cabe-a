import { useEffect, useState } from 'react';
import type { StickerAward } from '@decabeca/contracts';
import { buzz } from '../lib/haptics';
import { play } from '../lib/sound';
import { Lamps, reducedMotion } from './Broadcast';
import { RARITY_ORDER, RARITY_STYLE } from './rarity';
import { StickerCard } from './StickerCard';
import { Moment } from './Moment';
import { useFinish } from '../lib/cosmetics';

/** From Destaque da Rodada up, a pack tears open in the rarity colour before the card. */
const RARE = RARITY_ORDER.indexOf('destaque_rodada');

/** The rarity's colours for the pack (its --rc; Lenda's rainbow rim): Lottie cannot read CSS vars. */
const packColors = (r: StickerAward['sticker']['rarity']) =>
  r === 'lenda'
    ? ['#c08aff', '#ff8a8a', '#ffe08a', '#9dffb0', '#8ad8ff']
    : [/--rc:(#[0-9a-f]{6})/i.exec(RARITY_STYLE[r].className)?.[1] ?? '#f5c400'];

/**
 * Rarity colour and name first (with its sound), then the card spins in, then the name. A hero
 * moment sized to the viewport: the card about 44% of the screen height (60% of a phone's
 * width) over a light in the rarity colour, then the name and the Nota De Cabeça in big type.
 */
export function StickerReveal({
  award,
  onDone,
  short,
}: {
  award: StickerAward;
  onDone: () => void;
  short: boolean;
}) {
  const finishOf = useFinish();
  const { sticker, upgradedFrom, isNew } = award;
  const style = RARITY_STYLE[sticker.rarity];
  const level = RARITY_ORDER.indexOf(sticker.rarity);
  const rare = level >= RARE && !short;
  const [phase, setPhase] = useState<'rarity' | 'card' | 'named'>('rarity');

  // Straight on from the broadcast, under the same lit floodlights: the rarity is called at once,
  // the card spins in, then his name lands. Rarer stickers hold the suspense a little longer.
  useEffect(() => {
    const quick = short || reducedMotion();
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms));
    // a rare pack needs its 0.8 s to shiver and tear before the card spins in
    const hold = quick ? 0 : level >= RARE ? 250 + level * 60 : level * 80;
    play('rarity');
    at(quick ? 150 : 350 + hold, () => {
      setPhase('card');
      play('shimmer');
    });
    at(quick ? 650 : 1500 + hold, () => {
      setPhase('named');
      play('stamp');
      if (!reducedMotion()) buzz(30);
    });
    return () => timers.forEach(clearTimeout);
  }, [level, short]);

  const revealed = phase === 'card' || phase === 'named';
  const dur = short ? 500 : 1300;
  return (
    <div
      role="dialog"
      aria-label="Figurinha nova"
      className={`screen-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-[clamp(0.75rem,2.5vh,1.75rem)] overflow-hidden pb-24 bg-[#070b14] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white ${style.className}`}
    >
      <Lamps on={3} />
      {/* the rarity's light behind the card */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-[44%] left-1/2 aspect-square w-[max(120vmin,560px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--rc)_70%,transparent),color-mix(in_srgb,var(--rc)_22%,transparent)_45%,transparent)] transition-opacity duration-700 ${revealed ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* and its rays, turning slowly (still with reduced motion) */}
      <div
        aria-hidden="true"
        className={`reveal-rays pointer-events-none absolute top-[44%] left-1/2 aspect-square w-[max(110vmin,520px)] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-1000 ${revealed ? 'opacity-100' : 'opacity-0'}`}
      />
      {!short && !reducedMotion() && (
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 h-[120%] w-1.5 bg-[linear-gradient(transparent,#fff7d1,transparent)] opacity-0 motion-safe:animate-[beam_700ms_ease-out_forwards]"
        />
      )}
      <p className="relative text-center text-sm font-black tracking-[0.4em] text-(--rc) uppercase sm:text-base motion-safe:animate-[fade-in_300ms_both]">
        {isNew ? 'Figurinha ' : upgradedFrom ? 'Upgrade · ' : ''}
        {style.label}
      </p>
      <div className="relative">
        {rare && (
          <Moment
            art="packBurst"
            colors={packColors(sticker.rarity)}
            className="absolute top-1/2 left-1/2 aspect-square w-[min(150vw,600px)] -translate-x-1/2 -translate-y-1/2"
          />
        )}
        <div
          className={`relative aspect-[3/4] w-[min(62vw,33vh)] ${revealed ? 'motion-safe:animate-[card-in_var(--d)_cubic-bezier(.15,.85,.25,1)_both] motion-reduce:animate-[fade-in_200ms_both]' : 'opacity-0'}`}
          style={{ '--d': `${dur}ms` } as React.CSSProperties}
        >
          <StickerCard
            sticker={sticker}
            size="lg"
            showName={phase === 'named'}
            finish={finishOf(sticker.playerId)}
          />
        </div>
      </div>
      <div
        className={`relative flex flex-col items-center gap-1 px-5 text-center transition-[opacity,transform] duration-500 ease-out ${phase === 'named' ? 'opacity-100' : 'translate-y-3 opacity-0'}`}
      >
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
        {phase === 'named'
          ? `Figurinha ${style.label}: ${sticker.name}${sticker.rating === undefined ? '' : `, Nota De Cabeça ${sticker.rating}`}`
          : ''}
      </p>
      <button
        type="button"
        onClick={onDone}
        className={
          phase === 'named'
            ? 'font-condensed absolute inset-x-5 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto min-h-14 max-w-md rounded-xl bg-cover text-xl font-black tracking-wide text-ink uppercase shadow-[0_10px_24px_-8px_rgb(0_0_0/0.7)] motion-safe:animate-[fade-in_300ms_both]'
            : 'absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] min-h-11 rounded-full border-2 border-white/60 px-5 font-extrabold text-white'
        }
      >
        {phase === 'named' ? 'Continuar' : 'Pular'}
      </button>
    </div>
  );
}
