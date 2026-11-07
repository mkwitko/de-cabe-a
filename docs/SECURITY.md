# Segurança

Políticas e controles do De Cabeça, com o estado real do código em 2026-11-07. Referência: OWASP ASVS 5.0 nível 1 como base, com itens do nível 2 em autenticação, administração e auditoria. Não é certificação. Ameaças e mitigações estão em `THREAT_MODEL.md`; o que bloqueia um release está em `QUALITY_GATES.md`.

Legenda: ✔ existe e tem teste · ◐ existe sem teste · ✖ falta.

## 1. Identidade e sessão

| Controle | Estado | Onde |
|---|---|---|
| Sessão de convidado: token de 256 bits em cookie `HttpOnly; SameSite=Lax; Secure` (produção), só o sha256 no banco | ✔ | `modules/session/session.ts`, ADR-004 |
| Limite de sessões novas por IP | ✔ | `sessionsPerIp` |
| Conta: Better Auth (e-mail + senha, Google), e-mail por Resend | ◐ | `modules/account/auth.ts`, ADR-008 |
| Login limitado a 10/min por IP | ✔ | `account.routes.ts` |
| Logout invalida a sessão no servidor | ◐ | verificar teste |
| Exclusão de conta pelo usuário | ✖ | onda 1 (LGPD) |
| CSRF: toda rota que muda estado é `POST` JSON em mesma origem; `SameSite=Lax` bloqueia envio do cookie em POST de outro site | ◐ | sem teste automatizado; adicionar |

## 2. Autorização

| Controle | Estado |
|---|---|
| Tentativa (`Attempt`) pertence à sessão; ação em tentativa de outra sessão retorna 404 | ✔ (`attempts.int.test.ts`) |
| Admin: cabeçalho `X-Admin-Token` comparado em tempo constante, mínimo 16 caracteres | ✔ `modules/admin/auth.ts` |
| Papéis (moderador, curador) | ✖ só existe admin único; necessário antes da Oficina (onda 3) |
| Nenhum campo `role`, `ownerId`, `score`, `stars` aceito do cliente | ✔ corpos de jogo, apelido e eventos são `z.strictObject` (campo extra → 400). Achado em 2026-11-07: `StartAttemptRequest` e `SubmitActionRequest` eram `z.object` e ignoravam extras em silêncio; corrigido com teste `attempts.int.test.ts` "rejects client-supplied results" |

## 3. Integridade dos jogos

- Gabarito nunca vai ao navegador antes da revelação: `view` e `reveal` são separados nos contracts; `reveal` só sai com status final (ADR-005, testes de integração por modo).
- Pontuação, estrelas e tempo são calculados no servidor pelas engines puras em `packages/engine`; o cliente envia só `input`.
- Craque Misterioso: os fatos do palpite são injetados pelo servidor; o que o cliente mandar é ignorado.
- Tempo (modo contra o relógio): limite por modo no servidor (`TIME_LIMIT_SEC`); ação fora do prazo é recusada.
- Snapshots de fase são imutáveis (ADR-002); correção cria nova versão.
- Ranking usa só tentativas concluídas no servidor.
- ✖ Idempotência de ação repetida (mesma ação enviada duas vezes por rede ruim): hoje a segunda recebe erro de estado; documentar como esperado e testar.
- ✖ Desafio do Dia (onda 1): mesma fase para todos, sorteada no servidor por data; percentual só com 30 jogadas.

## 4. Limites de abuso

| Rota | Limite |
|---|---|
| Ações de jogo | `limits.actions`/min por sessão |
| Busca de jogadores | `limits.search`/min |
| Login | 10/min por IP |
| Sessões novas | por IP |
| Ligas, convites, votos, denúncias, criação de desafios | ✖ definir ao criar cada rota (onda 2 e 3) |

## 5. Entrada e saída

- Toda entrada validada por Zod (`z.strictObject` nos contracts; campos extras rejeitam).
- Nenhum HTML vindo de usuário é renderizado; React escapa texto. Apelidos e nomes de liga são texto simples com limite de tamanho.
- Fotos só de Wikimedia Commons, URL montada pelo servidor; nunca URL de usuário.
- Erros ao cliente sem stack; Sentry recebe stack sem cookie nem token (`instrument.ts`).
- ✖ Cabeçalhos de segurança (HSTS, `X-Content-Type-Options`, `X-Frame-Options`/CSP `frame-ancestors`, `Referrer-Policy`): adicionar no Caddy e nas respostas do Pages.

## 6. Dados e privacidade

- Convidado: sem dado pessoal (ADR-004). Conta: e-mail; Google: id e e-mail.
- `/privacidade` explica cookie, conta, Sentry, AdSense e Resend (ADR-012).
- Anúncios personalizados só com consentimento.
- ✖ Exclusão de conta e retenção: regra proposta: excluir conta apaga e-mail e vínculo; tentativas ficam anônimas (ranking histórico não quebra). Sessões de convidado sem uso há 12 meses são apagadas.
- Perfil público (onda 2): privado por padrão; nada além de apelido, título, estatísticas e conquistas.
- Menores: sem coleta de idade; sem chat, sem mensagem entre usuários, sem foto pessoal.

## 7. Operação

- Backup diário com `deploy/backup.sh` para R2, 14 dias (DEPLOY.md §6). ✖ Restauração testada: fazer uma vez antes do lançamento e registrar a data aqui.
- Segredos em `.env` fora do git; CI usa secrets do GitHub.
- ✖ `pnpm audit` e secret scanning no CI (QUALITY_GATES.md).
- Logs do Fastify sem corpo de requisição; sem token em log.

## 8. Oficina (requisito de entrada da onda 3)

- Desafio da comunidade é **configuração declarativa** sobre um template (`templateId` + `schemaVersion` + `config` com schema estrito por template). Nenhum código, HTML ou URL de usuário.
- O servidor valida que jogadores, clubes e partidas existem e que o gabarito é único, com o mesmo `buildSnapshot` das fases oficiais. O criador não é dono do gabarito.
- Versão publicada é imutável; correção gera nova versão.
- Voto: um por usuário por versão, só após tentativa concluída, criador não vota no próprio, troca substitui; único por restrição `UNIQUE (userId, challengeVersionId)` no banco, não só na aplicação.
- Denúncia separada de voto; suspensão preventiva só por denúncia de segurança; nada de banimento automático.
- Ações de moderador em tabela de auditoria (quem, o quê, quando, justificativa); moderador não muda o próprio papel.

## 9. Relato de vulnerabilidade

E-mail em `/privacidade`. Resposta em até 7 dias. Sem programa de recompensa.
