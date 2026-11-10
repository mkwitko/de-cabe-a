# Launch performance pass (web), 2026-11-10

Branch `launch-perf` (from `feat/launch-career-path`). Production bundle (`vite build`), served by
`vite preview` against a local API; Chromium (Playwright, new headless) on the real Intel iGPU
(Vulkan). SwiftShader (default headless) was tried first and discarded: it made every full-screen
layer look 4-5x worse than on real hardware.

- **Phone**: 360x740, DPR 2, touch, CPU throttled 4x.
- **Desktop**: 1920x1080, no throttle.
- fps = main-thread frame rate (rAF) over the window; jank = frames > 25 ms; lt = long tasks
  (count / longest ms). Scroll = synthesized touch (phone) / wheel (desktop) gesture down and up.
- Load rows include the full navigation (bundle parse at 4x CPU), so their long tasks are load-time.

## Before / after

| View (phone, 4x CPU) | Before | After |
|---|---|---|
| Home, entry choreography (load) | 43.5 fps, 11 long tasks (max 188 ms) | 53.8 fps, 5 (max 176 ms) |
| Home vitals | LCP 1208 ms, CLS 0.022 | LCP 964 ms, CLS 0 |
| Home idle (dust Lottie looping) | 60 fps; Lottie on main thread | 60 fps; Lottie in a worker |
| Home scroll (touch) | 60 fps; ~3 s of rAF Lottie work per 2.5 s on the main thread | 60 fps; 0 ms Lottie on the main thread |
| /career-path trail load / scroll | 53 fps / 60 fps | 51 fps / 60 fps (noise) |
| /career-path/1 open (passport) | 49 fps, max task 179 ms | 54 fps, max task 127 ms |
| Wrong guess (stamp) | 56 fps | 58 fps |
| Win → broadcast | 58 fps | 57 fps |
| Broadcast → sticker → end (taps) | 200-260 ms long tasks on the tap (3 traced runs) | max 125-137 ms (React renders in slices) |
| /album page turn | 52 fps, p95 33 ms, 23 janky; ~30% compositor frames dropped | 56 fps, p95 17 ms, 8 janky; ~9% dropped |
| /album sticker detail | 57 fps, max 135 ms | 57 fps, max 121 ms |
| /stats load / scroll | 54 fps / 60 fps | 51 fps / 60 fps (noise) |

| View (desktop 1920x1080) | Before | After |
|---|---|---|
| Home entry | 52.6 fps | 54.7 fps |
| Home vitals | LCP 1028 ms, CLS 0 | LCP 884 ms, CLS 0 |
| Home pointer parallax | **39 fps, p95 50 ms, 59 janky, 6 long tasks** | **60 fps, p95 17 ms, 0 janky, 0** |
| Home scroll | 60 fps | 60 fps |
| /career-path/1 flow | 58-60 fps | 58-60 fps |
| /album page turn | **42 fps, p95 67 ms, 39 janky** | **56 fps, p95 17 ms, 9 janky** |
| /album load / detail | 57 / 58 fps | 60 / 60 fps |
| /stats load / scroll | 57 / 60 fps | 60 / 60 fps |

Trace evidence: home parallax style recalculation 2585 ms → 580 ms (120 pointer moves); album turn
style recalculation 954 ms → ~400 ms and the leaf now animates on the compositor.

## What was slow and what changed

1. **Dust Lottie on the main thread.** `DotLottieReact` rendered the looping dust (and every
   moment) with wasm + canvas in a main-thread rAF. Now `DotLottieWorkerReact` (one shared worker,
   OffscreenCanvas); wasm/src URLs made absolute for the blob worker. (`Lottie.tsx`)
2. **Parallax restyled the whole home.** `--px/--py` were written on `.scene`; being inherited, every
   descendant restyled per frame. Now registered non-inherited `--sx/--sy` (`@property`) written only
   on `.scene-art`, `.scene-tilt`, `.ticket`. (`LockerRoom.tsx`, `index.css`)
3. **Album turn**: same inheritance problem with `--p/--m` on the book, plus a rAF loop. Now
   `--turn/--lift` are registered non-inherited and set on the leaf/shades/gloss/casts only (drag),
   and a released turn plays as Web Animations of transform/opacity sampled from the same curve, run
   by the compositor. (`AlbumPage.tsx`, `index.css`)
4. **Result screens**: broadcast → sticker → end, and the album detail, render via
   `startTransition`, so the tap no longer blocks for one 200 ms+ render. (`LevelParts.tsx`,
   `AlbumPage.tsx`)
5. **Reduzir animações** (Ajustes) now also stops the JS-driven motion (Lottie, parallax, album
   turn), not only CSS. (`Moment.tsx`, `LockerRoom.tsx`, `AlbumPage.tsx`)
6. Room art (`vestiario-night.webp`) preloaded from `index.html`.

## Checked and left alone

- `.room-dim` blur(2px), `.cp-room` filter, mix-blend layers, `.book` drop-shadow: on a real GPU
  they cost nothing measurable (home/stats/album idle and scroll at 60 fps, 1920x1080 included).
- Scroll listeners are passive; there are no layout-property animations on hot paths.
- Infinite animations: `house-pulse` (transform/opacity, composited) and the `sheen` on Ouro
  Brilhante stickers (background-position, main-thread paint of one card); small, left for the
  sticker work in flight.

## Still open

- Load-time long tasks at 4x CPU (index chunk ~330 kB / ~100 kB gzip parse): 130-180 ms on first
  navigation. Further route/vendor splitting would be the next step.
- Tap → result render tasks are 120-140 ms at 4x (from 200-260); the guess tap itself forces a
  ~60 ms layout.

## Round 2

- Home dust is CSS now (16 motes, transform/opacity); the dotlottie wasm (1.2 MB) is no longer
  requested on home, only when a celebration moment mounts.
- Ouro Brilhante `sheen` animates `transform` (compositor) instead of `background-position`.
- Album sticker detail: the large card renders a frame after the sheet opens. 4x CPU taps:
  detail 152 ms -> 70/99 ms; broadcast -> sticker ~88-101 ms; sticker -> end ~55-62 ms.
- Caddy: unhashed media (img, cutouts, audio, lottie, icons) `max-age=604800, stale-while-revalidate=86400`.
- Images: `decoding=async` on the rest; the broadcast hero is `fetchpriority=high`; the home LCP
  (room art) was already preloaded.
