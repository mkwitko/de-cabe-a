---
version: 1
slug: "src-games-manager-career-clubcareerpage-tsx"
primary_target: "src/games/manager/career/ClubCareerPage.tsx"
related_targets: []
---

# Modo Clube career hub (`/tecnico/carreira`)

Scope: the club career's home and its moments (start, tunnel, season turn). Visitor mode: Experience.

Audience and job: a Brazilian football fan on a phone, 2 to 10 minutes, running a fictional club. Each visit: see how the club is, decide what is due, go to the match. Owner brief (2026-11-17): highly immersive, premium, game-grade, "the interface lives inside a place"; light motion only; performance first.

Constraints: no club logos (round colour badges with initials), fictional clubs, all text through `t()`, WCAG AA, `prefers-reduced-motion`, no looping animation, no WebGL. Art plates are our own, drawn on the owner's desktop (FLUX 3 Klein), no people, no text; prompts and seeds in `docs/pesquisa/modo-clube/arte/placas-clube.json`.

## Direction contract

THESIS: the club is a place you stand in at night. Each destination of the career is one still, cinematic plate of a room in the stadium, and the working interface is set into it. Refuses the category default: a dark dashboard of cards on a flat ground.

OWN-WORLD: low-key photographs of an old stadium: dark green enamel, worn wood, one warm amber lamp against cold white floodlight. Type is Archivo condensed 900 uppercase, chalk white with a deep shadow, lettered straight onto the scene. Gold is the single action colour. The club's colour falls from the top of the scene as light and sits in the badges. Data lives on one dark slab (the desk) split by hairlines and lit on its top edge, never on separate cards.

STORY: the visitor arrives in the coach's office, reads the next match on the window over the lit pitch, sees on the desk how the club stands, and walks to the match through the tunnel.

FIRST VIEWPORT: full-bleed office plate, fixed. Top: badge, club name, division; date and cash at the right. Centre, over the window: both badges and both names at display size with the date line under them. Under it the primary gold button "Assistir à partida" and two outlined ones. The top edge of the desk slab shows at the bottom.

FORM: a chosen place-as-interface direction, pinned by the owner after rejecting the dealt hand (wall and banner, broadcast, scoreboard, departures board); seed: seed:4244a177e0b4d7ad.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- Other rooms (locker room for the squad, training pitch, boardroom) and navigation between them: not built.
- Decision centre ("Para decidir hoje"): needs events in the save.
