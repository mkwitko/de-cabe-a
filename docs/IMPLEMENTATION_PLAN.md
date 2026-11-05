# Implementation Plan

Cada slice: objetivo, escopo, dependências, módulos, critérios de aceite (verificáveis), testes obrigatórios, riscos, Definition of Done (DoD). DoD comum a todos: lint + typecheck + testes do slice verdes no CI; docs atualizados se o slice mudou uma decisão; nenhum TODO sem issue.

## Slice 1 — Fundação do repositório
- **Objetivo:** workspace funcional, zero funcionalidade.
- **Escopo:** `git init`; pnpm workspace; `apps/api` (Fastify 5, TS strict, `fastify-type-provider-zod`, pino, rota `GET /v1/health`); `apps/web` (Vite, React 19, TS, Tailwind v4, TanStack Query, React Router; página com "De Cabeça"); `packages/engine` e `packages/contracts` vazios com build; ESLint + Prettier + `no-restricted-paths`; Vitest configurado nos 4 pacotes; Playwright no web; `docker-compose.yml` com `postgres:16`; `.env.example` (`DATABASE_URL`, `ADMIN_TOKEN`, `SESSION_SECRET`, `PORT`); GitHub Actions (lint, typecheck, unit); README com comandos.
- **Dependências:** nenhuma.
- **Aceite:** `pnpm install && pnpm -r typecheck && pnpm -r test` passam; `pnpm dev` sobe api em :3000 e web em :5173; `curl :3000/v1/health` → `{"ok":true}`; importar `@decabeca/engine` dentro de `apps/web` falha no lint.
- **Testes:** 1 unit trivial por pacote; e2e: página carrega e mostra "De Cabeça".
- **Riscos:** versões (Node 24, Tailwind v4, Prisma); fixar versões exatas no lockfile.
- **Não fazer:** nenhuma tabela, nenhuma rota de jogo.

### Slice 1 — plano de execução (aprovado 2026-11-05)

Branch `feat/slice-1-foundation` → PR para `main`. `git init` já feito (repo existe com remote). Prisma fica para o slice 2.

Ajustes ao escopo (aprovados):
- A1. Fronteiras via regra nativa `no-restricted-imports` do ESLint (override em `apps/web/**`) em vez de `eslint-plugin-import/no-restricted-paths`: mesmo efeito, zero dependência.
- A2. `packages/engine` e `packages/contracts` exportam o fonte TS (`exports: ./src/index.ts`); "build" = `tsc --noEmit`. Vite e `tsx` consomem TS direto. Build de produção da API decide-se no deploy.
- A3. Unit do web com `react-dom/server` (`renderToString`) em ambiente node: sem jsdom nem Testing Library por ora.
- A4. CI: lint + typecheck + unit em Node 22 e 24 (REPO_DIAGNOSIS §5); e2e Playwright também no CI, 1 job, Chromium.
- A5. Página inicial com identidade visual mínima (tokens de cor/tipografia, tema claro/escuro por `prefers-color-scheme`), feita com a skill de design `impeccable`. Direção escolhida: "álbum de figurinhas" (`apps/web/DESIGN.md`, `PRODUCT.md`). Sem componentes de jogo.

Passos (commits):
1. `chore: scaffold pnpm workspace` — raiz, tsconfig base, Prettier, ESLint, `.nvmrc`.
2. `feat(contracts): health response schema` — teste primeiro.
3. `feat(engine): empty engine package` — `ENGINE_PACKAGE = 'engine'` + teste trivial.
4. `feat(api): fastify app with GET /v1/health` — teste com `app.inject` primeiro.
5. `feat(web): vite react app with home page` — teste de render + e2e Playwright.
6. `chore: docker-compose postgres and env example`.
7. `ci: lint, typecheck, unit and e2e workflow`.
8. `docs: README with commands`.

Arquivos:

```text
package.json  pnpm-workspace.yaml  tsconfig.base.json  eslint.config.js
.prettierrc.json  .prettierignore  .nvmrc  docker-compose.yml  .env.example  README.md
.github/workflows/ci.yml
packages/contracts/{package.json,tsconfig.json,src/index.ts,src/health.ts,src/health.test.ts}
packages/engine/{package.json,tsconfig.json,src/index.ts,src/index.test.ts}
apps/api/{package.json,tsconfig.json,src/app.ts,src/server.ts,src/app.test.ts}
apps/web/{package.json,tsconfig.json,vite.config.ts,playwright.config.ts,index.html,
          src/main.tsx,src/App.tsx,src/index.css,src/App.test.tsx,e2e/home.spec.ts}
```

Dependências (todas da stack do handoff §3, exceto marcadas):
- raiz: `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `prettier`, `vitest`, `@types/node`.
- api: `fastify`, `fastify-type-provider-zod`, `zod`; dev `tsx` (**fora da stack**: roda a API em TS com watch, sem passo de build).
- web: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `tailwindcss`, `@tailwindcss/vite`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `@playwright/test`.
- contracts: `zod`.
- web: `@fontsource-variable/archivo` (**fora da stack**: fonte self-hosted da direção visual, sem CDN externo).
- TypeScript fixado em 5.9 (typescript-eslint 8 não suporta TS 6+).

Verificação final (saída real no PR): `pnpm install && pnpm -r typecheck && pnpm -r test`; `pnpm -r lint`; `pnpm dev` + `curl localhost:3000/v1/health`; arquivo temporário importando `@decabeca/engine` em `apps/web` → `pnpm -r lint` falha; `pnpm test:e2e`; CI verde no PR.

## Slice 2 — Modelo de dados histórico
- **Escopo:** Prisma schema de `DATA_MODEL.md` §2.1 e §2.2 e §2.3 (todas as tabelas, inclusive `User` vazio e `Event`); migration inicial; migration SQL manual com trigger de imutabilidade de `Challenge.snapshot`; seed: países (ISO completo) + ~30 clubes brasileiros e ~20 estrangeiros com `wikidataId`; funções DQ-01..09 em `modules/knowledge/quality.ts`; `normalizeName` em `packages/engine/src/text`.
- **Dependências:** 1.
- **Aceite:** `pnpm db:migrate && pnpm db:seed` sem erro; teste de integração do trigger passa; testes de `normalizeName` passam; `quality.ts` detecta cada violação com fixture.
- **Testes:** unit normalize + DQ; integration trigger.
- **Riscos:** `uuid(7)` indisponível → usar `uuid()`.

## Slice 3 — Engine Career Path
- **Escopo:** `packages/engine/src/career-path/` conforme `GAME_ENGINE_CONTRACT.md` §3 e `CAREER_PATH.md` §1, §3, §7, §8, §12; `buildTrajectory(spells)` (função pura sobre DTOs) conforme `CAREER_PATH.md` §4; `isEligible(playerDto)` conforme §5 (sem a regra de 180 dias, que precisa de banco).
- **Dependências:** 1.
- **Aceite:** todos os casos de `TEST_STRATEGY.md` §1 para CP passam; `toPublicView` nunca contém `answerPlayerId` (teste de propriedade com todos os estados alcançáveis).
- **Riscos:** regra de "retorno após empréstimo" ambígua → testar os dois cenários do §4 explicitamente.

## Slice 4 — Import Wikidata + spot-check
- **Escopo:** `scripts/research/wikidata-spotcheck.ts` (as 5 consultas de `DATA_SOURCES.md` §4; grava resultado em `docs/DATA_QUALITY.md` §Baseline manualmente); `modules/data-import/wikidata.ts`: dado lista de QIDs, busca entidade (API `wbgetentities`), mapeia P54/P580/P582/P1642/P413/P27/P569/labels → `Player`, `Club`, `CareerSpell`, `PlayerAlias` com status `imported`; `ImportDiff` quando entidade já existe; rota `POST /v1/admin/import/wikidata` (token).
- **Dependências:** 2.
- **Aceite:** importar 20 QIDs da lista fixa cria registros `imported` com spells ordenados; segunda execução gera diffs e não altera `verified`; spot-check documentado.
- **Testes:** unit do mapper com fixtures JSON de 3 entidades reais salvas no repo; integration de reimport.
- **Riscos:** rate limit do Wikidata (respeitar `User-Agent` descritivo e ≤ 1 req/s); propriedades diferentes do esperado → ajustar mapper e documentar.

## Slice 5 — Admin mínimo: verificação
- **Escopo:** rotas admin de players/aliases/spells/clubs de `API_SPEC.md`; transições de status com DQ bloqueantes; página web `/admin` (token em sessionStorage) com lista de players, detalhe editável, avisos DQ. Sem estilo elaborado.
- **Dependências:** 2, 4.
- **Aceite:** editor importa, corrige um spell, marca `verified`; tentativa de verificar player com DQ-01 violada retorna 422 com código.
- **Testes:** integration das transições; e2e simples do fluxo de verificação.

## Slice 6 — Sessão, desafio e partida Career Path (API)
- **Escopo:** `modules/session` (cookie, criação, rate limit); `modules/challenges`: snapshot CP (`buildSnapshot(playerId)` lendo banco, chamando `buildTrajectory`), elegibilidade completa (inclui 180 dias via `ChallengePlayerUsage`), `POST /admin/challenges` (CP), `validate`, `publish`, `preview`, seleção de daily por data/fuso e de practice; `modules/attempts`: `POST /attempts`, `POST /attempts/:id/actions`, `GET /attempts/:id`, idempotência; `GET /v1/games`; `GET /v1/players/search`.
- **Dependências:** 2, 3, 5.
- **Aceite:** via curl: criar sessão, publicar desafio, iniciar, errar, pular, acertar; resposta nunca contém `answerPlayerId`; replay de `idempotencyKey` idêntico; sessão B recebe 404.
- **Testes:** integration de `TEST_STRATEGY.md` §2 (itens de sessão, attempts, daily/fuso, search, publish).
- **Riscos:** fuso — usar `Temporal` polyfill ou `date-fns-tz`? Preferir `Intl.DateTimeFormat` nativo com `timeZone: 'America/Sao_Paulo'` para obter a data civil (sem dependência nova).

## Slice 7 — Frontend Career Path
- **Escopo:** rotas `/`, `/career-path`, `/career-path/practice`; componentes de `UX_SPEC.md` §8 necessários; resultado + share; estados vazio/erro/loading; acessibilidade básica.
- **Dependências:** 6.
- **Aceite:** e2e passos 1–6 de `TEST_STRATEGY.md` §3; Lighthouse acessibilidade ≥ 90 local.
- **Riscos:** combobox acessível é a parte mais trabalhosa; considerar `@radix-ui/react-popover` só se o custom falhar em teclado.

## Slice 8 — Engine Football Grid
- **Escopo:** `packages/engine/src/football-grid/` conforme contrato §4 e `FOOTBALL_GRID.md` §1, §5, §7, §10; validação de combinações proibidas (§3) como função pura.
- **Dependências:** 1.
- **Aceite:** casos de `TEST_STRATEGY.md` §1 para Grid.

## Slice 9 — Grid: snapshot, elegibilidade, API, admin
- **Escopo:** `buildGridSnapshot(rows, cols)`: query por critério (club/nationality/position/played_in_country) sobre dados `verified`, interseção por célula, mínimo por célula, `exampleAnswerPlayerId`; `POST /admin/eligibility/grid`; `POST /admin/challenges` (Grid); attempts já funcionam (engine registry); página admin de criação de grid com contagens por célula.
- **Dependências:** 5, 6, 8.
- **Aceite:** curl completa um grid; célula com < 8 elegíveis bloqueia daily; `eligiblePlayerIds` nunca sai fora de `/admin`.
- **Testes:** integration de geração de snapshot com seed de 30 jogadores.

## Slice 10 — Frontend Grid
- **Escopo:** `/grid`, `/grid/practice`, `GridBoard`, `CellSheet`, resultado com exemplos, share.
- **Dependências:** 9.
- **Aceite:** e2e passo 7.

## Slice 11 — Progressão
- **Escopo:** `modules/progression`: history, stats, streak (fuso BR); telas `/history`, `/stats`; home mostra estado do daily.
- **Dependências:** 6, 9.
- **Aceite:** cenários de streak de `TEST_STRATEGY.md` §2; e2e passo 8.

## Slice 12 — Publicação editorial
- **Escopo:** calendário semanal no admin; `schedule`, `retire` com `supersedesId`; `publicNumber`; relatórios (`/admin/reports/rejections`); script `validate-pool.ts`.
- **Dependências:** 5, 6, 9.
- **Aceite:** editor publica 7 dias de cada jogo; retirar um daily e substituir mantém attempts antigos íntegros; trigger impede edição.

## Slice 13 — Analytics
- **Escopo:** tabela `Event`; `POST /v1/events`; cliente envia eventos de `ANALYTICS.md`; `sendBeacon` em abandono; 5 consultas SQL salvas em `docs/analytics-queries.sql`.
- **Dependências:** 7, 10.
- **Aceite:** jogar uma partida gera a sequência `game_viewed → game_started → answer_submitted… → game_completed`.

## Slice 14 — Hardening e piloto
- **Escopo:** rate limits finais; e2e completo; `prefers-reduced-motion`; revisão de contraste; seed de piloto (300 jogadores `verified`, 60 CP, 30 grids publicáveis — trabalho editorial, não código); checklist de deploy (sem contratar nada; documento com opções).
- **Dependências:** todos.
- **Aceite:** e2e completo verde; `validate-pool.ts` sem violações; 30 dias de desafios publicados.

## Slice 15 — Cadastro opcional (pós-piloto, bloqueado por RF-10)
Não planejar em detalhe até decisão.
