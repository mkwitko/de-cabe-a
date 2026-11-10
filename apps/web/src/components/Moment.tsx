import { lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react';
import type { LottieProps } from './Lottie';
import { motionReduced } from '../lib/settings';

type Props = LottieProps & { fallback?: ReactNode };
// Offline with the chunk not yet fetched, the moment quietly becomes its still (or nothing).
const Lottie = lazy<ComponentType<Props>>(() =>
  import('./Lottie').catch(() => ({ default: ({ fallback }: Props) => <>{fallback}</> })),
);

/** Fetch the player before a moment is due (it loads on first mount otherwise). */
export const preloadLottie = () => void import('./Lottie').catch(() => {});

// the system setting or Ajustes › Reduzir animações (JS-driven motion; CSS follows data-motion)
const still = motionReduced;

/**
 * A Lottie moment: the player chunk loads only when this mounts, and never under reduced motion,
 * where `fallback` (a still drawing, or nothing) stands in. Decorative: hidden from readers.
 */
export function Moment({
  className,
  fallback = null,
  ...props
}: LottieProps & { className?: string; fallback?: ReactNode }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className ?? ''}`}>
      {still() ? (
        fallback
      ) : (
        <Suspense fallback={fallback}>
          <Lottie {...props} fallback={fallback} />
        </Suspense>
      )}
    </div>
  );
}

/** The goal at rest, ball in the net: the still drawing behind the `goal` loop. */
function GoalStill() {
  const net = [];
  for (let x = 40; x <= 120; x += 10) net.push(`M${x} 34V100`);
  for (let y = 40; y <= 90; y += 10) net.push(`M32 ${y}H128`);
  return (
    <svg viewBox="0 0 160 120" className="size-full" fill="none" strokeLinecap="round">
      <path d={net.join('')} stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M8 100h144" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" />
      <path d="M30 100V30h100v70" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="88" cy="92" r="9.5" fill="#fff" stroke="#1d2a1f" strokeWidth="1.6" />
      <path d="M88 87.4l4.4 3.2-1.7 5.1h-5.4l-1.7-5.1z" fill="#1d2a1f" />
    </svg>
  );
}

/** Empty and error states: a ball flies into the net, looping; the still goal under reduced motion. */
export function GoalLoop({ className = 'h-24 w-32' }: { className?: string }) {
  // drawn in the page's text colour (chalk on the dark pitch, ink on the light one)
  const [chalk] = useState(() => getComputedStyle(document.body).color);
  return <Moment art="goal" colors={[chalk]} loop className={className} fallback={<GoalStill />} />;
}
