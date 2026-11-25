# ADR-025 — Modo Clube: faixas de bola longa e de bola rolando

Status: aceito pelo dono (2026-11-24). Motivo: na partida assistida (nível 1), 23% dos passes eram bolas longas, e o tempo de bola rolando não era medido. Nenhuma das duas medidas tinha faixa de aceite. Medida exata depois desta decisão: 50 minutos de bola rolando por jogo, um pouco abaixo da faixa. Uma estimativa anterior, feita a partir dos eventos, dava 74 minutos e estava errada.

## Decisão

1. **Bola longa: 9% a 13% dos passes** (`longPassShare` em `calibration/calibrate.ts`). Bola longa é passe de 32 m ou mais, sem contar cruzamento (a linha da Opta, 35 jardas). Único número real disponível: na Série A 2025, o 4º time mais direto dá 13,8% dos passes longos (Flashscore). A média da liga fica abaixo disso. A faixa é estimativa até aparecer a média publicada; quando aparecer, substitui esta com novo ADR.
2. **Bola rolando: 53 a 59 minutos por jogo** (`ballInPlayMin`). CBF: 53min54s por jogo em 2025 (até a 22ª rodada) e 58min43s em 2026, depois das regras contra cera. A faixa cobre as duas temporadas.
3. **A medida de bola rolando é exata no nível 1**: o evento `periodEnd` leva os segundos de bola em jogo do período (`inPlayS`). O nível 2 ainda não informa essa medida.

## Consequências

- O tempo de bola parada por reinício (`DEAD_SECONDS` em `rules/restart.ts`) passa a ser ajustado pela faixa de bola rolando. Esse tempo também vale para o nível 2.
- As duas faixas entram no ajuste da partida assistida junto com as outras faixas da liga.

## Situação em 2026-11-24 (corrida para a área)

- Ajustar só constantes não baixou a bola longa: com a bola no terço final havia 0,56 companheiro na área, contra 3,3 defensores. O ataque dependia da bola longa.
- Mudança: no terço final o ponta do lado oposto ataca a segunda trave e um segundo homem ataca a primeira, os dois sem passar da linha do impedimento (`tasksFor` em `team.ts`). O custo da bola longa (`LOFT_COST`) sobe para 0,025.
- Medida em 400 jogos com sementes fora do ajuste (20000+): bola longa 11,0% e bola rolando 58,6 min, as duas na faixa. Gols, chutes, chutes no alvo, gols por chute, faltas, distância e roubadas altas que viram chute também ficam na faixa.
- Ficam perto da faixa, aceitos pelo dono ("próximo já está legal"):

  | Medida | Valor | Faixa |
  |---|---|---|
  | Passes | 503 | 415–428 |
  | Acerto | 86% | 78–82% |
  | Amarelos | 2,10 | 2,15–2,59 |
  | Vermelhos | 0,08 | 0,10–0,15 |
  | Escanteios | 4,94 | 5,05–5,51 |
  | Impedimentos | 0,66 | 1,32–1,75 |
  | Roubadas altas | 9,8 | 5,75–8,35 |

- O próximo ajuste é o ritmo de passe: 8,6 passes por minuto de bola rolando, contra cerca de 7,5 no real.
