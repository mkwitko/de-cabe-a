# Modo Clube: métricas e teste de usabilidade

## Princípios

- Pseudonimizado e agregado: o servidor guarda só um hash da sessão, sem nome, e-mail ou id de clube.
- Nenhum evento carrega texto livre, nome de jogador ou de clube. Só contagens, faixa (tier), índice de temporada, veredito e durações.
- Sem perfilamento comportamental para publicidade (ECA Digital): os eventos servem para medir o funil e a lentidão do jogo, nada mais.
- Cada marco sai uma vez por carreira em cada aparelho (localStorage).

## Eventos

| Evento | Propriedades | Quando |
| --- | --- | --- |
| `career_started` | `tier` (1 a 4) | Primeira abertura de uma carreira nova |
| `season_started` | `n` (1 = primeira temporada da carreira) | Início de cada temporada |
| `season_completed` | `n`, `verdict` (`met`, `missed`, `fired`) | Fim da temporada, antes da virada |
| `career_fired` | `n` | Demissão pela diretoria |
| `first_meaningful_decision` | `seconds`, `what` (`lineup`, `signing`) | Primeira escalação, tática ou contratação, contada desde o início da carreira |
| `career_timing` | `step` (`open`, `seasonTurn`), `ms` | Tempo medido no aparelho para abrir a carreira e para virar a temporada |

p50 e p95 dos tempos saem do agregado de `career_timing` por `step` (percentil sobre os eventos, no PostHog ou em SQL).

## Conversão para a segunda temporada

`season_started` com `n = 2` dividido por `season_started` com `n = 1`, contando sessões distintas, na mesma janela de datas.

## Teste de usabilidade

5 participantes, 5 tarefas, um facilitador que não ajuda. Sessão de 30 a 40 minutos, em celular de 390 px de largura. Pedir para pensar em voz alta.

| Tarefa | O que registrar |
| --- | --- |
| 1. Entender o clube | Tempo até dizer o nome do clube, a meta da diretoria e o dinheiro em caixa; onde olhou primeiro; o que não achou |
| 2. Preparar o time | Tempo até a primeira escalação alterada; se achou o vestiário sem ajuda; erros (jogador fora de posição, formação trocada sem querer) |
| 3. Decisão tática e explicar o resultado | Qual mudança tática fez e por quê; se consegue explicar o resultado do jogo com as palavras do relatório; se acha o relatório útil |
| 4. Negociar sem prejudicar o clube | Se olhou caixa, salários e limite de fair play antes de fechar; valor aceito; se percebeu o impacto depois |
| 5. Continuar a carreira | Se entendeu a virada de temporada e o painel "O que vem aí"; se disse o que fazer na próxima temporada; se quer continuar e por quê |

Em todas: sucesso (sim, com ajuda, não), tempo, número de toques errados, frases citadas e uma nota de 1 a 5 para a facilidade que o participante dá à tarefa.
