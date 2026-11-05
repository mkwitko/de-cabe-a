# Design — De Cabeça (web)

Derived from the shipped home (`src/App.tsx`, `src/index.css`), slice 1. Product truth lives in `/PRODUCT.md`; the surface direction contract in `.impeccable/surfaces/`.

## World

A printed sticker album. The page is pitch-green album paper with a fine halftone; games and, later, answers are **slots** that get a **sticker** pasted in. Empty = dashed slot with its printed number; filled = white-bordered paper sticker. Clubs (later) are round colour badges with initials, never logos.

## Colour (Tailwind v4 `@theme`, oklch)

Strategy: Committed. Pitch green owns the page in both themes; album-cover yellow is the only accent.

| Token        | Light           | Dark           | Use                                                    |
| ------------ | --------------- | -------------- | ------------------------------------------------------ |
| `pitch`      | 0.46 0.12 152   | 0.22 0.045 155 | Page ground                                            |
| `pitch-deep` | 0.38 0.10 152   | 0.17 0.035 155 | Halftone dots, `html` ground, scrollbar track          |
| `chalk`      | 0.98 0.012 150  | 0.95 0.015 150 | Text on pitch                                          |
| `chalk-soft` | 0.90 0.035 150  | 0.80 0.04 150  | Secondary text, slot outlines and numbers (with alpha) |
| `paper`      | 0.985 0.006 100 | 0.93 0.008 100 | Sticker border                                         |
| `cover`      | 0.88 0.165 95   | 0.84 0.15 95   | Brand sticker field, selection, focus ring             |
| `ink`        | 0.27 0.07 152   | same           | Text on paper/cover                                    |
| `stamp`      | 0.90 0.16 95    | same           | "Em breve" rubber stamp                                |

Theme follows `prefers-color-scheme` only (no toggle).

## Type

One family, self-hosted: **Archivo Variable** (`@fontsource-variable/archivo/wdth.css`, wght 100–900, wdth 62–125%).

- Display/labels: `font-condensed` utility (`font-stretch: 68%`), weight 800–900, uppercase, tracking ≥ −0.02em. Brand: `clamp(3rem, 14vw, 5.5rem)`, leading 0.85, no wrap.
- Slot numbers: condensed 900, `text-7xl`, `tabular` (tabular numerals), `chalk-soft/50`.
- Body: normal width, 500–600, `text-lg`/`text-xl`, measure ≤ 34ch.

## Components

- **Brand sticker** — `paper` border 10px radius, `cover` field, rotated −2°, soft offset shadow. Pointer tilt (`--mx/--my`) and a soft-light sheen on hover, mouse only; off under `prefers-reduced-motion`.
- **Slot** — 2px dashed `chalk-soft/60` border, `chalk/6%` fill, radius 8px, min-height 14rem; number top-left, title + rule bottom.
- **Stamp** — 2px `stamp` border, condensed uppercase, rotated −8°, top-right of a slot.

## Layout and motion

Mobile-first (360px), single column; `sm` (640px) puts sticker and tagline side by side and slots in two columns; max width `4xl`. Motion: one authored moment (sticker tilt), `ease-out-expo`, 500ms.

## Browser surfaces

`::selection` cover on ink; `:focus-visible` 3px cover outline, 3px offset; `scrollbar-color` chalk-soft on pitch-deep; `color-scheme: light dark`.
