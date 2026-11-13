# Modo Clube — estratégia de testes

Data: 2026-11-13, revisão 4. Complementa `docs/TEST_STRATEGY.md` e `docs/QUALITY_GATES.md` do site; não os substitui. Uma tarefa só é DONE com o teste dela executado e verde.

## 1. Camadas

| Camada | Onde roda | O que prova |
| --- | --- | --- |
| Unidade | vitest nos pacotes | uma regra: disputa, âncora, lançamento, evolução, desempate |
| Determinismo | vitest | mesma entrada, mesma saída byte a byte; trecho a trecho = inteiro; retomar de estado serializado = seguir direto |
| Invariantes | vitest, a cada passo de simulações longas | 22 em campo menos expulsos; uma bola; velocidade ≤ máxima; relógio monotônico; caixa = soma dos lançamentos; todo jogador em no máximo um clube; toda vaga de competição preenchida |
| Estatístico | vitest lento (`test:stats`), milhares de sementes | distribuições dentro das faixas de `02-MATCH-ENGINE.md` §11 |
| Causal | vitest lento | cada instrução move a métrica declarada e cobra o custo declarado |
| Zebra | vitest lento | §4, Z1 a Z22 |
| Equilíbrio | scripts de simulação longa (`test:world`) | 30 temporadas sem usuário e com "usuário ótimo" automático |
| Integração | vitest com Postgres (`*.int.test.ts`) | posse da carreira, corpo estrito, idempotência, concorrência, limite de taxa, alçada |
| Ponta a ponta | Playwright, 360 px e 1.280 px | fluxos críticos em toque, mouse e teclado |
| Tradução | build e lint | chave ausente falha; texto literal em tela do modo falha |
| Dados | linha de comando do pacote | validação e critério de publicação (`03` §1.3 e §1.6) |

Testes lentos não rodam em todo PR; rodam em PR que toca `packages/match-engine` ou `packages/club-domain` e toda noite.

## 2. Tolerâncias estatísticas

Cada faixa-alvo declara tamanho de amostra e tolerância. Para proporções (resultado, cartão) usa-se o intervalo de 99% da simulação contido na faixa. Todo teste estatístico roda com lista fixa de sementes, para ser determinístico: ele não "falha uma vez em cem".

### 2.1 Protocolo único de calibragem e de equivalência

Substitui os números soltos de versões anteriores (2.000 e 5.000 sementes). Vale para: engine contra dados reais, nível 2 contra nível 1, `DT` de 0,25 s contra 0,1 s, e qualquer troca de implementação que deva preservar comportamento.

1. **Dois conjuntos de sementes que não se misturam.** Calibragem (onde se ajustam parâmetros) e validação (onde se mede o aceite). Ajustar parâmetro olhando o conjunto de validação invalida o resultado; o conjunto de validação é trocado se isso acontecer.
2. **Margens congeladas antes de rodar.** Para cada métrica, a margem de equivalência `δ` é escrita no arquivo `equivalence.ts` com a justificativa (a oscilação real entre temporadas, de `12-calibragem-dados-proprios.md` §4, é o teto natural) antes de a comparação existir. Mudar margem depois de ver o resultado exige registro em ADR.
3. **Teste de equivalência, não teste de diferença.** Não rejeitar a hipótese de diferença não prova igualdade. Para médias e proporções: dois testes unilaterais (a diferença é maior que `−δ` e menor que `+δ`), o que equivale a exigir o intervalo de confiança de 90% da diferença inteiro dentro de `[−δ, +δ]`. Para distribuições (placar, gols por time): distância entre distribuições (variação total ou Wasserstein) abaixo de limiar, com o limiar comparado à distância entre duas metades do próprio nível 1 (ruído de referência).
4. **Tamanho de amostra calculado**, não escolhido: o número de partidas é o que dá ao teste poder de 90% para a margem declarada. Fica registrado por métrica.
5. **Cinco grupos de métricas**, todos obrigatórios: (a) resultado: placar, gols por time, mandante, empate, visitante; (b) criação: finalizações, no alvo, `xG`, `xG` por finalização; (c) posse e território: posse, passes, acerto, entradas no terço final; (d) disciplina e interrupção: faltas, cartões, escanteios, impedimentos; (e) físico e elenco: fôlego ao fim, lesões, substituições, nota por jogador.
6. **Matriz de confrontos**, não um só: equilibrado, favorito leve, favorito forte, e três pares de planos contrastantes (pressão alta contra saída curta, bloco baixo contra posse, jogo direto contra linha alta). A equivalência precisa valer em cada célula.
7. **Relatório**: tabela por métrica e célula com diferença, intervalo, margem e veredito. Métrica reprovada bloqueia; não existe média de vereditos.

Fundamento e alternativas (distância de energia, limiares usados em validação de simuladores): `docs/pesquisa/modo-clube/11-simulacao-e-coordenacao.md` item 5.

## 3. Testes causais

Formato único: mesmos elencos, 500 sementes pareadas, com e sem a instrução. Aceite: a métrica-alvo muda no sentido declarado em pelo menos 90% das sementes e a métrica de custo também. A tabela `instructions.ts` é a fonte: instrução sem linha de teste falha no build.

Para o nível 2 (engine por posses) os testes causais são próprios: mesmo formato, mesmas instruções, sinal esperado; não se compara o tamanho do efeito com o nível 1 (ADR-013).

## 4. Testes de zebra e de explicação

Objetivo: provar que o time pior pode ganhar por caminhos legítimos, que o favorito não é protegido, e que o relatório conta o que aconteceu.

| ID | Cenário | Montagem | Aceite |
| --- | --- | --- | --- |
| Z1 | Vitória do azarão | diferença de força fixa (ex.: 10 pontos de nota média), amostra calculada pelo §2.1 | o azarão vence numa fração dentro da faixa calibrada (nem zero, nem perto de um terço); a fração cai de forma monotônica quando a diferença aumenta |
| Z2 | Favorito perde criando mais | filtrar partidas de Z1 em que o favorito teve `xG` maior e perdeu | existem; o relatório dessas partidas tem conversão como primeiro fator e não cita causa tática inexistente |
| Z3 | Goleiro decisivo | goleiro do azarão com atributos muito acima do resto do time | defesas e gols evitados sobem; nas vitórias do azarão o relatório cita o goleiro com o número de defesas |
| Z4 | Bola parada determinante | azarão com cobrador, cabeceadores e rotina treinada; favorito fraco no jogo aéreo | fração de gols de bola parada do azarão sobe; taxa de vitória sobe em relação a Z1 |
| Z5 | Azarão por tática | azarão em bloco baixo e contra-ataque contra favorito de linha alta e lento atrás | taxa de vitória maior que com plano espelhado; relatório cita transições |
| Z6 | Expulsão | cartão vermelho forçado no minuto 20 | `xG` do time com 11 sobe e o do time com 10 cai, na ordem de grandeza da referência (`02` §11) |
| Z7 | Lesão | titular-chave sai lesionado no minuto 10, banco fraco | desempenho cai na medida da diferença entre titular e reserva; relatório cita a lesão |
| Z8 | Domínio sem conversão | time com posse e território altos e finalizadores fracos | posse e finalizações altas, `xG` por finalização baixo, resultado pior que o domínio sugere; relatório diz isso |
| Z9 | Baixa eficiência | filtrar partidas com `xG` ≥ 2 e zero gol | frequência compatível com Poisson sobre o `xG` (sem "azar" induzido nem compensação no jogo seguinte) |
| Z10 | Sem compensação | sequência de 38 jogos do mesmo time, sementes independentes | resultado de um jogo não se correlaciona com o acaso do anterior; nenhuma variável de estado guarda "sorte devida" |
| Z11 | Raça | azarão com `intensidade`, `compostura` e `concentração` altas contra favorito tecnicamente melhor e mentalmente fraco, em jogo grande com estádio cheio | taxa de vitória acima da de Z1 com a mesma nota técnica média |
| Z12 | Simetria para o usuário | mesma partida com o usuário como mandante e como rival conduzido por regra, mesma tática | distribuições iguais: nenhum código distingue "time do usuário" na simulação |

| Z13 | Favorito relaxado | favorito com `concentração` baixa em jogo "pequeno" contra azarão motivado | taxa de vitória do azarão acima de Z1; o efeito some quando a `concentração` do favorito é alta |
| Z14 | Mando decisivo | mesmo confronto de Z1 com o azarão em casa, estádio cheio, e depois com portões fechados | vitória do azarão maior em casa; a diferença cai com portões fechados na proporção da referência (`02` §11) |
| Z15 | Gramado e clima | azarão adaptado a campo pesado ou sintético contra favorito de passe curto | acerto de passe do favorito cai; taxa de vitória do azarão sobe em relação ao campo bom |
| Z16 | Altitude | visitante não adaptado em estádio alto | efeito na ordem da referência (cerca de 0,5 gol por 1.000 m), só para o não adaptado |
| Z17 | Calendário | favorito no terceiro jogo em oito dias sem rodízio contra azarão descansado | fôlego do favorito menor aos 70 minutos; `xG` sofrido no fim do jogo sobe |
| Z18 | Rodízio forçado | favorito poupando sete titulares | desempenho cai na medida da diferença entre titulares e reservas, sem penalidade extra de "entrosamento" não declarada |
| Z19 | Pênalti e prorrogação | mata-mata empatado | vitória nos pênaltis do azarão perto de 50%, deslocada só por cobradores e goleiro |
| Z20 | Gol cedo | gol do azarão antes dos 10 minutos, forçado | o favorito sobe as linhas (treinador rival reage) e o `xG` de transição do azarão sobe; resultado final mais favorável ao azarão que em Z1 |
| Z21 | Erro individual | zagueiro ou goleiro do favorito com `compostura` muito baixa | gols sofridos por erro não forçado sobem; o relatório cita o erro com o evento |
| Z22 | Tabela final | 200 temporadas com forças fixas | o campeão não é o time de maior força em fração compatível com a referência de sorte e habilidade (`02` §11); o time de menor força não é rebaixado em toda temporada |

Regra de implementação verificada por teste de código: a engine não recebe a informação de qual time é do usuário.

**Invariância por troca de identificadores.** Trocar os identificadores dos jogadores, a ordem dos elencos na entrada ou o lado do campo de cada time, mantendo atributos e planos, não muda nenhuma distribuição (protocolo do §2.1). Pega viés por índice na ordem de resolução, no desempate de atribuição de tarefas e no gerador pseudoaleatório.

**Contrato de evidência** (`02` §11): para 500 partidas, um teste recalcula cada número citado na explicação a partir do registro de eventos; nenhuma frase sem evidência; a parcela "não explicado" é reportada; nenhuma frase causal fora da lista de mecanismos com teste causal.

## 4.1 Testes de plausibilidade de movimento (trajetórias)

Uma instrução pode melhorar a estatística e parecer absurda em campo. Estes testes olham trajetórias, não placares. Cada um é uma métrica calculada sobre quadros de partidas simuladas, com teto ou piso:

| ID | Defeito procurado | Métrica |
| --- | --- | --- |
| T1 | Enxame atrás da bola | número de jogadores do mesmo time a menos de 5 m da bola, média e máximo, fora de bola parada |
| T2 | Linhas que se rasgam | distância entre vizinhos da última linha e entre linhas, percentil 95 |
| T3 | Dois no mesmo lugar | pares de companheiros a menos de 2 m por mais de 3 s, fora da área |
| T4 | Tremedeira | trocas de alvo por jogador por minuto; oscilações A-B-A (`02` §5.5) |
| T5 | Volante que abandona a zona | tempo com a zona à frente da área desocupada com o adversário no terço final |
| T6 | Jogador alheio ao jogo | tempo parado a mais de 30 m da bola com o time sem posse, por função |
| T7 | Corrida sem propósito | fração de corridas intensas que não mudam nenhuma linha de passe nem ocupam espaço de valor |
| T8 | Forma do time | comprimento, largura e dispersão médios com e sem bola dentro das faixas de `02` §11 (comprimento 31 a 46 m, largura 35 a 48 m, dispersão 7 a 16 m), maiores com a posse; altura de bloco é entrada do plano e não tem faixa publicada, então é validada só pelo efeito |
| T9 | Defesa de descanso | jogadores atrás da linha da bola no momento da perda igual ao pedido no plano, na média |
| T10 | Armadilha de pressão | quando acionada, a linha de passe marcada está ocluída no momento do gatilho na maioria das vezes |

| T11 | Uso do espaço | entropia espacial da ocupação por jogador (grade de 12 × 8), comparada entre funções: ponta e lateral têm entropia menor que volante de cobertura; nenhuma função ocupa o campo todo de modo uniforme |
| T12 | Eficiência de percurso | razão entre deslocamento útil (distância em linha reta entre alvos consecutivos) e distância percorrida, por função e fase |
| T13 | Suavidade | variação da aceleração (jerk) por jogador, percentil 95; picos indicam troca de alvo sem inércia |

**Normalização por contexto.** Nenhuma métrica de trajetória tem teto único. Cada uma é medida por célula de contexto: fase (com bola, sem bola, transição), altura do bloco, zona da bola (terço), placar (ganhando, empatando, perdendo) e número de jogadores em campo. A faixa de aceite é por célula. Um time compacto a 25 m de comprimento em bloco baixo e esticado a 45 m em ataque posicional está certo nos dois casos.

Referências para as faixas: dados de rastreamento e de eventos de acesso público (amostras da Metrica Sports e dados abertos da StatsBomb), usados para distribuições de distância entre setores, largura, comprimento do time, velocidades e sequências de passe. FATO (`docs/pesquisa/modo-clube/08-verificacao-de-fontes.md` item 10): o acordo de uso dos dados abertos da StatsBomb proíbe redistribuição e exploração comercial dos dados e de análises derivadas, e exige crédito; a amostra da Metrica tem 3 jogos anonimizados e nenhuma licença formal, só pedido de uso responsável e atribuição. DECISÃO: usar esses dados para calibrar um produto com anúncio é zona cinzenta; só com permissão escrita. Sem ela, as faixas de forma do time saem da literatura publicada e dos dados de partidas que o site já tem. São amostras pequenas e de outras ligas: servem para método e ordem de grandeza, não para afirmar fidelidade ao futebol brasileiro.

Cenários táticos fixos (o lateral sobe e alguém cobre; o time perde a bola com cinco à frente; a saída curta é pressionada) rodam como testes de regressão com trajetória esperada dentro de tolerância.

## 4.2 Bancada de desempenho

Um só comando mede, por etapa acumulada, tempo de processador e memória por partida: (1) 22 agentes com movimento; (2) mais decisão sem bola; (3) mais controle de campo; (4) mais ações com bola e bola física; (5) mais disputas e árbitro; (6) mais registro de eventos; (7) mais serialização do estado e dos quadros. Cenários: jogo equilibrado, pressão alta dos dois lados, jogo com expulsão, prorrogação. Registra ambiente (processador, versão do Node, carga da máquina). Roda a cada mudança da engine e falha se uma etapa piora mais de 15% sem justificativa. Renderização é medida à parte, no navegador, em aparelho real (MC-030).

## 5. Equilíbrio de longo prazo

- **Mundo sem usuário, 30 temporadas, 20 sementes**: nenhum clube sem treinador ou sem goleiro; nenhum caixa negativo sem sanção; atributos médios por divisão dentro de ±2 pontos do início; curva de idade dos titulares com pico entre 25 e 27; lesões por elenco na faixa; trocas de treinador na faixa; títulos distribuídos de forma compatível com a concentração de receita; tamanho do estado do mundo abaixo do teto.
- **Torneio de presets táticos**: nenhum preset vence mais de 60% contra todos os outros com elencos iguais.
- **Comissão**: clube de comissão máxima e elenco mediano não supera de forma consistente clube de elenco bom e comissão mediana (`06` §4). **Teto combinado**: a soma dos efeitos de todos os departamentos sobre a força efetiva do time em campo tem limite declarado (PARÂMETRO, proposta: o equivalente a 4 pontos de nota média), além do teto por departamento; teste com todos os departamentos no máximo.

### 5.1 Busca de estratégia dominante

Uma política única de "usuário ótimo" não encontra exploração; encontra só o que o autor do teste já imaginou. São **cinco políticas automáticas**, cada uma levando uma ideia ao extremo, partindo da última divisão, 50 temporadas, 20 sementes:

| Política | O que faz sempre |
| --- | --- |
| Formador | só contrata até 21 anos, investe tudo em base e treino, vende no pico de valor |
| Negociante | compra subvalorizado pela função de valor e revende em duas janelas; elenco é meio, não fim |
| Gastador | folha no limite da regra financeira, dívida máxima permitida, contrata veterano pronto |
| Tático único | um só plano e uma só rotina de bola parada, o de melhor resultado no torneio de presets |
| Comissão máxima | prioriza departamentos sobre elenco em toda decisão de verba |

Indicadores por política: temporada do primeiro acesso e do primeiro título; fração de títulos da primeira divisão entre os anos 15 e 50; saldo de transferências acumulado; caixa e dívida; valor do elenco. **Aceite**: nenhuma política vence a primeira divisão em mais de 40% das temporadas depois do ano 15 (PARÂMETRO, questão 17 do roteiro); nenhuma é dominada por todas as outras em todos os indicadores (senão o sistema que ela exagera não importa); a vantagem do Negociante cai ao longo do tempo quando o mercado que aprende está ligado (`07` §6). Política vencedora vira item de ajuste, com o mecanismo explorado descrito.

### 5.2 Economia: manifesto de parâmetros, sensibilidade e Monte Carlo

- **Manifesto** (`packages/club-domain/src/economy/params.ts`): todo número da economia é uma entrada com `valor`, `unidade`, `origem` (fato com fonte, estimativa, ajuste de jogo), `confiança` (alta, média, baixa), `faixa` plausível e `versão`. Número econômico fora do manifesto falha no lint. Os FATOS de `docs/pesquisa/modo-clube/07`, `09` e `10` entram com a fonte; o resto fica marcado como estimativa.
- **Sensibilidade**: cada parâmetro de confiança média ou baixa é variado em ±20%, um por vez, em 10 temporadas e 10 sementes. Saída: tabela de quanto mudam falências, concentração de títulos, folha sobre receita e saldo médio por divisão. Parâmetro que muda um indicador em mais de 20% é marcado como crítico e ganha prioridade de pesquisa.
- **Monte Carlo**: 200 mundos de 15 temporadas com os parâmetros de baixa confiança sorteados dentro das faixas. Aceite: em 95% dos mundos, nenhuma divisão fica com mais de um quinto dos clubes em insolvência, a folha sobre receita mediana por divisão fica na faixa do manifesto e a ordem de receita entre divisões se mantém.
- **Equilíbrio contábil**: em toda simulação, a soma do dinheiro que entra e sai do mundo (premiação, direitos, patrocínio, salários, impostos) é registrada; inflação ou deflação do total acima de limite por temporada é falha.

## 6. Competições e calendário

- Cada tipo de fase tem teste com resultado conhecido: tabela de liga com todos os critérios de desempate, grupos, mata-mata de jogo único e de ida e volta com cada regra de desempate, final.
- Temporada completa em dois pacotes fictícios de tamanhos diferentes: toda vaga de acesso, descenso e classificação é preenchida uma vez; nenhum clube joga duas vezes no mesmo dia; descanso mínimo respeitado ou adiamento registrado.
- Virada de temporada com mudança de tamanho de divisão (regra de transição do pacote).
- Formatos reais: cada competição do pacote real tem um teste que confere número de clubes, de fases e de jogos com o regulamento citado em `05`.

## 7. Dinheiro

Caixa = soma em todo avanço; cache de saldo = soma; estorno é lançamento; idempotência (mesma chave, mesma resposta, um efeito); duas requisições simultâneas, um efeito; regra financeira da competição aplicada na temporada certa; amortização soma o valor da compra ao fim do contrato.

## 8. Segurança (por rota)

Dois usuários: o segundo não lê nem altera a carreira do primeiro. Campo extra rejeitado. Transição de estado inválida devolve 409. Pedido acima da alçada devolve 409. Limite de taxa testado. A semente da partida não aparece em nenhuma resposta antes do fim do jogo.

## 9. Interface

Celular (360 px) e desktop (1.280 px): sem rolagem lateral, sem erro de console, alvo de toque de 44 px, tudo alcançável por teclado, foco visível, movimento reduzido respeitado, leitor de tela recebe placar e eventos em texto. Medição de quadros por segundo em aparelho real antes de aprovar o campo 2D (MC-030).

## 10. O que não é testado automaticamente

Se a partida "parece futebol". Para isso existe o portão de revisão do dono (MC-048): dez partidas assistidas, com lista de defeitos.
