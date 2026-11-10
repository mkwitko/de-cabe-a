# Jogos imersivos: base, álbum e Trajetória — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the shared "três momentos" ceremony (transmission + sticker reveal), the 8-level sticker rarity computed on the server, the sticker album with a public showcase, and the Trajetória passport stage.

**Architecture:** API gains an `album` module: a pure rarity function, a `Sticker` table (one row per player-pk × footballer, best rarity kept), awarding inside the attempt finish flow, lazy upgrades for Rodada/Temporada on album read, and routes. Web gains a ceremony layer (`Broadcast`, `StickerReveal`) that plays before the existing `LevelEnd`, an `/album` page and profile showcase, and a full-screen `Passport` stage for Career Path. Pure CSS animation + Web Audio, no new dependency.

**Tech Stack:** Fastify + Zod contracts (`packages/contracts`), Prisma/Postgres, Vitest (unit + `*.int.test.ts`), React 19 + Tailwind v4, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-09-jogos-imersivos-design.md` (prototype: `docs/superpowers/specs/assets/2026-11-09-prototipo-trajetoria.html`).

**Out of this plan:** the other 8 modes' stages (one plan each later), Copa/Fantasy/Oficina stages, shop and payments.

## Global Constraints

- No new dependency. Animation = CSS `transform`/`opacity` only; sound = Web Audio synthesis in `apps/web/src/lib/sound.ts`.
- Phone first at 360px; no side columns; game stage fills the viewport between the HUD and the guess dock.
- `prefers-reduced-motion`: no shake, no spin; ceremonies become short fades.
- Sound stays off by default (existing `dc_sound` toggle). Vibration via existing `apps/web/src/lib/haptics.ts`.
- Rarity is computed on the server only; the client never sends a rarity.
- Rarity levels, in order (contract enum values): `bronze`, `prata`, `ouro`, `ouro_brilhante`, `destaque_rodada`, `selecao_temporada`, `idolo`, `lenda`. Display names: Bronze, Prata, Ouro, Ouro brilhante, Destaque da Rodada, Seleção da Temporada, Ídolo, Lenda.
- One sticker per (player pk, footballer); a new award replaces it only when its rank is higher.
- No paid random packs. "Abrir pacote" only for what was earned.
- Public showcase respects the existing `publicProfile` opt-in; private profile = same 404.
- "Pular" always available on transmission and reveal; the short version plays from the 2nd ceremony of the same mode on the same day (per device, localStorage).
- Copy in Portuguese (pt-BR), as in the rest of the app.

## Review Focus

1. A player who finishes the same level twice (replay) must not get a duplicate or a downgrade: award is idempotent and keep-best. → Task 3 test `replay keeps the best sticker`.
2. A loss or give-up must award nothing. → Task 3 test `lost attempt awards no sticker`.
3. A guest who later links an account keeps their album (stickers keyed by the same pk mechanism as attempts, read through `effectivePks`). → Task 4 test `album follows linked guest`.
4. Private profile must not leak the album through the showcase route. → Task 4 test `private profile album is 404`.
5. localStorage unavailable (private mode) must not break the ceremony; it just always plays the full version. → Task 6 test `ceremony works without storage`.

---

### Task 1: Rarity formula (pure)

**Files:**
- Create: `apps/api/src/modules/album/rarity.ts`
- Test: `apps/api/src/modules/album/rarity.test.ts`

**Interfaces:**
- Produces: `type Rarity = 'bronze'|'prata'|'ouro'|'ouro_brilhante'|'destaque_rodada'|'selecao_temporada'|'idolo'|'lenda'`; `const RARITY_ORDER: readonly Rarity[]`; `rank(r: Rarity): number` (index in `RARITY_ORDER`); `levelRarity(input: { stars: 0|1|2|3; fame: 'T1'|'T2'|'T3'|'T4'; difficulty: 1|2|3; retired: boolean; streakDays: number; flawless: boolean }): Rarity`.

Formula (the spec leaves weights to the builder; these are the chosen ones):
- `points = stars + fameBonus + (difficulty - 1)`, `fameBonus`: T1=3, T2=2, T3=1, T4=0. Range 1..10.
- `lenda` if `fame==='T1' && retired && stars===3 && difficulty===3 && flawless && streakDays>=7`.
- else `idolo` if `fame==='T1' && retired && stars===3 && difficulty===3`.
- else `ouro_brilhante` if `stars===3 && difficulty===3 && (fame==='T1'||fame==='T2')`.
- else by points: `>=6` → `ouro`, `>=4` → `prata`, else `bronze`.
- `destaque_rodada` and `selecao_temporada` are never returned here (Tasks 4–5).

- [ ] **Step 1: Write the failing tests**

```ts
it('easy level, unknown player, 1 star is bronze', () =>
  expect(levelRarity({ stars: 1, fame: 'T4', difficulty: 1, retired: false, streakDays: 0, flawless: false })).toBe('bronze'));
it('3 stars on a medium level with a famous player is ouro', () =>
  expect(levelRarity({ stars: 3, fame: 'T2', difficulty: 2, retired: false, streakDays: 0, flawless: false })).toBe('ouro'));
it('3 stars, hard level, famous player is ouro_brilhante', () =>
  expect(levelRarity({ stars: 3, fame: 'T2', difficulty: 3, retired: false, streakDays: 0, flawless: false })).toBe('ouro_brilhante'));
it('retired T1, 3 stars, hard is idolo', () =>
  expect(levelRarity({ stars: 3, fame: 'T1', difficulty: 3, retired: true, streakDays: 2, flawless: false })).toBe('idolo'));
it('idolo plus 7-day streak and flawless is lenda', () =>
  expect(levelRarity({ stars: 3, fame: 'T1', difficulty: 3, retired: true, streakDays: 7, flawless: true })).toBe('lenda'));
it('rank orders the 8 levels', () => {
  expect(RARITY_ORDER).toHaveLength(8);
  expect(rank('lenda')).toBeGreaterThan(rank('idolo'));
  expect(rank('destaque_rodada')).toBeGreaterThan(rank('ouro_brilhante'));
});
it('easy levels never exceed ouro', () => {
  for (const fame of ['T1','T2','T3','T4'] as const) for (const stars of [1,2,3] as const)
    expect(rank(levelRarity({ stars, fame, difficulty: 1, retired: false, streakDays: 0, flawless: false }))).toBeLessThanOrEqual(rank('ouro'));
});
```

- [ ] **Step 2:** Run `pnpm --filter ./apps/api test -- rarity` → FAIL (module missing).
- [ ] **Step 3:** Implement `rarity.ts` per the interface and formula above.
- [ ] **Step 4:** Run the same command → PASS.
- [ ] **Step 5:** Commit `feat(album): sticker rarity formula`.

### Task 2: Schema and contracts

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (new model + enum)
- Create: `apps/api/prisma/migrations/20261110000000_sticker_album/migration.sql` (via `pnpm --filter ./apps/api exec prisma migrate dev --name sticker_album`, then rename folder to that timestamp if needed)
- Create: `packages/contracts/src/album.ts`; Modify: `packages/contracts/src/index.ts` (export), `packages/contracts/src/game.ts` (`AttemptResponse.sticker`)

**Interfaces:**
- Produces (Prisma): `enum StickerRarity { bronze prata ouro ouro_brilhante destaque_rodada selecao_temporada idolo lenda }`; `model Sticker { pk String; playerId String; rarity StickerRarity; mode GameModeCode; challengeId String; earnedAt DateTime @default(now()); upgradedAt DateTime @updatedAt; player Player @relation(...); @@id([pk, playerId]); @@index([pk, rarity]) }` (add `stickers Sticker[]` to `Player`).
- Produces (contracts): `StickerRarity` (z.enum, same 8 values), `Sticker = z.strictObject({ playerId, name, positionGroup: nullable, nationality: string, rarity: StickerRarity, mode: GameMode, earnedAt: z.string() })`, `StickerAward = z.strictObject({ sticker: Sticker, upgradedFrom: StickerRarity.nullable(), isNew: z.boolean() })`, `AlbumResponse = z.strictObject({ total: z.number().int(), owned: z.number().int(), byRarity: z.record(StickerRarity, z.number().int()), stickers: z.array(Sticker) })`, `ProfileAlbumResponse = z.strictObject({ showcase: z.array(Sticker).max(6), owned: z.number().int() })`, `PromoteRequest = z.strictObject({ playerId: z.string() })`; `AttemptResponse` gains `sticker: StickerAward.optional()`.

- [ ] **Step 1:** Add the model/enum; run the migrate command; Expected: migration created and applied.
- [ ] **Step 2:** Add contracts; run `pnpm -r typecheck` → PASS.
- [ ] **Step 3:** Commit `feat(album): sticker table and contracts`.

### Task 3: Award a sticker when a level is won

**Files:**
- Create: `apps/api/src/modules/album/award.ts`, `apps/api/src/modules/album/streak.ts`
- Modify: `apps/api/src/modules/attempts/attempts.service.ts` (after the Modo Carreira block at the end of `submitAction`, and pass the award into `present`)
- Test: `apps/api/src/modules/album/album.int.test.ts` (follow the harness in `apps/api/src/modules/attempts/attempts.int.test.ts`)

**Interfaces:**
- Consumes: `levelRarity`, `rank` (Task 1); `Sticker` model, `StickerAward` (Task 2).
- Produces: `featuredPlayerId(mode: GameModeCode, snapshot: unknown): string | null` — this plan implements `CAREER_PATH` (`snapshot.answerPlayerId`) and `MYSTERY_PLAYER` (its answer id field); other modes return `null` until their plans. `streakDays(prisma, pks: string[], now: Date): Promise<number>` — consecutive civil days (America/Sao_Paulo, reuse `apps/api/src/modules/challenges/civil-date.ts`) ending today with at least one completed attempt. `awardSticker(prisma, player: Player, attempt, challenge, now): Promise<StickerAward | null>` — returns null unless status is won and `featuredPlayerId` is non-null; computes `retired` as "no `CareerSpell` with `endDate` null", `flawless` as won with zero wrong guesses (`attemptsUsed === 1` for Career Path), upserts keeping the higher `rank`.
- `present(...)` gains an optional `sticker?: StickerAward` that it copies into the response.

- [ ] **Step 1: Write failing integration tests**
  - `won career path level awards a sticker`: finish a seeded Career Path level correctly → response `sticker.isNew === true`, `sticker.sticker.playerId === answerPlayerId`, rarity is one of the 8.
  - `lost attempt awards no sticker`: give up → `sticker` undefined, no `Sticker` row.
  - `replay keeps the best sticker`: seed an existing `ouro_brilhante` row for that pk/player, win again with a lower result → `sticker.upgradedFrom === null`, row still `ouro_brilhante`, `isNew === false`.
  - `higher result upgrades`: seed `bronze`, win with 3 stars on difficulty 3 and T1 → `upgradedFrom === 'bronze'`.
- [ ] **Step 2:** Run `pnpm --filter ./apps/api test:int -- album` → FAIL.
- [ ] **Step 3:** Implement `featuredPlayerId`, `streakDays`, `awardSticker`; call it in `submitAction` only when `pending` holds `game_completed`; pass result to `present`.
- [ ] **Step 4:** Run the same command, then full `pnpm --filter ./apps/api test:int` → PASS.
- [ ] **Step 5:** Commit `feat(album): award stickers on won levels`.

### Task 4: Album routes, showcase and Destaque da Rodada

**Files:**
- Create: `apps/api/src/modules/album/album.routes.ts`, `apps/api/src/modules/album/round-upgrade.ts`
- Modify: `apps/api/src/app.ts` (register routes like the other modules)
- Test: `apps/api/src/modules/album/album.int.test.ts`

**Interfaces:**
- Consumes: `roundRows(prisma, monday)` from `apps/api/src/modules/daily/daily.ts`; profile lookup logic of `GET /profiles/:nickname` in `apps/api/src/modules/account/account.routes.ts` (extract it into an exported `publicProfileOwner(prisma, nickname)` returning `{ pks: string[] } | null` and reuse it in both routes).
- Produces: `GET /v1/me/album` → `AlbumResponse` (stickers across the player's `effectivePks`, best per footballer, ordered by rank desc then `earnedAt`; `total` = count of verified players); `GET /v1/profiles/:nickname/album` → `ProfileAlbumResponse` (top 6 by rank, 404 like the profile when private). `applyRoundUpgrades(prisma, pks, now)`: for every closed round (Monday–Friday already past) where the player was top 10 in `roundRows`, upgrade to `destaque_rodada` the stickers earned that week whose rank is lower; called at the start of `GET /v1/me/album`; idempotent.

- [ ] **Step 1: Failing tests:** `album lists my stickers best first`; `album follows linked guest` (guest earns, links account, album still has it); `private profile album is 404`; `public profile shows at most 6`; `top 10 of a closed round upgrades that week to destaque_rodada` (seed attempts in a past round week for 1 player).
- [ ] **Step 2:** Run `pnpm --filter ./apps/api test:int -- album` → FAIL.
- [ ] **Step 3:** Implement routes and `applyRoundUpgrades`.
- [ ] **Step 4:** Same command → PASS; `pnpm -r typecheck` → PASS.
- [ ] **Step 5:** Commit `feat(album): album routes, public showcase, round upgrade`.

### Task 5: Seleção da Temporada promotion

**Files:**
- Modify: `apps/api/src/modules/album/album.routes.ts`
- Create: migration adding `model SeasonPromotion { pk String; season Int; playerId String; createdAt DateTime @default(now()); @@id([pk, season]) }`
- Test: `apps/api/src/modules/album/album.int.test.ts`

**Interfaces:**
- Consumes: `trophies(prisma, pk, now)` from `apps/api/src/modules/progression/seasons.ts`.
- Produces: `GET /v1/me/album` adds `promotions: { season: number; theme: string }[]` (podium seasons not yet used) to `AlbumResponse` (update the contract); `POST /v1/me/album/promote` body `PromoteRequest` → `AlbumResponse`; uses the oldest unused podium season; 409 `NO_PROMOTION` when none, 404 when the sticker is not owned. Add `NO_PROMOTION` to `packages/contracts/src/errors.ts`.

- [ ] **Step 1: Failing tests:** `podium player promotes one sticker`; `second promote for the same season is 409`; `cannot promote a sticker you do not own`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(album): season podium promotes a sticker`.

### Task 6: Ceremony layer (web)

**Files:**
- Modify: `apps/web/src/lib/sound.ts` (extend `Sound` with `'stamp' | 'clunk' | 'crowd' | 'tick' | 'shimmer' | 'rarity'`, synthesised as in the prototype's `sfx` object)
- Create: `apps/web/src/lib/ceremony.ts`, `apps/web/src/lib/ceremony.test.ts`, `apps/web/src/components/Broadcast.tsx`, `apps/web/src/components/StickerReveal.tsx`, `apps/web/src/components/rarity.ts`
- Modify: `apps/web/src/games/LevelParts.tsx` (`LevelEnd` plays the ceremony first), `apps/web/src/index.css` (keyframes)

**Interfaces:**
- Consumes: `AttemptResponse.sticker` (Task 2).
- Produces: `ceremonyLength(mode: string, today: string): 'full' | 'short'` and `markCeremony(mode: string, today: string): void` (localStorage key `dc_ceremony_<today>_<mode>`, try/catch → `'full'` on failure); `<Broadcast stars score headline detail onDone short />` (lamps on one by one with `clunk`, crowd swell, score ticks up over 1.1 s, shake scaled by stars, "Pular" button, `aria-live` text "Acertou! N pontos"); `<StickerReveal award onDone short />` (rarity name + colour first with `rarity` sound, then card spins in, then name; holo follows pointer; levels ≥ `destaque_rodada` add the lamp intro; "Pular"); `RARITY_STYLE: Record<StickerRarity, { label: string; className: string }>` with the finishes from the spec table. `LevelEnd` shows `Broadcast` → (`StickerReveal` when `data.sticker`) → existing content. Losses skip both.

- [ ] **Step 1: Failing tests (`ceremony.test.ts`):** `first ceremony of the day is full`; `second is short`; `ceremony works without storage` (stub `localStorage.getItem` to throw → `'full'`, `markCeremony` does not throw).
- [ ] **Step 2:** `pnpm --filter ./apps/web test -- ceremony` → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Build components and wire `LevelEnd`; `pnpm --filter ./apps/web typecheck` and `pnpm --filter ./apps/web test:e2e` → PASS (update selectors in `apps/web/e2e/*.spec.ts` to click "Pular" where they wait for the end screen).
- [ ] **Step 6:** Check at 360×740 with Playwright MCP: transmission and reveal fit, no horizontal scroll, reduced-motion emulation shows no spin. Commit `feat(web): transmission and sticker reveal ceremony`.

### Task 7: Album page and profile showcase (web)

**Files:**
- Create: `apps/web/src/pages/AlbumPage.tsx`, `apps/web/src/components/StickerCard.tsx`
- Modify: `apps/web/src/App.tsx` (route `/album` under Perfil), `apps/web/src/pages/ProfilePage.tsx` (showcase), `apps/web/src/pages/StatsPage.tsx` (entry link "Meu álbum")
- Test: `apps/web/e2e/usability.spec.ts` (new case)

**Interfaces:**
- Consumes: `GET /v1/me/album`, `GET /v1/profiles/:nickname/album`, `POST /v1/me/album/promote`; `RARITY_STYLE` (Task 6).
- Produces: `<StickerCard sticker size="sm"|"lg" />` reused by album and showcase. Album page: header "x de y" and counts per rarity; pages grouped by position group, empty numbered slots (dashed, as `Slot` in DESIGN.md); promotion banner when `promotions` is non-empty, tapping a sticker then confirms promote inside the page (no `confirm()`).

- [ ] **Step 1: Failing e2e:** `album shows the sticker won in a level` (win a seeded Career Path level, skip ceremony, open `/album`, see the player's name and "1 de").
- [ ] **Step 2:** Run `pnpm --filter ./apps/web test:e2e -- usability` → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(web): sticker album and profile showcase`.

### Task 8: Trajetória passport stage

**Files:**
- Create: `apps/web/src/games/career-path/Passport.tsx`
- Modify: `apps/web/src/games/career-path/CareerPathPage.tsx` (full-screen stage, dock at bottom; remove the side-panel layout), keep `Trajectory.tsx` only if still used elsewhere, else delete it
- Test: `apps/web/e2e/home.spec.ts` (existing Career Path flow keeps passing)

**Interfaces:**
- Consumes: the existing Career Path view (clubs revealed, attempts, guess search); `play('stamp')`, haptics.
- Produces: `<Passport clubs={revealedClubs} total={n} opened onOpen />`: leather cover that opens on first tap (skipped on resume of an attempt in progress), 2-column stamp grid filling the page, each revealed club a stamp (club colour from `ClubBadge`, name, years, games/goals) landing with the `hit` animation + `stamp` sound + short vibration; unknown clubs are dashed "?" slots; wrong guess flashes the page red. The guess search docks at the bottom (fixed, safe-area aware) on phones and overlaps the foot of the passport on wide screens. Screen-reader text still announces each new club.

- [ ] **Step 1:** Run current e2e for Career Path → PASS (baseline).
- [ ] **Step 2:** Implement `Passport.tsx` and the new page layout.
- [ ] **Step 3:** `pnpm --filter ./apps/web typecheck`, `pnpm --filter ./apps/web test:e2e` → PASS.
- [ ] **Step 4:** Playwright MCP at 360×740 and 1280×800: passport fills the stage, no side column, dock reachable, no horizontal scroll. Compare against the prototype for timing.
- [ ] **Step 5:** Commit `feat(web): Trajetória passport stage`, push, open PR.
