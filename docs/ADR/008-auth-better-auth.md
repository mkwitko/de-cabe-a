# ADR-008 — Autenticação com Better Auth, login social e e-mail (Resend)

Status: aceito (2026-11-06). Substitui ADR-007 no ponto "cadastro por e-mail + senha com scrypt próprio, sem recuperação de senha" e retira "OAuth" da lista de fora do MVP.

## Contexto
O cadastro atual (e-mail + senha, scrypt nativo) não recupera senha nem oferece login social. O autor quer e-mail + senha e também Google (e outros depois). Auth0 foi considerado.

## Decisão
- **Better Auth** (biblioteca aberta, grátis) no `apps/api`, com o adaptador Prisma: usuários, contas e sessões ficam no nosso Postgres.
- Métodos: **e-mail + senha** (com verificação de e-mail e recuperação de senha) e **Google**. Apple e outros entram só com a configuração do provedor.
- **E-mail transacional pelo Resend** (plano grátis), num domínio próprio (a comprar).
- O jogo continua guest-first (ADR-004): o cookie de convidado segue valendo; ao entrar, a sessão de convidado é vinculada à conta, como hoje.
- As contas existentes são migradas: o hash scrypt atual continua aceito (verificação customizada de senha no Better Auth) e é regravado no formato do Better Auth no próximo login.

## Alternativas
- **Auth0**: plano grátis cobre o piloto, mas o custo cresce com usuários ativos, os dados ficam fora do nosso banco e a migração depois é cara. Rejeitado.
- **Manter o código próprio e somar OAuth à mão**: mais código de segurança para manter. Rejeitado.

## Consequências
Dependências novas: `better-auth` (autenticação) e `resend` (envio de e-mail). Variáveis novas: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`. Sem domínio comprado, o envio de e-mail fica desligado em desenvolvimento (o link sai no log).
