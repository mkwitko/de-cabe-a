# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Brazilian football fans (PT-BR) who know players by heart and enjoy testing it. Primary situation: short sessions on the phone, a few levels at a time, over coffee, on the bus or during a break. They play to prove they know football: stars, titles, achievements and the rankings show it. They play alongside friends: the same Desafio do Dia, leagues created by link, results shared without spoilers, typically in WhatsApp groups.

## Launch Scope (2026-11-10)

Launch is Career Path only, polished to a premium, immersive standard (spec: `docs/superpowers/specs/2026-11-10-lancamento-career-path-design.md`). Open at launch: Career Path, the sticker album and public showcase, profile and account, how to play, legal pages. Every other game and page below exists in code but shows as "Em breve" behind one web flag (`apps/web/src/lib/launch.ts`) until reopened. Bottom bar at launch: Jogar · Álbum · Perfil. Titles: a 10-step ladder (Peneira to Rei da Bola). Background music and sound effects, separate toggles. One dark theme (the night match), no theme choice. LGPD cookie consent before analytics or ads.

## Product Purpose

"De Cabeça F.C." ("Minijogos de futebol") is a web platform of football-knowledge minigames. Nine games, each a track of pre-built levels (ADR-007); finishing a level opens the next, one attempt per level, 0–3 stars each:

1. Career Path: guess the player from the ordered list of clubs (games/goals per club, position shown), 6 attempts.
2. Football Grid: 3×3 grid, each cell needs a player who fits its row and column (club, country, position).
3. Impostor: a club and 4 players; find the one who never played there.
4. Linha do tempo: put a player's clubs in career order.
5. Mais ou Menos: who scored or played more for a club.
6. Escalação: a real final's starting XI with names hidden.
7. Craque Misterioso: guess the player; each guess shows what matches.
8. Conexões: 16 players in 4 hidden groups.
9. Draft: build a 4-3-3 one slot per round; each round names a real match and a team, pick who started there. Scores knowledge, not luck.

Around the games:

- Desafio do Dia: one level of each game, the same for everyone, new at midnight in Brasília; "X% acertaram" after 30 plays; archive of earlier days. No streak.
- Rodada semanal: the Desafios do Dia from Monday to Friday, best 3 days count.
- Stars add up to titles (Reserva, Titular, Craque, Lenda), 14 permanent achievements and the rankings: all-time, 4-week themed seasons (podium becomes a permanent trophy), week, against the clock, per level.
- Ligas de amigos by link (up to 20, weekly ranking, no chat), optional public profile, predefined reactions on a finished level, a friendly nickname generator with an offensive-word filter.
- Copa dos Sonhos: draft an XI from the great World Cup sides (4 candidates per position), chemistry from players who really played together, a tactic per match and a simulated World Cup against legendary national teams. Ratings are ours, from each player's World Cup record (starts, rounds reached, titles), never a game studio's; Olheiro shows them, Raiz hides them until the end.
- Oficina: players build a Football Grid on our data; the server checks it (8 valid answers per cell) and an editor approves it before it goes live. Votes only after finishing, lists by Wilson lower bound, plays and date; reports put a level under review, never remove it. Creator pages (`/criador/:apelido`) rank the audience; dated events open a set of levels with their own ranking and an optional "apresentado por" label. Oficina levels never count for stars, titles or the main rankings.
- Modo Carreira: the player's own footballer, trained by the stars earned in the games, from the base to Europe.
- Opt-in push notifications: the new Desafio do Dia (09:00 Brasília) and a league's closed week.

Guest-first; an optional account (e-mail and password, or Google) keeps progress across devices. Success: people come back, play with friends and bring them in by link (north-star metric in `docs/GROWTH_PLAN.md` §5, measured in `/admin`).

## Positioning

Brazilian football first: players with passage through Brazilian clubs or the national team, plus globally relevant foreigners, with careers cross-checked between two open sources (Wikidata and Wikipedia) by an AI curator (ADR-006); real line-ups from Wikipedia. Answers validated server-side from an immutable snapshot. Knowledge over luck: unlike draft games that simulate a tournament, every pick here is a fact the player has to know.

## Operating Context

Mobile-first web (360 px base, up to 1280 px). Played one-handed on a phone; bottom bar with four places (Jogos, Desafio, Ranking, Perfil). Share text and links are pasted into chat apps. Editors use a minimal admin panel (`/admin`, token-protected, no public link) with pilot metrics, level reports and challenge publishing.

## Capabilities and Constraints

- No multiplayer, payments, live data or free-text chat/comments. Nothing sold that gives an advantage (stars, attempts, answers).
- Ads: Google AdSense only in pauses (end of a track page, under a level result, foot of the home), never during a level, no interstitials or rewarded ads. Personalised ads only with LGPD consent; otherwise non-personalised. Off until the AdSense account is approved (ADR-012).
- No club logos (licensing): clubs are shown with initials and colours; countries with flags. Player photos only from Wikimedia Commons (free licences), always with author and licence next to them.
- Never mock or expose real people.
- PT-BR only. One dark theme, no choice. Preferences (sound, notifications) live in Perfil › Conta and stay on the device.
- Not yet live: deploy to decabecafc.com.br is pending (domain, VM, Google OAuth, Resend, AdSense; `docs/DEPLOY.md`).
- Full spec in `docs/` (PRD, game design, UX spec, growth plan).

## Brand Commitments

- Name: "De Cabeça F.C.", tagline "Minijogos de futebol" (INPI check pending). Domain decabecafc.com.br.
- Voice: "resenha de boleiro": informal, good-humoured, football slang in measure ("Na trave!", "De placa!", "Craque!"). Never mocking the player; rules and errors stay clear. Notifications state facts, never "you are losing" or "your friends are ahead".

## Evidence on Hand

No users, testimonials, press, or metrics yet. No logo or brand assets exist. Do not fabricate player counts, ratings or social proof.

## Product Principles

1. Progress is the hook: the next level, the next star and the next title are always one tap away.
2. Fair play over flash: never leak the answer, never reject a valid answer silently, never sell an advantage.
3. Spoiler-free sharing is part of the game; every shared link opens the same level.
4. Football knowledge is the hero; the interface stays out of the way.
5. Rituals, not dependence: daily and weekly moments with no punishment for missing a day.

## Accessibility & Inclusion

WCAG AA contrast, full keyboard use, visible focus, `prefers-reduced-motion` respected, never colour as the only signal (icon + text), `aria-live` announcements for right/wrong (see `docs/UX_SPEC.md` §9).
