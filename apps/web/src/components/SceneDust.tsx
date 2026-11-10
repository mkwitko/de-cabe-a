/**
 * Dust drifting in the floodlight (our own Lottie, public/lottie/dust.json). Loaded on demand by
 * the home scene, never under reduced motion; the player's wasm is served by us, not a CDN.
 */
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
import wasmUrl from '../../node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm?url';

setWasmUrl(wasmUrl);

export default function SceneDust() {
  return <DotLottieReact src="/lottie/dust.json" loop autoplay className="size-full" />;
}
