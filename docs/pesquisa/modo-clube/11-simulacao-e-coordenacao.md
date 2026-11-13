# 11 — Simulação, coordenação de agentes e referências de calibração

Data da pesquisa: 2026-11-13. Convenção de etiquetas: **FATO** (fonte; "lido integral" = o arquivo/artigo inteiro ou a seção citada foi lido em texto; "só resumo" = apenas resumo, abstract, trecho de buscador ou página-resumo; "trechos" = partes relevantes lidas, não o documento todo) ou **NÃO ENCONTRADO**. Números marcados "(derivado)" foram calculados aqui a partir de números lidos; não são da fonte. Nenhuma constante foi inventada.

Aviso de método: PMC, FBref, FootyStats, informs-sim.org e ResearchGate bloquearam download direto. Quando a leitura passou por um resumidor de página (WebFetch) e não por texto bruto, está dito.

---

## 1. RoboCup Soccer Simulation 2D: como equipes abertas coordenam agentes

### 1.1 Modelo de movimento, bola, chute, stamina (servidor)

FATO — manual do rcssserver (movimento, dash, chute, say) e código-fonte `serverparam.cpp` / `playerparam.cpp`. Fontes: https://github.com/rcsoccersim/manual/tree/master/source/soccerserver (movement-models, action-models-dash-model, action-models-kick-model, heterogeneous-players, action-models-say-model) e https://raw.githubusercontent.com/rcsoccersim/rcssserver/master/src/serverparam.cpp e `.../playerparam.cpp`. Lido integral (as seções de dash, movimento, chute, heterogêneos, say; as constantes do código).

Passo de simulação de qualquer objeto (jogador ou bola):

```
u(t+1) = v(t) + a(t)            # acelera
p(t+1) = p(t) + u(t+1)          # move
v(t+1) = decay * u(t+1)         # decaimento
a(t+1) = 0
a = power * power_rate * (cos th, sin th)
ruído: u += U[-rmax, rmax], rmax = rand * |v|   (rand = player_rand ou ball_rand)
ruído no argumento: arg = (1 + U[-rand, rand]) * arg
colisão: se sobrepõem no fim do ciclo, recuam até não sobrepor; velocidades *= -0.1
```

Aplicação da aceleração: `a` é normalizada a `player_accel_max` (ou `ball_accel_max`); a velocidade resultante é limitada a `player_speed_max` (ou `ball_speed_max`); depois ruído e vento.

Constantes padrão (código-fonte, branch master; o manual está defasado em alguns pontos, o código manda):

```
BOLA:    ball_size 0.085  ball_decay 0.94  ball_rand 0.05  ball_speed_max 3.0  ball_accel_max 2.7
JOGADOR: player_size 0.3  player_decay 0.4  player_rand 0.1
         player_speed_max 1.05  player_speed_max_min 0.75  player_accel_max 1.0
         inertia_moment 5.0
STAMINA: stamina_max 8000  stamina_inc_max 45  stamina_capacity 130600  extra_stamina 50
         effort: dec_thr 0.3  dec 0.005  min 0.6  inc_thr 0.6  inc 0.01
         recover: dec_thr 0.3 dec 0.002 min 0.5   (recover_init 1.0, effort_init 1.0 no manual)
DASH:    dash_power_rate 0.006  min/max_dash_power -100/+100 (manual) ; side_dash_rate 0.4
         back_dash_rate 0.7 (código; manual diz 0.6)  dash_angle_step 1.0 (omnidirecional)
CHUTE:   kick_power_rate 0.027  kickable_margin 0.7  kick_rand 0.1  max/min power ±100
GOLEIRO: catchable_area_l 1.2  catchable_area_w 1.0  catch_ban_cycle 5
SENSORES: visible_angle 90  visible_distance 3.0  audio_cut_off_dist 50
```

Estamina e esforço (manual, pseudocódigo oficial):

```
dash para frente consome `power`; para trás consome -2*power
potência limitada pela stamina disponível (+ extra_stamina quando acaba)
edp = effort * dash_power_rate * power        # potência efetiva do dash
dir_rate (omnidirecional): 
  |dir|>90:  back_dash_rate - (back_dash_rate - side_dash_rate) * (1 - (|dir|-90)/90)
  senão:     side_dash_rate + (1 - side_dash_rate) * (1 - |dir|/90)

a cada ciclo:
  se stamina <= recover_dec_thr*stamina_max e recovery > recover_min: recovery -= recover_dec
  se stamina <= effort_dec_thr*stamina_max: effort = max(effort - effort_dec, effort_min)
  se stamina >= effort_inc_thr*stamina_max: effort = min(effort + effort_inc, effort_max)
  stamina_inc = recovery * stamina_inc_max
  stamina_inc limitado por stamina_capacity; stamina = min(stamina + stamina_inc, stamina_max)
  stamina_capacity -= stamina_inc ; se capacity chega a 0, a stamina não recupera mais (só extra_stamina é gasta)
```

Observação de qualidade: na tabela do manual os rótulos `effort_dec` (0.3) e `effort_dec_thr` (0.005) estão trocados; o código tem `EFFORT_DEC_THR = 0.3` e `EFFORT_DEC = 0.005`.

Chute (manual): `ep = kick_power * kick_power_rate`, reduzida por ângulo e distância da bola:

```
ep = ep * (1 - 0.25*dir_diff/180 - 0.25*dist_ball/kickable_margin)
# pior caso (bola atrás e distante): 50% da potência
chutes simultâneos somam acelerações na bola no mesmo ciclo
```

Inércia do giro (turn) e fórmula exata do ruído de chute atual: o manual marca "TODO" (ruído novo); a fórmula do turn não foi lida. NÃO ENCONTRADO como texto fechado.

### 1.2 Jogadores heterogêneos

FATO — manual, heterogeneous-players.rst e `playerparam.cpp`. Lido integral.

O servidor gera `player_types` tipos aleatórios por jogo; o tipo 0 é o padrão e fixo. As duas equipes usam os mesmos tipos. O técnico (coach online) troca tipos livremente antes do primeiro chute e `subs_max` vezes depois. Parâmetros que variam por tipo: velocidade máxima, stamina_inc, decay, inércia, dash_power_rate, tamanho, kickable_margin, kick_rand, extra_stamina, effort max/min, alongamento da área de defesa, kick_power_rate, probabilidade de falta detectada.

```
player_types 18   subs_max 3   pt_max 1   (padrão do código; pt_max=1 => cada tipo não padrão usado 1 vez)
player_decay_delta  [-0.1, +0.1]      inertia_moment_delta_factor 25
kickable_margin_delta [-0.1, +0.1]    kick_rand_delta_factor 1.0
extra_stamina_delta [0, 50]           effort_max/min_delta_factor -0.004
new_dash_power_rate_delta [-0.0012, +0.0008]   new_stamina_inc_max_delta_factor -6000
player_speed_max_delta [0,0]   dash_power_rate_delta [0,0]   (neutros por padrão)
catchable_area_l_stretch [1.0, 1.3]
```

Faixas do manual para os valores resultantes: player_decay [0.3, 0.5], inertia_moment [2.5, 7.5], stamina_inc_max [40.2, 52.2], dash_power_rate [0.0048, 0.0068], extra_stamina [50, 100], effort_min [0.4, 0.6].

FATO — HELIOS2021 TDP (https://github.com/rcsoccersim/rcsoccersim.github.io/raw/master/docs/papers/robocup2021/TDP_HELIOS2021.pdf, lido integral): o técnico dá o tipo padrão ao goleiro e, aos dez de linha, tipos com alta capacidade de corrida (medida pelo tempo de sprint de 30 m em ciclos; exemplo da figura: 33, 35 e 40 ciclos no nosso time contra 34, 36 e 38 no adversário). A troca de posição entre jogadores (uma vez, após 1000 ciclos, em bola parada) usa "confrontos" (cada jogador e seu adversário mais próximo, sem exigir um-para-um) e regras `all` (ordem de velocidade igual à ordem do confronto) e `sp` (melhor corredor contra o pior adversário). Teste com 1000 jogos por configuração; defesa por `all` e a combinação reduziram gols sofridos e passes em profundidade do adversário a 5% de nível. Efeito em vitórias: tabela não transcrita aqui.

### 1.3 Interceptação

FATO — `intercept_simulator_player.cpp` e `intercept_table.cpp` do librcsc (https://github.com/helios-base/librcsc/tree/master/rcsc/player). Lido integral nos trechos citados.

```
MAX_STEP = 50 ciclos (horizonte de interceptação)
jogador ignorado (step=1000) se posCount >= 15 (adversário) ou >= 10 (companheiro)
se já alcança a bola (kickable): step = 0
step_min = max(0, floor( max(0.3, |y_rel| - control_area) / realSpeedMax ) - bonus + penalty)
para total_step de step_min até o fim da trajetória prevista da bola:
   se (control_area + realSpeedMax*(total_step + bonus - penalty) + 0.5)^2 < dist2(jogador, bola[total_step])
       continue            # nunca chega
   se canReachAfterTurnDash(...): retorna total_step     # vira + corre
bonus_step  = min(3, min(heardPosCount, seenPosCount))    # incerteza de posição como folga
penalty_step = (se está de tackle) max(0, tackle_cycles - tackleCount - 2) senão 0
goleiro: só vale com a bola dentro da área de pênalti
```

A tabela de interceptação mantém: `selfStep`, `teammateStep` (mais rápido), `second_teammate`, `opponentStep`, `second_opponent`, `our_goalie_step`.

As versões do cálculo próprio (v7, v13, v17) não foram lidas; NÃO ENCONTRADO o detalhe delas.

### 1.4 Formação por triangulação de Delaunay

FATO (código) — `formation_dt.cpp` (https://raw.githubusercontent.com/helios-base/librcsc/master/rcsc/formation/formation_dt.cpp; lido nos trechos de interpolação e construção). FATO (artigo, só resumo) — Akiyama e Noda, "Multi-agent Positioning Mechanism in the Dynamic Environment", RoboCup 2007, LNCS 5001 (https://rd.springer.com/chapter/10.1007/978-3-540-68847-1_38): a formação é um mapa do ponto focal (posição da bola) para a posição desejada de cada jogador, aproximado por triangulação de Delaunay com interpolação linear; os autores relatam robustez a amostras desiguais, frente a uma rede gaussiana normalizada.

Mecânica no código: cada amostra do editor é um vértice (`M_triangulation.addVertex(d.ball_)`) cuja carga são as 11 posições; para a bola atual acha-se o triângulo que a contém; se não há triângulo, usa o vértice mais próximo; dentro do triângulo, interpola-se linearmente (reta do vértice 0 pelo ponto focal, interseção com o lado oposto, interpolação ao longo desse lado e depois ao longo da reta).

FATO — `strategy.cpp` do helios-base (https://raw.githubusercontent.com/helios-base/helios-base/master/src/player/strategy.cpp; lido nos trechos):

```
duas formações carregadas: defense-formation.conf, offense-formation.conf (+ normal)
situação: Defesa se opp_min <= our_min - 2 ;  Ataque se our_min <= opp_min - 2 ;  senão Normal
          our_min = min(self_min, mate_min) em ciclos de interceptação
ponto focal (em jogo): bola em inertiaPoint( min(self_min, mate_min, opp_min, 1000) )
posição base de cada um = formação.getPositions(ponto focal)
impedimento: x <= (linha de impedimento, ou ponto de domínio previsto do companheiro se mate_min<50) - 1.0
troca de papéis: exchangeRole(unum0, unum1) apenas troca os números de papel (M_role_number)
zonas da bola (BallArea): x>36 → cruzamento se |y|>17, senão chance de chute;
   -1<x<=36 → ataque com condução se |y|>17 ; x<-35.5 → perigo; demais zonas definidas por limites fixos
```

### 1.5 Evitar enxame em volta da bola

FATO — `bhv_basic_move.cpp` do helios-base (https://raw.githubusercontent.com/helios-base/helios-base/master/src/player/bhv_basic_move.cpp; lido integral):

```
se nenhum companheiro tem a bola e
   ( self_min <= 3  ou  ( self_min <= mate_min  e  self_min < opp_min + 3 ) )
   → este agente intercepta
senão → vai para a posição de formação (Strategy::getPosition(unum)), tolerância dist_thr = max(1.0, 0.1*dist_bola)
```

Ou seja: perseguir a bola é uma reivindicação por tempo de chegada (o menor tempo de interceptação entre os companheiros vence; empate vai ao próprio agente), e todo o resto fica em posição de formação. Sem fichas nem mensagens: cada agente calcula o mesmo `mate_min` a partir do mesmo mundo previsto.

Política de potência de corrida (`Strategy::get_normal_dash_power`, lido integral):

```
capacidade esgotada: min(100, stamina + extra_stamina)
modo recuperação liga se stamina < 0.5*stamina_max, desliga se > 0.7*stamina_max
my_inc = stamina_inc_max * recovery
linha de defesa nossa atrás do agente e bola < linha+20: 100 (potência máxima)
recuperando:            max(0, my_inc - 25)
companheiro com a bola a <20: min(1.1*my_inc, 100)
em posição de impedimento:    100
bola longe, ataque certo (bola.x>25 e >self.x+10 e self_min<opp_min-6 e mate_min<opp_min-6): clamp(0.5*my_inc, 10, 100)
normal:                  min(1.7*my_inc, 100)
```

### 1.6 Busca de ações em cadeia ("chain action")

FATO — helios-base, `src/player/planner/action_chain_graph.cpp` e `sample_field_evaluator.cpp` (https://github.com/helios-base/helios-base/tree/master/src/player; lido nos trechos). Contexto bibliográfico (só resumo): HELIOS2019 TDP (https://tdp.robocup.org/wp-content/uploads/tdp/robocup/2019/robocupsoccer-simulation-2d/helios2019-98/robocup-2019-robocupsoccer-simulation-2d-helios20196E5Tv1wQLY.pdf) diz que obter uma função de avaliação eficaz para o planejamento de sequências de ações ainda é problema em aberto.

```
DEFAULT_MAX_CHAIN_LENGTH   = 4        # profundidade da busca
DEFAULT_MAX_EVALUATE_LIMIT = 500      # nós avaliados por decisão
geradores: passe direto, passe verificado estrito, passe para si (self pass), cruzamento,
           chute, drible curto, drible simples, afastar (clear)
avaliação do estado final (sample_field_evaluator):
   gol adversário:  +1e7 ;  gol próprio: -1e7 ;  bola fora: -DBL_MAX/2
   ponto = bola.x + max(0, 40 - dist(bola, gol adversário))
   +1e6 se há chute possível do portador ;  +5e5 adicional se o portador é o próprio agente
```

O avaliador de exemplo é deliberadamente ingênuo (progressão em x mais proximidade do gol); a qualidade das equipes de ponta vem da função de avaliação própria. NÃO ENCONTRADO: o artigo original da busca em árvore (em japonês, resultado só por título).

### 1.7 Marcação

FATO (negativo) — a listagem de `src/player/` do helios-base não contém módulo de marcação (nomes: roles, strategy, communication, planner). NÃO ENCONTRADO marcação no helios-base.

FATO — CYRUS, "Improving Dribbling, Passing, and Marking Actions in Soccer Simulation 2D Games Using Machine Learning" (https://arxiv.org/pdf/2401.03406, lido integral na seção de marcação):

- Marcação por proximidade: cada um marca o adversário mais próximo; falha porque vários marcam o mesmo e outros ficam sem marca.
- Marcação por perigo: ordena os adversários por perigo e atribui ao companheiro mais próximo ainda livre; ainda falha quando cada agente calcula sozinho com visão ruidosa.
- Método húngaro com custo = distância: mínimo de deslocamento total, mas (1) exige nº igual de agentes e tarefas, (2) ignora importância das tarefas, (3) é sensível a ruído de observação: 10! combinações fazem agentes divergirem e marcarem o mesmo adversário.
- OMAM (usado em 2021): cada agente só considera suas k=3 melhores tarefas; compara soluções primeiro por cobertura dos mais perigosos (cadeia de 0/1 ordenada por importância) e depois pelo custo; grupos Back, Middle e Forward; adversários em Attacker e Normal; reduz o espaço a 6! soluções.
- Resultado reportado: média de gols sofridos na fase principal 0,9 (2019) para 0,33 (2021), em 28 jogos; os autores ressalvam que os ataques adversários também evoluíram.

FATO (só resumo) — TDP Austras2D 2021 (https://tdp.robocup.org/wp-content/uploads/tdp/robocup/2021/robocupsoccer-simulation-2d/austras2d-248/robocup-2021-robocupsoccer-simulation-2d-austras2dVF5OUDicbs.pdf): separa defesa em marcação, bloqueio de bola e bloqueio de chute, com marcação por interseção e "desmarcação" para o ataque.

### 1.8 Treinador (coach) e mensagens `say`

FATO — manual (action-models-say-model.rst, sensor-models-aural-sensor-model.rst, coach.rst; https://github.com/rcsoccersim/manual/tree/master/source). Lido integral nas seções de say e do coach online:

```
say_msg_size 10 caracteres ; audio_cut_dist 50 m (ouvem os dois times)
hear_max 1 / hear_inc 1 / hear_decay 1  → capacidade de escuta limitada por ciclo
coach online: vê o mundo global sem ruído; mensagens livres (freeform) só fora de play_on, ou
   em janelas: a cada 600 ciclos (freeform_wait_period) por 20 ciclos (freeform_send_period); teto say_coach_cnt_max por jogo
CLang (regras): janela de 300 ciclos (clang_win_size), ouvida 50 ciclos depois (clang_mess_delay)
coach pode trocar tipos de jogador: ilimitado antes do 1º chute; subs_max vezes depois (fora de play_on)
```

FATO — `sample_communication.cpp` do helios-base (lido nos trechos): a regra é "só falar se vale": o agente diz a bola quando a velocidade dela mudou (>0.5 de velocidade anterior e >20 graus de desvio, ou ao chutar), se é o mais perto da bola ou o segundo mais perto; diz estamina para recuperação, goleiro adversário, a si mesmo e jogadores próximos. O limite de 10 caracteres obriga a codificar poucos campos; a posição/velocidade da bola e de jogadores é o que alimenta o `bonus_step` da interceptação (item 1.3).

---

## 2. Outros métodos que evitam todos escolherem o mesmo alvo

**Acordo de vestiário (locker-room agreement), Stone e Veloso.** FATO — "Task Decomposition, Dynamic Role Assignment, and Low-Bandwidth Communication for Real-Time Strategic Teamwork", AIJ 1999 (https://cse-robotics.engr.tamu.edu/dshell/cs689/papers/stone99task.pdf, lido em trechos: estrutura, protocolo de comunicação e resultados). Pontos: o acordo é fixado quando o time pode sincronizar em privado e define papéis flexíveis (com protocolos de troca), formações como coleções de papéis e jogadas ensaiadas; em jogo, a comunicação é de canal único, baixa largura de banda e não confiável, então o acordo mapeia tipo de mensagem para resposta exigida, usa carimbo de tempo para o mais recente ganhar (empate decidido por precedência entre papéis, definida no acordo) e evita "todos falarem ao mesmo tempo". Resultado reportado: 67 a 9 em seis jogos; time flexível venceu 34 de 38 contra um rígido (tabela 3 do artigo).

**Posicionamento por situação (SBSP).** FATO (só resumo) — Reis, Lau e Oliveira, "Situation Based Strategic Positioning for Coordinating a Team of Homogeneous Agents", LNAI 2001 (https://rd.springer.com/content/pdf/10.1007%2F3-540-44568-4_11.pdf; resumo via https://repositorio-aberto.up.pt/handle/10216/443): separa situações ativas de estratégicas; quem não está em situação ativa ocupa a posição estratégica da formação, ajustada pela posição e velocidade da bola e pela situação, com troca dinâmica de papéis; o FC Portugal depois usou Delaunay para editar formações.

**Campos potenciais.** FATO (só resumo) — Vail e Veloso, "Multi-Robot Dynamic Role Assignment and Coordination Through Shared Potential Fields" (https://www.ri.cmu.edu/publications/multi-robot-dynamic-role-assignment-and-coordination-through-shared-potential-fields): campos baseados na posição dos companheiros e da bola, cada robô desce o gradiente até o mínimo; superou time sem coordenação. SPAR (atração e repulsão com restrições) de Stone: só resumo de buscador (página da UT Austin não pôde ser lida); NÃO ENCONTRADO leitura do texto original.

**Matriz de custo, Húngaro e minimização de makespan.** FATO — MacAlpine et al., "SCRAM: Scalable Collision-avoiding Role Assignment with Minimal-makespan for Formational Positioning" (https://cs.utexas.edu/~AustinVilla/sim/3dsimulation/AustinVilla3DSimulationFiles/2013/papers/AAMAS14-MacAlpine.pdf; lido integral, resumo estendido de 2 páginas):

```
problema: n agentes, n alvos; minimizar o makespan (maior deslocamento) e evitar colisões
MMDR (minimax lexicográfico recursivo): o custo de cada aresta recebe peso 2^i pela ordem de distância;
   o Húngaro O(n^3) resolve → dinamicamente consistente
MMD+MSD2: 1) acha o emparelhamento perfeito de menor aresta máxima (Ford-Fulkerson), 2) Húngaro sobre as
   arestas <= essa, com custo = distância ao quadrado. Tempo O(n^3), espaço O(n^2). Não é dinamicamente consistente.
tempos medidos (MMD+MSD2, Xeon E31270): n=10: 0,016 ms; n=20: 0,062 ms; n=100: 1,82 ms; n=1000: 351 ms
```

"Dinamicamente consistente" aqui significa que a atribuição não troca de alvos entre ciclos sem motivo. Para n=11 o custo é desprezível.

**Atribuição gulosa por tempo de chegada.** É o que o helios-base faz para quem persegue a bola (item 1.5): o menor `self_min` vence. FATO (código lido). Como alternativa global, o Húngaro com custo = tempo de chegada não foi encontrado numa fonte pronta para esse custo específico (MacAlpine usa distância): NÃO ENCONTRADO fonte com tempo de chegada como custo.

**Quadro tático compartilhado (blackboard).** NÃO ENCONTRADO fonte primária confiável com resultados; só descrições genéricas de buscador. No helios-base o análogo é o modelo de mundo derivado igual em todos os agentes (mesma `interceptTable`, mesma formação), sem mensagem de coordenação.

**Utilidade com fichas de reivindicação (claim tokens).** FATO (só resumo, fontes não acadêmicas) — o padrão "ficha de ataque" limita quantos inimigos atacam ao mesmo tempo: cada tipo de ataque tem um número de fichas, o agente pega antes de atacar e devolve ao fim, devolvendo-as se morrer; um relato atribui o padrão a uma palestra de desenvolvedores de DOOM (2016): https://www.strayspark.studio/blog/attack-token-system-ue5-group-combat-that-feels-fair e https://code.tutsplus.com/battle-circle-ai-let-your-player-feel-like-theyre-fighting-lots-of-enemies--gamedev-13535t. As fichas controlam tempo, não posição: quem não tem ficha reposiciona. NÃO ENCONTRADO publicação primária; para jogo de futebol, o equivalente é o papel de "pressionador" com ficha por ciclo.

---

## 3. Modelos cinemáticos de tempo de chegada

**Spearman (pitch control).** O artigo ("Beyond Expected Goals", Sloan 2018) NÃO foi lido (PDF indisponível); uma lâmina de aula cita 58 jogos de tracking de 2017–18 (https://saberpowers.github.io/teaching/smgt432/lecture/tracking/slides.pdf, só resumo). FATO — implementação de referência de Laurie Shaw para dados Metrica, com os parâmetros e as equações do código (https://raw.githubusercontent.com/Friends-of-Tracking-Data-FoTD/LaurieOnTracking/master/Metrica_PitchControl.py, lido integral):

```
r_reaction = pos + vel * t_react
tti = t_react + | r_final - r_reaction | / vmax              # tempo de interceptação
P_j(T) = 1 / (1 + exp( -(pi / (sqrt(3) * sigma)) * (T - tti_j) ))   # prob. do jogador j ter chegado até T
dPPCF_j/dT = (1 - sum_i PPCF_i) * P_j(T) * lambda            # integra-se em passos int_dt
tempo da bola até o alvo = |alvo - bola| / average_ball_speed
atraso de controle: time_to_control = veto * ln(10) * ( sqrt(3)*sigma/pi + 1/lambda )

parâmetros do código: max_player_speed 5 m/s ; reaction_time 0.7 s ; tti_sigma 0.45 s ;
 max_player_accel 7 m/s^2 (não usado) ; lambda_att 4.3 ; lambda_def = 4.3*kappa_def (kappa_def = 1 no código;
 o comentário diz que o artigo usa 1.72) ; lambda_gk = 3*lambda_def ; average_ball_speed 15 m/s ;
 int_dt 0.04 ; max_int_time 10 ; model_converge_tol 0.01
```

Esses valores são da implementação pública (Metrica), não necessariamente os do artigo.

**Fujimura e Sugihara (movimento com resistência).** O artigo original (2004/2005) não foi lido. FATO (via terceiros, trechos) — equação e parâmetros como relatados em Ueda et al., Football Science 2014 (https://www.shobix.co.jp/jssf/tempfiles/journal/2014/071.pdf, lido nos trechos) e em Brefeld et al. 2019 (https://ml3.leuphana.de/publications/mlj-soccer2018.pdf, lido nos trechos):

```
m dv/dt = F e - k v               # força motriz máxima F na direção e, resistência proporcional à velocidade
Vmax = F/k ,  alpha = k/m
x(t) - x0 = Vmax * ( t - (1 - e^(-alpha t))/alpha ) * e  +  ((1 - e^(-alpha t))/alpha) * v0
região alcançável em t: círculo com centro  x0 + v0*(1 - e^(-alpha t))/alpha
                        e raio              Vmax*( t - (1 - e^(-alpha t))/alpha )
valores ajustados por mínimos quadrados em corrida retilínea (citados por Ueda): alpha = 1.3 ; Vmax = 7.8 m/s
```

**Taki e Hasegawa (região dominante).** FATO (via terceiros): é a região em que a pessoa chega antes de qualquer outra, um Voronoi com a distância trocada por uma função tempo (Ueda; Brefeld). Modelo de aceleração uniforme (Brefeld, eq. 1):

```
x = 0.5 * a_max * cos(phi) * t^2 + v t ;  y = 0.5 * a_max * sin(phi) * t^2
alcançável em t: círculo de centro (v t, 0) e raio 0.5 * a_max * t^2     # velocidade sem limite: ressalva dos autores
```

**Brefeld, Lasek e Mair (modelos de movimento aprendidos).** FATO (lido em trechos) — Machine Learning 108, 2019: estima por jogador a distribuição das posições alcançáveis em um tempo dado a partir de dados posicionais; transforma a posição para o referencial "origem + movimento no eixo x com velocidade v", discretiza a faixa de velocidade e suaviza com KDE gaussiano (largura de banda 0.7 no exemplo da figura); compara com Voronoi, Taki-Hasegawa e Fujimura-Sugihara. Valores numéricos de desempenho não lidos.

---

## 4. Faixas de referência de tracking: forma da equipe e esforço físico

### 4.1 Forma da equipe

FATO — revisão sistemática "Reference values for collective tactical behaviours based on positional data in professional football matches" (https://pmc.ncbi.nlm.nih.gov/articles/PMC8805357/; resumo e seções de resultados lidos; 13 artigos de Espanha, Portugal, Inglaterra, Brasil e UEFA Champions League, sistemas de tracking diferentes):

```
comprimento da equipe (length)         31 a 46 m   (jogos inteiros: 27-48; Premier 24-42; La Liga 26-46)
largura (width)                        35 a 48 m   (La Liga 41±6 a 47±9, mais estável que o comprimento)
stretch index (distância ao centroide) 7 a 16 m
área média da equipe                   ~900 m²    ; área/20 jogadores de linha: 79±15 a 94±16 m²
goleiro adversário até companheiro mais próximo: 9±6 a 30±7 m (defendendo); 13±8 a 33±8 (atacando)
linha do gol - local de recuperação    27 a 37 m ; "linha do gol - linha de defesa" 22 a 28 m ; "linha do gol - linha de ataque" 42 a 50 m
(a revisão descreve essas linhas de forma inconsistente entre as seções; usar com cautela)
distância gol-defensor mais recuado: atacando 38±8 m ; defendendo ~6 a ~45 m
todos os estudos: distâncias e áreas maiores com posse do que sem posse
```

Fatores de contexto (mesma revisão): comprimento é maior perto do gol adversário que no meio-campo; mandante tem distâncias maiores; equipe que ganha ou empata fica mais perto do próprio gol; contra adversário forte a linha defensiva fica mais baixa.

FATO (resumo, só resumo) — estudo de 8 temporadas de La Liga (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10901331/, 5518 observações coletivas, 2011-12 a 2018-19): usa largura, comprimento, altura (distância entre o jogador mais recuado e a linha do gol que defende) e distância goleiro-defensor mais próximo; equipes do grupo "Europa" mostram comprimento menor a partir de 2015-16. Médias por grupo não foram extraídas.

FATO (só resumo, blog de analista) — convenção de altura do bloco pela mediana de x dos jogadores de linha, num campo de 105 m com centro em 0: baixo < -15 m, médio -15 a +5 m, alto > +5 m; compacto = intervalo interquartil de x < 18 m (https://alexllinas13.substack.com/p/the-shape-of-a-defence). Não é padrão publicado.

FATO (só resumo) — estudo de 153 jogos da Bundesliga 2020/21: a compactação do grupo de cinco defensores mais próximos da bola diferenciou defesas bem e mal sucedidas; a do time inteiro quase não (https://www.researchgate.net/publication/370827756_Is_a_compact_organization_important_for_defensive_success_in_elite_soccer_-_Analysis_based_on_player_tracking_data).

NÃO ENCONTRADO: faixas publicadas em metros para a distância entre linha defensiva e linha de meio-campo por altura de bloco (baixo, médio, alto) no futebol masculino de elite; e por fase (com e sem bola) para o stretch index separado. A revisão dá apenas as faixas gerais acima. Um exemplo de caso (não referência) do relatório técnico da Champions League 2023/24 cita 21,8 m entre dois jogadores do Madrid em bloco médio.

### 4.2 Sprints, corrida de alta velocidade e acelerações

Limiares diferem por estudo; as faixas não são comparáveis diretamente.

FATO (só resumo, trecho de buscador de uma tese e de artigos) — Premier League: lateral de meio-campo (ala) 1049±106 m de corrida de alta intensidade contra zagueiro central 681±128 m; distância de sprint 346 m (ala), 287 m (lateral), 264 m (atacantes); Bush et al. 2015 via tese de 2025 (https://ueaeprints.uea.ac.uk/id/eprint/100911/1/2025GualtieriAPhD.pdf): zagueiros centrais e alas cobrem 750 a 1200 m de corrida de alta velocidade e 225 a 330 m de sprint por jogo.

FATO (resumo, lido via resumidor de página) — Premier League, 3 temporadas, tracking óptico, 31 jogadores (https://pmc.ncbi.nlm.nih.gov/articles/PMC12244393/): com a posse, pontas têm a maior corrida de alta velocidade e zagueiros centrais a menor (p<0,001, tamanho de efeito 4,19; sprint 3,30); a posição foi o único preditor significativo com a posse. Valores em metros não extraídos.

FATO (lido via resumidor de página, tabelas 2 e 3) — La Liga 123, um clube, 23 jogadores, GPS WIMU Pro 10 Hz, 13 jogos, apenas jogos completos (https://pmc.ncbi.nlm.nih.gov/articles/PMC7410317/); média ± desvio por posição:

```
posição                  acel>3 m/s2  desacel<-3  ações de sprint  dist. sprint (>24 km/h)  Vmax (km/h)
zagueiro central           26,5±6,1    50,9±8,6     8,6±3,7        148,9±73,1 m             30,6±1,4
lateral                    30,4±7,6    54,1±13,3   11,7±3,9        228,3±92,5 m             30,7±1,6
meia central               27,1±5,5    54,8±12,4    4,6±2,9         88,2±53,9 m             28,5±1,7
ala/meia aberto            34,9±6,7    64,5±15,8   15,9±4,7        338,2±103,9 m            32,0±1,6
atacante                   29,9±9,6    55,2±12,1    8,7±3,1        165,3±58,1 m             29,9±2,0
```

Atenção: o artigo rotula as contagens como "total", sem dizer explicitamente "por jogo".

FATO (lido via resumidor de página) — Premier League e Ligue 1, 2020/21 e 2021/22, GPS Apex 18 Hz, só jogadores com 90 min (https://pmc.ncbi.nlm.nih.gov/articles/PMC11694201/); acelerações por minuto (limiar +3 m/s², duração mínima 0,5 s):

```
Premier League: zagueiro 0,81±0,15  lateral 0,96±0,19  meia central 0,87±0,19  meia ofensivo 0,97±0,29  centroavante 0,92±0,12
Ligue 1:        zagueiro 0,60±0,28  lateral 0,74±0,37  meia central 0,64±0,36  meia ofensivo 0,73±0,34  centroavante 0,75±0,35
(90 min: zagueiro da Premier ≈ 73 acelerações; derivado, 0,81*90)
```

Ressalva (buscador): o tracking óptico (TRACAB) subestima acelerações e desacelerações em relação a GPS com sensores inerciais.

---

## 5. Testes de equivalência estatística para comparar dois simuladores

**TOST.** FATO — Lakens, "Equivalence Tests: A Practical Primer" (https://pmc.ncbi.nlm.nih.gov/articles/PMC5502906/, lido via resumidor de página): duas hipóteses nulas compostas H01: Δ <= -ΔL e H02: Δ >= ΔU; equivalência só se as duas forem rejeitadas.

```
t_L = (M1 - M2 - Δ_L) / ( s * sqrt(1/n1 + 1/n2) )   rejeita H01 se t_L >=  t(df, α)
t_U = (M1 - M2 - Δ_U) / ( s * sqrt(1/n1 + 1/n2) )   rejeita H02 se t_U <= -t(df, α)
s = desvio padrão combinado; com variâncias desiguais usar Welch (graus de liberdade de Satterthwaite)
p do TOST = max(p_L, p_U) ; equivalente a o IC de 1-2α caber dentro de [Δ_L, Δ_U]
```

Margens: o artigo recomenda o menor efeito de interesse (SESOI), definido por teoria ou custo-benefício; se isso não existe, "o menor efeito que se tem poder para detectar"; como último recurso, referências de efeito pequeno, médio e grande (d = 0,2, 0,5, 0,8). O artigo não recomenda d = 0,5 como padrão (±0,5 e ±0,3 aparecem só como exemplo). Não há margem universal.

**Falha em rejeitar diferença não prova equivalência.** FATO (mesma fonte): se p > α, a única conclusão correta é que os dados não são surpreendentes sob a nula; "é estatisticamente impossível sustentar que o efeito verdadeiro é exatamente zero". Um teste sem significância pode apenas ter pouco poder.

**Distâncias entre distribuições** (definições, Wikipédia, lido via resumidor de página):

```
Wasserstein-p (1D, por quantis):  W_p = ( ∫_0^1 |F1^-1(q) - F2^-1(q)|^p dq )^(1/p)
  W1 = ∫ |F1(x) - F2(x)| dx ; mesma unidade da variável (ex.: gols, metros). Fonte: https://en.wikipedia.org/wiki/Wasserstein_metric
Variação total:  δ(P,Q) = sup_A |P(A) - Q(A)| = 0.5 * Σ_x |P(x) - Q(x)| (discreto) ; vai de 0 a 1 ;
  δ <= sqrt( KL(P||Q) / 2 )  (Pinsker). Fonte: https://en.wikipedia.org/wiki/Total_variation_distance_of_probability_measures
Distância de energia:  D² = 2 E|X-Y| - E|X-X'| - E|Y-Y'| >= 0 ; zero sse as distribuições são iguais ;
  em 1D D² = 2 ∫ (F-G)² dx (duas vezes a distância de Cramér) ;
  estatística de duas amostras  E_{n,m} = 2A - B - C , teste T = sqrt(nm/(n+m)) * E_{n,m}.
  Fonte: https://en.wikipedia.org/wiki/Energy_distance
```

Uso prático: Wasserstein e energia são sensíveis ao deslocamento de média e à forma; variação total exige discretizar variáveis contínuas e é insensível à distância entre os valores (por exemplo, 0 e 5 gols pesam igual a 0 e 1).

**Como a literatura de validação de simulação define limiares.** FATO (lido via resumidor de página) — https://en.wikipedia.org/wiki/Verification_and_validation_of_computer_simulation_models: o teste t clássico (H0: modelo e sistema iguais) tem erro tipo I = rejeitar modelo válido ("risco do construtor") e tipo II = aceitar modelo inválido ("risco do usuário"); o método de "faixa de precisão" aceita o modelo se a diferença entre médias cai em limites definidos antes, e com risco do construtor, risco do usuário e limites fixados calcula-se o tamanho de amostra; com intervalo de confiança e tolerância ε em torno do valor μ0 do sistema: ambas as pontas fora de ε → calibrar; ambas dentro → aceitar; uma dentro → mais corridas. FATO (só resumo de buscador) — Sargent: validade = faixa de precisão adequada ao uso pretendido, especificada antes do desenvolvimento, por variável de saída; falha em uma condição experimental invalida; sucesso em várias não garante validade nas demais. NÃO ENCONTRADO: um valor numérico universal de limiar de aceitação; os textos exigem fixá-lo por uso.

---

## 6. Futsal como caminho de desenvolvimento para o futebol

FATO (lido via resumidor de página) — comentário de Yiannaki, Carling e Collins, Front. Psychol. 2018 (https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01214/full) sobre Oppici et al. 2017 (Front. Psychol. 8:1387): o estudo original comparou, em jogos 6x6 com áreas por jogador de 36 m² (futsal) e 86 m² (futebol), idade média de 13,6 anos, o comportamento perceptivo e o passe; jogadores de futsal olham mais para outros jogadores ao receber a bola, e os de futebol varrem mais sem a bola. Críticas: formato 6x6 com campo modificado reduz validade ecológica, sem impedimento no teste de futebol, método de rastreio do olhar validado em outro esporte, e dados preliminares ("é preciso mais pesquisa antes de usar o futsal como ferramenta de desenvolvimento"); pedem estudos com jogo real, desenho representativo e intervenções randomizadas.

FATO (só resumo, buscador) — os próprios autores (Oppici) respondem que não testaram transferência entre esportes, e sim como praticar o passe em cada esporte molda o comportamento perceptivo; um estudo anterior (Oppici et al. 2018a) relatou passes mais precisos de jogadores de futsal em jogo de futebol modificado (https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01214/full e páginas Frontiers 2018 e 2019 indicadas pelo buscador).

FATO (só resumo) — Travassos, Araújo e Davids, "Is futsal a donor sport for football? Exploiting complementarity for early diversification in talent development", Science and Medicine in Football 2(1), 66-70: comentário teórico (Modelo de Habilidades Atléticas) que argumenta que o futsal enriquece a paisagem perceptivo-motora; não é estudo empírico de transferência (https://ubibliorum.ubi.pt/bitstreams/a55e7b34-eed7-4987-bc78-e4e329001f5e/download, só resumo).

FATO (só resumo) — Yiannaki, Toering, Collins e Carling (Football Studies, 2026), entrevistas com treinadores experientes em ambos os formatos: percepção de transferência positiva (evidência de percepção, não de desempenho). Revisão de identificação e desenvolvimento de talentos no futsal masculino (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9517923/): só resumo.

O que está e o que não está demonstrado: há indício de que a prática em futsal muda comportamento perceptivo e precisão de passe em tarefas modificadas, com jovens e amostras pequenas; não há, nas fontes lidas, estudo longitudinal ou randomizado mostrando que treinar futsal melhora desempenho em jogo de 11 contra 11. NÃO ENCONTRADO ensaio randomizado de intervenção.

---

## 7. Estatísticas da Série A do Brasileirão

FATO — não encontrei tabela de médias publicada por fonte oficial em página acessível (FBref e FootyStats retornaram 403). Calculei a partir do conjunto de dados comunitário https://github.com/adaoduque/Brasileirao_Dataset (arquivos `campeonato-brasileiro-estatisticas-full.csv`, 17.570 linhas por clube e jogo, e `campeonato-brasileiro-full.csv`; último commit 2026-02-05; lido integral por script). Procedência (como o autor coletou) não verificada; tratar como indicativo. Valores por clube e jogo (para o jogo inteiro, dobre); ano civil, não temporada (2020 e 2021 se misturam: 2021 tem 492 jogos, incluindo o fim da temporada 2020; 2020 tem 267):

```
ano  jogos  chutes  no alvo  passes  prec.passe%  faltas  amarelos  vermelhos  escanteios  impedimentos
2017   379   12,77    4,25    422,9      n/d       15,75     2,34      0,10       5,34        1,71
2018   380   12,63    3,99    426,5     79,99      15,55     2,39      0,13       5,33        1,48
2019   357   13,57    4,44    422,7     80,84      14,68     2,15      0,13       5,23        1,32
2020   267   12,58    4,19    428,4     80,84      15,87     2,22      0,15       5,18        1,52
2021   492   12,71    4,15    427,1     80,67      15,00     2,16      0,11       5,05        1,38
2022   380   13,60    4,39    414,9     79,95      13,44     2,40      0,14       5,51        1,52
2023   380   13,51    4,56    428,4     80,38      14,34     2,59      0,14       5,29        1,75
```

Em 2015 e 2016 o campo "no alvo" vem praticamente zerado e a precisão de passe vem zerada em 2015-2017 (dado ausente, não valor real). Estatísticas por clube de 2024 e 2025: NÃO ENCONTRADO (o conjunto não traz; 2024 tem placares mas não estatísticas). Por jogo (dois times, derivado): chutes ≈ 25 a 27; no alvo ≈ 8 a 9; faltas ≈ 27 a 32; amarelos ≈ 4,3 a 5,2; escanteios ≈ 10,1 a 11,0; impedimentos ≈ 2,6 a 3,5.

FATO (só resumo, trecho de buscador da Wikipédia em português) — Série A 2025: 959 gols em 380 jogos, 2,52 por jogo; conversão média de chutes em gol 9,3% (matéria do campeão, sem data de fechamento) (https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2025_-_S%C3%A9rie_A e https://www.flamengo.com.br/noticias/futebol/flamengo-lidera-a-tabela-e-as-estatisticas-do-brasileirao-2025).

---

## 8. Mando de campo e gols por jogo nas Séries A, B, C e D

FATO — contagem própria por script a partir da wikitext das páginas da Wikipédia em inglês de cada temporada (ex.: https://en.wikipedia.org/wiki/2024_Campeonato_Brasileiro_S%C3%A9rie_B), usando a caixa de informação (jogos e gols totais) e a matriz de resultados (célula `match_MAN_VIS = placar`, mandante primeiro). Lido integral por script. Ressalvas: a matriz da Série C tem 214 de 216 jogos; da Série D cobre só a fase de grupos (434 a 448 de 510 jogos); da Série A 2025 só 356 de 380 jogos.

Gols por jogo, pela caixa de informação (gols totais/jogos, todas as partidas):

```
Série B:  2021 2,17 (826/380)  2022 2,02 (766/380)  2023 2,09 (796/380)  2024 2,19 (832/380)  2025 2,22 (843/380)
Série C:  2021 2,05 (423/206)  2022 2,32 (501/216)  2023 2,15 (465/216)  2024 2,42 (522/216)  2025 2,00 (432/216)
Série D:  2021 2,43 (1259/518) 2022 2,26 (1154/510) 2023 2,34 (1191/510) 2024 2,24 (1143/510) 2025 2,25 (1148/510)
Série A (matriz, 2021-2025): 2,24 a 2,55 ; Série A 2015-2024 (conjunto de dados do item 7): 2,18 a 2,49
```

Mando de campo, anos 2021 a 2025 agregados (derivado da matriz):

```
Série  jogos  gols/jogo  gols mandante  gols visitante  vitória mandante  empate  vitória visitante  % dos gols do mandante
A       1794     2,43        1,42           1,01             47,0%          27,2%      25,8%             58,4%
B       1900     2,14        1,28           0,86             47,5%          29,4%      23,1%             59,9%
C       1060     2,19        1,30           0,90             47,4%          30,3%      22,4%             59,2%
D       2226     2,34        1,39           0,96             45,2%          29,6%      25,2%             59,2%
```

Variação anual: vitória do mandante na Série B de 43,4% a 52,4%; na Série C de 43,9% a 51,4%; na Série D (grupos) de 41,0% a 48,4%; na Série A, 2015 a 2024 (conjunto do item 7), de 43,7% a 53,3%. Amostras de uma temporada têm erro grande (cerca de ±5 pontos percentuais em 380 jogos): use o agregado.

---

## 9. Relatórios técnicos recentes (Copa do Mundo e Champions League)

**Copa do Mundo 2022.** FATO — Degrenne e Carling, "Comparison of goalscoring patterns between the 2018 and 2022 FIFA World Cups", Front. Sports Act. Living 2024 (https://frontiersin.org/articles/10.3389/fspor.2024.1394621/full; lido via resumidor de página; dados StatsPerform, sem gols de disputa de pênaltis). Não é o relatório técnico da FIFA, que não foi encontrado em PDF.

```
                            2018          2022
gols                         169           172      (172/64 jogos = 2,69 gols/jogo, derivado)
jogo aberto (posicional+contra-ataque rápido)   92 (54,4%)   128 (74,4%)
  ataque posicional           79           117
  contra-ataque rápido (fastbreak) 13        11
bola parada (total)           65 (38,5%)    42 (24,4%)
  escanteios 23 / 13 ; faltas diretas 7 / 2 ; faltas indiretas 12 / 10 ; pênaltis 22 / 17 ; laterais 1 / 0
gols contra                   12            2
gols no segundo tempo         59,8%        58,7%
xG jogo aberto                105,5        122,8    (gols 92 e 128)
posse antes do gol de jogo aberto (média)  25,9 s (dp 23,7)   33,6 s (dp 34,46)
```

**Copa do Mundo 2026.** FATO (só resumo) — relatório pós-torneio publicado em 2 de outubro de 2026, 104 jogos (https://inside.fifa.com/en/news/comprehensive-post-tournament-report-fifa-world-cup-2026) e revisão da fase de grupos (https://www.fifatrainingcentre.com/en/fifa-world-cup-2026/group-stage-review.php): contrapressão como tendência principal; estrutura de "rest defence" 3+2; goleiros fizeram só 52% dos tiros de meta na fase de grupos contra 91% em 2022; EUA e Canadá lideram no percentual do tempo sem bola em contrapressão (percentuais não informados); sem fórmula vencedora única. NÃO ENCONTRADO: gols por jogo, parcela de bola parada, gols de contra-ataque e métricas de altura de linha com números (as páginas lidas não os trazem e o PDF completo não foi localizado).

**Champions League 2023/24.** FATO — Relatório técnico UEFA 2023/24 (https://indd.adobe.com/view/publication/f2775b56-3f10-48b1-af79-55026873e9a5/l7c5/publication-web-resources/pdf/UCL_Tech-Report_2023-24_Digital.pdf; texto extraído e lidas as seções de gols e bola parada):

```
gols totais                     375  (3,0/jogo se 125 jogos; contagem de jogos não lida no relatório, derivado)
gols de bola parada (sem pênaltis)   66 = 18%  (os três anos anteriores: 16%)
gols de jogo aberto por tipo de ataque:
   posse controlada  157 (42%)  ; maior parte contra bloco baixo organizado
   transição          81 (22%)  : 41 dentro do campo adversário + 40 em contra-ataque de longe
   recuperação em pressão organizada  23 (gols marcados após ganhar a bola no campo adversário)
passes antes do gol de jogo aberto:  22% com 1 ou 2 passes ; 23% com 10 ou mais
gols no fim: 86 gols entre o minuto 76 e o fim = 23% do total
gols de cabeça em bola parada: 23 (21 + 2 gols contra)
Real Madrid em bloco médio: 38% do tempo sem bola (exemplo de um time)
```

**Champions League 2024/25.** FATO (só resumo, buscador) — 618 gols, 3,27 por jogo, o maior da era da Liga dos Campeões; bola parada 16% dos gols, e 24% com os 52 pênaltis (https://www.champions-journal.com/500/talking-tactics). Não verificado no relatório da UEFA.

NÃO ENCONTRADO: altura de linha defensiva e estruturas com e sem bola em números (metros) nos relatórios lidos; só descrições qualitativas e exemplos de caso.

---

## O que muda no desenho

Mecanismos concretos para adotar na simulação de 22 agentes, com a origem de cada um.

1. **Reivindicação da bola por tempo de chegada, sem ficha nem mensagem.** Cada agente calcula, no mesmo mundo previsto, o tempo de interceptação de todos; só o de menor tempo (`self_min <= mate_min` e `self_min < opp_min + 3`, ou `self_min <= 3`) persegue a bola; os demais vão para a posição de formação. Impede o enxame. Origem: `bhv_basic_move` (item 1.5). Empates resolvidos por índice fixo para o resultado ser determinístico.
2. **Tempo de interceptação com horizonte de 50 passos, limite de alcance `(controle + vmax·(t+bônus−penalidade)+0,5)²` e bônus de incerteza de até 3 passos.** Serve também para a pressão (quem chega primeiro ao portador) e para o controle de espaço. Origem: item 1.3.
3. **Posição de formação como função do ponto focal (bola prevista no instante de menor `min(self, mate, opp)`)**, interpolada por triangulação de Delaunay sobre amostras da tática, com formações de ataque, defesa e normal escolhidas pela diferença de dois passos entre o tempo de bola nosso e do adversário, e posição limitada pela linha de impedimento menos 1,0. Origem: itens 1.4 e 2.
4. **Troca de papéis por permuta de números de papel**, com atribuição por matriz de custo quando mais de uma troca é pedida: Húngaro O(n³) com custo = distância² (ou tempo de chegada) após minimizar o maior deslocamento (MMD+MSD2); para n = 11 custa microssegundos. Origem: SCRAM (item 2).
5. **Marcação com k melhores alvos por agente (k = 3) e cobertura dos mais perigosos primeiro**, em vez de Húngaro puro, para ficar estável com informação ruidosa; atacantes adversários não são marcados por quem precisa guardar energia para o contra-ataque. Origem: OMAM do CYRUS (item 1.7). Se a simulação for determinística e sem ruído de observação, o Húngaro puro basta.
6. **Busca de ações em cadeia limitada: profundidade 4, no máximo 500 avaliações por decisão, geradores de passe, passe em corrida, cruzamento, chute, drible, afastar; avaliação = progressão em x + proximidade do gol + bônus de chance de chute.** Boa linha de base barata para o portador. Origem: item 1.6.
7. **Gestão de stamina por três variáveis (stamina, recuperação, esforço) com capacidade total finita por jogo, política de potência por situação e modo de recuperação com histerese 50%/70%.** Constantes do item 1.1 e 1.5 servem de ponto de partida para velocidade, aceleração e fadiga; heterogeneidade por jogador via deltas do item 1.2 (tipos distintos de corredor, chutador, resistência).
8. **Equivalência entre simuladores por TOST com margem fixada antes**, por métrica (gols por jogo, chutes, faltas, escanteios, impedimentos, cartões, comprimento e largura da equipe), mais Wasserstein-1 para distribuições de contagem e distância de energia para vetores; relatar também o intervalo de confiança contra a tolerância. Nunca concluir equivalência por p > 0,05. Origem: item 5. As margens devem sair do desvio entre temporadas reais (por exemplo, o intervalo dos anos 2021-2025 dos itens 7 e 8), não de um d genérico.
9. **Alvos de calibração com faixa e não com ponto**, a partir dos itens 4, 7, 8 e 9: gols por jogo Série A 2,18 a 2,55, B 2,02 a 2,22, C 2,00 a 2,42, D 2,24 a 2,43; vitória do mandante 45 a 48% agregada (43 a 53% por temporada); chutes ≈ 12,6 a 13,6 por time e jogo; bola parada 18% (Champions 23/24) a 24% (Copa 2022) dos gols; transição 22% e posse controlada 42% dos gols de jogo aberto (Champions 23/24); comprimento 31 a 46 m, largura 35 a 48 m, stretch 7 a 16 m, área ≈ 900 m², sempre maiores com a bola.
10. **Pressão e altura de bloco como parâmetros de entrada**, não como saída calibrada: não há faixas publicadas em metros (item 4 e 9); definir os três blocos pela convenção da mediana de x (baixo, médio, alto) e validar só pelos efeitos medidos (comprimento, largura, gols sofridos), documentando que a convenção é de um analista.
11. **Modelo de tempo de chegada para controle de espaço**: usar o modelo de Spearman (tti com reação 0,7 s, vmax, sigma 0,45 s e logística) para cobertura do campo e passe; usar Fujimura (alpha 1,3, vmax 7,8 m/s) quando o jogador já corre; os dois são alternativas baratas; o tempo de reação e sigma funcionam como "ruído de percepção" ajustável.
12. **Comunicação mínima ao estilo `say`**: mensagens curtas e somente quando muda algo relevante (bola mudou de velocidade, estamina baixa), com uma conversa por ciclo no máximo; carimbo de tempo, mais recente vence. Origem: itens 1.8 e 2.
13. **Ficha de reivindicação para a pressão** (um pressionador por portador, mais um de cobertura) como camada extra sobre a regra do item 1: NÃO há fonte acadêmica; adotar apenas se a regra de tempo de chegada deixar dois pressionadores empatados.
