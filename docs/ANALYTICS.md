# Analytics

> **Revisão 2026-11-05 (ADR-007):** props `kind`/`challengePublicNumber` viraram `level`; `game_completed` inclui `stars`. DAU/retenção seguem iguais; "daily_challenge_completed" não existe mais.

Sem ferramenta externa no MVP: eventos vão para `POST /v1/events` → tabela `Event (id, sessionHash, name, ts, props jsonb)`. Consultas SQL. Migrar para PostHog (há MCP disponível na máquina, mas conta/uso exigem aprovação) quando houver tráfego real.

## 1. Eventos

| Evento | Quando | Props |
|---|---|---|
| `game_viewed` | Tela do jogo aberta | mode, kind, challengePublicNumber |
| `game_started` | `POST /attempts` 201 | mode, kind, challengePublicNumber, difficultyTier |
| `answer_submitted` | Ação guess | mode, kind, attemptsUsed, correct, cellIndex? |
| `hint_revealed` | Career Path: clube/pista extra revelado | mode, revealedCount, hintType |
| `game_completed` | Status final | mode, kind, status, score, attemptsUsed, durationSec (cliente) |
| `game_abandoned` | `visibilitychange`/unload com partida em andamento (best effort via `sendBeacon`) | mode, kind, attemptsUsed |
| `result_shared` | Copiar/compartilhar | mode, kind, method (clipboard\|webshare) |
| `practice_started` | = game_started com kind=practice (não duplicar; derivar) | — |
| `daily_challenge_completed` | = game_completed com kind=daily (derivar) | — |
| `search_no_result` | Autocomplete sem resultados para q ≥ 3 chars | qLength, mode (texto **não** enviado; só comprimento; editorial vê o texto via log de busca server-side com retenção 30 dias) |
| `link_opened` | Chegada por link compartilhado (cliente, uma vez por carregamento) | kind (`level` \| `league` \| `profile` \| `daily`), ref (`share`, `invite`, `profile` ou `link`); o `?ref=` sai da barra de endereço depois |
| `league_created` | Liga criada (servidor) | — |
| `league_joined` | Entrada em liga (servidor) | members |

Implementação (2026-11-05): `game_started`, `answer_submitted`, `hint_revealed`, `game_completed` (com `durationSec` calculado no servidor) e `action_rejected` são gravados pela API no momento da ação. O cliente envia só `game_viewed`, `result_shared`, `game_abandoned` (`sendBeacon`) e `search_no_result`. Consultas em `docs/analytics-queries.sql`.

Onda 2 (2026-11-09, GROWTH_PLAN.md §5): o painel `/admin` mostra a métrica norte (de quem terminou uma fase, quantos compartilharam ou criaram liga; dos que chegaram por link, quantos terminaram uma fase), o Desafio do Dia por dia (fases iniciadas no próprio dia do sorteio, via `DailyPick`, sem evento novo), ligas criadas e entradas, e D1/D7 por semana de entrada. Links compartilhados levam `?ref=` (resultado `share`, convite de liga `invite`, perfil `profile`).

Sem IP, sem user agent completo (só `isMobile` boolean), sem texto de busca em eventos.

## 2. Métricas

### Produto
- DAU (sessões com ≥ 1 `game_started`/dia).
- D1, D7 retention (sessões que voltam, por cookie).
- Partidas por sessão/dia.
- Completion rate = completed / started, por jogo e kind.
- Abandonment rate = 1 − completion (daily).
- Share rate = shared / completed.
- Distribuição de tentativas (CP) e de score (Grid).
- Streak médio.

### Técnicas
- P50/P95 de `POST actions`, `GET search`.
- Taxa de 5xx; taxa de 429.
- `action_rejected` por código.

### Editoriais
- Invalid answer rate = guesses errados / guesses (por desafio; alto demais = desafio difícil ou dado faltando).
- `search_no_result` por dia (alias faltante).
- Challenge rejection rate = drafts rejeitados na validação / drafts criados.
- Jogadores `verified` / total; spells sem data.

## 3. Metas

Nenhuma até baseline. Após 2 semanas de piloto, fixar metas como "+X% sobre baseline".

## 4. Validação com grupo pequeno

- 20–50 pessoas, convite direto, 14 dias.
- Formulário curto ao final (3 perguntas: clareza das regras, resposta injustamente rejeitada?, jogaria amanhã?).
- Revisão semanal dos relatórios editoriais.
- Decisão de expandir só com: completion daily > abandono, zero incidentes de resposta válida rejeitada não corrigidos, e pelo menos 30 dias de desafios publicados à frente.
