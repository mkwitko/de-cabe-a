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

Os períodos são PARÂMETROS medidos na bancada (`TEST_STRATEGY.md` §4.2) contra `DT = 0,1 s`: aceita-se o passo maior se as distribuições de eventos não diferem pelo protocolo de equivalência (`TEST_STRATEGY.md` §2.1). Determinismo: a ordem de resolução dentro de um passo é fixa (por instante, depois por índice do jogador).

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

- Aceleração e velocidade máxima por atributo: `vmax = 6,0 + 3,2 × (velocidade/99)` m/s; aceleração `2,5 + 3,0 × (aceleração/99)` m/s² (PARÂMETROS; conferir com dados físicos da pesquisa). Fadiga reduz as duas.
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
- Percepção: uma opção só entra na lista se o jogador a "vê": chance cresce com `visão` e cai com ângulo fora do campo visual e com pressão.
- Escolha por softmax; temperatura cai com `decisões` e `compostura`, sobe com pressão e fadiga. Mentalidade e `risco` do plano deslocam o peso do termo de perda.

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

**Prova de coordenação antes de crescer** (MC-246): antes de implementar a tabela de instruções inteira, a engine precisa passar nos testes de trajetória T1, T2, T3, T5 e T9 só com forma do time, atribuição de tarefas e bola por roteiro, em seis cenários fixos. Sem isso, cada instrução nova é ajustada em cima de um movimento coletivo errado. Mecanismos de referência (simulação 2D da RoboCup e outros): `docs/pesquisa/modo-clube/11-simulacao-e-coordenacao.md` itens 1 e 2.

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

### 6.1 Bola
Estados: `presa` (acompanha o dono), `rolando` (atrito linear: perde velocidade a taxa constante por segundo), `no ar` (parábola com altura; só pode ser disputada abaixo de 2,6 m; quica com perda), `parada`. Passe rasteiro, passe alto, cruzamento e chute definem velocidade e ângulo iniciais com o erro de execução. A bola é integrada com o mesmo `DT`, mas alcance e interceptação usam tempo de chegada calculado em forma fechada sobre o segmento, para não depender do tamanho do passo. Trave, saída de campo e linha do gol são testes geométricos sobre o segmento do passo.

### 6.2 Ocupação e contato
Sem física de corpo rígido. Cada jogador ocupa um disco de 0,3 m de raio; discos não se atravessam (resolução por separação, determinística por índice). Quem está entre o adversário e a bola **protege** a bola: o desarme de quem vem por trás tem dificuldade maior e risco de falta maior. Carga ombro a ombro é uma disputa de `força` e `equilíbrio`. Barreira e aglomeração na área limitam o corredor de chute por oclusão geométrica.

### 6.3 Disputa aérea
Quem disputa: os jogadores que alcançam o ponto de queda a tempo. Vence por logística de `impulsão`, altura, `cabeceio`, `força`, `posicionamento` (quem chegou antes e parado leva vantagem), `agressividade`. O vencedor direciona com erro; perder a disputa não tira o jogador do lance (segunda bola). Goleiro dentro da área disputa com as mãos, com alcance maior.

### 6.4 Goleiro
Posicionamento sobre a bissetriz do ângulo de chute, com profundidade dada por função e `posicionamento de goleiro`. Defesa: tempo de reação (`reflexos`) mais tempo de deslocamento até o ponto de cruzamento da bola com o plano do gol, limitado por alcance; bola dentro do alcance é defendida com probabilidade que cai com velocidade e distância ao corpo. Resultado da defesa: segura, espalma para o lado ou devolve para a frente (rebote), conforme `defesa`. Um contra um: sai ou fica, por `um contra um` e `decisões`. Cruzamento: sai ou fica, por `domínio da área`. Reposição com a mão ou o pé conforme plano e `reposição`.

### 6.4.1 Goleiro no modelo de jogo

O goleiro também é jogador de linha quando o plano pede: opção de passe na saída (posição entre ou ao lado dos zagueiros), altura fora da área com o time adiantado (cobre a bola nas costas da linha alta, com risco de chute por cobertura), tipo de reposição (curta, lançamento para o ponta, chute para disputa), organização da última linha (melhora a sincronização do impedimento conforme `liderança` e `comunicação`), posição em bola parada. Atributos de linha relevantes ao goleiro: `passe`, `primeiro toque`, `decisões`, `compostura`. Contratar goleiro passa a depender do modelo de jogo.

### 6.5 Árbitro e regras
- **Falta**: nasce de desarme falho, carga, puxão ou mão; gravidade por velocidade relativa, direção (por trás) e zona.
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

2. **Execução do chute**: o finalizador escolhe alvo e força; o erro de execução (`finalização`, `técnica`, `compostura`, pé, pressão, fôlego) desloca direção e velocidade. O chute pode sair para fora, ser bloqueado por oclusão ou ir no gol.
3. **`xG pós-chute`** (FATO: modelo pós-chute, de 0 a 1 por chute no alvo; gols evitados = `xG pós-chute` sofrido menos gols sofridos): probabilidade de gol dada a trajetória real em direção ao gol (colocação, velocidade, distância do goleiro ao ponto de cruzamento). Só existe para chutes no alvo.
4. **Defesa**: o goleiro resolve contra a trajetória (§6.4).

Avaliação: finalizador = `xG pós-chute` menos `xG` (coloca a bola melhor ou pior do que a chance valia); goleiro = `xG pós-chute` sofrido menos gols sofridos (gols evitados). O relatório usa os três números: "criaram pouco, chutaram bem, e o seu goleiro não ajudou" é uma frase que o jogo consegue dizer com fato.

Coeficientes: PARÂMETROS iniciais da literatura (pesquisa 01), ajustados até a conversão por faixa de distância bater com a referência. Por construção, para finalizador e goleiro medianos a taxa de gol média de um conjunto de chances iguala o `xG`; `finalização` e `compostura` deslocam a conversão de forma moderada (PARÂMETRO: de −25% a +25% relativos entre 40 e 90 de atributo).

## 8. Tática

### 8.1 Plano tático (dado)
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

Resolvidas pela mesma física: cobrança com erro, disputa aérea, segunda bola, transição. `sincronização` da rotina cresce com treino (`03` §5.1); um treinador de bola parada na comissão acelera (`06`).

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
| `xG` por finalização | 0,10 a 0,12 (FATO: conversão de 10,3% a 11,9% na Premier League) |
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
