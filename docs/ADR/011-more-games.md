# ADR-011 — Mais jogos: Impostor primeiro

Status: aceito (2026-11-06). Retira "mais de dois jogos" da lista de fora do MVP (handoff §15).

## Contexto
O autor quer mais modos de jogo. A matriz de `COMPETITIVE_ANALYSIS.md` §3 indica a ordem: Football Impostor (quase grátis com os dados que temos), Mystery Player, Connections. "Mais ou Menos" (jogos/gols) ficou viável depois que as passagens ganharam jogos e gols do infobox.

## Decisão
- **Impostor** (`IMPOSTOR`, engine `impostor@1`): cada fase tem 5 rodadas; uma rodada mostra um clube e 4 jogadores, 3 com passagem **verificada** no clube e 1 que **nunca** jogou lá (nenhuma passagem não rejeitada, de qualquer fonte). Uma escolha por rodada. Estrelas: 5 acertos = 3, 4 = 2, 3 = 1. Contra o relógio: 60 s.
- O impostor é plausível: jogou no mesmo país, em anos que cruzam os dos 3, com fama parecida (`notabilityTier`). As primeiras fases usam os jogadores mais conhecidos.
- Snapshot imutável como os outros jogos; a validação remonta a fase com os dados atuais (um "jogou aqui" rejeitado ou uma passagem nova do impostor derruba a fase).
- Trilha, estrelas, ranking, relatos de erro, modo contra o relógio e métricas são os mesmos dos outros jogos.
- Próximos, nesta ordem: Mystery Player, Mais ou Menos, Connections. Cada um entra com seu ADR curto quando for feito.

## Consequências
Cada jogo novo toca: engine (pura, testada), contratos (view/reveal/stats), `GameModeCode`, apresentação na API, tela, card da home, stats e histórico. Fases geradas por `scripts/research/publish-impostor.ts`.
