# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Brazilian football fans (PT-BR) who know players by heart and enjoy testing it. Primary situation: short sessions on the phone, a few levels at a time, over coffee, on the bus or during a break. They play to prove they know football: stars, titles and a public ranking show it. Results are shared without spoilers, typically in WhatsApp groups.

## Product Purpose

"De Cabeça" is a web platform of football-knowledge minigames. MVP has two games, each a track of pre-built levels (ADR-007): Career Path (guess the player from the ordered list of clubs, with games/goals per club and the position shown from the start, 6 attempts) and Football Grid (3×3 grid, each cell needs a player matching row and column criteria, 9 attempts). Finishing a level opens the next; each level gives 0–3 stars, stars add up to titles (Reserva, Titular, Craque, Lenda) and to the community ranking (all-time, weekly, per level). One attempt per level. Guest-first; an optional account keeps progress across devices. Success in the pilot: people come back, climb the ranking and share results (see `docs/ANALYTICS.md`).

## Positioning

Brazilian football first: players with passage through Brazilian clubs or the national team, plus globally relevant foreigners, with careers cross-checked between two open sources (Wikidata and Wikipedia) by an AI curator (ADR-006); answers validated server-side from an immutable snapshot.

## Operating Context

Mobile-first web (360 px base, up to 1280 px). Played one-handed on a phone. Share text is pasted into chat apps. Editors use a minimal admin panel (`/admin`, token-protected, no public link).

## Capabilities and Constraints

- Two games only in the MVP; no multiplayer, payments, ads or live data. Ranking, stars and titles are in (ADR-007). Optional account by e-mail and password; no password recovery yet. Layout reserves space for future ads.
- No club logos or player photos in the MVP (licensing). Clubs are shown with initials and colours; countries with flags.
- PT-BR only. Theme follows `prefers-color-scheme`; no settings screen.
- Full spec in `docs/` (PRD, game design, UX spec).

## Brand Commitments

- Name: "De Cabeça" (domain and INPI check pending).
- Voice: "resenha de boleiro" — informal, good-humoured, football slang in measure ("Na trave!", "De placa!"). Never mocking the player; rules and errors stay clear.

## Evidence on Hand

No users, testimonials, press, or metrics yet. No logo or brand assets exist. Do not fabricate player counts, ratings or social proof.

## Product Principles

1. Progress is the hook: the next level, the next star and the next title are always one tap away.
2. Fair play over flash: never leak the answer, never reject a valid answer silently.
3. Spoiler-free sharing is part of the game.
4. Football knowledge is the hero; the interface stays out of the way.

## Accessibility & Inclusion

WCAG AA contrast, full keyboard use, visible focus, `prefers-reduced-motion` respected, never colour as the only signal (icon + text), `aria-live` announcements for right/wrong (see `docs/UX_SPEC.md` §9).
