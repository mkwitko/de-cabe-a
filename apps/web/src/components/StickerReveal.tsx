import { useEffect, useRef, useState } from 'react';
import type { StickerAward } from '@decabeca/contracts';
import { buzz } from '../lib/haptics';
import { play } from '../lib/sound';
import { Lamps, reducedMotion } from './Broadcast';
import { RARITY_ORDER, RARITY_STYLE } from './rarity';
import { StickerCard } from './StickerCard';
import { Moment } from './Moment';

/** From Destaque da Rodada up, a pack tears open in the rarity colour before the card. */
const RARE = RARITY_ORDER.indexOf('destaque_rodada');

/** The rarity's colours for the pack (its --rc; Lenda's rainbow rim): Lottie cannot read CSS vars. */
const packColors = (r: StickerAward['sticker']['rarity']) =>
  r === 'lenda'
    ? ['#c08aff', '#ff8a8a', '#ffe08a', '#9dffb0', '#8ad8ff']
    : [/--rc:(#[0-9a-f]{6})/i.exec(RARITY_STYLE[r].className)?.[1] ?? '#f5c400'];

/** Rarity colour and name first (with its sound), then the card spins in, then the name. */
export function StickerReveal({
  award,
  onDone,
  short,
}: {
  award: StickerAward;
  onDone: () => void;
  short: boolean;
}) {
  const { sticker, upgradedFrom, isNew } = award;
  const style = RARITY_STYLE[sticker.rarity];
  const level = RARITY_ORDER.indexOf(sticker.rarity);
  const rare = level >= RARE && !short;
  const [phase, setPhase] = useState<'rarity' | 'card' | 'named'>('rarity');
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);

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

  const onMove = (e: React.PointerEvent) => {
    if (phase !== 'named' || reducedMotion() || !stage.current || !tilt.current) return;
    const follow = stage.current.classList.contains('holo-follow');
    const r = stage.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    tilt.current.style.transform = `rotateY(${(x - 0.5) * 28}deg) rotateX(${(0.5 - y) * 24}deg)`;
    if (follow && strip.current) strip.current.style.transform = `translateX(${(x - 0.5) * 60}%)`;
  };

  const revealed = phase === 'card' || phase === 'named';
  const dur = short ? 500 : 1300;
  return (
    <div
      ref={stage}
      onPointerMove={onMove}
      role="dialog"
      aria-label="Figurinha nova"
      className={`screen-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden bg-[#070b14] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white ${style.className}`}
    >
      <Lamps on={3} />
      {!short && !reducedMotion() && (
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 h-[120%] w-1.5 bg-[linear-gradient(transparent,#fff7d1,transparent)] opacity-0 motion-safe:animate-[beam_700ms_ease-out_forwards]"
        />
      )}
      <p className="text-center text-sm font-black tracking-[0.4em] text-(--rc) uppercase motion-safe:animate-[fade-in_300ms_both]">
        {isNew ? 'Figurinha ' : upgradedFrom ? 'Upgrade · ' : ''}
        {style.label}
      </p>
      <div className="relative [perspective:900px]">
        {rare && (
          <Moment
            art="packBurst"
            colors={packColors(sticker.rarity)}
            className="absolute top-1/2 left-1/2 aspect-square w-[min(150vw,600px)] -translate-x-1/2 -translate-y-1/2"
          />
        )}
        <div
          ref={tilt}
          className={`relative aspect-[3/4] w-[min(64vw,250px)] [transform-style:preserve-3d] ${revealed ? 'motion-safe:animate-[card-in_var(--d)_cubic-bezier(.15,.85,.25,1)_both] motion-reduce:animate-[fade-in_200ms_both]' : 'opacity-0'}`}
          style={{ '--d': `${dur}ms` } as React.CSSProperties}
        >
          <StickerCard sticker={sticker} size="lg" showName={phase === 'named'} stripRef={strip} />
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {phase === 'named' ? `Figurinha ${style.label}: ${sticker.name}` : ''}
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
