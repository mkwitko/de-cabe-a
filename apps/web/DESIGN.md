# Design — De Cabeça (web)

Derived from the shipped app (`src/App.tsx`, `src/index.css`, pages and games), updated 2026-11-06. Product truth lives in `/PRODUCT.md`; the surface direction contract in `.impeccable/surfaces/`.

## World

A printed sticker album. The page is pitch-green album paper with a fine halftone; games, levels and answers are **slots** that get a **sticker** pasted in. Empty = dashed slot with its printed number; filled = white-bordered paper sticker. Clubs are round colour badges with initials, never logos.

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
- **Slot** — 2px dashed `chalk-soft/60` border, `chalk/6%` fill, radius 8px; number top-left, title + rule bottom. Game slots on the home show progress (`0/200 fases`, stars, bar) and the next action.
- **Stamp** — 2px `stamp` border, condensed uppercase, rotated −8°.
- **Track grid** (`TrackPage`) — progress panel (done/total, stars, "Jogar fase N"), then pages of 10 level slots; the open level is a `cover` sticker, done levels show their stars, locked ones stay dashed.
- **Trajectory** (Career Path) — vertical path of club badges joined by a dashed line; each club: name, country, years, games/goals in `cover`; the next unknown club is a dashed `?` badge.
- **Clue chip** — `cover` pill, small uppercase label + condensed value ("Posição · Meio-campista / Atacante"); main position first, then secondary ones.
- **Dugout panel** — the guess box (search + "Chutar" + skip) beside the board on wide screens, docked below it on phones.
- **Grid board** — 3×3 cells with criteria headers (club badge, flag or position); a right answer pastes a sticker into the cell; hints show a `HintMask` ("R______ _______").
- **Attempt dots** — dashed squares that fill per attempt, top-right of the game header.
- **Result sticker** (`LevelEnd`) — one pasted sticker (paper border, `cover` field, −1°, paste animation) with headline, detail, ink stars and points; then next/share buttons and the level's Top 10 (empty state "O lugar 1 está vago").
- **Title ladder** (Stats) — Reserva 0, Titular 15, Craque 60, Lenda 150 stars as a stepped track; the current title is a big cover sticker.
- **Player sticker** (Conta) — initials badge, nickname, title and stars on `pitch-deep`, paper border, −2°.
- **Buttons** — primary: `cover` fill, ink condensed uppercase, min-height 44px; secondary: 2px `chalk-soft/60` outline.

## Layout and motion

**Rule: use as much of the screen as possible, always centred.**

- One shell for every page: `max-w-7xl` (1280px, the product's widest target), `mx-auto`, gutters 16px (`px-4`) on phones and 32px (`sm:px-8`) from 640px. No page narrows the shell; there is no narrow/wide variant.
- `scrollbar-gutter: stable` on `html`, so the centre does not move between pages with and without a scrollbar.
- Width is filled by columns, not by stretching lines: the content regroups into 2 columns (`md`/`lg`) or a board + side panel, never a single narrow column floating to one side. Example: Conta puts the nickname and account forms side by side from `lg`; Stats puts Career Path and Grid side by side.
- Text keeps its measure (body ≤ 34–48ch) inside its column; the column, not the line, takes the width.
- Single elements without a column (empty states, the guest sticker on phones) are centred.
- Mobile-first (360px base): one column, bottom tab bar (`min-h-14` targets), no horizontal scroll at 360px.
- Motion: sticker tilt (home), paste-in for stickers and clue chips (`ease-out-expo`, 420–500ms); all off under `prefers-reduced-motion`.

## Browser surfaces

`::selection` cover on ink; `:focus-visible` 3px cover outline, 3px offset; `scrollbar-color` chalk-soft on pitch-deep; `color-scheme: light dark`.
