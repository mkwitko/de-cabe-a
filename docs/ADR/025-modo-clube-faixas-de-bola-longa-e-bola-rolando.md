# ADR-025 — Modo Clube: faixas de bola longa e de bola rolando

Status: aceito pelo dono (2026-11-24). Motivo: na partida assistida (nível 1), 23% dos passes eram bolas longas, e o tempo de bola rolando não era medido. Nenhuma das duas medidas tinha faixa de aceite. Medida exata depois desta decisão: 50 minutos de bola rolando por jogo, um pouco abaixo da faixa. Uma estimativa anterior, feita a partir dos eventos, dava 74 minutos e estava errada.

## Decisão

1. **Bola longa: 9% a 13% dos passes** (`longPassShare` em `calibration/calibrate.ts`). Bola longa é passe de 32 m ou mais, sem contar cruzamento (a linha da Opta, 35 jardas). Único número real disponível: na Série A 2025, o 4º time mais direto dá 13,8% dos passes longos (Flashscore). A média da liga fica abaixo disso. A faixa é estimativa até aparecer a média publicada; quando aparecer, substitui esta com novo ADR.
2. **Bola rolando: 53 a 59 minutos por jogo** (`ballInPlayMin`). CBF: 53min54s por jogo em 2025 (até a 22ª rodada) e 58min43s em 2026, depois das regras contra cera. A faixa cobre as duas temporadas.
3. **A medida de bola rolando é exata no nível 1**: o evento `periodEnd` leva os segundos de bola em jogo do período (`inPlayS`). O nível 2 ainda não informa essa medida.

## Consequências

- O tempo de bola parada por reinício (`DEAD_SECONDS` em `rules/restart.ts`) passa a ser ajustado pela faixa de bola rolando. Esse tempo também vale para o nível 2.
- As duas faixas entram no ajuste da partida assistida junto com as outras faixas da liga.
