# Portões de qualidade

O que precisa passar antes de mergear e antes de publicar. Complementa `TEST_STRATEGY.md`.

## Por PR (CI, `.github/workflows/ci.yml`)

| Gate | Comando | Estado |
|---|---|---|
| Formatação | `pnpm format:check` | ✔ |
| Lint | `pnpm lint` | ✔ |
| Tipos | `pnpm typecheck` | ✔ |
| Unitários e integração (engine, API com Postgres, web) | `pnpm test` | ✔ |
| E2E (Chromium, 360 px e desktop) | `pnpm test:e2e` | ✔ |
| Usabilidade mobile: sem rolagem lateral, sem erro de console, alvo ≥ 40 px em 13 rotas | `apps/web/e2e/usability.spec.ts` | ✔ |
| Vulnerabilidades em dependências | `pnpm audit --audit-level=high` | ✔ (adicionado 2026-11-07) |
| Segredos no código | GitHub secret scanning (configuração do repositório) | ligar no GitHub |
| Acessibilidade automática (axe) nas 13 rotas | `@axe-core/playwright` | ✖ onda 1 |

## Por mudança de UI

1. `impeccable context` + `critique` na tela antes de desenhar; `polish` só na tela tocada, nunca em varredura geral. Oficina e admin são superfícies de operação: não ganham estética de figurinha.
2. Print em 360 px e desktop no PR.
3. Teclado: Tab chega em todo controle; foco visível (anel amarelo); Escape fecha diálogos.
4. `prefers-reduced-motion`: nenhuma animação de deslocamento ou escala.
5. Contraste AA: texto normal ≥ 4,5:1; verde-claro (`chalk-soft`) não em texto pequeno.
6. Texto em PT-BR, sem jargão em inglês na interface.

## Por mudança em API, auth, ligas, votos ou moderação

- Teste de integração com dois usuários: o segundo não lê nem altera o que é do primeiro (IDOR).
- Corpo com campo extra (`stars`, `role`, `ownerId`) é rejeitado.
- Limite de taxa da rota testado (N+1 requisições → 429).
- Para votos e convites: duas requisições simultâneas → um efeito.
- `/security-review` do Claude Code no PR.

## Antes de publicar (release)

- [ ] Backup restaurado num Postgres descartável e API aberta sobre ele (DEPLOY.md §6); data registrada em `SECURITY.md` §7.
- [ ] `curl -I` no site mostra HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors`.
- [ ] Login, logout, Google e troca de senha testados à mão em produção.
- [ ] `/privacidade` atualizada com os serviços usados.
- [ ] Sentry recebe erro de teste sem cookie nos dados.
- [ ] Rate limit em produção: 61 buscas em 1 minuto → 429.
- [ ] Lighthouse mobile: performance ≥ 85, acessibilidade ≥ 95 na home e numa fase.
- [ ] Leitor de tela (NVDA ou TalkBack) numa fase de cada modo novo.
- [ ] Zoom 200 % sem perda de conteúdo na home, trilha e resultado.

## Antes de abrir comunidade (onda 2)

- [ ] Filtro de apelidos com lista de testes.
- [ ] Limite de ligas por usuário e de membros por liga.
- [ ] Perfil privado por padrão e teste de que um perfil privado retorna 404 para terceiros.
- [ ] Denúncia e saída de liga funcionando.

## Antes da Oficina (onda 3)

- [ ] `SECURITY.md` §8 inteiro com teste por item.
- [ ] Papéis e auditoria de moderação.
- [ ] Aprovação manual ligada por padrão.
