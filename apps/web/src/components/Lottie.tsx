/**
 * The dotLottie player, in its own lazy chunk: the home's dust (public/lottie/dust.json) and the
 * moments authored in lib/lottie-art (coloured at play time). The wasm is served by us, not a CDN.
 * Mount it through `Moment`, which keeps it out under reduced motion.
 */
import { useMemo } from 'react';
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
import wasmUrl from '../../node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm?url';
import { ART, type Art } from '../lib/lottie-art';

setWasmUrl(wasmUrl);

export type LottieProps = { loop?: boolean } & (
  { src: string; art?: never; colors?: never } | { art: Art; colors?: string[]; src?: never }
);

export default function Lottie({ src, art, colors, loop = false }: LottieProps) {
  // colours arrive as a fresh array each render: their text keeps the animation from reloading
  const key = colors?.join();
  const source = useMemo(
    () => (art ? { data: ART[art](key?.split(',')) } : { src: src! }),
    [art, key, src],
  );
  return <DotLottieReact {...source} loop={loop} autoplay className="size-full" />;
}
