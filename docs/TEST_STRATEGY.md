# Test Strategy

Baseada em risco. Sem meta de cobertura percentual.

## 1. Unit (Vitest, `packages/engine`, sem banco)

| Área | Casos obrigatórios |
|---|---|
| `normalizeName` | Lista de `DATA_QUALITY.md` §3 |
| Career ordering (`buildTrajectory`) | Empréstimo marcado; retorno ao clube = 2 entradas; `youth` excluído; data só ano; empate por `sortIndex`; spells sobrepostos |
| CareerPathEngine | Tabela: cada tentativa 1–6 certa/errada/skip → estado, evento, revealedClubs; trajetória de 3 clubes com 6 tentativas (pistas extras); `DUPLICATE_GUESS`; submit após fim lança; score 60..10/0; share text |
| FootballGridEngine | Célula certa/errada; `PLAYER_ALREADY_USED`; `CELL_ALREADY_FILLED`; `finish` antecipado; completar 9; score; share grid |
| `toPublicView` | Serializa e falha se contiver `answerPlayerId`/`eligiblePlayerIds` (ambos os jogos, todos os estados) |
| Elegibilidade (função pura sobre DTOs) | ≥3 ≤12 clubes; spell não verificado bloqueia; tier T4 só practice; grid: mínimo por célula, combinações proibidas |
| Snapshot hash | Mesmo snapshot → mesmo hash; ordem de chaves irrelevante |

## 2. Integration (Vitest, `apps/api`, Postgres docker)

- Criar guest session no primeiro request; cookie HttpOnly; reutilizada depois.
- `POST /attempts` daily duas vezes → mesma partida (200).
- Submit com mesma `idempotencyKey` → mesma resposta, 1 `AttemptAction`.
- Sessão B não lê/altera partida de A (404).
- Daily respeita fuso: às 23:59 e 00:01 America/Sao_Paulo retorna desafios diferentes (relógio injetável no serviço).
- Trigger de imutabilidade: `UPDATE snapshot` em published → erro.
- Publish atribui `publicNumber` sequencial; unique de data.
- Practice exclui 20 últimos; pool esgotado → 404.
- Search: aliases, acentos, prefixo por token, só `verified`, limite 10.
- Stats/streak: cenário 3 dias seguidos + falha → streak 0; practice não conta.
- Rate limit retorna 429.
- Admin sem token → 401; token errado → 401.

## 3. E2E (Playwright, `apps/web`, API real + Postgres seed)

Fluxo único principal (seed determinístico com 1 daily de cada jogo):
1. Abre home sem cadastro, vê dois cards.
2. Inicia Career Path; erra (busca + seleciona jogador errado); vê clube 2.
3. Pula; vê clube 3.
4. Acerta; vê resultado e trajetória.
5. Copia resultado; clipboard contém `3/6` e não contém o nome do jogador.
6. Volta à home; card mostra concluído.
7. Inicia Grid; preenche 2 células (1 certa, 1 errada); encerra; vê exemplos.
8. Histórico lista 2 partidas; Stats mostra streak 1.

Edge e2e: reload no meio da partida restaura estado; rede offline mostra banner.

## 4. Regressão de dados (script, não CI)

`scripts/research/validate-pool.ts`: roda DQ-01..09 em todo o banco e imprime violações. Executar antes de publicar semana de desafios.

## 5. Ferramentas e execução

```bash
pnpm test            # unit + integration (precisa docker compose up -d)
pnpm test:unit
pnpm test:e2e        # sobe api+web com seed
```

CI: unit em todo push; integration + e2e em PR.
