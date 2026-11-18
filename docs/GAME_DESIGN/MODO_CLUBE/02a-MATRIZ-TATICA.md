# Modo Clube — Matriz Tática da Engine

Data: 2026-11-13. Anexo de `02-MATCH-ENGINE.md` §5 e §8, pedido pelo dono. Fontes: pesquisas 13 (`docs/pesquisa/modo-clube/13-formacoes-pressao-e-confrontos.md`) e 14 (`14-sistemas-taticos-pesquisa-do-dono.md`).

## 1. Regra de desenho

DECISÃO: nenhuma formação recebe bônus, multiplicador ou tabela de vantagem contra outra. A vantagem de um sistema nasce de quatro coisas que a engine já mede ou passa a medir:

1. **Onde estão os jogadores** em cada fase (âncoras por fase e tarefas coletivas, `02` §5.2 e §5.11).
2. **O que cada jogador sabe fazer** na função (nota por função, `03` §2.2; atributos nas disputas, `02` §6).
3. **Quanto o time consegue sustentar** (fôlego acumulado e fadiga aguda, §4 abaixo).
4. **O que o adversário oferece**: superioridade numérica por zona e linhas de passe (controle de campo, `02` §4.1), superioridade posicional (recebe sem marcador a tempo) e qualitativa (duelo de atributos).

Critério de aceite (MC-045 e esta matriz): nenhum plano vence mais de 60% contra todos os outros com elencos iguais; cada plano vence algum confronto quando o elenco combina com ele.

## 2. Mecanismos por instrução

| Instrução | O que ganha | O que custa | Atributos que decidem | Estado na engine |
| --- | --- | --- | --- | --- |
| Pressão alta | recuperações perto do gol adversário; adversário decide com pressa | fôlego do bloco inteiro; espaço nas costas da linha alta; buraco se a pressão não sai junta | de quem pressiona: aceleração, antecipação, disposição, trabalho em equipe e familiaridade (sincronia); de quem sai: primeiro toque, técnica, calma, decisões | feito: custo de fôlego (`engine.ts`), sincronia (`rules/duel.ts` `pressSync`), resistência à pressão no passe e no bloqueio (`pressResistance`) |
| Bloco baixo | área protegida; chutes de longe e cruzamentos do adversário | território e posse; contra-ataque depende de saída rápida | velocidade e passe vertical de quem sai; posicionamento de quem defende | feito: contra-ataque acelera nos 6 s após recuperar (`carrier.ts` `inCounter`) |
| Linha alta | campo pequeno para o adversário | bola nas costas | velocidade dos zagueiros; antecipação e passe longo do adversário | feito: opção "bola nas costas" para atacantes onside contra linha alta (`over`); corrida de recuperação dos defensores |
| Ritmo | menos tempo para o adversário se organizar | mais perda de bola | primeiro toque, decisões | feito: tempo de domínio (`settleTime`) |
| Defesa de descanso | proteção contra contra-ataque | menos gente no ataque | posicionamento | feito (`02` §5.9, MC-246) |

## 3. Formações

Cada formação é forma com e sem bola (`presets.ts`) e uma função por posição. O que a matriz espera ver em campo (teste de coerência, nível 1 da bateria):

| Formação | Comportamento esperado | Verificação |
| --- | --- | --- |
| 4-3-3 | três na primeira linha de pressão; três no meio | contagem de jogadores por faixa sem a bola |
| 4-4-2 | duas linhas de quatro compactas | distância entre linhas (T2) e número de jogadores por linha |
| 4-2-3-1 | dois protegendo a defesa; um entre linhas com a bola | posição média do 10 e dos volantes |
| 4-1-4-1 | um volante entre duas linhas de quatro | volante à frente da área com a bola no terço defensivo (T5) |
| 3-5-2 | cinco atrás sem a bola, alas largos com ela | número na última linha por fase; largura dos alas |
| 4-4-2 losango | quatro no centro, laterais dão a largura | largura média dos laterais contra a dos meias |

Formações hoje no código: 4-3-3, 4-4-2, 4-2-3-1, 4-1-4-1, 3-5-2, 4-4-2 losango. Pendentes: 3-4-3, 4-2-2-2, 5-4-1.

## 4. Cansaço

- **Acumulado** (fôlego, `rules/stamina.ts`): cai com o quadrado da velocidade relativa; o tanque vem de `resistência`; pressão alta e bloco alto aumentam a carga do time sem a bola.
- **Agudo** (pesquisa 14 §2): depois de uma sequência de corrida intensa, aceleração e velocidade máxima caem por cerca de um minuto e se recuperam em uns três. PARÂMETRO: carga aguda sobe com corrida acima de 75% da velocidade máxima, decai com meia-vida de 60 s ajustada por `resistência`, e reduz aceleração e velocidade em até 15%.
- O jogador explosivo e pouco resistente sofre mais com sprints repetidos; o resistente e lento sofre pouco com corrida contínua.

## 5. Placar e emoção

Mesma regra para os dois times (o time da pessoa segue só os comandos dela): quem perde sobe risco e ritmo a partir dos 65 minutos, pressão aos 75, bloco e defesa de descanso aos 80; quem ganha recua o bloco aos 80. Forma do dia por jogador pela `consistência` oculta. Alvos (pesquisa 13 §5): de 20% a 25% dos gols nos 15 minutos finais; quem sofre primeiro vira em cerca de 12% e empata em cerca de 19%; zebras na ordem dos dados de odds.

## 6. Bateria de testes

1. Coerência tática por formação (tabela do §3).
2. Perfis de elenco na mesma formação: alas rápidos contra lentos no 3-5-2; volante posicional contra não posicional no 4-3-3; time técnico contra time de pressão.
3. Todos os confrontos de formação e estilo (`src/calibration/zebra.ts`), olhando vitórias, `xG`, recuperações altas, contra-ataques e fôlego.
4. Adaptações: o treinador que reage ao placar muda gols no fim e viradas na direção dos alvos do §5.

## 7. Inteligência coletiva e individual (pesquisa 15)

A pesquisa 15 pede três níveis (jogador, unidade, equipe), jogadas com pré-condições e contramedidas, e atributos que separem perceber, decidir e executar. Ordem de implementação, na prioridade que a própria pesquisa recomenda:

| Fase | Conteúdo | Estado |
| --- | --- | --- |
| 1. Fundação | quatro fases, formação e funções, passe, recepção, drible, desarme, finalização, compactação e cobertura | feito no nível 1 (MC-031 a MC-246); fases explícitas `02` §5.1 ainda implícitas na posse e na transição |
| 2. Inteligência coletiva | terceiro homem, overlap e underlap, inversão, pressão coordenada, contrapressão, contra-ataque, defesa de descanso, complementaridade | pressão coordenada, contra-ataque e defesa de descanso feitos; terceiro homem, overlap e underlap, inversão e contrapressão pendentes |
| 3. Profundidade individual | scanning, orientação do corpo, primeiro toque direcionado, decisão contextual | parcial: campo visual do portador e visão nas opções vistas (MC-159 aberta) |
| 4. Treinamento | treino técnico, perceptivo, por unidade e coletivo; familiaridade de dupla e de sistema | corte 1 em diante (`03` §5) |
| 5. Complexidade competitiva | bola parada como sistema, adaptação, relações entre jogadores | MC-068 a MC-071 |

**Atributos.** O contrato tem hoje 34 atributos (`contract.ts`). A pesquisa propõe famílias maiores (passe curto e longo separados, pé ruim, resistência aeróbica e anaeróbica, recuperação, desaceleração, scanning, percepção espacial, orientação do corpo, timing, disciplina tática, relações coletivas). DECISÃO PENDENTE do dono: ampliar o contrato agora (mexe em pacote, gerador, notas por função e engine; pede ADR) ou derivar o que falta dos 34 atuais (por exemplo, scanning de antecipação e visão; desaceleração de agilidade e equilíbrio) até o corte 1. Recomendação: derivar agora, ampliar com ADR no corte 1, junto com o treino que desenvolve esses atributos.
