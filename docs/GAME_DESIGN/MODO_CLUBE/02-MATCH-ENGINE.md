# Modo Clube — especificação da engine de partida, da tática e do campo 2D

Data: 2026-11-13, revisão 4. Base: ADR-013, ADR-015, ADR-016 e ADR-017. Evidência e números: `docs/pesquisa/modo-clube/01-engine-de-partida.md` e `04-design-de-jogos-e-tatica.md`. Legenda: FATO, HIPÓTESE, DECISÃO, PARÂMETRO (ver `00-VISAO-E-PRODUTO.md`).

Ideias de origem (FATO, literatura): posicionamento por situação da liga de simulação 2D da RoboCup (âncora do jogador como função da posição da bola); controle de campo (tempo que cada jogador leva para chegar a um ponto, Spearman 2018; Fernández e Bornn 2018); valor de posse por zona (ameaça esperada, grade de valores); gols esperados por regressão logística sobre distância e ângulo. Nada disso é copiado de outro jogo.

## 1. Unidades e campo

- Metros e segundos. Campo 105 × 68. Origem no canto; `x` cresce na direção do ataque do mandante no primeiro tempo. Internamente cada time enxerga o campo normalizado (ataca para `+x`); a conversão é uma função única (`toTeamFrame`, `toWorldFrame`).
- Bola: posição `(x, y, z)`, velocidade, dono (`playerId | null`), estado (`presa`, `rolando`, `no ar`, `parada`).
- Zonas só para análise e para a tabela de valor: grade 12 × 8 e cinco corredores (ponta, meia-ponta, centro, meia-ponta, ponta).

## 2. Tempo

DECISÃO (revisão 4): a engine tem **três relógios**, e não um passo único. Um passo de 0,25 s serve para deslocar jogadores, mas é grosso para o contato com a bola (a 25 m/s a bola anda 6 m por passo) e fino demais para decidir.

| Relógio | Período | O que roda |
| --- | --- | --- |
| Física | `DT = 0,25 s` para jogadores; a bola e os contatos são resolvidos **de forma analítica dentro do passo**: calcula-se o instante exato em que a bola cruza o alcance de um jogador, a linha ou o gol, e o passo é partido nesse instante. Sem subpasso iterativo, sem túnel | movimento, bola, colisão, saída de campo |
| Decisão | portador: ao receber e a cada 0,5 s; sem bola: a cada 1 s, escalonado (um quarto do time por passo); todos de imediato em troca de posse, comando ou bola parada | escolha de alvo e de ação (§5) |
| Percepção | a cada 0,5 s por jogador, escalonado; atraso de reação por atributo entre o fato e o jogador "saber" | o que cada jogador acredita sobre bola, companheiros e adversários (§5.6) |
| Coordenação | a cada 1 s e em todo evento de posse | atribuição de tarefas coletivas do time (§5.11) |

Implementação: `packages/match-engine/src/ball.ts` (`firstContact`, `advanceBall`, `due`). Dentro do passo, a velocidade da bola relativa ao jogador é a média do passo; com desaceleração de rolagem de 3 m/s² (PARÂMETRO) o erro de posição fica abaixo de 0,02 m. Os períodos são PARÂMETROS medidos na bancada (`TEST_STRATEGY.md` §4.2) contra `DT = 0,1 s`: aceita-se o passo maior se as distribuições de eventos não diferem pelo protocolo de equivalência (`TEST_STRATEGY.md` §2.1). Determinismo: a ordem de resolução dentro de um passo é fixa (por instante, depois por índice do jogador).

- Bola parada não é simulada passo a passo: o relógio salta um atraso sorteado por tipo de reinício e os jogadores vão às posições da rotina. Meta de bola rolando: 52 a 58 minutos por partida (PARÂMETRO).
- Acréscimos: função do tempo parado (substituições, lesões, gols, cartões).

## 3. Estado

```ts
interface MatchState {
  engineVersion: number; tick: number; clockMs: number; period: 1 | 2;
  rng: RngState;                       // fluxos: decisão, execução, árbitro, lesão
  ball: BallState;
  players: PlayerState[];              // 22 em campo + bancos
  teams: [TeamState, TeamState];       // tática ativa, comandos ativos, substituições, placar
  phase: [TeamPhase, TeamPhase];       // fase de jogo de cada time
  restart: RestartState | null;
  events: MatchEvent[];                // acumulado do trecho
  stats: MatchStats;
}
interface PlayerState {
  id: string; team: 0 | 1; slot: number;
  pos: Vec2; vel: Vec2; facing: number;
  target: Vec2; intent: Intent;        // por que está indo para lá
  stamina: number;                     // 0..1
  focus: number; composure: number; urgency: number;   // estados mentais, 0..1
  cards: 0 | 1 | 2; injured: boolean;
  attrs: Attributes; traits: Trait[]; role: RoleId; instructions: InstructionSet;
  familiarity: number;                 // 0..1 com função + plano atual
}
```

O estado é serializável e pequeno: retomar um trecho = desserializar e seguir (ADR-015).

## 4. Movimento

- Aceleração e velocidade máxima por atributo: `vmax = 6,0 + 3,2 × (velocidade/99)` m/s; aceleração `3,0 + 4,0 × (aceleração/99)` m/s² (PARÂMETROS; revisão de 2026-11-13 na MC-247: a aceleração antiga, até 5,5 m/s², deixava o tempo para 10 m cerca de 15% acima da curva de referência; o teto de 7 m/s² é o do código público de controle de campo). Reação `0,95 − 0,5 × (0,6 antecipação + 0,4 concentração)/99` s (média perto de 0,65 s; referência 0,7 s). Meia-volta `0,9 − 0,5 × agilidade/99` s, proporcional a `(1 − cos θ)/2`. Fadiga abaixo de 0,3 de fôlego reduz velocidade e aceleração até 80% do normal. Código: `packages/match-engine/src/kinematics.ts`; teste contra a curva de Fujimura e Sugihara (pesquisa 11 §3) em `kinematics.test.ts`, com erro abaixo de 12% de 5 a 40 m.
- Direção: o jogador vira com taxa limitada (agilidade); correr de costas e de lado custa velocidade.
- Fôlego: custo por passo proporcional ao quadrado da velocidade relativa; recuperação parado ou trotando; `resistência` define o tamanho do tanque. Abaixo de 0,3 cai velocidade máxima, precisão e `focus`.
- Ocupação e contato: §6.2. Os parâmetros de velocidade, aceleração e fôlego acima são provisórios e são reavaliados por teste contra os dados físicos da pesquisa 01 §5 (distância por jogador, queda de corrida intensa no fim) na tarefa MC-037.

### 4.1 Modelo de chegada (quem alcança um ponto e quando)

Uma só função responde "em quanto tempo o jogador J chega ao ponto P", e todo o resto a usa: interceptação, disputa de bola solta, cobertura, linha de passe aberta ou fechada, controle de campo e atribuição de tarefas (§5.11).

```text
t_chegada(J, P) = t_reação(J) + t_giro(J, direção de P) + t_percurso(J, P)
t_percurso: movimento com aceleração constante a(J) até vmax(J), partindo da velocidade atual projetada na direção de P
```

`t_reação` vem de `antecipação` e `concentração`; `t_giro` de `agilidade` e do ângulo entre a direção atual e o alvo; `a` e `vmax` do §4, já com fadiga. A função só usa soma, produto, divisão e raiz (ADR-013 item 6). Proibido estimar chegada por distância dividida por velocidade máxima em qualquer ponto do código: é o erro que faz todo zagueiro lento parecer rápido. Referências lidas (`docs/pesquisa/modo-clube/11-simulacao-e-coordenacao.md` item 3):

| Modelo | Forma | Constantes publicadas | Uso aqui |
| --- | --- | --- | --- |
| Controle de campo, implementação pública | reação, depois distância sobre velocidade máxima; chegada tratada como probabilidade (curva logística) | reação 0,7 s; velocidade 5 m/s; desvio 0,45 s; bola a 15 m/s em média | referência de ordem de grandeza para `t_reação` e para a incerteza da chegada; a forma sem aceleração **não** é adotada |
| Aceleração uniforme (região dominante) | círculo de raio `0,5 × a × t²` deslocado pela velocidade atual | os autores ressalvam que a velocidade fica sem limite | adotada, com o limite de `vmax` |
| Movimento com resistência | velocidade tende a `vmax` por exponencial | `vmax` 7,8 m/s; taxa 1,3 | não adotada: exige exponencial, proibida no caminho da simulação (ADR-013 item 6); serve para conferir a curva do modelo adotado |

A incerteza da chegada (o desvio de 0,45 s da referência) entra como erro de percepção por atributo (§5.6), sorteado pelo gerador da partida, e não como probabilidade contínua.

## 5. Decisão

Três camadas, da coletiva à individual.

### 5.1 Fase do time
`saída`, `progressão`, `criação`, `defesa alta`, `defesa média`, `defesa baixa`, `transição ofensiva`, `transição defensiva`, `bola parada a favor`, `bola parada contra`. Derivada de quem tem a bola, onde, há quanto tempo mudou a posse e da altura de bloco pedida.

### 5.2 Âncora (forma do time)
Para cada jogador: `âncora = posição_do_slot(fase) + atração_pela_bola + ajustes do plano`.
- `posição_do_slot`: o plano tático guarda uma formação por fase (no mínimo duas: com bola e sem bola).
- `atração_pela_bola`: deslocamento lateral e longitudinal proporcional à posição da bola, com fatores por linha (defesa acompanha menos que meio).
- Ajustes: largura, profundidade, altura da linha, compactação. A última linha nunca fica atrás da linha de impedimento pedida, salvo cobertura.
- Defesa da área (pesquisa 18 H5; 2026-11-16): sem a bola, com ela perto do nosso gol, as linhas ficam do lado do gol em relação à bola: a última linha pelo menos 5 m mais funda que a bola (nunca abaixo de 3 m), a de meio 2 m (nunca abaixo de 8 m); os atacantes ficam como saída. A partir de 30 m do gol a última linha se fecha em direção à boca do gol, até 60% da largura a 10 m. PARÂMETROS. Testado e descartado: tratar o ponta de um 4-4-2 como linha de meio sem a bola (aglomerava perto da bola na prova de coordenação, sem ganho medido).

### 5.3 Alvo sem bola (utilidade)
Candidatos: a âncora e os movimentos que a função permite (oferecer curto, atacar as costas, abrir, entrar por dentro, ultrapassar, cobrir companheiro que saiu, marcar adversário, pressionar portador, fechar linha de passe, voltar).

```text
U(alvo) = w_forma    × proximidade da âncora
        + w_espaço   × ganho de controle de campo no alvo × valor da zona
        + w_linha    × (abrir linha de passe a favor | fechar linha contra)
        + w_instr    × viés das instruções e comandos ativos
        + w_traço    × viés dos traços do jogador
        − w_custo    × distância × (1 − stamina)
        − w_risco    × buraco que deixa (perda de controle de campo na zona de origem × valor para o adversário)
```
Os pesos vêm de função, instruções e atributos: `movimentação sem bola` aumenta a chance de enxergar o melhor candidato ofensivo; `posicionamento` e `antecipação`, o defensivo; `trabalho em equipe` aumenta `w_risco`. Escolha: melhor candidato com ruído inversamente proporcional a `decisões × familiarity`.

**Compensação coletiva**: o termo `w_risco` de um jogador e o candidato `cobrir` dos vizinhos são o mecanismo. Lateral sobe; o volante do lado passa a ter candidato "cobrir corredor" com valor alto. Se ninguém tem atributo ou instrução para cobrir, o buraco fica e o adversário o enxerga pelo próprio termo `w_espaço`.

**Pressão**: gatilhos configuráveis (passe para trás, domínio ruim, bola no lateral, recebedor de costas). Disparado o gatilho, os N mais próximos recebem `pressionar` e os seguintes `fechar linha`; N vem da intensidade pedida.

### 5.4 Ação com bola
Candidatos: passe rasteiro, em profundidade ou alto para cada companheiro visível; conduzir em três direções; driblar o marcador; chutar; cruzar; afastar; proteger.

```text
U(ação) = P(sucesso) × V(estado se der certo)
        − (1 − P(sucesso)) × V_adv(estado se der errado)
        + viés de instrução, comando, função, traço
```
- `V`: grade de valor de posse (12 × 8, tabela do pacote da engine), corrigida pelo controle de campo ao redor do alvo.
- `P(sucesso)` é a estimativa **do jogador**, que erra mais com `decisões` baixa.
- DECISÃO (2026-11-17, calibração da estimativa do passe): o passador julga o passe que de fato joga. Para um companheiro em movimento, a estimativa usa o mesmo ponto à frente que o chute mira (`leadTarget`). O ponto final é uma disputa entre o recebedor e o adversário mais próximo, contada uma vez só; ao longo do caminho entram só os pontos antes dele. Um companheiro em impedimento não é opção (o passador percebe 30% das vezes na linha e sempre a 2 m dela, sobre o que ele percebe. DECISÃO do dono, 2026-11-17: o impedimento nasce do tempo do lance, não de piorar a leitura. O passador vê a linha e o companheiro como estavam `PERCEPTION_LAG` atrás (0,45 s, PARÂMETRO; tempo humano de leitura de 0,2 a 0,5 s). Quem acabou de passar a linha em velocidade parece em posição legal. Em 2000 partidas: 1,23 por time com 0,3 s e 1,29 com 0,45 s, ainda um pouco abaixo da faixa. Falta a outra causa real: o atacante que sai cedo na corrida, pelo `timing`. Um ajuste anterior, que piorava a leitura para 10% na linha e certeza a 3,6 m, foi desfeito). Medido antes: passes rasteiros estimados em 14% a 55% chegavam em 69% a 79%; o defensor junto do recebedor era contado duas vezes (77% das ameaças previstas vinham do ponto final). Depois: estimativa e resultado batem entre 55% e 99%; abaixo de 15% a estimativa ainda é pessimista (cerca de 1% estimado contra 34% de acerto real, em todos os tipos de passe).
- Percepção: uma opção só entra na lista se o jogador a "vê": chance cresce com `visão` e cai com ângulo fora do campo visual e com pressão.
- Escolha por softmax; temperatura cai com `decisões` e `compostura`, sobe com pressão e fadiga. Implementado (2026-11-16): fôlego 0 aumenta a temperatura em 60% (PARÂMETRO). Fadiga na execução: erro da bola alçada +0,04 por unidade de fôlego perdido, chute no alvo −0,04, conversão −15% com fôlego 0 (PARÂMETROS). Mentalidade e `risco` do plano deslocam o peso do termo de perda.

### 5.5 Estabilidade das escolhas (histerese)
Sem amortecimento, um jogador alterna entre dois alvos de utilidade parecida a cada reavaliação e treme em campo. Regras: (1) o alvo atual recebe bônus de permanência; só troca se o melhor candidato superar o atual por uma margem (PARÂMETRO: 10% da utilidade); (2) uma intenção assumida (pressionar, atacar as costas, cobrir) tem duração mínima de 1,5 s, salvo troca de posse, bola parada ou comando; (3) o ruído de escolha é sorteado por intenção, não por passo; (4) a âncora é filtrada no tempo (média móvel curta) para não saltar quando a fase do time muda. Teste: número de trocas de alvo por jogador por minuto abaixo de um teto, e nenhuma oscilação A-B-A em menos de 2 s.

### 5.6 Percepção limitada
O jogador decide sobre o que percebe, não sobre o estado verdadeiro.
- Campo visual de 200° à frente do corpo; fora dele, a posição conhecida de um jogador é a última vista, envelhecida.
- "Olhar por cima do ombro": antes de receber, jogadores com `antecipação` e `visão` altas atualizam o que está atrás com mais frequência.
- Atraso de reação a eventos (troca de posse, passe, gatilho de pressão): função de `antecipação`, `concentração`, `familiarity` e fôlego.
- Ninguém lê atributo de adversário; lê posição, velocidade e o histórico do jogo (quem já o driblou).
- Lapso de `concentração`: por um intervalo curto o jogador não reavalia. Mais provável com fôlego baixo, placar confortável e nos minutos finais.
O custo de calcular percepção por jogador é limitado: atualização a cada reavaliação, não a cada passo.

### 5.7 Decisão e execução são sistemas separados
- **Decisão**: escolhe a intenção com a informação percebida (5.3, 5.4, 5.6). Depende de atributos mentais, plano, traços e estado mental.
- **Execução**: transforma a intenção em movimento e em contato com a bola, com erro (§6). Depende de atributos técnicos e físicos, pressão, fôlego, pé e gramado.
As duas falhas são distinguíveis no log: "escolheu mal" (havia opção percebida de utilidade bem maior) e "executou mal" (a intenção era boa e o erro de execução a estragou). O relatório e o treino usam essa distinção: decisão melhora com treino tático e vídeo; execução, com treino técnico.


### 5.8 Autonomia: a instrução é prioridade, não trilho

Cada jogador tem duas tendências derivadas de personalidade e traços: **disciplina tática** (quanto o viés de instrução pesa sobre a própria leitura) e **improviso** (quanto ele considera candidatos fora da função). Um lateral disciplinado cumpre a instrução mesmo quando há opção melhor; um armador com improviso alto e `decisões` alta rompe a instrução quando enxerga valor claramente maior, e acerta; com `decisões` baixa, rompe e erra. O plano pode pedir mais ou menos liberdade por jogador. Consequência: o mesmo plano joga diferente com elencos diferentes.

### 5.9 Defesa de descanso (organização defensiva enquanto ataca)

Conceito de treinamento sem definição acadêmica formal; as fontes são material de treinadores (`docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 12), então o que segue é DECISÃO de desenho. No plano, com a bola, o time declara **quantos ficam atrás da linha da bola** (2 a 5) e **como**: quem protege o centro, quem cobre o corredor do lateral que subiu. Na engine isso é um conjunto de âncoras de segurança ocupadas por função (zagueiros, volante, lateral do lado oposto) e um termo coletivo na utilidade: se o número de jogadores atrás da bola cai abaixo do pedido, o candidato `segurar posição` dos elegíveis ganha peso. Métricas que a instrução move: contra-ataques sofridos e `xG` sofrido em transição (caem com mais gente atrás); presença na área e `xG` próprio em ataque posicional (caem também). É uma das instruções com custo mais claro, e tem teste causal próprio.

DECISÃO (2026-11-17, relato do amistoso: zagueiros atrás do goleiro): com a bola, ninguém de linha fica atrás do goleiro. A âncora de cada jogador de linha fica pelo menos 4 m à frente do ponto do goleiro com a bola, e a defesa de descanso, que normalmente fica 16 m atrás da bola, nunca fica a menos de 8 m à frente dele. Na saída de bola ela vira a base da construção. Teste: com a bola na própria metade e fora da área, menos de 0,1% dos quadros têm jogador de linha mais de 3 m atrás do goleiro (antes 2,3%).

### 5.10 Armadilha de pressão

Além de intensidade e gatilhos (5.3), a pressão pode ter **alvo e direção**:
- **Para onde empurrar**: para a lateral, para dentro, para o pé ruim do portador.
- **Quem deixar livre de propósito**: o adversário com pior passe ou pior domínio sob pressão (identificado pelo analista antes do jogo ou percebido durante).
- **Que linha de passe fechar primeiro**: a do volante, a do goleiro, a do lado forte.
Mecânica: os pressionadores escolhem ângulo de aproximação que oclui a linha de passe escolhida (sombra de cobertura, calculada por geometria) e deixam aberta a linha que leva à zona da armadilha; quando a bola entra nela, dispara o gatilho com N jogadores. Funciona se a oclusão e a chegada são sincronizadas (`familiarity`, treino do momento "organização defensiva") e falha deixando espaço atrás se um adversário de bom passe quebra a linha. Métricas: recuperações na zona da armadilha, erros forçados do alvo; custo: bolas progressivas sofridas quando a armadilha falha.

### 5.11 Coordenação coletiva (ninguém escolhe sozinho o que é do time)

Problema: se cada jogador maximiza a própria utilidade, vários escolhem o mesmo alvo (enxame na bola, dois na mesma cobertura, zona vazia). Utilidade individual com penalidade de vizinhança não resolve; reduz a frequência e deixa o defeito.

DECISÃO (revisão 4): existe uma camada de time, executada no relógio de coordenação (§2), que **atribui tarefas coletivas a jogadores** antes da decisão individual.

1. **Tarefas da fase.** Cada fase gera uma lista ordenada por prioridade. Sem bola: pressionar o portador; cobrir o pressionador; marcar cada opção de passe perigosa; fechar o corredor central; guardar a zona à frente da área; manter a última linha. Com bola: apoio curto ao portador; opção em largura de cada lado; opção em profundidade; ocupação da área; defesa de descanso (§5.9). O plano tático muda quantas tarefas de cada tipo existem e a ordem (pressão alta cria mais tarefas de pressão; bloco baixo cria mais de linha).
2. **Custo.** Para cada par jogador e tarefa: tempo de chegada (§4.1) ao ponto da tarefa, mais custo de abandonar a zona da função, mais custo de fôlego, menos aptidão da função para a tarefa.
3. **Atribuição.** Gulosa por prioridade: a tarefa mais importante recebe o jogador de menor custo, que sai da lista; segue para a próxima. Onze jogadores e cerca de dez tarefas: custo desprezível. Atribuição ótima por matriz de custo fica como alternativa a medir, não como padrão.
4. **Estabilidade.** A tarefa atribuída tem histerese (§5.5): só troca de dono se o novo custo for menor por margem, ou em evento de posse.
5. **Erro.** A atribuição usa o que os jogadores percebem (§5.6). `trabalho em equipe`, `posicionamento` e familiaridade tática definem a chance de um jogador seguir a tarefa atribuída ou a própria leitura. É daqui que saem erros coletivos legítimos: dois vão na bola, ninguém cobre.
6. **Decisão individual.** O jogador com tarefa calcula o alvo dentro dela (onde exatamente pressionar, a que distância marcar). Jogador sem tarefa segue a âncora (§5.2) e a utilidade do §5.3. A utilidade individual ganha dois termos: custo de **ocupação duplicada** (ponto já servido por um companheiro) e custo de **zona de responsabilidade desocupada**.

A lista de tarefas atribuídas é parte do estado e do registro de eventos: a explicação da partida pode dizer "a cobertura do lateral estava atribuída ao volante, que chegou 0,8 s atrasado".

Regras de referência adotadas da simulação 2D da RoboCup (`docs/pesquisa/modo-clube/11-simulacao-e-coordenacao.md` itens 1 e 2), onde times de código aberto resolvem o mesmo problema há duas décadas:

- **Quem vai na bola solta**: só o jogador com o menor tempo de interceptação do time, e só se esse tempo não for muito pior que o do adversário mais próximo; os outros dez seguem a forma do time. Todos calculam sobre o mesmo mundo previsto, sem troca de mensagem. Empate resolvido por índice fixo.
- **Forma do time em função de um ponto focal**: o ponto é a bola prevista no instante em que alguém a alcança, e não a bola de agora. A âncora (§5.2) passa a usar esse ponto, e a última linha limita a posição pelo impedimento.
- **Marcação**: cada defensor considera só os três alvos de menor custo; os adversários mais perigosos são cobertos primeiro. É mais estável com percepção ruidosa que a atribuição ótima pura. Resultado relatado pelos autores: gols sofridos de 0,9 para 0,33 por jogo, com a ressalva de que os adversários também mudaram.
- **Atribuição ótima** (matriz de custo, minimizando primeiro o maior deslocamento): custa microssegundos para onze jogadores; fica disponível para bola parada e reorganização depois de expulsão, onde todos trocam de tarefa ao mesmo tempo.
- **Decisão do portador**: busca de ações em cadeia com profundidade e número de avaliações limitados (referência: profundidade 4, 500 avaliações) é a linha de base barata para o §5.4; o custo entra na bancada.
- **Fôlego em três variáveis** (reserva, recuperação, esforço, com capacidade finita por partida e histerese na recuperação): referência para o §4.

"Ficha de reivindicação" (um jogador reserva a tarefa e os outros a veem ocupada) não tem fonte acadêmica encontrada; a atribuição por time já cumpre esse papel.

**Implementação da prova (2026-11-13, verde).** `packages/match-engine/src/team.ts` (âncoras com bloco, teto e piso por linha, tarefas por fase, atribuição gulosa por custo de chegada com os três melhores alvos por jogador e histerese, tarefa sem dono adequado fica aberta), `world.ts` (relógio de coordenação, erro coletivo: quem não segue a tarefa volta à própria âncora; linha de defesa sem bola defende por zona, fecha o buraco de quem sai e se move como unidade), `trajectories.ts` (T1, T2, T3, T5, T9 e faixas), `coordination.scenarios.ts` (os seis cenários). Faixas de T1 a T5 e T9 são PARÂMETROS sem referência publicada: T1 média ≤ 1,5 e máximo ≤ 3 fora das áreas (≤ 4 dentro); T2 vão da última linha p95 ≤ 22 m e entre linhas ≤ 22 m (bloco alto 30 m), sem contar quem está a menos de 10 m da bola; T3 ≤ 1 episódio por 10 min; T5 ≤ 10% do tempo; T9 = pedido ± 1, contando quem está mais de 12 m atrás da bola. Transição (8 s depois da troca de posse) fica fora de T2 e T5 e é medida à parte (MC-257). Células de contexto de cada métrica (máximo de T1 sustentado por 1 s, T2 sem bola na nossa área e com a linha do meio entre a bola e o gol, T3 e T5 somados nas oito sementes, T9 só depois de ataque estabelecido) e as regras de comportamento acrescentadas na calibragem: ADR-018. Regras: bloco médio e baixo não pressiona acima da frente do bloco e a cobertura fica 6 m atrás dela; zagueiro central com bola só faz defesa de descanso ou apoio curto na saída; quem não está na defesa de descanso acompanha a jogada a no máximo 10 m atrás da bola; dois companheiros a menos de 3 m se afastam, contando o portador.

**Prova de coordenação antes de crescer** (MC-246): antes de implementar a tabela de instruções inteira, a engine precisa passar nos testes de trajetória T1, T2, T3, T5 e T9 só com forma do time, atribuição de tarefas e bola por roteiro, em seis cenários fixos. Sem isso, cada instrução nova é ajustada em cima de um movimento coletivo errado. Mecanismos de referência (simulação 2D da RoboCup e outros): `docs/pesquisa/modo-clube/11-simulacao-e-coordenacao.md` itens 1 e 2.

### 5.12 Defesa perto do gol (DESENHO, 2026-11-17; ainda não implementado)

**Por quê.** Com a estimativa de passe corrigida (§5.4), a defesa perto do gol ficou exposta: 3,86 gols por jogo na bancada. Ajustes isolados (segundo pressionador, recomposição, marcação mais colada) tiraram no máximo 10% cada (HANDOFF, 2026-11-17). A causa está na coordenação, não num parâmetro.

**Linha de base medida (bola a até 35 m do nosso gol, sem a bola).**
- Recepção do adversário a até 22 m do gol: defensor mais próximo a 3,7 m; 1,2 defensor a até 5 m; 3,7 defensores na área; 5,4 defensores não estão entre o recebedor e o gol.
- Marcação: 1,6 a 2,3 marcadores por instante; cada marcador fica 6,3 m do atacante mais próximo e 9 m do próprio ponto de marcação; 0,8 a 1,1 marcação nova por segundo (cada uma dura 2 a 3 s); só 10% dessas trocas vêm de um evento (passe).
- Condutor no terço final: defensor mais próximo a 3,7 m, alguém a distância de desarme só 14% do tempo; o pressionador está a 6,1 m e entre o condutor e o gol em 43% das vezes.

**Causas no código.**
1. A marcação exclui quem está a menos de 8 m da bola e quem está atrás da nossa última linha (`tasksFor`), e o ponto de marcação não desce abaixo da linha (`aboveLine`). Perto do gol, isso deixa sem marcação justamente o recebedor e o atacante entre a linha e o gol.
2. Zagueiro só marca a menos de 20 m do gol e perto da própria âncora (`assign`, `BOX_MARK_X`, `DEF_RADIUS`). Os meio-campistas pegam pressão, cobertura e zona antes; as marcações sobram sem dono.
3. A atribuição é gulosa e refeita a cada segundo; a marcação muda de dono antes de o marcador chegar. Causa exata da rotatividade ainda em aberto: candidatas são a lista de perigo que muda de ordem e o erro coletivo (`compliance`) que faz a tarefa reaparecer como nova.

**Regras propostas** (DECISÃO de desenho, PARÂMETROS a calibrar).
- **Zona de perigo**: com a bola a até 35 m do nosso gol, todo adversário a até 25 m do gol e a até 22 m do eixo do campo é marcado, inclusive o recebedor e quem está atrás da nossa linha. O portador é do pressionador.
- **Marcação individual que dura**: o dono de uma marcação na zona só a perde quando o marcado sai da zona ou outro companheiro chega claramente antes (margem maior que a da histerese comum, também em evento).
- **Ponto de marcação**: 1 m entre o atacante e o gol, deslocado 0,8 m para o lado da bola, sem limite pela altura da linha.
- **Quem pode marcar**: qualquer jogador de linha, zagueiros inclusive; a linha de defesa deixa de defender só por zona dentro da zona de perigo.
- **Contenção e cobertura**: o defensor mais próximo que já está entre o condutor e o gol fica com a pressão; a cobertura fica 4 a 5 m atrás dele, na linha até o gol.
- **Zona restante**: quem sobra protege primeiro poste, marca do pênalti e entrada da área.

**Ordem de implementação** (um passo por commit, cada um com teste e comparação pareada contra o anterior).
1. Instrumentação: as medidas da linha de base viram métricas do resumo da bancada.
2. Rotatividade: achar a causa e fazer a marcação na zona durar.
3. Zona de perigo e ponto de marcação.
4. Zagueiros marcando na zona.
5. Contenção e cobertura.
6. Recalibrar a decisão de chutar e a defesa da área (`shotClear`, `SHOT_FOLLOW_UP`), que foram ajustadas sobre o erro de passe.

**Primeira tentativa (2026-11-17, revertida).** Diagnóstico da rotatividade: 0,53 troca de dono por segundo; 56% porque a tarefa some (a lista de perigo muda de membros), 21% troca entre marcadores, 19% jogador sem tarefa. Zona de perigo com marcação colada: gols 3,86 → 3,50 (300 partidas), marcadores a 8,3 m do próprio ponto (antes 9), sem mudança no defensor mais próximo da recepção (3,8 m). Zagueiros marcando na zona: pior (3,68; defensores na área 3,5 → 2,7). Conflito: a prova de coordenação reprova S2 e S3 (T1 na área chega a 5 e 6, faixa ≤ 4) mesmo excluindo da marcação quem está a menos de 8 m da bola, porque marcar colado na área põe defensores junto de atacantes que estão perto da bola. A faixa de T1 na área não tem referência publicada; mudá-la depois de ver o resultado é o tipo de decisão do ADR-018 e fica com o dono. Também em aberto: o marcador segue o atacante em vez de antecipar a corrida (alvo = posição atual), por isso não chega.

**Segunda tentativa (2026-11-17, não entrou).** Com T1 na área contando só excesso (ADR-020, aceito pelo dono), a zona de perigo passa em T1 na área, mas reprova T1 fora da área (4 contra 3) em S2 e o vão da última linha (22,4 a 24,8 m contra 22) em S2 e S3. Começar a zona com a bola mais perto do gol (25 m, 20 m) reduz as falhas e também o ganho (gols 3,61 e 3,75 em 150 partidas). Conclusão: a marcação colada sozinha rende cerca de 10%; o excesso de gols tem outra origem principal ainda não achada.

**Teste do defensor ideal (2026-11-17, só medição, revertido).** Chaves temporárias, uma de cada vez, valendo para o time sem a bola. Bancada de 300 partidas, mesmas sementes:

| Chave | Gols | Chutes por time | `xG` por chute |
|---|---|---|---|
| nenhuma (base) | 3,86 | 17,5 | 0,112 |
| c: cumpre sempre a tarefa | 3,61 | 17,6 | 0,113 |
| r: lê o passe na hora | 3,01 | 14,8 | 0,106 |
| k: recalcula tarefas a cada passo | 3,86 | 17,5 | 0,114 |
| s: corre sempre no máximo | 4,40 | 19,1 | 0,112 |
| a: marca onde o atacante estará em 1 s | 3,75 | 17,8 | 0,113 |
| t: marca colado (1 m) | 3,59 | 16,9 | 0,108 |
| r + a + t | 2,87 | 14,1 | 0,105 |
| c + r + a + t | 2,63 | 14,0 | 0,103 |

Leitura:

- A defesa explica quase todo o excesso. Com c + r + a + t os gols ficam perto da faixa. O ataque não é a origem principal.
- A maior alavanca é o tempo de leitura do passe. O tempo de reação em si é realista, então a correção não é zerá-lo. O que falta é o que o defensor faz antes do passe: posição e antecipação.
- Correr sempre no máximo piora (4,40). O defensor que dispara sai do lugar.
- Mesmo no caso ideal, o marcador recebe a tarefa a cerca de 11 m do ponto. Ele só fica colado (0,2 m) depois de uns 8 s na mesma marcação. Isso dá 70% do tempo de marcação com o marcador correndo atrás. Com a bola a menos de 35 m do gol, a distância média do marcador ao ponto fica entre 6 e 10 m em todas as variantes.
- Causa estrutural suspeita: as marcas fora de `BOX_MARK_X` (20 m) vão para meio-campistas, que vêm de longe. Os zagueiros perto do lance não podem pegá-las.

**Quem pega a marca (2026-11-17, só medição, revertido).** Com a bola a menos de 35 m do gol, em 840 marcas novas de 6 partidas:

- O marcador escolhido está a 11,8 m do ponto. O companheiro mais perto está a 6,7 m. O escolhido é o mais perto em só 36% dos casos.
- Atacantes (pontas, meias-atacantes, centroavantes) pegam 455 das 840 marcas. Eles vêm de longe, voltando do ataque.
- Mesmo o companheiro mais perto fica a mais de 6 m do ponto em 40% dos casos. A forma inteira está longe dos atacantes, não só o escolhido.

Variações, 150 partidas cada:

| Variação | Gols por jogo |
|---|---|
| Base | 3,86 |
| `BOX_MARK_X` 26 | 3,84 |
| `BOX_MARK_X` 32 | 3,71 |
| `BOX_MARK_X` 40 | 3,82 |
| Atacante não marca abaixo de 35 m | 3,56 |
| Atacante não marca abaixo de 35 m, `BOX_MARK_X` 35 | 3,94 |

Em todas as variações o marcador segue a 7–8 m do ponto. Trocar quem marca não resolve. O problema é a distância entre a forma e os atacantes.

**Leitura do passe separada.** Com tempo de leitura zero só no movimento, os gols ficam em 3,19. Com tempo zero só na estimativa do passador, ficam em 3,39. As duas partes contam. O tempo atual (0,4 × reação, cerca de 0,24 s) é realista e fica como está.

**Contenção do condutor (DECISÃO, 2026-11-17).**

- Regra: na nossa metade, o defensor de linha mais próximo do condutor, que esteja do lado do gol e a até 6 m dele, sai para fechá-lo.
- Ponto alvo: 1,2 m à frente do condutor, na linha entre ele e o gol.
- Ele corre e pode dar o bote como o pressionador.
- PARÂMETROS: 6 m e 1,2 m.
- Motivo: os desarmes só aconteciam a até 1,4 m, e o defensor da linha só entrava no lance a até 1,0 m. O condutor passava por 2 a 3 defensores (5 conduções de cerca de 20 m até o chute por time por jogo).
- Raio medido em 600 partidas: 4 m deu 3,48 gols; 6 m deu 3,36; 8 m deu 3,56; base 3,63. A prova de coordenação passa com 6 m.

Confirmação em 2000 partidas, mesmas sementes:

| Medida | Antes | Depois |
|---|---|---|
| Gols por jogo | 3,61 | 3,44 |
| Chutes por time | 17,5 | 16,9 |
| Faltas por time | 10,9 | 12,3 |
| Amarelos por time | 2,47 | 2,91 |

Os amarelos saem da faixa (2,15 a 2,59) porque a taxa de cartão por falta já era alta: 0,23 contra cerca de 0,16 na Série A (2,37 amarelos para 14,6 faltas). Corrigir essa taxa é o próximo passo. Testes em `match.test.ts` ("containment of a carrier in our half").

**Defensor recém-batido volta para a contenção (DECISÃO, 2026-11-18).**

- Regra: o defensor que está até 2 m atrás do condutor (acabou de ser batido, ainda emparelhado) também conta para a contenção e volta para fechá-lo. Antes, só contava quem estava pelo menos 0,5 m do lado do gol.
- PARÂMETRO: 2 m (`RECOVER`).
- Motivo: nos lances de atacante sozinho após passe, o recebedor deixava para trás cerca de 850 defensores em 30 partidas. O mais comum era o zagueiro na linha, parado na posição. Quem era batido por meio passo saía do lance.
- Recuo medido em 600 partidas: 1 m deu 3,40 gols; 2 m deu 3,19; 4 m deu 3,24. Raio de 9 m com 2 m deu 3,29 (não ajuda). A prova de coordenação passa com 2 m.

Confirmação em 2000 partidas, mesmas sementes:

| Medida | Antes | Depois |
|---|---|---|
| Gols por jogo | 3,53 | 3,23 |
| Gols por chute | 0,137 | 0,129 |
| Chutes por time | 12,9 | 12,5 |
| Faltas por time | 11,5 | 12,8 |
| Amarelos por time | 2,74 | 3,17 |

Os amarelos sobem pelo mesmo motivo de antes: a taxa de cartão por falta está alta. Chutes por time ficam um pouco abaixo da faixa (12,6 a 13,6). Testes em `match.test.ts` ("a defender just beaten, still level with the carrier, cuts back in" e "a defender well behind the carrier does not").

**Marcação colada perto do gol, terceira tentativa (2026-11-17, não entrou).** Feita depois do conserto do goleiro e da contenção. Regra: atacante a menos de TX metros do gol é marcado a 1 m, e não mais a 2–6 m.

Resultado em 2000 partidas, mesmas sementes:

| Variante | Gols por jogo | Chutes por time | Prova de coordenação |
|---|---|---|---|
| Base | 3,44 | 16,9 | passa |
| TX 25 m | 3,34 | 16,3 | reprova: T1 fora da área 4 contra 3 em S2 e S3 |
| TX 35 m | 3,22 | 16,1 | reprova: T1 5 em S4; vão da última linha 23,0 e 23,5 contra 22 em S3 e S4 |

O ganho (3% a 6%) não justifica mudar as faixas de T1 e T2. O vão da última linha é defeito real de forma, não de medição. Revertido.

**Critérios de aceite.**
- Recepção a até 22 m do gol: defensor mais próximo abaixo de 2,5 m.
- Marcador a menos de 2 m do próprio ponto na maior parte do tempo.
- Gols, chutes e `xG` por chute voltam às faixas de §11.
- Prova de coordenação (T1 a T10) segue verde: marcar mais não pode virar aglomeração.

## 6. Execução e disputas

O princípio: **o erro entra na execução, não num sorteio de resultado.** O passe sai com desvio de direção e força; a bola viaja; quem chega primeiro fica com ela.

| Ação | O que é sorteado | Atributos |
|---|---|---|
| Passe | desvio angular e de força (σ cresce com distância, pressão, fadiga, pé ruim) | passe, técnica, compostura |
| Recepção | qualidade do domínio (limpo, alonga, escapa) | primeiro toque, técnica, força do passe recebido |
| Interceptação | não é sorteada: tempo para alcançar a trajetória | antecipação (reage antes), aceleração, posicionamento |
| Condução | perda de controle por passo sob pressão | drible, equilíbrio, técnica |
| Drible × desarme | logística da diferença; falha do defensor pode virar falta | drible, agilidade, aceleração × desarme, antecipação, agressividade |
| Disputa aérea | logística; quem ganha direciona com erro | impulsão, cabeceio, força, posicionamento |
| Cruzamento | como passe alto com alvo em zona | cruzamento, técnica |
| Finalização | ver §7 | finalização, compostura, técnica, cabeceio |
| Goleiro | ver §7; saída em cruzamento e reposição | reflexos, defesa, um contra um, domínio da área, reposição, posicionamento |

Forma logística padrão: `P = 1 / (1 + e^(−(Δ − d)/k))`, com `Δ` = diferença ponderada de atributos, `d` = dificuldade do contexto, `k` = dispersão (PARÂMETRO por disputa).

Implementação (MC-256): núcleo `packages/match-engine/src/rules/`. `math.ts` calcula exponencial, logística, arco tangente e desvio normal só com `+ − × ÷` (redução de intervalo e série; normal como soma de seis uniformes), o que cumpre o objetivo do ADR-013 item 6 sem tabela; `duel.ts` tem a escala de atributo (0 a 1), a média ponderada e `contest(Δ, d, k)`. `rules.test.ts` proíbe o núcleo de importar fora de si (exceto contrato e gerador), proíbe outro arquivo da engine de redefinir um nome exportado pelo núcleo e proíbe função transcendental de `Math` em arquivo de simulação.

### 6.1 Bola
Estados: `presa` (acompanha o dono), `rolando` (atrito linear: perde velocidade a taxa constante por segundo), `no ar` (parábola com altura; só pode ser disputada abaixo de 2,6 m; quica com perda), `parada`. Passe rasteiro, passe alto, cruzamento e chute definem velocidade e ângulo iniciais com o erro de execução. A bola é integrada com o mesmo `DT`, mas alcance e interceptação usam tempo de chegada calculado em forma fechada sobre o segmento, para não depender do tamanho do passo. Trave, saída de campo e linha do gol são testes geométricos sobre o segmento do passo.

### 6.2 Ocupação e contato
Sem física de corpo rígido. Cada jogador ocupa um disco de 0,3 m de raio; discos não se atravessam (resolução por separação, determinística por índice). Quem está entre o adversário e a bola **protege** a bola: o desarme de quem vem por trás tem dificuldade maior e risco de falta maior. Carga ombro a ombro é uma disputa de `força` e `equilíbrio`. Barreira e aglomeração na área limitam o corredor de chute por oclusão geométrica.

### 6.3 Disputa aérea
Cruzamento (2026-11-16, ordem aprovada item 5): o cruzador avalia primeiro pau, marca do pênalti e segundo pau com a mesma física de chegada do passe (um companheiro precisa chegar com a bola e antes do primeiro defensor ou do goleiro; precisão por `cruzamento`) e o valor de um cabeceio dali. O cruzamento é esperado pelos dois lados: atacantes e defensores atacam a bola sem atraso de reação (a leitura curta do passe pelo defensor continua). Erro de queda do cruzamento 1,8 vez o da bola longa (PARÂMETRO). Medido (40 partidas): 13,8 cruzamentos e 5,7 escanteios por time, 18% dos cruzamentos viram cabeceio, cabeceios 20% dos chutes (referência 15% a 18%).

**Cruzamento avaliado como o motor joga (DECISÃO, 2026-11-18).** A estimativa do cruzador contava como perdido todo cruzamento em que um defensor chegava primeiro. No motor, o companheiro que chega até 0,5 s depois dele salta junto e disputa pela força aérea. Medido em 40 partidas com a estimativa antiga: cruzamentos estimados em 0,05 (três quartos dos cruzamentos) davam a primeira bola ao ataque em 26% das vezes, e 47% viravam disputa; os estimados entre 0,43 e 0,57 davam só 32% a 37%. Regra nova:

- p = precisão × (chegar primeiro + (1 − chegar primeiro) × disputa) × companheiro alcança a bola.
- Chegar primeiro: companheiro antes do primeiro defensor de linha e do goleiro.
- Disputa: o companheiro chega até 0,5 s depois do primeiro defensor de linha (`AERIAL_CLOSE`), o goleiro não chega antes desse defensor, e o companheiro vence pela diferença de força aérea (`aerialScore`, escala 0,07, o ruído do duelo).

Em 2000 partidas, mesmas sementes: gols 3,23 para 3,26 (dentro do ruído), chutes 12,5 nos dois, amarelos 3,17 para 3,09, escanteios 6,3 para 6,6. Em 100 partidas: cruzamentos de jogo corrido de 10,3 para 11,8 por time, cabeceios de 14,1% para 14,8% dos chutes, disputas aéreas com os dois times perto estáveis (10,3 e 10,1 por jogo, contra cerca de 25 na Série A). As disputas que faltam não vêm do cruzamento: vêm da bola longa, cujo alvo está em média a 10 m do adversário mais próximo no momento do passe. Testes em `match.test.ts` ("a team-mate level with his marker at the spot is a duel, not a lost ball" e "the duel is worth more for a team-mate who is better in the air").
Quem disputa: os jogadores que alcançam o ponto de queda a tempo. Vence por logística de `impulsão`, altura, `cabeceio`, `força`, `posicionamento` (quem chegou antes e parado leva vantagem), `agressividade`. O vencedor direciona com erro; perder a disputa não tira o jogador do lance (segunda bola). Goleiro dentro da área disputa com as mãos, com alcance maior.

### 6.4 Goleiro
Posicionamento sobre a bissetriz do ângulo de chute, com profundidade dada por função e `posicionamento de goleiro`. Defesa: tempo de reação (`reflexos`) mais tempo de deslocamento até o ponto de cruzamento da bola com o plano do gol, limitado por alcance; bola dentro do alcance é defendida com probabilidade que cai com velocidade e distância ao corpo. Resultado da defesa: segura, espalma para o lado ou devolve para a frente (rebote), conforme `defesa`. Um contra um: sai ou fica, por `um contra um` e `decisões`. Cruzamento: sai ou fica, por `domínio da área`. Reposição com a mão ou o pé conforme plano e `reposição`.

DECISÃO (2026-11-17, bug do goleiro na bola longa): o goleiro só sai do gol para uma bola que ele encontra em voo (até 4 s à frente) e antes do adversário mais rápido. Antes ele corria para onde a bola morreria quando ninguém a alcançava, e o atacante dominava antes e chutava com o gol vazio. Testes em `match.test.ts` ("the keeper on a long ball"). Medido em 2000 partidas, mesmas sementes: gols 3,80 para 3,61 (−5%). A primeira medida, 3,92 para 3,49 em 600 partidas, foi otimista: o ruído e uma instrumentação temporária que consumia sorteio pesaram. Chutes defensáveis que viram gol caíram de 21 para 4 em 40 partidas.

### 6.4.1 Goleiro no modelo de jogo

O goleiro também é jogador de linha quando o plano pede: opção de passe na saída (posição entre ou ao lado dos zagueiros), altura fora da área com o time adiantado (cobre a bola nas costas da linha alta, com risco de chute por cobertura), tipo de reposição (curta, lançamento para o ponta, chute para disputa), organização da última linha (melhora a sincronização do impedimento conforme `liderança` e `comunicação`), posição em bola parada. Atributos de linha relevantes ao goleiro: `passe`, `primeiro toque`, `decisões`, `compostura`. Contratar goleiro passa a depender do modelo de jogo.

### 6.5 Árbitro e regras
- **Falta**: nasce de desarme falho, carga, puxão ou mão; gravidade por velocidade relativa, direção (por trás) e zona. Implementado (2026-11-16): desarme (com falta tática) e disputa aérea: quem perde a disputa empurra ou sobe no adversário com chance de 6% a 16% pela `agressividade` (15% disso dentro da própria área, onde seria pênalti). Disputa aérea: quem está a 1,8 m e o adversário que, já em movimento, chega ao ponto em até 0,5 s (PARÂMETRO). Defensores de linha também atacam a bola alta na própria área. Defensor driblado derruba ou segura o portador com chance de 15% a 35% pela `agressividade` (15% disso na própria área). Falta ainda: mão.
- **Cartão**: por gravidade, por parar ataque promissor, por reincidência e por reclamação (traço). Segundo amarelo expulsa. Rigor do árbitro é parâmetro da partida, sorteado do pacote.
- **Vantagem**: aplicada se o time que sofreu mantém a bola e o valor de posse é maior que o da cobrança; o cartão fica para a próxima paralisação.
- **Impedimento**: avaliado no instante do passe. Fora de jogo quem, no campo adversário, está à frente da bola e do penúltimo adversário. Só é punido se participar: receber a bola, disputar ou obstruir o goleiro. Não há impedimento em tiro de meta, lateral e escanteio. Margem de erro do árbitro em lances de menos de 0,3 m é parâmetro (zero se a competição tem árbitro de vídeo).
- **Pênalti**: falta punível com tiro livre direto dentro da área. Cobrança resolvida como finalização com `xG` do pênalti (`bola parada`, `compostura` contra `reflexos`, com lado escolhido).
- **Reinícios**: tiro de meta, lateral, escanteio, tiro livre direto e indireto, bola ao chão, saída de bola. Barreira a 9,15 m.
- **Substituições**: cinco em três paradas, mais intervalo (parâmetro da competição); extra por concussão se o regulamento do pacote prever.
- **Acréscimos**: soma de tempos parados medidos. Prorrogação e pênaltis conforme a fase da competição (ADR-016).
- Fora do modelo por enquanto: simulação de erro grave de arbitragem como evento, recuo para o goleiro, regra dos seis segundos.

Lesão: risco por minuto função de carga acumulada, fadiga, idade, histórico e contato (taxas em `docs/pesquisa/modo-clube/02-formacao-e-desenvolvimento.md`).

## 7. Gols esperados: chance, chute e goleiro são três coisas

1. **`xG` (qualidade da chance)**, calculado antes do chute e independente de quem chuta e de quem defende:

```text
logit(xG) = b0 + b1 × distância + b2 × ângulo de visão do gol + b3 × cabeceio
          + b4 × pressão do marcador + b5 × goleiro fora de posição + b6 × após cruzamento
          + b7 × contra-ataque + b8 × bola parada direta
```

1a. **Decisão de chutar**: o finalizador decide pela chance vezes a parte da boca do gol que ele vê livre (`shotClear`): cada corpo de linha entre ele e o gol projeta na linha do gol a sombra do mesmo alcance de bloqueio do voo (0,35 a 0,55 m pela `bravura`), mais o passo que dá enquanto a bola viaja (PARÂMETRO: 2 m/s a 23 m/s de chute); o goleiro fica para a defesa. Ele lê essa parte só em parte: de 0% a 40% pela `decisões` (PARÂMETRO calibrado em chutes por jogo da Série A). Como os modelos publicados de `xG` são ajustados sobre todos os chutes, bloqueados inclusive, e o voo bloqueia de verdade, o chute que passa pelos corpos converte a chance dividida pela parte livre (`shotClear`, mínimo 0,3; não vale para pênalti e cabeceio): na média, gols ≈ `xG` (medido: 0,99). O `xG` registrado continua sendo a chance. Calibração (2026-11-16): chutes vistos 80–100% livres são bloqueados 13% das vezes; bloqueios em 26% dos chutes (referência perto de 25%); chutes de fora da área 36% (referência 35 a 40%).
2. **Execução do chute**: o finalizador escolhe alvo e força; o erro de execução (`finalização`, `técnica`, `compostura`, pé, pressão, fôlego) desloca direção e velocidade. O chute pode sair para fora, ser bloqueado por oclusão ou ir no gol.
3. **`xG pós-chute`** (FATO: modelo pós-chute, de 0 a 1 por chute no alvo; gols evitados = `xG pós-chute` sofrido menos gols sofridos): probabilidade de gol dada a trajetória real em direção ao gol (colocação, velocidade, distância do goleiro ao ponto de cruzamento). Só existe para chutes no alvo.
4. **Defesa**: o goleiro resolve contra a trajetória (§6.4).

Avaliação: finalizador = `xG pós-chute` menos `xG` (coloca a bola melhor ou pior do que a chance valia); goleiro = `xG pós-chute` sofrido menos gols sofridos (gols evitados). O relatório usa os três números: "criaram pouco, chutaram bem, e o seu goleiro não ajudou" é uma frase que o jogo consegue dizer com fato.

Coeficientes: PARÂMETROS iniciais da literatura (pesquisa 01), ajustados até a conversão por faixa de distância bater com a referência. DECISÃO (2026-11-16): a fórmula do `xG` não é usada para acertar a média de gols; quando sobra gol, corrige-se o excesso de chances no jogo (defesa, decisão de chutar). Entre 2026-11-13 e 2026-11-16 o intercepto foi baixado de −1,1 para −1,4 para esse fim e foi revertido. Por construção, para finalizador e goleiro medianos a taxa de gol média de um conjunto de chances iguala o `xG`; `finalização` e `compostura` deslocam a conversão de forma moderada (PARÂMETRO: de −25% a +25% relativos entre 40 e 90 de atributo).

## 8. Tática

### 8.1 Plano tático (dado)

O esquema de verdade é `TacticalPlanSchema` em `packages/match-engine/src/contract.ts` (MC-145). Lá os valores são identificadores em inglês (`'short' | 'mixed' | 'long'`, `'counterPress' | 'regroup'`…), traduzidos na tela por chave; o bloco abaixo mostra o desenho em português. O contrato acrescenta `restDefence` (2 a 5, §5.9) às instruções de time; formações por fase são 11 pontos no referencial do time; funções e instruções individuais são listas de 11, na ordem dos slots.

```ts
interface TacticalPlan {
  shapes: Record<'inPossession' | 'outOfPossession' | 'buildUp' | 'lowBlock', Shape>; // 2 obrigatórias
  team: {
    buildUp: 'curta' | 'mista' | 'longa'; tempo: 1..5; width: 1..5; risk: 1..5;
    progression: 'circular' | 'vertical' | 'pelos lados' | 'pelo centro';
    finalThird: { crosses: 1..5; throughBalls: 1..5; boxPresence: 1..5; shootFromDistance: 1..5 };
    onLoss: 'contrapressão' | 'recompor'; onWin: 'contra-ataque' | 'reter';
    block: 'alto' | 'médio' | 'baixo'; lineHeight: 1..5; compactness: 1..5;
    pressIntensity: 1..5; pressTriggers: PressTrigger[]; forceDirection: 'dentro' | 'fora' | null;
    offsideTrap: boolean; timeWasting: 0..3;
  };
  roles: Record<slot, RoleId>;
  individual: Record<slot, InstructionSet>;
  marking: Array<{ slot: number; targetOpponentSlot: number; mode: 'individual' | 'pressionar' }>;
  setPieces: Record<SetPieceKind, RoutineId[]>;
}
```

### 8.2 Posição, função, instrução (sem redundância)
- **Posição** (13): onde o jogador sabe jogar; pertence ao jogador; define adaptação.
- **Função** (ex.: lateral que apoia, lateral invertido, ala, volante de contenção, construtor, meia infiltrador, armador, ponta aberto, ponta por dentro, pivô, falso 9, atacante de profundidade, líbero, goleiro-líbero): conjunto nomeado de candidatos de movimento e vieses. Pertence ao slot do plano.
- **Instrução individual**: modifica um viés ou habilita ou proíbe um candidato da função. Lista por função; a tela só mostra as válidas.
- "Papel" e "dever" não existem como conceitos separados.

### 8.3 Toda instrução declara o que move
Tabela obrigatória no código (`instructions.ts`): `id → { variáveis afetadas, métrica que deve mudar, custo esperado }`. Exemplos:

| Instrução | Variável na engine | Métrica que sobe | Custo |
|---|---|---|---|
| Linha alta | `lineHeight` na âncora da defesa | compactação, recuperações no campo adversário | bolas nas costas, impedimentos a favor do risco |
| Pressão 5 | N de pressionadores, `urgency` | recuperações altas, erros de saída do rival | fôlego aos 75 min, espaço entre linhas |
| Saída curta | viés de passe do goleiro e zagueiros | posse, passes no próprio terço | perdas perto da área |
| Lateral invertido | âncora com bola no corredor central | superioridade no meio | largura daquele lado |
| Ponta aberto | âncora colada à linha | largura, 1×1 no lado | menos gente na área |
| Marcar o 10 | candidato `marcar` fixo | toques do alvo caem | buraco na zona do marcador |

O teste causal de cada linha roda 500 sementes com e sem a instrução e exige o sinal esperado nas duas colunas (`TASKS.md`).

### 8.4 Conflitos e prioridade
Ordem de precedência, do mais forte ao mais fraco: comando ao vivo → marcação designada → instrução individual → função → instrução de fase do time → princípio do time. Limites físicos e de regra (impedimento, linha pedida) nunca são violados por viés. O editor detecta pares incompatíveis conhecidos (ex.: "ficar aberto" + "entrar por dentro") e mostra o efeito previsto em vez de proibir.

### 8.5 Familiaridade e complexidade
- `familiarity` por jogador, por função e por plano (0..1). Sobe com treino tático e minutos; cai com troca de plano.
- Efeito: atraso de reação nas reavaliações, ruído na âncora, erro na sincronização de pressão e de bola parada.
- Complexidade do plano = soma dos custos das instruções não padrão e das diferenças entre formações por fase. O teto que o elenco absorve vem de `decisões`, `trabalho em equipe` e qualidade do treinador. Acima do teto, a familiaridade máxima alcançável cai. Plano simples rende logo; plano complexo rende mais depois de treinado (HIPÓTESE de equilíbrio, verificada no torneio de presets).

### 8.6 Bola parada, ofensiva e defensiva

FATO (Sarmento e outros, 2025, International Journal of Sports Medicine; `docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 6): revisão de 95 estudos sobre bola parada em futebol masculino adulto de níveis competitivos altos (não só profissional). O uso aqui é qualitativo: tipo de cobrança, organização defensiva e número de envolvidos importam; os pesos são PARÂMETROS.

**Situações cobertas**: escanteio (curto, fechado, aberto), falta lateral, falta direta, falta indireta, lateral (curto e longo na área), pênalti, tiro de meta, saída de bola.

**Rotina ofensiva** = posições iniciais, corridas com instante de partida, alvo da cobrança, papéis (primeira trave, segunda trave, bloqueio, distração, rebote, entrada da área) e **defesa de descanso da rotina** (quem fica para o contra-ataque).

**Esquema defensivo** = marcação por zona, individual ou mista; quantos na barreira; quem fica na trave; quantos ficam à frente para o contra-ataque; linha de impedimento em falta lateral.

Resolvidas pela mesma física: cobrança com erro, disputa aérea, segunda bola, transição. Esquema padrão de escanteio enquanto o plano não traz rotina (2026-11-16): no ataque, a defesa de descanso do plano fica atrás (no mínimo 2), dois na entrada da área e os demais em primeiro pau, centro da pequena área, segundo pau, marca do pênalti e área do segundo pau, os melhores no alto primeiro; na defesa (mista), os melhores no alto marcam os atacantes da área pelo lado do gol, os demais em zona a partir do primeiro pau, e um atacante fica na frente para o contra-ataque. No cruzamento, até três defensores de linha que estão na área atacam a bola. PARÂMETROS. `sincronização` da rotina cresce com treino (`03` §5.1); um treinador de bola parada na comissão acelera (`06`).

### 8.7 Memória tática e repertório

> **Revisão 4: cortado como sistema autônomo.** Não há tarefa de implementação nos cortes 1 a 3. O efeito "repetir perde valor" fica coberto pelo treinador adversário (§10), que lê as últimas partidas do rival no relatório do analista. O texto abaixo fica como registro do desenho, porque o dono aprovou o corte "num primeiro momento" e o sistema pode voltar (`ROADMAP.md` §4, questão 18).

Cada clube guarda, por adversário e por temporada, contagens do que viu: rotinas de bola parada usadas, lado de construção preferido, função dos laterais, gatilhos de pressão, quem bate falta. O treinador rival usa essa memória na preparação, na proporção de `análise de adversário` e do nível do departamento de análise: rotina vista N vezes rende menos contra ele (o bônus de leitura decai com o tempo e zera se a rotina muda). O mesmo vale para o usuário: o relatório de adversário mostra os padrões que o analista dele registrou.

Consequência: repetir sempre a mesma coisa perde valor ao longo da temporada. Ter duas ou três variações treinadas (rotinas, saída de bola, lado do lateral que sobe) é uma vantagem real, e custa tempo de treino.

## 9. Comandos ao vivo

```ts
type Command =
  | { kind: 'team'; set: Partial<TacticalPlan['team']> }
  | { kind: 'player'; slot: number; set: Partial<InstructionSet> | { role: RoleId } }
  | { kind: 'mark'; slot: number; target: number | null }
  | { kind: 'swap'; a: number; b: number }
  | { kind: 'sub'; out: number; inPlayerId: string; slot?: number }
  | { kind: 'shout'; shout: 'intensidade' | 'concentração' | 'calma' | 'pressão' | 'objetividade' | 'incentivo' };
// carimbados pelo servidor com atMs
```
- Jogador nunca é teleportado: comando muda alvo e viés; ele corre até lá.
- Mudança de função ou formação no meio do jogo derruba `familiarity` do que mudou.
- **Gritos** mexem só em estado mental (`urgency`, `focus`, `composure`), com resposta por jogador (personalidade, moral, confiança no técnico, liderança do capitão em campo), duração limitada e retorno decrescente por repetição. Nunca somam em atributo.
- Cada comando gera evento com estado anterior, posterior e, no relatório final, a métrica observada nos 10 minutos seguintes.

## 10. Treinador adversário

A cada 5 minutos de jogo e nos intervalos, o treinador rival lê diagnósticos (duelos por corredor, sucesso da própria pressão, bolas nas costas sofridas, diferença de `xG`, fôlego, placar, cartões). Regras com limiar escolhem ajuste. `leitura de jogo` define quanto diagnóstico ele enxerga e com que atraso; `flexibilidade`, quantas mudanças aceita; mudar custa familiaridade como para o usuário. Treinador conservador pode não mudar nada.

## 11. Saída, estatística e explicação

- **Quadros**: `{ t, ball: [x, y, z], p: Int16Array(44) }` em decímetros a 4 Hz, só nos modos com visualização.
- **Eventos**: passe, recepção, interceptação, desarme, drible, falta, cartão, impedimento, finalização (com `xG`), defesa, gol (com assistência), escanteio, lateral, substituição, lesão, comando, mudança de fase.
- **Estatísticas**: por time e por jogador, mais mapas por zona e matriz de duelos por par.
- **Explicação da partida** (DECISÃO: é parte da engine, não da tela; devolve chaves de mensagem com parâmetros, ADR-017). Função pura sobre o log. Passos: (1) decompõe o saldo de gols em **criação** (saldo de `xG`) e **conversão** (gols menos `xG` de cada lado, que inclui finalizador, goleiro e acaso); (2) atribui o saldo de `xG` a fatores medidos no log: corredor, bola parada, transição, pressão, duelos por par, fôlego no fim, cartão, lesão; (3) devolve os fatores de maior peso com número. Se a conversão explica mais do resultado que a criação, a primeira mensagem diz isso ("criou 2,1 de gol esperado e fez 0; o goleiro deles defendeu 7"), sem inventar causa tática. Cada fator aponta a decisão que o afetaria, quando existe uma; para acaso, não aponta nenhuma.

### Contrato de evidência da explicação

Toda frase do relatório é uma afirmação verificável. Cada fator devolvido tem a forma `{ chave, parâmetros, evidência: { métrica, valor, referência, janela, eventos: [ids] }, peso }`. Regras:

- Sem evidência, sem frase. Um fator cujo valor não se afasta da referência (a média do próprio time na temporada, ou a do adversário) além de um limiar declarado não é citado.
- A soma dos pesos dos fatores de criação reconstrói o saldo de `xG` dentro de tolerância; o que não foi atribuído aparece como "não explicado", com o tamanho, e nunca é distribuído entre os fatores.
- O relatório pode ser auditado: dado o registro de eventos, um teste recalcula cada número citado.
- Linguagem de causa só quando há teste causal da instrução ou do mecanismo (`TEST_STRATEGY.md` §3); no resto, linguagem de fato ("perdeu 9 de 12 disputas pelo lado direito"), sem "por isso".

### Zebras
O time pior pode ganhar, e a engine não protege ninguém (`00-VISAO-E-PRODUTO.md` §8). Caminhos legítimos modelados: bloco baixo e transição contra linha alta; bola parada; goleiro; eficiência acima do `xG`; estado mental (intensidade, compostura, concentração, resposta a jogo grande e a estádio cheio); expulsão e lesão do adversário. A engine não recebe a informação de qual time é do usuário. Suíte Z1 a Z22 em `TEST_STRATEGY.md` §4.

### Faixas-alvo de calibragem (PARÂMETROS; gols e resultado fechados em `docs/pesquisa/modo-clube/12-calibragem-dados-proprios.md`)

DECISÃO do dono (2026-11-16): a referência de todas as faixas é o Brasileirão Série A; outras ligas entram como referência secundária, citada ao lado, quando faltar dado da Série A ou para comparar. Faixa sem dado da Série A diz de onde veio.
| Métrica (por partida, times equilibrados) | Faixa inicial |
|---|---|
| Gols, primeira divisão | 2,2 a 2,5 por temporada simulada; média de longo prazo 2,40 (FATO: 3.317 partidas da Série A, 2018 a 2026; temporadas entre 2,18 e 2,52) |
| Gols, segunda divisão | 2,0 a 2,25; média 2,13 (FATO: 2.717 partidas da Série B, 2018 a 2025) |
| Mandante / empate / visitante, primeira divisão | 47,6% / 27,5% / 24,9% na média (FATO, mesma base); por temporada o mandante oscila entre 44% e 53% |
| Mandante / empate / visitante, segunda divisão | 45,9% / 29,8% / 24,2% (FATO) |
| 0 a 0 | 8,4% na primeira divisão, 11,8% na segunda (FATO) |
| Três gols ou mais no jogo | 43,9% e 36,8% (FATO) |
| Diferença de três gols ou mais | 11,0% e 7,8% (FATO) |
| Variância dos gols por time | um pouco abaixo da média (mandante 1,33 contra 1,41 na primeira divisão): não forçar Poisson |
| Gols, terceira e quarta divisões | C: 2,00 a 2,42, agregado 2,19; D: 2,24 a 2,43, agregado 2,34 (FATO, 2021 a 2025, contagem sobre páginas públicas de cada temporada; Série D só fase de grupos no mando) |
| Mandante vence, terceira e quarta divisões | C 47,4%; D 45,2%; o mandante faz cerca de 59% dos gols nas quatro divisões (FATO, mesma contagem) |
| Finalizações por time | 12,6 a 13,6 (FATO: Série A, 2017 a 2023, conjunto de dados comunitário; 2024 e 2025 não encontrados) |
| No alvo por time | 4,0 a 4,6 (FATO, mesma fonte: cerca de um terço das finalizações) |
| Gols por finalização | 0,085 a 0,10 (Série A: 2,2 a 2,5 gols em 12,6 a 13,6 finalizações por time dão conversão de 8,1% a 9,9%; referência secundária, Premier League: 0,10 a 0,12). A bancada compara gols sobre chutes. O `xG` do motor por chute é outra medida e só é impresso, sem faixa (DECISÃO 2026-11-17: antes a bancada comparava o `xG` por chute com esta faixa de conversão). |
| Passes de 40 m ou mais | abaixo de 13,8% dos passes (Série A 2025: o quarto time mais direto tem 13,8% de passes longos, Flashscore, rodada 16). É um teto, não uma faixa: vale para qualquer definição de passe longo até 40 m. `LOFT_COST` (`carrier.ts`, 0,01) foi calibrado nele e no acerto de passe. Em 2000 partidas: passes de 40 m ou mais de 18% para cerca de 13%, acerto de passe de 76% para 80%, gols de 3,44 para 3,34, impedimentos de 1,41 para 1,11 (ver §5.4: impedimento pelo tempo do lance). |
| `xG` do pênalti | 0,77 a 0,79 (FATO) |
| Expulsão cedo | cerca de +0,6 `xG` para quem fica com 11 e −0,5 para quem fica com 10 (FATO; teste de cenário) |
| Corrida intensa nos 15 min finais | queda de cerca de 26% (FATO; valida o modelo de fôlego) |
| Altitude | cerca de 0,5 gol por 1.000 m de diferença (FATO; efeito máximo, só visitante não adaptado) |
| Sem público | vantagem do mandante cai de um sexto a um terço, não some (FATO; limita o peso da torcida no mando) |
| Passes por time, acerto | 415 a 428, cerca de 80% (FATO, Série A, mesma fonte) |
| Escanteios por time | 5,05 a 5,51 (FATO) |
| Faltas por time | 13,4 a 15,9 (FATO) |
| Amarelos por time | 2,15 a 2,59; vermelhos 0,10 a 0,15 (FATO) |
| Impedimentos por time | 1,32 a 1,75 (FATO) |
| Distância por jogador de linha | 9,5 a 11,5 km |
| Conferência: Série A 2026 (FBref, tabelas agregadas por time, 34 rodadas, 682 jogos-time; trazidas pelo dono em 2026-11-17) | gols 2,57 por jogo; por time: finalizações 14,05, no alvo 4,61 (33%), gols por finalização 0,091, faltas 13,2, amarelos 2,32, vermelhos 0,13, impedimentos 1,42, cruzamentos 19,4, desarmes vencidos 9,65, interceptações 8,8. Fonte diferente da que gerou as faixas (definições podem mudar o número, sobretudo finalizações e interceptações); as faixas acima continuam as de várias temporadas. A FBref não publica tabela de passes para a Série A: passes completados para o terço final (coluna "1/3") seguem SEM REFERÊNCIA na liga principal |
| Duelos aéreos por jogo | cerca de 25 (FATO, Série A 2026, conferido em 2026-11-18: AS, "Total aerial duels" por time, média 845 em 34 jogos, 24,9 por jogo; NumberTwenty via pesquisa do dono, 12,4 vencidos por time, 24,8 por jogo). Definição Opta: dois jogadores disputam a bola no alto; quem fica com ela vence. Taxa de vitória por time entre cerca de 45% e 54%. Ainda sem faixa na bancada: o motor não registra o duelo. Medição provisória (40 partidas, 2026-11-18): 21,9 bolas altas disputadas por jogo, só 10,0 com jogadores dos dois times perto; 0,88 falta aérea por jogo |
| Grandes chances criadas por time | cerca de 2,2 por jogo (FATO, Série A 2026, Statz.ai, atualizado em 14/11/2026: 1.470 em 20 times com 34 jogos; Flamengo 3,4, Remo 1,6). Definição Opta: chance em que se espera razoavelmente que o jogador marque, em geral um contra um ou chute muito perto; pênalti conta. Não é a medida de "atacante sozinho" do motor (8,2 por time). Comparar só depois de o motor marcar grande chance com a mesma definição |
| Largura e comprimento do time | largura 35 a 48 m, comprimento 31 a 46 m, área cerca de 900 m², stretch index 7 a 16 m (Rico-González et al., 2022, revisão sistemática, PMC8805357). Mistura fases com e sem bola (com bola é maior): não serve para calibrar largura com bola |
| Passes longos completos por time | 24,6 a 28,6 nos cinco times de maior volume (NumberTwenty 2026, via pesquisa do dono, não conferido: a página não abre por leitura simples). Definição de distância não confirmada; FBref usa mais de 30 jardas (27,4 m) |
| Passes no próprio campo por time | 188 a 244 nos cinco times de maior volume (NumberTwenty 2026, via pesquisa do dono, não conferido). Próprio campo não é terço defensivo |
| Gols de bola parada | 18 a 25% (FATO: 18% na Liga dos Campeões de 2023/24, 66 de 375; 24,4% na Copa de 2022; a definição muda o número) |
| Origem dos gols de jogo corrido | transição cerca de 22%, posse controlada cerca de 42% (FATO: Liga dos Campeões de 2023/24) |
| Forma do time | comprimento 31 a 46 m, largura 35 a 48 m, dispersão média em torno do centro 7 a 16 m, área perto de 900 m²; tudo maior com a posse (FATO: revisão sistemática de dados de rastreamento). Distância entre linhas por altura de bloco: NÃO ENCONTRADO |
| Sprints e acelerações | distância em sprint por posição de 88 m (meia central) a 338 m (ala); 26 a 35 acelerações acima de 3 m/s² por jogo (FATO: uma temporada de uma liga europeia, 23 jogadores; amostra pequena) |
| Favorito (diferença de 10 pontos de força) vence | medir; não fixar |
| Peso do acaso na tabela final | desvio por sorte perto de 7 pontos em 38 jogos contra 6 de habilidade (FATO, ligas europeias); a tabela simulada deve mostrar dispersão dessa ordem |

Referência de controle de campo (FATO, código público de Spearman): velocidade 5 m/s, reação 0,7 s. A liga de simulação 2D da RoboCup usa ciclo de 100 ms e 6.000 ciclos por partida; nosso passo de 250 ms é uma economia a validar. Medição da sandbox (MC-028; escopo: só âncoras, movimento e bola por roteiro, sem decisão nem disputa; ambiente: Intel(R) Core(TM) 7 250U, Node 24.12, um núcleo, média de 20 partidas depois de aquecimento, máquina de desenvolvimento com outros processos): 94 ms por 90 minutos só de movimento; trecho de 5 minutos de quadros = 87 KB comprimido; partida inteira = 1,5 MB comprimido, por isso os quadros só viajam em trechos.

## 12. Nível 2: engine por posses (as outras partidas)

Decisão do dono (2026-11-13): partida de rival também é simulada, não sorteada. ADR-013 item 3.

- **Núcleo de regras compartilhado** (revisão 4): os dois níveis importam o mesmo módulo `rules/` para tudo o que não depende de coordenada contínua: escala de atributos, fórmulas de disputa (§6), `xG` e chute (§7), fôlego, cartões e faltas, lesão, substituição, decisão do treinador rival, vocabulário de eventos e de estatísticas, e a função de explicação. O que difere são os **executores**: o nível 1 resolve espaço por posição e tempo de chegada; o nível 2, por zona e superioridade numérica. Uma regra corrigida no núcleo vale para os dois; um teste de código proíbe o nível 2 de ter cópia própria de fórmula do núcleo.
- **Campo**: 18 zonas (6 faixas de profundidade × 3 corredores). Cada jogador ocupa zonas conforme função, formação da fase e instruções (a mesma tabela de âncoras do nível 1, discretizada).
- **Posse**: sequência de ações do portador até gol, finalização, perda ou bola parada. A cada ação o portador escolhe entre avançar por passe, conduzir, driblar, cruzar, finalizar ou recuar, com a mesma utilidade do §5.4 calculada sobre zonas (valor da zona, superioridade numérica local, viés de instrução e traço).
- **Disputas**: as mesmas fórmulas do §6, entre o portador e o defensor responsável pela zona (escolhido por função e marcação designada). Pressão, cobertura e linha alta entram como modificadores de zona derivados do plano.
- **Finalização**: `xG` pela zona, tipo de jogada e pressão, mesma regra do §7.
- **Fôlego, cartões, lesões, substituições, treinador rival**: mesmas regras, com passo por posse em vez de passo por tempo.
- **Relógio**: cada ação consome tempo sorteado por tipo; metas de bola rolando e de ações por jogo iguais às do nível 1.
- **Saída**: eventos nomeados (quem passou, quem desarmou, quem fez), estatística por jogador e por setor, nota por jogador. Sem quadros.
- **Custo-alvo**: até 2 ms por partida; rodada inteira (39 jogos) abaixo de 100 ms.
- **Aceite** (ADR-013 item 4): equivalência **estatística** com o nível 1 (placar, finalizações, posse, `xG`, cartões pelo protocolo de `TEST_STRATEGY.md` §2.1) e **coerência tática**, verificada por testes próprios do nível 2: cada instrução move a métrica que declara no sentido declarado. Não se exige o mesmo tamanho de efeito nem a mesma cadeia causal do nível 1.

O usuário pode abrir o relatório de qualquer jogo do dia, de qualquer competição: placar, autores, estatísticas, notas e os três fatores por setor. Rever em campo só existe nos jogos do próprio clube.

## 13. Campo 2D (`match-view`)

- Recebe quadros e eventos; interpola entre quadros a 4 Hz; não calcula futebol.
- Camadas ligáveis: nomes, setas de alvo com intenção, linhas de passe abertas, zona de pressão, controle de campo, linha de impedimento, mapa de calor.
- Controles: pausar, 1×, 2×, 4×, pular para o próximo lance de `xG` ≥ 0,1, replay do último lance.
- Toque no jogador abre comandos válidos para a função; arrastar jogador no editor tático move o slot da formação da fase escolhida.
- Acessível: placar, relógio e últimos eventos também em texto ao vivo (`aria-live`), cores de time com contraste e forma distinta, `prefers-reduced-motion` troca animação contínua por posições a cada lance.
- Biblioteca: decisão por medição (ADR-015 item 5).

## 14. Primeira fatia: sandbox (Fase 2)

Prova quatro coisas: contrato espacial, determinismo, instrução que move jogador, desenho fluido no celular. Conteúdo: campo, 22 agentes de teste e bola; duas formações (4-3-3 com bola, 4-1-4-1 sem bola); âncora por posição da bola; uma bola que circula por roteiro determinístico entre jogadores (sem disputa ainda); três instruções que mudam âncoras (largura, altura da linha, lateral invertido); quadros a 4 Hz; página `/tecnico/sandbox` com pausa, velocidade e os três controles. Fora da sandbox: passe com erro, disputa, chute, árbitro (Fase 3).
