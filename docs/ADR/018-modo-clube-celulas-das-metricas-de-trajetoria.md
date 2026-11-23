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

## Item 7 (proposto em 2026-11-16, aplicado em 2026-11-19 com aceite do dono)

7. **T2 por altura de bloco no bloco baixo.** Aplicado: vão da última linha p95 de 23 m no bloco baixo, 22 m nos blocos médio e alto (`BANDS.T2backGapP95` em `trajectories.ts`); T1 não mudou. Motivo da aplicação: com o posicionamento com bola por função (`02` §5.11, DECISÃO de 2026-11-19), o S3 chega a 22,2 m em 1 de 8 sementes pela marcação homem a homem perto da área. Texto original da proposta: Com a linha do bloco baixo na entrada da área (piso de 14 m para a defesa e 19 m para o meio, `LOW_FLOOR_EXTRA` em `team.ts`), o cenário S3 passa a ter 4 defensores perto da bola fora da área e vão de 22,7 a 24,1 m entre zagueiros em 7 de 12 sementes. É o comportamento esperado de um bloco baixo compacto (pesquisa 13 §3) e o que reduziu os gols sofridos por ele de 2,44 para 1,92 por jogo. TEST_STRATEGY §4.1 já pede faixa por altura de bloco; a proposta é T1 máximo 4 e T2 vão 25 m na célula de bloco baixo. Só vale com aceite do dono; até lá a prova fica vermelha nesse cenário.

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

## Item 7, revisão (2026-11-23, com aceite do dono)

O limite T2 do vão da última linha no bloco baixo passa de 23 m para 24 m, ainda abaixo dos 25 m da proposta original. Motivo: os confrontos de controle (holdout) mostraram que a retranca da partida assistida cedia 2,13 gols por jogo a um adversário de mesma força, com 3,48 contra linha alta. A causa era o recuo de 9 m de todo o time sem a bola (`BLOCK_SHIFT` em `team.ts`), que colava a zaga no próprio gol. Agora a zaga do bloco baixo não recua além do piso, e meio e ataque recuam 4 m. Contra o plano padrão, a retranca vai de 0,72×2,13 para 0,96×1,44, com 2,40 gols por jogo contra 2,53 do bloco médio. Com a zaga um pouco mais alta, o cenário S3 abre 23,7 m entre zagueiros em 1 semente.
