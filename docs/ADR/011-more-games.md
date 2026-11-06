# ADR-011 — Mais jogos: Impostor primeiro

Status: aceito (2026-11-06). Retira "mais de dois jogos" da lista de fora do MVP (handoff §15).

## Contexto
O autor quer mais modos de jogo. A matriz de `COMPETITIVE_ANALYSIS.md` §3 indica a ordem: Football Impostor (quase grátis com os dados que temos), Mystery Player, Connections. "Mais ou Menos" (jogos/gols) ficou viável depois que as passagens ganharam jogos e gols do infobox.

## Decisão
- **Impostor** (`IMPOSTOR`, engine `impostor@1`): cada fase tem 5 rodadas; uma rodada mostra um clube e 4 jogadores, 3 com passagem **verificada** no clube e 1 que **nunca** jogou lá (nenhuma passagem não rejeitada, de qualquer fonte). Uma escolha por rodada. Estrelas: 5 acertos = 3, 4 = 2, 3 = 1. Contra o relógio: 60 s.
- O impostor é plausível: jogou no mesmo país, em anos que cruzam os dos 3, com fama parecida (`notabilityTier`). As primeiras fases usam os jogadores mais conhecidos.
- Snapshot imutável como os outros jogos; a validação remonta a fase com os dados atuais (um "jogou aqui" rejeitado ou uma passagem nova do impostor derruba a fase).
- Trilha, estrelas, ranking, relatos de erro, modo contra o relógio e métricas são os mesmos dos outros jogos.
- **Linha do tempo** (`TIMELINE`, engine `timeline@1`, 2026-11-06): 5 rodadas; cada uma mostra um jogador e 4 clubes dele embaralhados (passagens profissionais verificadas, anos de início distintos: o primeiro, o último e os dois mais longos do meio). Tocar na ordem da carreira; uma resposta por rodada; estrelas como o Impostor; contra o relógio 90 s. Fases geradas por `scripts/research/publish-timeline.ts`.
- Próximos, nesta ordem: Mais ou Menos, Mystery Player, Connections.

## Consequências
Cada jogo novo toca: engine (pura, testada), contratos (view/reveal/stats), `GameModeCode`, apresentação na API, tela, card da home, stats e histórico. Fases geradas por `scripts/research/publish-impostor.ts`.
