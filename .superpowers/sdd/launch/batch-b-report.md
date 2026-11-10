# Batch B report (Tasks 4 and 8)

Branch launch-b (from feat/launch-career-path).

## Task 4: 10-title ladder
- engine `TITLES`: Peneira 0, Base 10, Reserva 25, Titular 50, Capitão 100, Craque 175, Ídolo 275, Lenda 400, Imortal 600, Rei da Bola 900. `stars.test.ts` updated.
- API uses `titleFor` from the engine everywhere (ranking, progression, account), so no API code changed; `attempts.int.test.ts` expectations updated (Peneira/Base missing 8). Achievements by stars untouched.
- web `TITLE_LADDER` mirrors it, with `tone` (colour) and `perk` (frame reward); `titleTone`, `promotedTo(totalStars, levelStars)` (unit tested).
- New `TitleBadge` (SVG shield in the title colour, crown on Rei da Bola) and `TitleLadder` (vertical 10-step track, current lit, "Faltam N estrelas para X", perk per step). Used in StatsPage (own profile), replacing the old 4-step ladder.
- Profile frame: title colour on the public profile card (ProfilePage), stats hero card and account sticker.
- Promotion: `LevelEnd` reads fresh `useStats` (invalidated on completion; only used when not fetching) and calls `promotedTo`; `Broadcast` shows the "PROMOVIDO A <título>" band (prop `promoted`), and the end screen repeats it. No API/contract change.
- SEO copy (`seo-pages.json`) and e2e `home.spec.ts` heading (Reserva -> Peneira) updated.

## Task 8: profile and login
- `components/SignInButton.tsx` (exported; hides itself when signed in; links to `/conta?entrar=1`). Placed in ProfilePage header and StatsPage guest banner "Salve seu progresso"; AccountPage opens in login mode with `?entrar`, and the guest sign-in form comes first and spans the row.
- One-time "Salve seu progresso" invite on the level-end screen after a guest's first win (localStorage `decabeca:save-invite`).
- No CSS added to index.css (Tailwind utilities only), so no end-of-file block.

## Verification
typecheck, lint, web tests (27), engine tests (158) green; prettier clean. API int tests (need DB) and e2e not run. Visual check (360x640 / 1280x800) pending: the dev server serves the main checkout.

## Design review (static critique + audit)
- Contrast: tone fills L>=0.76 with ink text; locked rows chalk-soft on pitch (AA). Targets >=44px; text >=12px; promo band transition disabled under reduced motion.
- Fixed in review: ladder connector line had 0 height.
- Eyeball later: Broadcast band at top-[60%] sits between score and lower third; tight at 360x640.

## Concerns
- `App.tsx:380` (home card, other agent) still says "Título máximo. Lenda!"; should read "Rei da Bola" or use the title name.
- AccountPage form reorder touches the Task 9 area; merge may conflict there.
