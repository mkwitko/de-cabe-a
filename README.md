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
pnpm db:migrate && pnpm db:seed
pnpm dev                      # api em :3000, web em :5173
```

`curl localhost:3000/v1/health` deve responder `{"ok":true}`.

## Comandos

| Comando                             | O que faz                                                |
| ----------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                          | Sobe API (Fastify, `tsx watch`) e web (Vite) em paralelo |
| `pnpm -r typecheck`                 | `tsc` em todos os pacotes                                |
| `pnpm -r lint`                      | ESLint, incluindo regras de fronteira entre pacotes      |
| `pnpm test`                         | Unitários + integração (Vitest) de todos os pacotes      |
| `pnpm test:unit`                    | Só testes unitários (sem banco)                          |
| `pnpm test:e2e`                     | Playwright no web (sobe o Vite sozinho)                  |
| `pnpm db:migrate`                   | Aplica as migrations (Prisma) no banco do `.env`         |
| `pnpm db:seed`                      | Fontes, países ISO e 60 clubes (idempotente)             |
| `pnpm format` / `pnpm format:check` | Prettier                                                 |

`pnpm test` inclui os testes de integração da API, que precisam do Postgres (`docker compose up -d`); eles rodam num schema `test` separado. Nova migration: `pnpm --filter @decabeca/api db:migrate:dev --name <nome>`.

## Estrutura

```text
apps/api            Fastify 5 + Zod (fastify-type-provider-zod) + Prisma 7 (PostgreSQL 16)
apps/web            Vite + React 19 + Tailwind v4 + TanStack Query + React Router
packages/engine     Regras puras dos jogos (sem I/O). O web não pode importar.
packages/contracts  Schemas Zod dos contratos HTTP, usados pela API e pelo web
docs/               Produto, game design, arquitetura, ADRs, plano de implementação
```

Os pacotes exportam o fonte TypeScript direto (sem passo de build); Vite e `tsx` consomem TS.

## Design

Direção visual "álbum de figurinhas": `apps/web/DESIGN.md`. Contexto de produto para design: `PRODUCT.md`.
