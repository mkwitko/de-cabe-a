# ADR-001 — Modular monolith em monorepo pnpm

Status: aceito (2026-11-04).

## Contexto
Produto novo, um desenvolvedor (mais agentes), dois jogos, sem tráfego. Prompt exige evitar microservices, filas, K8s.

## Decisão
Um processo Fastify, um bundle web, um Postgres. Monorepo pnpm com `apps/api`, `apps/web`, `packages/engine`, `packages/contracts`. Módulos por domínio dentro da API com regra de dependência linear (ver `ARCHITECTURE.md` §2).

## Alternativas
- Repos separados (como o projeto Camisa7 anterior): mais atrito para compartilhar engine e contratos; rejeitado.
- Next.js full-stack: junta API e web, mas acopla a engine ao framework e dificulta testes puros; rejeitado.
- Um único package sem `packages/`: engine ficaria importável pelo web sem controle; rejeitado.

## Consequências
Deploy conjunto; sem versionamento de API externo no MVP. Lint de fronteiras com `no-restricted-paths`.
