# Modelo de ameaças

Data: 2026-11-07. Método: ativos, atores, fronteiras, ameaças por fronteira, mitigação e teste. Atualizar quando entrar ligas (onda 2) e Oficina (onda 3).

## Ativos

1. Integridade dos resultados (estrelas, ranking, títulos): a confiança do jogador depende disso.
2. Base de dados de futebol (7.991 jogadores, escalações, carreiras): meses de curadoria.
3. Contas (e-mail, vínculo Google) e sessões.
4. Disponibilidade do site em dias de pico (Copa, clássicos).
5. Reputação: nunca expor ou ridicularizar pessoas reais; créditos de foto.

## Atores

| Ator | Motivação | Capacidade |
|---|---|---|
| Jogador trapaceiro | Subir no ranking, ganhar liga de amigos | Edita requisições, abre várias sessões, scripts |
| Script de abuso | Raspar base, derrubar API | Milhares de requisições |
| Usuário tóxico (onda 2+) | Apelidos ofensivos, denúncias coordenadas, votos combinados | Várias contas |
| Criador malicioso (onda 3) | Publicar desafio errado/ofensivo, forçar destaque | Conta de criador |
| Admin comprometido | Token vazado | Tudo do painel |
| Fornecedor | Vazamento em Sentry, Resend, AdSense | Dados que enviamos |

## Fronteiras de confiança

- **F1** Navegador ↔ API (`/v1/*` pelo Pages → Caddy → Fastify).
- **F2** API ↔ Postgres.
- **F3** API ↔ serviços externos (Google OAuth, Resend, Sentry, Wikimedia).
- **F4** Painel admin (token) ↔ API.
- **F5** Scripts de importação (Wikidata, Wikipedia, API-Football) ↔ banco.

## Ameaças e mitigações

| # | Fronteira | Ameaça | Mitigação | Estado | Teste |
|---|---|---|---|---|---|
| T1 | F1 | Cliente envia estrelas, score ou tempo | Servidor calcula tudo; `strictObject` rejeita campos extras | ✔ | `attempts.int.test.ts`; adicionar caso explícito com `stars` no corpo |
| T2 | F1 | Ler o gabarito antes de revelar | `view` sem resposta; `reveal` só em estado final | ✔ | testes por modo |
| T3 | F1 | Agir em tentativa de outra sessão (IDOR) | Busca por `attemptId` + `sessionId` | ✔ | int test 404 |
| T4 | F1 | Ação repetida por rede ruim | Estado da tentativa recusa; UI desabilita botão | ◐ | adicionar teste de dupla ação |
| T5 | F1 | Várias sessões de convidado para "tentar de novo" o Desafio do Dia | Daily conta por conta ou por sessão; ranking do daily só com conta (onda 1) | ✖ | planejar |
| T6 | F1 | Força bruta de login | 10/min por IP; Better Auth | ✔ | verificar teste |
| T7 | F1 | CSRF em POST com cookie | `SameSite=Lax`, JSON, mesma origem | ◐ | teste: POST com `Origin` estranho sem cookie |
| T8 | F1 | Clickjacking, sniffing | Cabeçalhos no Caddy e Pages | ✖ | curl no gate de release |
| T9 | F1 | Raspagem da base pela busca | `limits.search`/min, máximo 10 resultados, sem endpoint de listagem | ✔ | — |
| T10 | F1 | DoS em dia de jogo | Rate limit, Cloudflare na frente do Pages, API só via Pages | ◐ | teste de carga antes da Copa |
| T11 | F4 | Token admin vazado | Mínimo 16 caracteres, comparação constante, só por rede do dono | ◐ | rotação documentada em DEPLOY.md; ✖ IP allowlist no Caddy |
| T12 | F2 | SQL injection | Prisma parametrizado; SQL cru só em migrations e scripts | ✔ | lint |
| T13 | F3 | Vazar cookie/token no Sentry | `instrument.ts` não envia cabeçalhos; revisar `beforeSend` | ◐ | teste unitário do scrubber |
| T14 | F5 | Dado errado ou ofensivo importado | Status `verified` por fato; curadoria; relatório de fase com erro | ✔ | DATA_QUALITY.md |
| T15 | F1 | Apelido ofensivo (onda 2) | Filtro + gerador + denúncia | ✖ | lista de termos nos testes |
| T16 | F1 | Votos combinados / contas falsas (onda 3) | Um voto por versão (UNIQUE no banco), só após tentativa, limiar de 30, Wilson inferior, análise antes de punir | ✖ | teste de concorrência (2 votos simultâneos → 1) |
| T17 | F1 | Criador tenta gabarito inválido (onda 3) | Config declarativa; `buildSnapshot` valida; sem código | ✖ | caso: jogador fora do grupo → rejeitado |
| T18 | F4 | Moderador sobe o próprio papel (onda 3) | Papel só mudado por admin; auditoria | ✖ | teste |
| T19 | F1 | Link de liga vazado (onda 2) | Código rotacionável, limite de membros, dono pode remover | ✖ | teste |
| T20 | Reputação | Conteúdo que ridiculariza pessoa real | Regra de produto; sem modo desse tipo; moderação | ✔ | revisão editorial |

## Fora de escopo

Multiplayer síncrono, dinheiro, apostas, chat: não existem e não entram sem novo modelo.
