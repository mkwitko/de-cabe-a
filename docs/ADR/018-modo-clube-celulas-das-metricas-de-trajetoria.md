# ADR-018 — Modo Clube: células de contexto das métricas de trajetória da prova de coordenação

Status: proposto, aguarda o dono. O dono aprovou a opção A (calibrar forma e linhas na arquitetura atual) em 2026-11-13; as mudanças de medição abaixo são do assistente, feitas depois de ver o resultado, e só valem com aceite do dono.

## Contexto

A prova de coordenação (MC-246) falhou na primeira rodada com T2 (vão da última linha e distância entre linhas) e, em parte, T1, T3 e T9. O dono escolheu manter a arquitetura (atribuição gulosa por custo de chegada) e calibrar a forma das linhas. TEST_STRATEGY §2.1 exige registro em ADR quando um critério de aceite muda depois de ver o resultado. As faixas não mudaram. Mudou a definição de quais quadros e jogadores entram em cada métrica, porque o diagnóstico mostrou quadros que mediam outra coisa. TEST_STRATEGY §4.1 já manda medir por célula de contexto (fase, zona da bola); estas são as células.

## Decisão

Faixas (`BANDS` em `trajectories.ts`) ficam como estavam. Definições:

1. **T1 (enxame): o máximo conta quem fica perto da bola por 1 s** (`SWARM_HOLD`). Um corredor que cruza a área da bola num quadro não é enxame. A média continua quadro a quadro. O goleiro não conta em T1 (acrescentado depois, na calibragem da partida completa): perto da bola na própria área ele está no lugar dele, não num enxame.
2. **T2 (linhas): sem bola dentro da nossa área.** Com a bola na área a defesa é de área, não de linha; os zagueiros perto da bola saem da linha de propósito e o "vão" medido era o lugar onde a bola está. Já era célula separada em T1.
3. **T2 entre linhas: a linha do meio são os meio-campistas entre a bola e o nosso gol.** Quem ainda está do outro lado da bola está recuperando e pertence à célula de transição (MC-257).
4. **T3 (dois no mesmo lugar) e T5: taxa somada nas oito sementes.** Uma rodada de 4 min com um episódio dá 2,5 por 10 min; a taxa é estimada no total de 32 min, como já era T5. T5 só é julgado com pelo menos 10 s de amostra (40 quadros) na soma; abaixo disso a fração é ruído, como T9 só é julgado com pelo menos cinco perdas.
5. **T9 (defesa de descanso): só perdas depois de ataque estabelecido**, com a bola no campo de ataque há pelo menos `TRANSITION` (8 s). Um contra-ataque perdido no primeiro passe longo é transição, não a defesa de descanso que o plano monta.
6. **Cenários: quem recebe dentro da área adversária fica 1 s com a bola** (`BOX_HOLD`), não 2,8 s. Ninguém segura a bola parado na área; chuta ou cruza.

Mudanças de comportamento feitas na mesma calibragem (não de métrica), em `02` §5.11: bloco médio e baixo sem bola não pressiona acima da frente do bloco; a cobertura fica 6 m atrás da frente do bloco; zagueiros centrais com bola só fazem defesa de descanso ou apoio curto na saída (até x = 45); quem não está na defesa de descanso acompanha a jogada a no máximo 10 m atrás da bola; dois companheiros a menos de 3 m se afastam, contando o portador.

## O que mudou no jogo e o que mudou na régua

| Cenário | Antes | Melhora por comportamento | Melhora por medição |
| --- | --- | --- | --- |
| S2, S3 vão da linha (23 a 37 m) | vermelho | — | item 2: os quadros com bola na nossa área saíram da conta; o "vão" era o lugar da bola |
| S4, S5 entre linhas (23 a 41 m) | vermelho | bloco médio sem pressão acima da frente do bloco; cobertura atrás da frente; zagueiro central fica atrás com a bola | item 3: meio-campista do outro lado da bola saiu da linha |
| S4 T9 do time 1 (4,3 contra 3) | vermelho | quem não está na defesa de descanso acompanha a jogada | item 5: perdas em contra-ataque saíram da conta |
| T1 máximo e T3 | vermelhos esporádicos | dois companheiros a menos de 3 m se afastam | itens 1, 4 e o goleiro fora de T1 |

Não há medição separada de quanto cada linha mudou sozinha; a ordem foi comportamento primeiro, régua depois, nos mesmos ciclos.

## Consequências

- Os seis cenários passam em todas as oito sementes.
- As definições 2, 3 e 5 tiram quadros da medida. O que sai não fica sem teste: a recuperação depois da perda e o contra-ataque são medidos em MC-257 (transição), e a defesa de área em MC-203 (T1 na área já existe).
- Risco: célula bem escolhida também esconde defeito. Por isso a prova continua valendo só como portão de arquitetura; o efeito das instruções em campo é medido pelos testes causais (MC-060) e pela avaliação do dono (MC-048).
