# API Spec — v1

> **Revisão 2026-11-05 (ADR-007).** Onde conflitar, vale isto:
> - `GET /v1/games` → por jogo: `levels`, `completed`, `stars`, `nextLevel`.
> - `GET /v1/tracks/:mode` → fases com `state` (`locked|open|in_progress|done`), `stars`, `score`, `difficultyTier`.
> - `POST /v1/attempts { mode, level }` → 201 nova / 200 existente; 403 `LEVEL_LOCKED`, 404 `LEVEL_NOT_FOUND`. Uma tentativa por fase por jogador (conta ou convidado).
> - `AttemptSummary` = `{ id, challengeId, mode, level, status, score, stars }`.
> - `GET /v1/me/stats` → `totalStars`, `title`, `rank { all, week }` e números por jogo; `GET /v1/me/history` itens com `level` e `stars`.
> - `GET /v1/ranking?scope=all|week`, `GET /v1/ranking/levels/:mode/:level` (top 10).
> - `GET|PATCH /v1/me` (apelido), `/v1/auth/*` = Better Auth (ADR-008): `POST sign-up/email` (`name` = apelido; 409 apelido em uso), `POST sign-in/email` (401), `POST sign-in/social` (`provider: google`), `POST request-password-reset`, `POST reset-password`, `POST send-verification-email`; erros no formato `{ code, message }` do Better Auth. `POST /v1/auth/logout` volta a uma sessão de convidado nova. 10/min por IP.
> - Admin: sem `kind`, `scheduledFor` nem `/schedule`; `publish` anexa a próxima fase; `GET /v1/admin/challenges?mode=&status=`.

Base: `/v1`. JSON. Cookie `dc_session` (HttpOnly) criado automaticamente na primeira resposta de qualquer rota pública. Erros no formato de `ARCHITECTURE.md` §6.

Schemas em `packages/contracts`. Abaixo, TypeScript/Zod resumido.

## Tipos comuns

```ts
const GameMode = z.enum(['CAREER_PATH', 'FOOTBALL_GRID']);
const ChallengeKind = z.enum(['daily', 'practice']);
const AttemptStatus = z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']);
const PlayerRef = z.object({ id: z.string().uuid(), name: z.string(), disambiguation: z.string().nullable() });
```

---

## GET /v1/games
Catálogo + estado do daily da sessão. Público. Idempotente.

Response 200:
```json
{
  "today": "2026-11-04",
  "games": [
    { "mode": "CAREER_PATH", "name": "Career Path", "daily": { "challengeId": "…", "publicNumber": 123, "attempt": null } },
    { "mode": "FOOTBALL_GRID", "name": "Grid", "daily": { "challengeId": "…", "publicNumber": 45, "attempt": { "id": "…", "status": "COMPLETED", "score": 7 } } }
  ]
}
```
`daily` é `null` se não houver desafio publicado para hoje.

---

## GET /v1/players/search?q=&limit=
Autocomplete. Público. `q` 2–40 chars, `limit` ≤ 10 (default 10). Rate limit 60/min por sessão. Homônimos recebem `disambiguation` = "ano de nascimento · clube mais longo".

Rate limits (429 `RATE_LIMITED`): criação de sessão 20/min por IP; rotas públicas 300/min por sessão; ações 120/min por sessão.

Response 200: `{ "players": PlayerRef[] }`. Só players `verified`. Ordem: notabilityTier, isPrimary.

Erros: 400 `VALIDATION_ERROR`.

---

## POST /v1/attempts
Inicia ou retoma partida. Público. Daily: **idempotente por (sessão, challenge)**; se já existe, retorna a existente com 200 (não 201). Practice **[APROVADO 2026-11-05]**: se a sessão tem partida practice `IN_PROGRESS` no modo, retorna essa com 200 (retomar); senão sorteia e cria (201). Rejogar o mesmo desafio practice é permitido.

Request:
```json
{ "mode": "CAREER_PATH", "kind": "daily" }
```
ou `{ "mode": "FOOTBALL_GRID", "kind": "practice" }`.

Regras: daily → resolve challenge de hoje (America/Sao_Paulo). practice → retoma `IN_PROGRESS` do modo, ou sorteia challenge `published` do modo excluindo os 20 últimos da sessão (sem candidato → sorteia entre todos).

Response 201/200:
```json
{
  "attempt": { "id": "a1", "challengeId": "c1", "mode": "CAREER_PATH", "kind": "daily", "publicNumber": 123, "status": "IN_PROGRESS", "score": 0 },
  "view": { /* engine.toPublicView */ },
  "reveal": null
}
```

Career Path `view` exemplo:
```json
{ "maxAttempts": 6, "attemptsUsed": 0, "revealed": [ { "clubName": "Cruzeiro", "countryCode": "BR", "fromYear": 1993, "toYear": 1994, "isLoan": false } ], "extraHints": {}, "history": [] }
```

Grid `view` exemplo:
```json
{ "maxAttempts": 9, "attemptsUsed": 0, "rows": [ { "type": "club", "label": "Palmeiras" }, … ], "cols": [ … ], "cells": [ { "index": 0, "player": null }, … ] }
```

Erros: 404 `NO_DAILY_CHALLENGE`, 404 `PRACTICE_POOL_EXHAUSTED` (modo sem nenhum practice publicado), 400.

---

## POST /v1/attempts/:id/actions
Submete ação. Público, só a sessão dona. **Idempotente por `idempotencyKey`** (repetição retorna mesma resposta, 200).

Request (Career Path):
```json
{ "idempotencyKey": "7c9e…", "input": { "kind": "guess", "playerId": "p1" } }
```
ou `{ "kind": "skip" }`. Grid: `{ "kind": "guess", "cellIndex": 4, "playerId": "p1" }` ou `{ "kind": "finish" }`.

Response 200:
```json
{
  "attempt": { "id": "a1", "status": "IN_PROGRESS", "score": 0 },
  "event": { "type": "wrong", "revealed": "club" },
  "view": { … },
  "reveal": null
}
```
Quando a partida termina, `reveal` = `engine.toRevealView` (resposta, trajetória completa / exemplos por célula) e `share` = `{ "text": "…" }`.

Erros: 404 `ATTEMPT_NOT_FOUND` (inclui sessão diferente), 409 `GAME_ALREADY_COMPLETED`, 409 `DUPLICATE_GUESS`, 409 `CELL_ALREADY_FILLED`, 409 `PLAYER_ALREADY_USED`, 400 `UNKNOWN_PLAYER`, 400 `VALIDATION_ERROR`, 429.

---

## GET /v1/attempts/:id
Estado atual (reload de página). Mesma forma da resposta de actions sem `event`. 404 se sessão diferente.

---

## GET /v1/me/history?mode=&cursor=&limit=
Partidas concluídas da sessão, mais recentes primeiro. `limit` ≤ 50.

Response: `{ "items": [ { "attemptId", "mode", "kind", "publicNumber", "status", "score", "completedAt" } ], "nextCursor": null }`.

---

## GET /v1/me/stats
```json
{
  "CAREER_PATH": { "played": 12, "won": 9, "distribution": { "1": 0, "2": 2, "3": 4, "4": 2, "5": 1, "6": 0 }, "currentStreak": 3, "maxStreak": 5 },
  "FOOTBALL_GRID": { "played": 8, "avgScore": 6.4, "perfect": 1, "currentStreak": 2, "maxStreak": 4 }
}
```
`played`, `won`, `distribution`, `avgScore` e `perfect` contam só `kind=daily`; `practicePlayed` conta os treinos. Streak = dias civis (America/Sao_Paulo) seguidos com daily concluído, ganho ou perdido; um dia sem jogar zera (implementado 2026-11-05).

---

## POST /v1/events
Analytics do cliente. Body: `{ "events": [ { "name": "game_viewed", "ts": "…", "props": { … } } ] }`, máx. 20 por request. Response 202. Só `game_viewed`, `result_shared`, `game_abandoned`, `search_no_result`; props fora da lista do evento são descartadas. Os eventos de jogo (`game_started`, `answer_submitted`, `hint_revealed`, `game_completed`, `action_rejected`) são gravados pela API.

---

## Admin (`X-Admin-Token`)

| Método | Path | Função |
|---|---|---|
| GET | /v1/admin/players?status=&q=&page= | Lista com status e contagem de spells por status |
| GET | /v1/admin/players/:id | Player + aliases + spells + DQ warnings |
| PATCH | /v1/admin/players/:id | Campos editáveis + `verificationStatus` (transição validada) |
| POST/PATCH/DELETE | /v1/admin/players/:id/aliases[/:aliasId] | |
| POST/PATCH/DELETE | /v1/admin/players/:id/spells[/:spellId] | DQ-01..03 aplicadas |
| GET/POST/PATCH | /v1/admin/clubs | |
| POST | /v1/admin/import/wikidata | Body `{ "wikidataIds": [...] }` ou `{ "query": "brazil-players" }`; cria/atualiza `imported`; responde resumo + diffs |
| GET | /v1/admin/import/diffs?status=open | |
| POST | /v1/admin/challenges | Body: `{ "mode", "kind", "scheduledFor"?, "params" }` onde params = `{ playerId }` (CP) ou `{ rows, cols }` (Grid). Gera snapshot, roda elegibilidade, salva `draft` + relatório de validação |
| POST | /v1/admin/challenges/:id/validate | Reexecuta checagens; `draft → validated` |
| POST | /v1/admin/challenges/:id/schedule | `validated → scheduled` com `scheduledFor` |
| POST | /v1/admin/challenges/:id/publish | `validated|scheduled → published`; atribui `publicNumber`; snapshot vira imutável |
| POST | /v1/admin/challenges/:id/retire | Body `{ reason }`; `published → retired`; opcional `replacementParams` cria novo draft com `supersedesId` |
| GET | /v1/admin/challenges?mode=&status=&from=&to= | Calendário |
| GET | /v1/admin/challenges/:id/preview | Snapshot completo (única rota que o expõe) |
| GET | /v1/admin/reports/rejections | Relatórios de `DATA_QUALITY.md` §5: buscas sem resultado, palpites errados no Grid, verificados com passagens importadas |
| POST | /v1/admin/eligibility/career-path | Body `{ playerId }` → trajetória calculada + motivo de inelegibilidade |
| POST | /v1/admin/eligibility/grid | Body `{ rows, cols }` → contagem por célula + avisos |

Publicação de daily: cron **não** necessário. `scheduled` com `scheduledFor = hoje` é tratado como publicado pela query de daily? **Não**: para manter `publicNumber` sequencial e imutabilidade clara, publicação é ação explícita. Recomendação: editor publica a semana inteira com antecedência; rota `GET /v1/games` só considera `status=published AND scheduledFor=today`. Job de auto-publicação fica como sugestão pós-MVP.

Erros admin: 401 `UNAUTHORIZED`; 409 `DATE_TAKEN` (já existe daily vivo na data); 409 `INVALID_TRANSITION`; 422 `DATA_QUALITY_VIOLATION` com `details.rules: ["DQ-01"]`; 422 `CHALLENGE_NOT_ELIGIBLE` com `details.reasons`.

## Idempotência (resumo)

| Rota | Chave |
|---|---|
| POST /attempts | Daily: (sessionId, challengeId) via unique parcial. Practice: retoma a `IN_PROGRESS` do modo |
| POST /attempts/:id/actions | (attemptId, idempotencyKey) via unique; resposta recomputada do `AttemptAction.event` + estado atual |
| Admin publish/retire | Transição de estado; repetição → 409 `INVALID_TRANSITION` |
