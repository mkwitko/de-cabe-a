# Design — De Cabeça (web)

Derived from the shipped app (`src/App.tsx`, `src/index.css`, pages and games), updated 2026-11-06. Product truth lives in `/PRODUCT.md`; the surface direction contract in `.impeccable/surfaces/`.

## World

A printed sticker album. The page is pitch-green album paper with a fine halftone; games, levels and answers are **slots** that get a **sticker** pasted in. Empty = dashed slot with its printed number; filled = white-bordered paper sticker. Clubs are round colour badges with initials, never logos.

## Colour (Tailwind v4 `@theme`, oklch)

Strategy: Committed. Pitch green owns the page; album-cover yellow is the only accent.

| Token        | Value          | Use                                                    |
| ------------ | -------------- | ------------------------------------------------------ |
| `pitch`      | 0.22 0.045 155 | Page ground                                            |
| `pitch-deep` | 0.17 0.035 155 | Halftone dots, `html` ground, scrollbar track          |
| `chalk`      | 0.95 0.015 150 | Text on pitch                                          |
| `chalk-soft` | 0.80 0.04 150  | Secondary text, slot outlines and numbers (with alpha) |
| `paper`      | 0.93 0.008 100 | Sticker border                                         |
| `cover`      | 0.84 0.15 95   | Brand sticker field, selection, focus ring             |
| `ink`        | 0.27 0.07 152  | Text on paper/cover                                    |
| `stamp`      | 0.90 0.16 95   | "Em breve" rubber stamp                                |

One theme, dark (2026-11-10): no light values, no `prefers-color-scheme` or `data-theme` switching; `theme-color` `#0f1f16`.

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
- **Career Path passport** (`CareerPathCard`, `games/career-path/Trail`) — burgundy leather cover with gold tooling and seal, the name in gold foil, a ruled visa page tucked in it (title in its frame and tone, last stamps and the lit next slot, progress, rarest sticker) and one `cover` button. Home: the cover fills the first phone screen; from `lg` a ticket beside it shows what the next level is worth. Trail: a spread of two visa pages, 6 stamp slots each (ink stamp + stars when done, lit dashed slot when next, faint when locked), turned 12 levels at a time.
- **Home scene, "Vestiário à noite"** (`components/LockerRoom.tsx`) — full-screen locker room (our own art, `public/img/vestiario-night.webp`, fixed and slightly parallaxed); the passport lies open on the bench (inside cover: name, rule, title in its frame; visa page: 10 stamp slots, 5 on phones, and the count), the player's Career Path stickers fanned out of it, the next-level ticket clipped to it (stub with the level and what it is worth, one big ink button "Jogar fase N"), the closed modes as premiere posters taped to the wall under the "Em breve" stamp (one row that scrolls sideways with snap and faded edges, ~1.3 posters on a phone, 4–5 wide, arrows from `lg`): each the mode's art full-bleed under its own hue, halftone, folds, grain, a chipped corner and two strips of tape, the name in condensed 900 sized in container units, a one-line hook, a `stamp` "Em breve · Votar" strip, a round votes sticker (`cover` when it is the player's vote, "Seu voto") and a `cover` "Mais votado" ribbon on the leader; hover/focus lifts and straightens it; a tap opens `ModeDialog` (`?modo=`). Entry once per tab: light flickers on, cover swings open (rotateY on wide, rotateX on phones), stickers slide out, ticket lands, last stamp thumps; dust in the light is a small self-authored Lottie loaded after the entry. Reduced motion: the composed scene, still.
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
- Mobile-first (360px base): one column, no horizontal scroll at 360px.
- **Navigation** (updated 2026-11-09): four places, each owning its pages. Jogos (home, tracks, levels, Modo Carreira), Desafio (`/d/*`), Ranking (ranking, seasons, `/ligas`, `/liga/*`), Perfil (`/stats`, `/history`, `/conta`, `/perfil/*`). Phone: bottom bar 64px + safe area, four equal columns, 22px drawn icon over a 12px bold label, active tab in `cover` with a 3px cover bar on its top edge. Wide screens: the same four words in condensed uppercase at the top right, the active one underlined by the same bar. At launch the places are Jogar · Álbum · Perfil. Updated 2026-11-10: the header is a **scoreboard strip** (`.scoreboard`: black glass with a fine LED grid, a gold floodlight hairline on top, radius 16px, 56px tall) on every route: crest + name (the h1 on the home), places (wide only; the active one lit from the strip's floor with a `cover` bar and a soft cover wash, `.tab-lit`), one gear for **Ajustes**, Entrar/avatar. Phone: the same strip with crest, gear, Entrar on every route except inside a level (the game owns the phone screen); the bottom bar uses the same scoreboard material, the lit bar on the active tab's top edge. **Ajustes** (`components/Settings.tsx`, native `<dialog>`): a bottom sheet on phones, a 26rem panel under the strip's right end from 640px; Música and Efeitos switches with live volume faders (`.fader`), Trilha (Automática or one of four CC0 football loops, each with a 12 s preview), Vibração, Reduzir animações (`data-motion="reduce"` on `<html>`), Conta, Privacidade, cookies. Saved in `dc_settings` on the device.
- **Icons** (`src/components/Icons.tsx`): authored SVG on a 24px grid, 2px round stroke (nav, clock, trophy, chevron). Stars use `StarIcon`. No emoji or text glyphs as icons.
- **Headings carry their own name**: no small uppercase label above a heading (the home cards are titled "Desafio do Dia" and "Modo Carreira" themselves).
- Motion: sticker tilt (home), paste-in for stickers and clue chips (`ease-out-expo`, 420–500ms); all off under `prefers-reduced-motion`.

## Pitch and sound

- **Pitch behind the page** (`body::before`, fixed): mowing stripes (pitch-deep at 22%, 9vh bands) and field markings as an inline SVG of a vertical 68 × 105 pitch, `slice`-fitted (whole pitch on a phone, centre circle on wide screens), white at 7% opacity. The album halftone stays on top. Never strong enough to compete with text.
- **Sound** (`src/lib/sound.ts`): synthesised with Web Audio (no files): whistle when a level starts, rising chord + crowd on a right answer, falling "uhh" on a wrong one, cheer on a 3-star finish. **Off by default**; toggle in Perfil › Conta › Preferências (and in the top nav on wide screens), choice kept on the device.
- **Photos**: Wikimedia Commons only, always credited — under the photo in the card, as the thumbnail's title in the search list, and on `/creditos` (linked from the list).

## Browser surfaces

`::selection` cover on ink; `:focus-visible` 3px cover outline, 3px offset; `scrollbar-color` chalk-soft on pitch-deep; `color-scheme: dark`.
