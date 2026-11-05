# ADR-005 — Engines puras em `packages/engine`, uma por jogo, contrato mínimo

Status: aceito.

## Contexto
Precisamos adicionar jogos sem um framework genérico, e testar regras sem banco.

## Decisão
Cada jogo é um módulo em `packages/engine` que implementa `GameEngine<TConfig,TState,TInput,TEvent>` (`GAME_DESIGN/GAME_ENGINE_CONTRACT.md`). Engine não conhece Prisma, HTTP, relógio ou aleatoriedade. Geração de snapshot, elegibilidade com acesso a dados e persistência ficam na API. Registro de engines é um objeto literal `{ 'career-path': careerPathV1, 'football-grid': footballGridV1 }` em `apps/api/src/modules/challenges/engines.ts`.

## Alternativas
- Interface só com `submit`: perde `score`, `toPublicView` e `share` como pontos testáveis; rejeitada.
- Plugin system com descoberta dinâmica: sem necessidade com 2 jogos; rejeitado.

## Consequências
Adicionar um jogo = novo módulo na engine + geração de snapshot + telas. Nada mais muda.
