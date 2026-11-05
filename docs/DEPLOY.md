# Deploy — checklist (nada contratado)

Status: sem hospedagem decidida (Q2). Este checklist serve para quando o autor escolher; nenhuma conta foi criada.

## Peças
- **API** (Node 24, `pnpm --filter @decabeca/api start` via `tsx`, ou bundle): variáveis `DATABASE_URL`, `ADMIN_TOKEN` (≥ 16 chars, aleatório), `PORT`, `HOST=0.0.0.0` dentro de container, `NODE_ENV=production` (liga o `Secure` do cookie).
- **Web**: `pnpm --filter @decabeca/web build` gera estático em `apps/web/dist`. Precisa servir `/v1/*` no **mesmo domínio** (proxy reverso para a API), senão o cookie de sessão não funciona.
- **Banco**: PostgreSQL 16; `pnpm db:migrate` no deploy; `pnpm db:seed` uma vez.

## Opções gratuitas (ARCHITECTURE.md §12)
| Peça | Opção | Observação |
|---|---|---|
| Web + proxy | Cloudflare Pages + Functions, ou o mesmo host da API servindo o estático | o proxy `/v1` é obrigatório |
| API | Fly.io / Render free tier | dorme sem tráfego: primeiro request lento |
| Banco | Neon / Supabase free tier | conferir limites de conexão; usar a URL com pooler |

## Antes de abrir o piloto
- [ ] `pnpm -r typecheck && pnpm -r lint && pnpm test && pnpm test:e2e` verdes.
- [ ] `scripts/research/validate-pool.ts` sem violações bloqueantes.
- [ ] 30 dias de daily publicados para cada jogo (painel `/admin/challenges`).
- [ ] `ADMIN_TOKEN` novo, fora do repositório.
- [ ] Domínio (Q3) e aviso de cookies/privacidade (só cookie técnico de sessão, sem dado pessoal).
