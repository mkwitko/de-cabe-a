# SESSION_HANDOFF — De Cabeça

Documento para uma sessão nova, sem histórico. Leia inteiro antes de qualquer ação.

## 1. Resumo do produto

Plataforma web de minijogos de conhecimento de futebol, PT-BR, foco em futebol brasileiro + jogadores internacionais relevantes. MVP com dois jogos: **Career Path** (adivinhe o jogador pela sequência de clubes, 6 tentativas) e **Football Grid** (3×3, 9 tentativas). Daily challenge (mesmo para todos, fuso America/Sao_Paulo) + Practice ilimitado. Guest-first, sem cadastro. Resultado compartilhável sem spoiler.

## 2. Decisões aprovadas (não renegociar sem justificativa documentada)

Ver tabela em `PRD.md` §1. Resumo: dois jogos; single-player; guest-first; daily + practice; Brasil como ponto de partida; sem multiplayer, pagamentos, live data, achievements no MVP; monetização só futura.

Decisões desta análise (status **recomendado**, assumidas como aprovadas para o plano, salvo objeção):
- Career Path: 6 tentativas; score `(7 − tentativas) × 10`; input por `playerId` via autocomplete, não texto livre.
- Grid: 9 tentativas; score = células preenchidas; pool pré-computado no snapshot; 4 tipos de critério.
- Snapshot imutável por desafio (ADR-002). Publicação é ação explícita do editor; sem cron.
- Wikidata (CC0) como única fonte automática; verificação manual obrigatória; sem scraping; sem logos (ADR-003).
- Guest session por cookie HttpOnly; sem auth; admin por `X-Admin-Token` (ADR-004).
- Monorepo pnpm: `apps/api`, `apps/web`, `packages/engine`, `packages/contracts` (ADR-001, ADR-005).
- Sem geração OpenAPI/Kubb; contratos Zod compartilhados.
- Analytics em tabela própria; sem ferramenta externa.

## 3. Stack

Node ≥ 22 (máquina: 24.12), pnpm 10, TypeScript 5 strict, Fastify 5 + `fastify-type-provider-zod`, Zod, Prisma + PostgreSQL 16 (docker-compose), React 19 + Vite + Tailwind v4 + TanStack Query + React Router, Vitest, Playwright, ESLint/Prettier, GitHub Actions. Sem Redux. Sem libs adicionais sem justificativa no PR.

## 4. Estado do repositório

**Vazio** (só `.remember/` do plugin e `docs/`). Sem git. Sem código. Projetos `futebol-*` antigos não existem mais e eram outro produto. Ver `REPO_DIAGNOSIS.md`.

## 5. Documentos a ler (ordem)

1. `SESSION_HANDOFF.md` (este)
2. `PRD.md`
3. `GAME_DESIGN/CAREER_PATH.md`, `GAME_DESIGN/FOOTBALL_GRID.md`, `GAME_DESIGN/GAME_ENGINE_CONTRACT.md`
4. `DATA_MODEL.md`, `DATA_QUALITY.md`, `DATA_SOURCES.md`
5. `ARCHITECTURE.md`, `API_SPEC.md`, `UX_SPEC.md`
6. `TEST_STRATEGY.md`, `ANALYTICS.md`
7. `ROADMAP.md`, `IMPLEMENTATION_PLAN.md`
8. `ADR/*`
9. `PRODUCT_VISION.md`, `COMPETITIVE_ANALYSIS.md` (contexto)

## 6. Modelo de dados (resumo)

Knowledge: `Country`, `Club`, `Player`, `PlayerAlias`, `CareerSpell`, `Source`, `ImportDiff`. Platform: `Challenge` (snapshot jsonb imutável), `ChallengePlayerUsage`. Sessão: `GuestSession`, `User` (vazio), `Attempt`, `AttemptAction`, `Event`. Procedência inline (`sourceId`, `sourceRef`, `verificationStatus`, `verifiedAt`, `verifiedBy`). Streak derivado.

## 7. Regras dos jogos (resumo)

**Career Path:** clube 1 visível; cada erro/pular revela próximo; 6 tentativas; trajetória = spells `verified` `professional|loan`, sem `youth`, ordem `startDate, endDate, sortIndex`; elegível se 3–12 clubes e tier T1–T3; share `N/6` com quadrados.
**Grid:** 9 tentativas, 1 por célula, jogador único por partida; critérios `club|nationality|position|played_in_country`; mínimo 8 elegíveis por célula (daily); share grid 3×3 de emojis.

## 8. Ordem de implementação

`ROADMAP.md`: 1 Fundação → 2 Modelo de dados → 3 Engine CP → 4 Import + spot-check → 5 Admin verificação → 6 API CP → 7 Web CP → 8 Engine Grid → 9 API Grid → 10 Web Grid → 11 Progressão → 12 Publicação → 13 Analytics → 14 Hardening. 3 e 8 paralelizáveis.

## 9. Primeiro vertical slice

Slice 1 de `IMPLEMENTATION_PLAN.md`: monorepo, API com `/v1/health`, web "De Cabeça", packages vazios, lint de fronteiras, Vitest/Playwright, docker-compose Postgres, `.env.example`, CI, README. **Nada de tabelas ou rotas de jogo.**

## 10. Critérios de aceite do slice 1

`pnpm install && pnpm -r typecheck && pnpm -r test` verdes; `pnpm dev` sobe api :3000 e web :5173; `curl localhost:3000/v1/health` → `{"ok":true}`; importar `@decabeca/engine` em `apps/web` falha no lint; CI verde no primeiro commit.

## 11. Comandos (a criar no slice 1; nenhum existe hoje)

```bash
docker compose up -d          # postgres
pnpm install
pnpm dev                      # api + web
pnpm -r typecheck
pnpm -r lint
pnpm test                     # unit + integration
pnpm test:e2e
pnpm db:migrate && pnpm db:seed
```

## 12. Restrições de infraestrutura e custo

Tudo local e gratuito. Não contratar hospedagem, banco, APIs pagas, Sentry, PostHog ou qualquer serviço sem autorização explícita do usuário. Não fazer scraping de Transfermarkt, FBref, Sofascore, Flashscore, ogol. Wikidata: `User-Agent` descritivo, ≤ 1 req/s.

## 13. Decisões pendentes

- Q1 Método de cadastro opcional (RF-10) — adiado para pós-piloto.
- Q2 Hospedagem.
- Q3 Nome decidido: "De Cabeça". Pendente: checar domínio e INPI.
- Q4 Tamanho mínimo do pool para o piloto (recomendação: 300 jogadores, 60 CP, 30 grids).
- Q5 Cobertura real do Wikidata para BR pré-2000 (spot-check no slice 4).
- Q6 Confirmação dos concorrentes brasileiros citados no briefing (Shotle, Fut Trivia) — não localizados na pesquisa.

## 14. Riscos conhecidos

Cobertura/qualidade de dados históricos; empréstimos inconsistentes no Wikidata; esforço editorial para 300 jogadores verificados; combobox acessível no web; retenção não comprovada (hipóteses em `COMPETITIVE_ANALYSIS.md` §7).

## 15. O que NÃO implementar

Multiplayer, ranking global, pagamentos, anúncios, achievements, live data, logos de clubes, OAuth/JWT, cron de publicação, microservices, filas, CQRS, event sourcing, geração OpenAPI, Redux, mais de dois jogos, scraping.

---

## Prompt para a próxima sessão

```text
Você vai implementar o MVP da plataforma "De Cabeça" (minijogos de conhecimento de futebol) seguindo desenvolvimento spec-driven.

Antes de escrever qualquer código:
1. Leia docs/SESSION_HANDOFF.md por completo e depois os documentos na ordem da seção 5.
2. Confira o estado atual do repositório (espera-se vazio além de docs/ e .remember/). Se houver código, pare e reporte divergência em relação a docs/REPO_DIAGNOSIS.md.
3. Valide a consistência da especificação: PRD × Game Design × Data Model × Engine Contract × API × UX. Liste qualquer contradição, regra incompleta ou critério de aceite subjetivo que encontrar. Não corrija decisões aprovadas silenciosamente; proponha e aguarde.
4. Identifique bloqueios (ferramenta ausente, versão incompatível, decisão pendente que impede o slice 1).
5. Produza um plano de execução curto só para o Slice 1 (docs/IMPLEMENTATION_PLAN.md), com a lista de arquivos a criar.

Então implemente SOMENTE o Slice 1, com TDD onde fizer sentido, e pare. Rode os critérios de aceite da seção 10 do handoff e mostre a saída real dos comandos. Não avance para o Slice 2 sem o Slice 1 verde e validado pelo usuário.

Restrições: tudo local e gratuito; nenhuma contratação de serviço; nenhuma dependência nova sem justificativa de uma linha no PR; nenhuma funcionalidade da seção 15 do handoff. Commits pequenos com mensagens convencionais.
```
