# Deploy do piloto (ADR-010)

Tudo na **VM da Oracle** (`ubuntu@136.248.86.54`, ARM, compartilhada com outros projetos) em Docker: Postgres, API e web (Caddy serve o site e encaminha a API, então os dois ficam no **mesmo domínio**, como o cookie de convidado e o login exigem). A VM não abre portas: o **Cloudflare Tunnel** que já roda nela (`cloudflared`, `/etc/cloudflared/config.yml`) publica `decabecafc.com.br` → `127.0.0.1:8088`, e o HTTPS fica no Cloudflare. As portas 80/443 da VM são de outro projeto.

## 1. Domínio no Cloudflare (dono)

1. Cloudflare → *Add a domain* → `decabecafc.com.br`, plano Free, na conta onde o túnel foi criado.
2. registro.br → domínio → DNS → trocar os servidores para os dois que o Cloudflare mostrar.
3. Quando o Cloudflare marcar o domínio como ativo: `cloudflared tunnel route dns <túnel> decabecafc.com.br` e o mesmo para `www` (feito na VM).

## 2. VM

1. Código em `/opt/de-cabeca` (cópia do `main` por `git archive`; sem credencial do GitHub na VM).
2. `deploy/.env.prod` gerado na VM a partir de `deploy/.env.prod.example` (segredos com `openssl rand`).
3. Subir: `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build`. As migrações rodam na partida da API.
4. Ingress no túnel (`/etc/cloudflared/config.yml`, antes da regra 404): `decabecafc.com.br` e `www.decabecafc.com.br` → `http://localhost:8088`; `sudo systemctl restart cloudflared`.
5. Conferir: `https://decabecafc.com.br/v1/health` responde `200`.
6. Conteúdo do jogo (jogadores, partidas, escalações e todas as fases): no computador local, `deploy/content.sh export` gera `content.sql.gz` sem nenhum dado de jogador; copiar para a VM e rodar `deploy/content.sh import content.sql.gz` com a API já no ar. Só num banco ainda sem conteúdo.

Atualizar: copiar o `main` de novo e o mesmo `up -d --build`; depois `docker builder prune -f` (o disco da VM é pequeno).

## 4. Login com Google

Google Cloud Console → APIs e serviços → Credenciais → ID do cliente OAuth (aplicativo da Web):
- Origem JavaScript autorizada: `https://decabecafc.com.br`
- URI de redirecionamento autorizado: `https://decabecafc.com.br/v1/auth/callback/google` (em desenvolvimento: `http://127.0.0.1:5173/v1/auth/callback/google`)
- Copiar ID e segredo para `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` em `deploy/.env.prod` e reiniciar a API.

## 5. E-mail (Resend)

1. Resend → Domains → adicionar `decabecafc.com.br` e criar no Cloudflare os registros DNS que ele pedir (SPF/DKIM).
2. Criar uma API key só de envio → `RESEND_API_KEY`; `EMAIL_FROM=De Cabeça <nao-responda@decabecafc.com.br>`.
3. Reiniciar a API e testar "Esqueci a senha" na página Conta.

## 5b. Notificações (push)

1. Gerar o par de chaves uma vez: `pnpm --filter @decabeca/api exec web-push generate-vapid-keys`.
2. No `.env` da VM: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:contato@decabecafc.com.br`. Não trocar as chaves depois: inscrições antigas param de funcionar.
3. A API manda às 9h (Brasília) o Desafio do Dia e, às segundas, o fechamento da semana das ligas. Cada lote é registrado em `PushSend` e sai uma vez só.

## 6. Backup

1. Cron na VM: `30 6 * * * /opt/de-cabeca/deploy/backup.sh >> /opt/de-cabeca/backups/backup.log 2>&1`. Guarda 7 dias em `/opt/de-cabeca/backups`.
2. Cópia fora da VM (recomendado): configurar o `rclone` com um remote `r2` (bucket `decabeca-backups` no Cloudflare R2); o script passa a enviar também.
3. **Antes do lançamento, restaurar um backup uma vez** num Postgres descartável.

## 7. Observabilidade

- **Logs**: a API escreve JSON (pino), uma linha por requisição, com rota, status e tempo. Ver: `docker compose -f deploy/docker-compose.prod.yml logs -f api`. O Docker gira os arquivos (10 MB × 5 por serviço).
- **Erros e desempenho (Sentry, plano grátis)**: criar a organização e dois projetos (Node e React) em sentry.io; `SENTRY_DSN` em `deploy/.env.prod` (API) e `VITE_SENTRY_DSN` nas variáveis do Pages (web, lida no build). Sem DSN, nada é enviado. Amostra de 10% das requisições para latência (`SENTRY_TRACES_SAMPLE_RATE`). Nenhum dado pessoal (IP, cookie, corpo) é enviado.
- **Métricas do piloto**: `/admin/metrics` (jogadores, conclusão, compartilhamento, retorno D1/D7, fases difíceis ou fáceis demais, latência P50/P95 e erros por rota desde o último start). A IA lê o mesmo com `scripts/research/metrics.ts`.
- **Disponibilidade**: monitor de uptime do Sentry (ou health check do Cloudflare) em `https://decabecafc.com.br/v1/health`, alerta por e-mail.

## Antes de abrir o piloto

- [ ] `pnpm -r typecheck && pnpm -r lint && pnpm test && pnpm test:e2e` verdes.
- [ ] `scripts/research/validate-pool.ts` sem violações bloqueantes.
- [ ] Trilhas publicadas (Career Path e Grid) conferidas por amostragem.
- [ ] `ADMIN_TOKEN` e `BETTER_AUTH_SECRET` novos, fora do repositório.
- [ ] Aviso de cookies e privacidade: cookie técnico de sessão e, com conta, e-mail (e dados do Google, se usado).
- [ ] Backup restaurado uma vez (seção 6).
