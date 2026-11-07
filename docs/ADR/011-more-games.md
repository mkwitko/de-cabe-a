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
- **Escalação** (`MISSING_XI`, engine `missing-xi@1`, 2026-11-06): os 11 titulares de um lado de uma final real (Copa do Mundo, Copa dos Campeões/Champions, Libertadores em jogo único, Copa América), num campo vertical, com nomes escondidos. A pessoa busca jogadores; 5 erros encerram a fase. Escondidos: os 5 mais conhecidos (nível 1), 7 (nível 2) ou todos os ligados à nossa base (nível 3); só jogadores ligados podem ser escondidos, e o lado precisa de ao menos 6 ligados. Pontuação = parte encontrada (0–100); estrelas: 100 = 3, ≥ 70 = 2, ≥ 40 = 1. Contra o relógio: 120 s. Escalações da Wikipédia em inglês (CC BY-SA, crédito com link na tela), importadas por `scripts/research/import-lineups.ts`; fases por `scripts/research/publish-missing-xi.ts`. Treina Visão no Modo Carreira.
- **Craque Misterioso** (`MYSTERY_PLAYER`, engine `mystery-player@1`, 2026-11-07): um jogador escondido; a cada palpite a tela compara o chute com ele (nacionalidade, posição, ano de nascimento com "perto" até 2 anos, clubes e países em comum, só passagens verificadas). Os dados do chute vêm da base (a API completa a ação), nunca do navegador. 8 palpites; pontuação 9 − palpites; estrelas: até 3 palpites = 3, 4–5 = 2, 6–8 = 1. Contra o relógio: 120 s. Fases por `scripts/research/publish-mystery.ts`. Treina Finalização.
- **Conexões** (`CONNECTIONS`, engine `connections@1`, 2026-11-07): 16 jogadores em 4 grupos de 4 (mesmo clube, mesma seleção, titulares da mesma final). A montagem garante solução única: cada jogador cabe no seu grupo e em nenhum outro, conferido com a base. 4 erros encerram; "quase" quando 3 de 4 estão certos; estrelas: 4 grupos com até 1 erro = 3, 4 grupos = 2, 2–3 grupos = 1. Fases por `scripts/research/publish-connections.ts`. Treina Passe.

## Consequências
Cada jogo novo toca: engine (pura, testada), contratos (view/reveal/stats), `GameModeCode`, apresentação na API, tela, card da home, stats e histórico. Fases geradas por `scripts/research/publish-impostor.ts`.
