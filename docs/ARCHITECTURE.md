# Architecture

## 1. Forma

Modular monolith em monorepo pnpm. Um processo de API, um bundle web estático, um banco Postgres.

```text
de-cabeca/
├── apps/
│   ├── api/            # Fastify + Prisma
│   └── web/            # Vite + React + Tailwind + TanStack Query
├── packages/
│   ├── engine/         # engines puras (sem I/O) + normalização de texto
│   └── contracts/      # schemas Zod dos contratos HTTP (request/response) + tipos
├── scripts/research/   # scripts temporários de análise de dados (não fazem parte do build)
├── docs/
├── docker-compose.yml  # postgres:16 local
├── pnpm-workspace.yaml
└── package.json
```

Por que dois packages e não um: `engine` é pura e testada sem Zod de HTTP; `contracts` muda com a API. Mantê-los separados evita que o web importe código de regra. Não criar mais packages sem um consumidor concreto.

## 2. Módulos da API (`apps/api/src/modules/`)

| Módulo | Responsabilidade | Pode depender de |
|---|---|---|
| `knowledge` (players, clubs, countries, aliases, spells) | CRUD da base, busca de jogadores, checagens DQ | prisma |
| `data-import` | Import Wikidata → tabelas com status `imported`; `ImportDiff` | knowledge |
| `challenges` | Geração de snapshot, elegibilidade, validação, agenda, publicação, pool de practice | knowledge, engine |
| `attempts` | Iniciar partida, submeter, estado, concluir; idempotência | challenges (leitura de snapshot), engine, session |
| `progression` | Histórico, estatísticas, streak | attempts (leitura) |
| `session` | Guest session (cookie), rate limit por sessão | prisma |
| `admin` | Rotas `/admin/*`, auth por token, telas mínimas servidas pelo web | knowledge, challenges, data-import |
| `analytics` | Ingestão de eventos (`POST /events`) → tabela `Event` | session |

Módulos sugeridos no prompt e absorvidos: `players/clubs/careers` → `knowledge` (um módulo; três sub-pastas); `games` → enum + catálogo estático em `challenges`; `scoring` → vive na engine; `content-admin` → `admin`.

Regra de dependência: setas só para baixo na tabela; `engine` e `contracts` nunca importam de `apps/*`. Lint com `eslint-plugin-import` `no-restricted-paths` (já está no ecossistema ESLint; não adicionar ferramenta de arquitetura).

## 3. Estrutura interna de um módulo

```text
modules/attempts/
├── attempts.routes.ts     # Fastify plugin: rotas + schemas (de packages/contracts)
├── attempts.service.ts    # casos de uso; recebe prisma e engine por parâmetro
├── attempts.repo.ts       # Prisma só aqui
└── attempts.test.ts       # integração (testcontainers? não: usa Postgres do docker-compose com schema por teste)
```

Sem camada "domain/application/infrastructure" formal por módulo. Separação real: `engine` (domínio puro) vs `apps/api` (aplicação + infra). Isso é o que traz benefício; mais camadas não.

## 4. Fluxo de dados (submit)

```text
web ──POST /attempts/:id/actions {idempotencyKey, input}──▶ routes (zod parse)
  → service.submit: carrega Attempt + Challenge.snapshot (uma query)
  → se idempotencyKey já existe → retorna evento gravado
  → engine.validateConfig(snapshot); engine.submit(state, input, config)
  → transação: update Attempt.state/status/score + insert AttemptAction
  → retorna engine.toPublicView (+ toRevealView se concluído)
```

## 5. Contratos

- HTTP: schemas Zod em `packages/contracts`, usados por Fastify (`fastify-type-provider-zod`) e pelo web (parse de resposta em dev, tipos em prod). Sem geração de código (sem Kubb/OpenAPI no MVP; dois apps, um time).
- Interno: engine contract (`GAME_ENGINE_CONTRACT.md`).
- Versionamento HTTP: prefixo `/v1`. Mudança incompatível = `/v2` só se houver cliente externo; no MVP, web e api fazem deploy juntos.

## 6. Erros

Formato único:

```json
{ "error": { "code": "GAME_ALREADY_COMPLETED", "message": "Partida já concluída.", "details": {} } }
```

Catálogo em `packages/contracts/src/errors.ts`. Códigos estáveis; mensagens em PT-BR. Zod inválido → 400 `VALIDATION_ERROR` com `details.issues`.

## 7. Validação

Entrada: Zod em toda rota. Saída: Zod `strict` nas respostas de partida em testes (garante que `answerPlayerId`/`eligiblePlayerIds` nunca vazam).

## 8. Segurança

| Ameaça | Controle |
|---|---|
| Resposta exposta | `toPublicView`; teste de serialização; snapshot nunca retornado fora de `/admin` |
| Validação no cliente | Toda regra na engine, no servidor |
| Abuso de guest session (criar milhares) | Rate limit por IP em `POST` de criação (`@fastify/rate-limit`, 20/min); cookie `HttpOnly; Secure; SameSite=Lax`; token 256 bits, só hash no banco |
| Replay / duplicata | `idempotencyKey` (uuid gerado no cliente por ação) unique por attempt; resposta idêntica |
| Manipulação de score | Score calculado no servidor a partir do estado; cliente nunca envia score |
| Enumeração de desafios futuros | Daily só acessível a partir de 00:00 do dia (America/Sao_Paulo); `publicNumber` não permite deduzir conteúdo |
| Dados pessoais | Nenhum no guest. Cookie sem identificação. IP só em rate limit (memória), não persistido |
| Admin | Header `X-Admin-Token` comparado em tempo constante com `ADMIN_TOKEN` env; rotas `/admin` fora do rate limit público; sem UI pública |

Sem JWT, sem OAuth, sem senhas no MVP.

## 9. Observabilidade

- Logs estruturados do Fastify (pino) com `requestId`, `sessionId` (hash curto), rota, status, duração.
- Métricas: endpoint `/metrics` opcional via `prom-client` **só se** houver onde ler; no MVP, logs bastam.
- Erros: capturados pelo handler global; sem Sentry contratado (há MCP de Sentry disponível na máquina, mas o uso exige conta e aprovação; pendente).

## 10. Persistência

- Prisma migrations versionadas. Trigger de imutabilidade do snapshot em migration SQL manual.
- Seeds: `prisma/seed.ts` com países e ~30 clubes para dev; jogadores vêm do import.
- Testes de integração: Postgres do docker-compose, schema por worker (`DATABASE_URL` com `?schema=test_<worker>`).

## 11. Frontend

- Rotas (React Router): `/`, `/career-path`, `/career-path/practice`, `/grid`, `/grid/practice`, `/history`, `/stats`, `/admin/*`.
- Estado de servidor: TanStack Query. Estado local: `useState`/`useReducer`. Sem Redux, sem Zustand.
- Componentes em `apps/web/src/components/` (UI genérica) e `apps/web/src/games/<game>/` (específicos).
- Tailwind v4 (CSS-first). Sem lib de componentes no MVP; se precisar de dialog/popover acessível, `@radix-ui` primitives (justificar no PR).

## 12. Deploy (pendente, sem custo autorizado)

Opções gratuitas compatíveis: web estático em Cloudflare Pages ou GitHub Pages; API em Fly.io/Render free tier (dorme); Postgres em Neon/Supabase free tier. **Nenhuma contratada.** Decisão fica para após o piloto local. Desenvolvimento e testes 100% locais com docker-compose.

## 13. Ferramentas de dev

- TypeScript 5.x strict; ESLint + Prettier; Vitest; Playwright; Husky **não** (CI basta).
- CI: GitHub Actions (grátis em repo público ou dentro do free tier): lint, typecheck, unit, integration (service Postgres), e2e no PR.
