# ADR-010 — Hospedagem do piloto

Status: aceito (2026-11-06).

## Decisão
- **Web** (`apps/web`, estático): Cloudflare Pages.
- **API e Postgres**: na VM da Oracle Cloud que já existe, em Docker Compose (Postgres 16 + API), atrás de um proxy com HTTPS (Caddy).
- **Mesmo domínio para web e API**: o site chama `/v1` no próprio endereço, e o cookie de convidado e o login (Better Auth) dependem disso; o retorno do Google é `<site>/v1/auth/callback/google`. O Cloudflare encaminha `seudominio/v1/*` para a VM (Pages Function ou regra de rota); a API não fica num subdomínio próprio.
- **Backup**: `pg_dump` diário enviado para fora da VM (Cloudflare R2, plano grátis).

## Alternativas
- **Neon** (Postgres gerenciado): o plano grátis tem 0,5 GB por projeto e a base já ocupa 319 MB (95 mil jogadores); sobra pouco para crescer, e o banco suspenso tem partida a frio na primeira consulta. Fica como opção se a VM virar problema: trocar é só mudar `DATABASE_URL` e restaurar o dump.

## Consequências
Custo zero além do domínio. A VM precisa de atualizações de segurança e do backup testado (restaurar um dump uma vez antes do lançamento).
