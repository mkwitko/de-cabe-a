# De Cabeça

Minijogos de conhecimento de futebol (PT-BR): **Career Path** e **Football Grid**, com desafio diário e modo treino. Especificação completa em [`docs/`](docs/SESSION_HANDOFF.md).

## Requisitos

- Node 24 (mínimo 22.12) e pnpm 10 (`corepack enable`)
- Docker com Compose

## Começando

```bash
cp .env.example .env
docker compose up -d --wait   # PostgreSQL 16 em :5432
pnpm install
pnpm dev                      # api em :3000, web em :5173
```

`curl localhost:3000/v1/health` deve responder `{"ok":true}`.

## Comandos

| Comando                             | O que faz                                                |
| ----------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                          | Sobe API (Fastify, `tsx watch`) e web (Vite) em paralelo |
| `pnpm -r typecheck`                 | `tsc` em todos os pacotes                                |
| `pnpm -r lint`                      | ESLint, incluindo regras de fronteira entre pacotes      |
| `pnpm test`                         | Testes unitários (Vitest) de todos os pacotes            |
| `pnpm test:e2e`                     | Playwright no web (sobe o Vite sozinho)                  |
| `pnpm format` / `pnpm format:check` | Prettier                                                 |

`pnpm db:migrate` e `pnpm db:seed` chegam no slice 2.

## Estrutura

```text
apps/api            Fastify 5 + Zod (fastify-type-provider-zod)
apps/web            Vite + React 19 + Tailwind v4 + TanStack Query + React Router
packages/engine     Regras puras dos jogos (sem I/O). O web não pode importar.
packages/contracts  Schemas Zod dos contratos HTTP, usados pela API e pelo web
docs/               Produto, game design, arquitetura, ADRs, plano de implementação
```

Os pacotes exportam o fonte TypeScript direto (sem passo de build); Vite e `tsx` consomem TS.

## Design

Direção visual "álbum de figurinhas": `apps/web/DESIGN.md`. Contexto de produto para design: `PRODUCT.md`.
