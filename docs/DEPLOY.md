# Deploy do piloto (ADR-010)

Web estática no **Cloudflare Pages**; API + Postgres na **VM da Oracle** em Docker, atrás do Caddy (HTTPS). O site e a API ficam no **mesmo domínio**: o Pages encaminha `decabecafm.com.br/v1/*` para a VM (`apps/web/functions/v1/[[path]].js`). O cookie de convidado e o login dependem disso.

Nomes usados abaixo: `decabecafm.com.br` (site) e `api-origin.decabecafm.com.br` (origem da API, que ninguém abre direto).

## 1. Domínio e DNS (Cloudflare)

1. Comprar o domínio e apontar os nameservers para o Cloudflare.
2. Registro `A` `api-origin` → IP público da VM, **DNS only** (nuvem cinza), para o Caddy emitir o certificado.
3. O domínio raiz fica para o Pages (passo 3).

## 2. VM da Oracle

1. Liberar as portas 80 e 443 na *security list* da VCN e no firewall da VM (`iptables`/`firewalld`).
2. Instalar Docker e o plugin compose; clonar o repositório em `/opt/de-cabeca`.
3. `cp deploy/.env.prod.example deploy/.env.prod` e preencher:
   - `POSTGRES_PASSWORD`, `ADMIN_TOKEN`, `BETTER_AUTH_SECRET`: `openssl rand -base64 32` cada.
   - `API_HOST=api-origin.decabecafm.com.br`, `WEB_ORIGIN=https://decabecafm.com.br`.
   - Google e Resend: passos 4 e 5 (pode subir sem eles; o login com Google fica desligado e os e-mails vão para o log).
4. Subir: `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build`. As migrações rodam na partida da API.
5. Conferir: `https://api-origin.decabecafm.com.br/v1/health` responde `200`.
6. Base de jogadores: restaurar o dump do ambiente local (`pg_dump` local → `psql` no contêiner `postgres`), em vez de reimportar tudo.

Atualizar: `git pull` e o mesmo `up -d --build`.

## 3. Cloudflare Pages

- Projeto ligado ao repositório GitHub, branch `main`.
- Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @decabeca/web build`; saída `apps/web/dist`; diretório raiz: `/` (as Functions ficam em `apps/web/functions`, então use **Root directory** `apps/web` e build `cd ../.. && corepack enable && pnpm install --frozen-lockfile && pnpm --filter @decabeca/web build`, saída `dist`).
- Variável de ambiente (Production): `API_ORIGIN=https://api-origin.decabecafm.com.br`.
- Domínio personalizado: `decabecafm.com.br`.
- Teste: `https://decabecafm.com.br/v1/health` → `200` (passou pela Function até a VM).

## 4. Login com Google

Google Cloud Console → APIs e serviços → Credenciais → ID do cliente OAuth (aplicativo da Web):
- Origem JavaScript autorizada: `https://decabecafm.com.br`
- URI de redirecionamento autorizado: `https://decabecafm.com.br/v1/auth/callback/google` (em desenvolvimento: `http://127.0.0.1:5173/v1/auth/callback/google`)
- Copiar ID e segredo para `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` em `deploy/.env.prod` e reiniciar a API.

## 5. E-mail (Resend)

1. Resend → Domains → adicionar `decabecafm.com.br` e criar no Cloudflare os registros DNS que ele pedir (SPF/DKIM).
2. Criar uma API key só de envio → `RESEND_API_KEY`; `EMAIL_FROM=De Cabeça <nao-responda@decabecafm.com.br>`.
3. Reiniciar a API e testar "Esqueci a senha" na página Conta.

## 6. Backup

1. Criar o bucket `decabeca-backups` no Cloudflare R2 e um token S3; configurar o `rclone` na VM com um remote chamado `r2`.
2. Cron: `30 6 * * * /opt/de-cabeca/deploy/backup.sh >> /var/log/decabeca-backup.log 2>&1` (guarda 14 dias).
3. **Antes do lançamento, restaurar um backup uma vez** num Postgres descartável e abrir a API apontando para ele.

## Antes de abrir o piloto

- [ ] `pnpm -r typecheck && pnpm -r lint && pnpm test && pnpm test:e2e` verdes.
- [ ] `scripts/research/validate-pool.ts` sem violações bloqueantes.
- [ ] Trilhas publicadas (Career Path e Grid) conferidas por amostragem.
- [ ] `ADMIN_TOKEN` e `BETTER_AUTH_SECRET` novos, fora do repositório.
- [ ] Aviso de cookies e privacidade: cookie técnico de sessão e, com conta, e-mail (e dados do Google, se usado).
- [ ] Backup restaurado uma vez (seção 6).
