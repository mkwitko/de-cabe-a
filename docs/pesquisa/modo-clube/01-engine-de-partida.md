# Engine de partida para um jogo de gestão de futebol: pesquisa de base

Data da pesquisa: 2026-11-13. Escopo: oito tópicos de modelagem de partidas de futebol.

Convenção de etiquetas:

- **EVIDÊNCIA**: afirmação com fonte (URL) e o número citado. Quando o número veio de resumo secundário (comunicado de imprensa, página de agregador, repositório de código) isso é dito. Nenhum PDF foi lido diretamente: os PDFs retornaram binário ilegível, então os artigos só foram lidos por página HTML, resumo ou abstract.
- **COMUNIDADE**: prática ou valor corrente em blogs, repositórios e fóruns, sem verificação acadêmica.
- **HIPÓTESE DE DESIGN**: decisão proposta para o simulador, não comprovada.

Números que não foram encontrados estão listados na seção "Lacunas".

---

## 1. Expected goals (xG): variáveis, conversão, pênaltis, cabeceios, volume de chutes

**Variáveis típicas do modelo.**

- EVIDÊNCIA: o modelo xG da Opta usa distância e ângulo ao gol, posição do goleiro, clareza do alvo (jogadores no caminho), pressão de defensores, tipo de finalização (pé, voleio, cabeceio, mano a mano), padrão de jogo (jogada aberta, contra-ataque, falta, escanteio, lateral) e ação anterior (tipo de assistência). Segundo o texto, são mais de 20 variáveis. Fonte: https://theanalyst.com/articles/what-is-expected-goals-xg
- EVIDÊNCIA: o modelo da American Soccer Analysis usa 42 dados por chute, e a autora afirma que cerca de 5.000 chutes bastam para um xG básico e cerca de 25.000 para um modelo bom. Fonte: https://americansocceranalysis.com/home/2021/8/12/where-goals-come-from-using-past-goals-to-create-future-goals
- EVIDÊNCIA: modelos de regressão logística (distância e ângulo) e gradient boosting são o padrão acadêmico. Hewitt e Karakuş treinaram com 15.575 chutes da StatsBomb e dividiram o treino por posição (atacante, meio-campo, defesa). Fonte: https://arxiv.org/abs/2301.13052
- EVIDÊNCIA (resumo de busca, não verificado no artigo): um artigo reporta coeficiente de cerca de -0,31 por metro de distância e +0,09 por radiano de ângulo em um modelo logístico simples. Não foi aberto o artigo original, então tratar apenas como ordem de grandeza. Fonte indicada pela busca: https://arxiv.org/pdf/2401.09940 (o mesmo artigo também discute viés dos modelos xG na medição de finalização).
- COMUNIDADE: blogs de tutorial usam coeficiente de cabeceio em torno de -0,55 na escala logit, mas é parâmetro de simulação do próprio blog, não estimativa real. Não usar como referência.

**Taxas de conversão.**

- EVIDÊNCIA: conversão média na Premier League desde 2003/04 de 10,30 por cento dos chutes (incluindo bloqueados); em 2023/24 foi o recorde de 11,88 por cento; 49,96 por cento dos chutes foram no alvo, contra média de 20 anos de 45,10 por cento; 27,60 chutes por jogo (somando os dois times). Fonte: https://premierleague.com/news/4027257
- EVIDÊNCIA: base da American Soccer Analysis, cerca de 375.000 chutes: taxa de conversão de 9,875 por cento, xG médio por chute 0,098, xG mediano 0,0526, e cerca de 70 por cento dos chutes têm xG abaixo de 10 por cento. Fonte: https://americansocceranalysis.com/home/2021/8/12/where-goals-come-from-using-past-goals-to-create-future-goals
- EVIDÊNCIA: base de 10 ligas profissionais (Espanha, Inglaterra, Itália, Alemanha, Portugal, Turquia e outras, 2010/11 a 2019/20): média de 24,68 chutes, 9,18 chutes no alvo e 2,64 gols por jogo. Correlação com gols: chutes r = 0,29; chutes no alvo r = 0,53. Fonte: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0248590
- EVIDÊNCIA: Premier League 2021-22: 1.071 gols em 9.747 chutes (25,7 chutes por jogo). Fonte: resumo de busca de https://theanalyst.com/articles/numbers-behind-premier-league-goal-explosion (página não aberta).
- EVIDÊNCIA: cabeceios foram 10 por cento de todos os chutes na Premier League 2022/23, o maior valor em 12 temporadas; chutes em jogo corrido (sem cabeceio) caíram de pouco mais de 21 para pouco mais de 18 por jogo (queda de 17 por cento) entre 2011/12 e 2022/23. Fonte: https://apfa.io/posts/the-evolution-of-shooting-in-the-premier-league/
- EVIDÊNCIA (ilustrativa, de modelo próprio do autor): cerca de 50 por cento ou mais de chance de gol dentro da pequena área, 20 a 30 por cento perto da marca do pênalti, 5 a 10 por cento na entrada da área. Mesma fonte (apfa.io). Não é estatística de liga, é leitura de um modelo.
- COMUNIDADE: faixas de xG por distância (cerca de 35 por cento na pequena área, menos de 3 por cento fora da área) aparecem em páginas de tutorial sem fonte primária. Fonte: https://metricgate.com/blogs/expected-goals-xg-soccer-analytics/ . Usar só como ordem de grandeza.

**Pênaltis.**

- EVIDÊNCIA: a Opta atribui valor constante de 0,79 xG ao pênalti, refletindo a conversão histórica. Fonte: https://theanalyst.com/articles/what-is-expected-goals-xg
- EVIDÊNCIA: a American Soccer Analysis encontra pênaltis agrupados perto de 0,77 xG. Fonte: https://americansocceranalysis.com/home/2021/8/12/where-goals-come-from-using-past-goals-to-create-future-goals
- EVIDÊNCIA: estudo com 115 competições europeias estima conversão em jogo de 82,00 por cento (após filtrar temporadas anômalas) e conversão menor em disputa de pênaltis, atribuída à piora do batedor, não à melhora do goleiro. Fontes: https://arxiv.org/pdf/2310.04797v1 e https://pmc.ncbi.nlm.nih.gov/articles/PMC11627389/ (números lidos em resumo de busca).
- EVIDÊNCIA: Copas do Mundo e Eurocopas 2000-2010: 73 por cento em disputa de pênaltis e 68 por cento no tempo normal (Dalton e colegas, 2015, via resumo de busca). Amostra de torneios, não de liga.

**Gols por jogo e chutes no Brasil.**

- EVIDÊNCIA: Série A 2024: 380 jogos, 929 gols, 2,44 por jogo. Fonte: https://en.wikipedia.org/wiki/2024_Campeonato_Brasileiro_S%C3%A9rie_A
- EVIDÊNCIA: Série B 2024: 380 jogos, 832 gols, 2,19 por jogo. Fonte: https://en.wikipedia.org/wiki/2024_Campeonato_Brasileiro_S%C3%A9rie_B
- EVIDÊNCIA (agregador): Série A 2023 com 946 gols, 2,49 por jogo; 2025 com 959 gols, 2,52 por jogo. Fonte: https://www.futbol24.com/national/Brazil/Serie-A/2023/statistics e https://www.futbol24.com/national/Brazil/Serie-A/2025/statistics (resumo de busca; as páginas não foram abertas).
- EVIDÊNCIA: chutes por jogo da Série A só foram achados por time, não por liga: Palmeiras 17,5, Athletico 15,9, Corinthians 14,6 (Footstats 2024, via https://www.bemparana.com.br/publicacao/blogs/entrelinhas-do-jogo/athletico-precisa-de-15-finalizacoes-para-marcar-um-gol/amp/); Palmeiras 15,1, Criciúma 10,5, Atlético-GO 10,3 (https://www.sportsmole.co.uk/football/brasileiro/2024/best-attack.html). Fontes divergem em definição de chute. A média da liga não foi achada.
- EVIDÊNCIA: em 2026 a média de chutes por rodada subiu a nível recorde desde 2013 após as regras antiperda de tempo, segundo estudo do economista Bruno Imaizumi para o Gato Mestre. O texto não traz o valor numérico. Fonte: https://netvasco.com.br/n/395220/dispara-o-numero-de-finalizacoes-apos-regras-antijogo-e-brasileiro-2026-se-descola-de-media-historica

**HIPÓTESE DE DESIGN.** Usar xG por chute como pipeline único: probabilidade de gol = logística(distância, ângulo, tipo de finalização, pressão, goleiro). Calibrar a média do modelo em cerca de 0,10 por chute (média das fontes acima: 9,9 a 11,9 por cento). Pênalti como constante de 0,77 a 0,82 (ver calibragem). Cabeceio com cerca de 10 por cento dos chutes.

---

## 2. Modelos de placar: Poisson, Dixon-Coles, Poisson bivariado, empates e vantagem de mandante

**Dixon-Coles.**

- EVIDÊNCIA: Dixon e Coles (1997, JRSS Series C, 46, 265-280) usam Poisson independente com λ_casa = exp(ataque_casa − defesa_fora + γ) e um fator corretivo τ aplicado só aos placares 0-0, 0-1, 1-0 e 1-1: no resumo secundário, τ = 1 − ρ para os placares com h ≤ 1 e a ≤ 1 (exceto 1-1) e τ(1,1) = 1 + ρ, com ρ negativo para deslocar massa de 1-0 e 0-1 em direção a 0-0 e 1-1. Os dados originais são da liga inglesa de 1992 a 1995. O peso de tempo é exp(−δ·dias), com δ típico de 0,001 a 0,006 por dia. Fonte (resumo secundário, não o artigo): https://sports-models-kb.pages.dev/dixon-coles-original-paper . O artigo original não foi lido.
- Atenção: o resumo secundário escreve τ = 1 − ρ para "h ≤ 1 e a ≤ 1 exceto (1,1)", o que inclui 0-0. A forma clássica do artigo usa τ(0,0) = 1 − λμρ, τ(0,1) = 1 + λρ, τ(1,0) = 1 + μρ, τ(1,1) = 1 − ρ. Esta forma clássica vem de memória e não foi verificada nas fontes lidas. Conferir no artigo antes de implementar.
- EVIDÊNCIA (secundária, valores divergentes entre fontes): ρ típico entre -0,1 e -0,2 em um resumo, entre -0,15 e -0,05 em outro; fator de mandante γ de 1,3 a 1,4 em grandes ligas europeias, ou coeficiente logarítmico de 0,27 (cerca de 1,31) em exemplo de pacote R. Fonte: resultado de busca com https://metricgate.com/docs/dixon-coles-soccer-model/ e https://github.com/opisthokonta/goalmodel (não abertos).
- EVIDÊNCIA: o artigo de dependência em resultados de futebol discute que Poisson independente subestima empates e propõe alternativa. Fonte: https://arxiv.org/pdf/2103.07272 (binário, só indexado; conclusões não extraídas).

**Poisson bivariado.**

- EVIDÊNCIA (resumo de busca): Karlis e Ntzoufras modelam dependência positiva por componente compartilhada (covariância constante entre partidas, ou função de covariáveis); a extensão de 2009 infla a diagonal do quadro de placares (empates) com peso entre 0 e 1. Em uma aplicação à Copa de 2018 os pesos de inflação ajustados ficaram próximos de zero. Fonte: https://www.jstatsoft.org/index.php/jss/article/view/v014i10/v14i10.pdf e https://ftp.fau.de/cran/web/packages/footBayes/vignettes/footBayes_a_rapid_guide.html . Valores de covariância por liga não foram achados.

**Taxa de empates e de vitórias.**

- EVIDÊNCIA: Série A 2024: 180 vitórias do mandante, 101 empates, 99 vitórias do visitante em 380 jogos, ou seja 47,4 por cento, 26,6 por cento e 26,1 por cento. As vitórias do mandante foram contadas à mão na matriz de resultados da página (a própria ferramenta alerta para possível pequeno erro); empates e vitórias do visitante saem da tabela. Fonte: https://en.wikipedia.org/wiki/2024_Campeonato_Brasileiro_S%C3%A9rie_A
- EVIDÊNCIA (derivado): vitórias de visitante na Série A: 104 em 2022, 107 em 2023, 99 em 2024 de 380 jogos (27 por cento, 28 por cento, 26 por cento por cálculo). Fonte: resumo de busca de https://placar.com.br/?p=309000 (página aberta não confirmou). O Placar também diz que os mandantes têm hoje a maior porcentagem de vitórias da história, 53 por cento, sem deixar claro o recorte. Este número não foi confirmado e contradiz o valor 47,4 por cento de 2024; não usar.
- EVIDÊNCIA: Premier League 2018-19: mandante 181 (47 por cento), visitante 128 (34 por cento), empates 71 (19 por cento). Fonte: https://en.wikipedia.org/wiki/Home_advantage (citando Sky Sports).

**Tamanho da vantagem de mandante.**

- EVIDÊNCIA: método de Pollard: fração dos pontos conquistados em casa; 50 por cento significa ausência de vantagem. Na Inglaterra, estudo de mais de 70.000 jogos de 1888 a 2003 encontra a vantagem estável em torno de 60 por cento dos pontos em casa; análise da primeira divisão inglesa de 1992/93 a 2011/12 achou 60,77 por cento. Fontes: https://pmc.ncbi.nlm.nih.gov/articles/PMC4415821 (carta sobre o método) e resultado de busca com https://johk.pl/wp-content/uploads/2023/03/10.1515_hukin-2015-0001.pdf (PDF, não aberto).
- EVIDÊNCIA: times de menor posição na tabela têm vantagem de mandante maior que os melhores. Fonte: https://pmc.ncbi.nlm.nih.gov/articles/PMC4415821
- EVIDÊNCIA: nos jogos de 2005 a 2006 da Premier League, 10.000 torcedores a mais correspondem a 0,1 gol a mais do mandante (Boyko, Journal of Sports Sciences, via Wikipedia). Fonte: https://en.wikipedia.org/wiki/Home_advantage

**Estudos de pandemia (estádios vazios).**

- EVIDÊNCIA: Wunderlich et al. (PLoS ONE, 2021), 36.882 jogos com público e 1.006 sem público, dez ligas: no modelo só de 2019/20 o efeito do público não é significativo para gols (p = 0,449) e pontos (p = 0,498), com a vantagem reduzida em cerca de um sexto; no conjunto de dez temporadas a redução é de cerca de um terço (p = 0,056 para gols, 0,068 para pontos); o domínio do mandante em chutes foi quase pela metade; faltas e cartões amarelos contra o visitante desapareceram; o desvio por árbitro some sem público, mas a vantagem de mandante não some. A vantagem caiu cerca de 10 por cento ao longo das dez temporadas anteriores. Fonte: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0248590
- EVIDÊNCIA: o mesmo artigo compara com 5.624 jogos amadores da Kreisliga A alemã e não acha diferença significativa de vantagem de mandante entre amador e profissional sem público (coeficiente de pontos -0,0318, p = 0,514). Mesma fonte.
- EVIDÊNCIA (resumo de imprensa): estudo de McCarrick e colegas (Psychology of Sport and Exercise, 2021) reporta queda forte da vantagem de gols e pontos sem público e mudança no comportamento dos árbitros; vantagem de 0,29 gol por jogo com público; pontos quase pela metade. Fonte: https://www.leeds.ac.uk/news/article/4894/how_empty_stadiums_affected_football_during_pandemic . Os autores de Wunderlich criticam esse trabalho por contar cada jogo duas vezes na regressão.
- EVIDÊNCIA (resumo de busca): estudo hospedado em Stirling reporta que árbitros deram mais de um terço de cartão amarelo a menos por jogo aos visitantes sem público, e que o efeito sobre o resultado final não é estatisticamente conclusivo. Fonte: https://www.stir.ac.uk/research/hub/file/1969461 (PDF, não lido).

**Causas da vantagem de mandante.**

- EVIDÊNCIA: o artigo de Wunderlich lista apoio e pressão da torcida sobre o árbitro, expectativa psicológica, fadiga de viagem, familiaridade com o estádio, territorialidade, comportamento tático (mandante joga mais ofensivo), aprendizado e possível ausência de pressão; conclui que os dados mostram que a vantagem não se deve só à torcida. Fonte: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0248590
- EVIDÊNCIA: segundo o resumo da Wikipedia, fadiga de viagem, distância, familiaridade e viés de arbitragem têm efeitos fracos isoladamente. Fonte: https://en.wikipedia.org/wiki/Home_advantage (citação de segunda mão).

**HIPÓTESE DE DESIGN.** Não usar Poisson cru como motor de partida (a partida emerge das ações), mas usar Dixon-Coles e Poisson bivariado como **validador estatístico**: simular milhares de partidas e verificar placar, empate e média de gols contra Série A e Série B. Vantagem de mandante dividida em canais separados e cada um calibrável: árbitro (cartões e faltas), tática (ritmo e risco), fadiga do visitante, familiaridade (campo, gramado), moral da torcida. O canal árbitro é o que desaparece sem público; os outros permanecem.

---

## 3. Modelos espaciais: controle de campo, EPV, probabilidade de passe, partículas autopropulsionadas, perigo

**Controle de campo de Spearman (2018).**

- EVIDÊNCIA: Spearman, "Beyond Expected Goals", MIT Sloan 2018, modelo físico tipo potencial elétrico sobre dados de rastreamento de 58 partidas da temporada 2017-18 (Hudl). Fonte: lista de referências em https://arxiv.org/html/2501.05870v1 e resumo de busca; o artigo original não foi aberto.
- EVIDÊNCIA: parâmetros padrão da implementação pública de Laurie Shaw para o modelo: velocidade máxima do jogador 5 m/s, tempo de reação 0,7 s, tti_sigma 0,45, lambda de ataque 4,3, lambda de defesa 4,3 vezes kappa_def (kappa_def 1,0), velocidade média da bola 15 m/s, passo de integração 0,04 s, tempo máximo de integração 10 s, veto de tempo de controle de 3 s. Tempo para interceptar = tempo de reação + distância em linha reta (a partir da posição projetada após a reação) dividida pela velocidade máxima. Probabilidade de interceptar a bola no instante T = 1 / (1 + exp(−(π/√3)·(T − tti)/tti_sigma)). Fonte: https://raw.githubusercontent.com/Friends-of-Tracking-Data-FoTD/LaurieOnTracking/master/Metrica_PitchControl.py
- EVIDÊNCIA: Spearman estimou o parâmetro de sensibilidade de decisão β entre 2,3 e 2,7, que varia com qualidade e intensidade do campeonato; quando β tende ao infinito o modelo vira diagrama de Voronoi. Fonte: https://arxiv.org/html/2501.05870v1
- EVIDÊNCIA: entrevista com a equipe de análise de um clube inglês descreve controle de campo como "a probabilidade de um jogador controlar a bola se ela estivesse naquele ponto", com toque controlado em cerca de 1 s em 90 por cento dos casos; o controle relevante pesa mais que o total, e o espaço é ponderado por valor (espaço atrás da defesa vale mais). Fonte: https://archive.trainingground.guru/articles/william-spearman-how-liverpool-create-pitch-control
- EVIDÊNCIA: Fernández e Bornn ("Wide Open Spaces", 2018) modelam a influência de cada jogador como normal bivariada que depende de posição, velocidade e distância à bola; o controle é a soma das influências. Fontes: https://arxiv.org/html/2501.05870v1 (descrição) e resumo de busca. Parâmetros numéricos não foram achados.

**EPV (valor esperado de posse).**

- EVIDÊNCIA: Fernández, Bornn e Cervone definem EPV como a probabilidade de a equipe fazer ou sofrer o próximo gol em qualquer instante, decomposta em passes, conduções e chutes; redes neurais sobre dados espaço-temporais de 22 jogadores e bola produzem superfícies de probabilidade de passe. O abstract não traz métricas numéricas. Fonte: https://arxiv.org/abs/2011.09426 (versão em Machine Learning, 2021, DOI 10.1007/s10994-021-05989-6).

**Partículas autopropulsionadas.**

- EVIDÊNCIA: Peralta Alguacil, Piñones Arce, Sumpter e Fernández, "Seeing in to the future" (MIT Sloan 2020): cada jogador é partícula que prevê alguns segundos à frente e se move para o ponto de maior valor segundo três critérios: probabilidade de passe, impacto no campo e controle de campo. Uma resenha observa que, em alguns casos, a posição atual do jogador previa a posição futura melhor que os modelos. Fontes: https://www.sloansportsconference.com/research-papers/seeing-in-to-the-future-using-self-propelled-particle-models-to-aid-player-decision-making-in-soccer e https://buttondown.com/getgoalside/archive/research-in-focus-predicting-attacking-movement-3101
- EVIDÊNCIA: modelo de sprint de Fujimura-Sugihara estimado com dados de rastreamento: velocidade máxima V_max 14,53 m/s (passo de 1 s) ou 11,19 m/s (passo de 2 s), constante α de 1,23 e 1,04 por segundo; para hóquei em experimento anterior, V_max 7,8 m/s e α 1,3. Os valores de rastreamento são sensíveis ao erro de ±1 m e ao passo de tempo, portanto não usar como velocidade real de jogador. Fonte: https://arxiv.org/html/2205.04511

**Probabilidade de passe e perigo (dangerousity).**

- EVIDÊNCIA: não foi achado, nas fontes lidas, um coeficiente publicado de probabilidade de passe nem a fórmula de "dangerousity". A descrição existente é a de EPV e controle de campo acima.

**HIPÓTESE DE DESIGN.** Para um simulador de gestão, o controle de campo de Spearman é barato e dá a base de um sistema de "espaço": cada célula de campo tem P(ataque) e P(defesa) pela fórmula logística acima, com velocidades máximas por atributo do jogador (usar 5 m/s do código público como piso, não 9 a 10 m/s de sprint real, para cobrir aceleração; ver Seção 5). Passe: probabilidade = produto da chance de interceptação por cada defensor no trajeto usando o tempo de bola. Perigo = controle × xG da célula. Reservar EPV por rede neural como fora do escopo.

---

## 4. Simulação baseada em agentes: RoboCup 2D, Google Research Football, IA de utilidade e steering

**RoboCup 2D.**

- EVIDÊNCIA: cada equipe tem 11 agentes autônomos; um servidor central guarda o estado completo e a física; os agentes recebem sensores relativos e ruidosos e enviam comandos básicos (dash, turn, kick). Uma partida tem 6.000 ciclos de 100 ms (cerca de 10 minutos; 3.000 ciclos por tempo, half_time de 300 s). A liga existe desde 1997; a equipe HELIOS tem 8 títulos, a mais recente em 2025. Fonte: https://en.wikipedia.org/wiki/RoboCup_2D_Soccer_Simulation_League e https://rcsoccersim.readthedocs.io/en/latest/soccerserver.html
- EVIDÊNCIA: valores padrão do servidor (server.conf): passo de simulação 100 ms; sensor visual assíncrono a cada 150 ms (sense_step); sensor do corpo a cada 100 ms; ângulo visível 90°; distância visível 3,0 m; ruído de distância 0,0125; player_speed_max 1,05; player_accel_max 1,0; player_decay 0,4; stamina_max 8000; stamina_inc_max 45; esforço mínimo 0,6; decay da bola 0,94; kick_rand 0,1; ball_rand 0,05; área de captura do goleiro 2,0 por 1,0; tackle_dist 2 e tackle_exponent 6. Fonte: https://rcsoccersim.readthedocs.io/en/latest/soccerserver.html (a página foi lida até o caractere 100.000 de 113.099).
- EVIDÊNCIA: o modelo de audição limita cada jogador a ouvir no máximo uma mensagem por equipe a cada dois ciclos. Fonte: resumo de busca do manual em https://rcsoccersim.readthedocs.io/
- EVIDÊNCIA: a equipe HELIOS descreve um modelo de formação por triangulação de Delaunay com interpolação linear, "semelhante em espírito ao posicionamento estratégico baseado em situação (SBSP), mas mais flexível"; versão posterior usa triangulação de Delaunay com restrições; as formações são editadas na ferramenta fedit (depois fedit2) do pacote base agent2d. Fontes: https://wrighteagle2d.github.io/robocup/2010/2D_TDP_HELIOS.pdf , https://staff.fnwi.uva.nl/a.visser/activities/robocup/RoboCup2013/Symposium/TeamDescriptionPapers/SoccerSimulation/Soccer2D/TDP_HELIOS2013.pdf (PDFs; só o texto do resumo de busca foi lido).
- Não foi achado nas fontes lidas o artigo original de Reis e Lau sobre SBSP, apenas a referência a ele como "mecanismo bem conhecido de posicionamento de agentes".

**Google Research Football.**

- EVIDÊNCIA: ambiente de simulação 3D baseado em física; cerca de 140 milhões de passos por dia em máquina de seis núcleos; o jogo completo padrão tem 3.000 passos, que a nota de rodapé equivale a 300 s a 10 passos por segundo (o corpo do texto fala em 55 minutos, o que conflita); 19 ações; recompensa +1 por gol e -1 por gol sofrido, mais recompensas de checkpoint de 0,1 por região (10 regiões, máximo 1); observações em pixels 1280×720, mapa pequeno com quatro matrizes 72×96 ou vetor de 115 números. Cenários de Football Academy: 11, incluindo Empty Goal, Run to Score with Keeper, 3 versus 1 with Keeper, Corner, Easy Counter-Attack e Hard Counter-Attack. Fonte: https://arxiv.org/html/1907.11180v2 (estes números foram extraídos por resumo automático da página; o próprio resumo alertou conflito entre texto e tabela).
- EVIDÊNCIA: os agentes de aprendizado por reforço (PPO, IMPALA, DQN) ficam em geral abaixo da IA padrão em dificuldade média e difícil. DQN a 500 milhões de passos fez diferença de gols de 8,16 na fácil, 2,01 na média e 0,27 na difícil. Mesma fonte.

**IA de utilidade e steering.**

- COMUNIDADE: não foi achado artigo primário específico de futebol sobre utility AI nem steering; as técnicas de steering (Reynolds) e utility AI são padrão da indústria de jogos. Não há número verificado a citar.

**HIPÓTESE DE DESIGN.**

- Passo de simulação de 100 ms (10 Hz) para lógica de decisão, com interpolação visual a 60 Hz; partida de 90 minutos simulada a 54.000 passos de 100 ms, ou menos com passo variável de 200 a 500 ms quando não há bola em disputa. O RoboCup comprova que 10 Hz basta para comportamento convincente.
- Camadas: mundo percebido com ruído e latência (vision 150 ms, corpo 100 ms), posicionamento por formação interpolada (Delaunay ou grade de âncoras indexadas pela posição da bola, no espírito de SBSP), decisão por utilidade (passe, drible, chute, cobrar posição) e movimento por steering com aceleração limitada.
- Percepção imperfeita (ruído, campo de visão) é a alavanca natural para atributos como visão de jogo e posicionamento.

---

## 5. Dados físicos: distância, sprints, fadiga, velocidade, cartão vermelho e substituições

**Distância e alta intensidade.**

- EVIDÊNCIA: Barnes et al. (Int J Sports Med, 2014), Premier League de 2006-07 a 2012-13, mais de 1.000 jogadores e 23.000 observações: a distância total foi cerca de 2 por cento maior em 2012-13; corrida de alta intensidade de 890±299 m para 1.151±337 m (cerca de +30 por cento); distância em sprint de 232±114 m para 350±139 m (+35 por cento); número de sprints de 31±14 para 57±20; sprint médio mais curto (6,9±1,3 m para 5,9±0,8 m); proporção de sprints explosivos de 34±11 por cento para 47±9 por cento; passes por jogador de 25±13 para 35±17; acerto de passe de 76±13 por cento para 83±10 por cento. Fonte: resumo de busca de https://sure.sunderland.ac.uk/4904 e https://sciencedaily.com/releases/2014/08/140811124626.htm (valores do abstract, extraídos por resumo; artigo não lido).
- EVIDÊNCIA: Bradley et al. (2009), 28 jogos da Premier League 2005-06 (n = 370): meio-campistas laterais tiveram a maior distância de alta intensidade, 3.138 m (desvio 565). Fonte: resumo de busca de https://read.qxmd.com/read/19214939/analysis-of-high-intensity-activity-in-premier-league-soccer
- EVIDÊNCIA: Di Salvo et al. (2007), 300 jogadores de campo na liga espanhola e Liga dos Campeões: meio-campistas cobrem significativamente mais distância total que zagueiros e atacantes (p < 0,0001); primeiro tempo com mais corrida de intensidade média (11,1 a 19 km/h) que o segundo. O valor de 11,4 km citado em outras fontes não foi confirmado. Fonte: https://www.thieme-connect.de/products/ejournals/abstract/10.1055/s-2006-924294

**Queda no segundo tempo.**

- EVIDÊNCIA: nos últimos 15 minutos, a corrida de alta intensidade dos meio-campistas laterais cai de 467 m (desvio 104) para 344 m (desvio 80), queda de cerca de 26 por cento por cálculo; o tempo de recuperação entre corridas de altíssima intensidade é 28 por cento maior. Fonte: resumo de busca do trabalho de Bradley (2009), https://read.qxmd.com/read/19214939/analysis-of-high-intensity-activity-in-premier-league-soccer

**Velocidades máximas.**

- EVIDÊNCIA: velocidade máxima registrada na Premier League desde 2020/21: 37,38 km/h (Micky van de Ven, zagueiro, 2023-24); atacante mais rápido da temporada 36,93 km/h; meio-campista mais rápido 36,84 km/h; lateral citado 35,9 km/h. Os números dependem do fornecedor de rastreamento. Fonte: https://www.premierleague.com/news/3680868 e https://www.sportbible.com/football/football-news/premier-league-fastest-players-this-season-827528-20240417 (resumos de busca).
- EVIDÊNCIA: Liga dos Campeões 2018/19: máximas de 34,5 km/h (van Dijk), 34,4 (Sané), 34,2 (Walker); 2017/18, Salah 33,8; 2016/17, Mendy 32,6; sprints por jogo (≥ 25,2 km/h) de 62,25 do líder (Tadić), 54,38 (Mané). Fonte: https://archive.trainingground.guru/articles/premier-league-pushes-european-speed-limits-again . O artigo não separa por posição.
- Não foi achada tabela confiável de velocidade máxima média por posição.

**Cartão vermelho.**

- EVIDÊNCIA: análise de 204 jogos da Premier League com exatamente uma expulsão: expulsão no minuto 1 vale cerca de 1,08 gol no total, sendo +0,61 xG para o time com 11 e -0,47 xG para o time com 10; a expulsão média ocorre aos 66 por cento do jogo; o valor decai ao longo do jogo. Fonte: https://blogarchive.statsbomb.com/articles/soccer/dogso-and-punishment/ . Estimativa anterior de Mark Taylor: 1,45 gol para expulsão no minuto 1 (citada no mesmo texto).
- EVIDÊNCIA (resumo de busca): Bar-Eli e colegas, 743 jogos alemães: expulsão do time mais forte tende a reduzir gols, do mais fraco tende a aumentá-los; Greenberg (2015, Significance) conclui, em quatro temporadas da Premier League, que não é mais difícil jogar contra dez; um modelo de taxa de gol de 2017 acha que expulsões no segundo tempo não têm efeito mensurável. Fontes: https://www.nottingham.ac.uk/economics/documents/news/greenberg-2015-significance.pdf (PDF, não lido) e https://link.springer.com/article/10.1007/s10479-022-04733-0

**Substituições.**

- EVIDÊNCIA: Copas e Eurocopas recentes, 3.738 substituições: com a regra de cinco substituições há cerca de 48 por cento mais trocas, o minuto médio passa de cerca de 69 para cerca de 71; substitutos marcam 13,2 por cento dos gols (15,9 por cento com cinco, 12,5 por cento com três). Fonte: https://termedia.pl/Analysing-substitutions-in-recent-World-Cups-and-European-r-nChampionships-in-male-and-female-elite-football-influence-of-r-nnew-substitution-rules,78,52313,0,1.html
- EVIDÊNCIA: com três substituições, as trocas médias saem aos minutos 60, 74 e 83 (análise de xG da KU Leuven). Fonte: https://dtai.cs.kuleuven.be/sports/blog/unraveling-the-strategy-of-soccer-substitutions-using-data
- EVIDÊNCIA: a probabilidade de gol do time sobe após a primeira e a segunda substituição e cai após as três trocas do adversário; o efeito é maior quando o time está perdendo (Psychology of Sport and Exercise, 2021, resumo de busca). Fonte: https://lida.sport-iat.de/twm/Record/4069751?lng=en

**HIPÓTESE DE DESIGN.** Fadiga como multiplicador de 0,74 sobre a corrida de alta intensidade no fim do segundo tempo para jogadores de meio-campo, com recuperação 28 por cento mais lenta; tempo de recuperação e consumo derivados da escala de stamina do RoboCup como referência de forma da curva, não de valor. Expulsão: aplicar ao placar esperado -0,47 xG para o time com 10 e +0,61 xG para o time com 11 no minuto 1, decaindo linearmente até zero perto do fim.

---

## 6. Papel da sorte e da habilidade nos resultados

- EVIDÊNCIA: Holzmeister e Johannesson (Journal of Sports Economics, 26(8), 953-975, dez. 2025; sete maiores ligas masculinas europeias, três temporadas, xG e xPTS): cerca de 40 por cento do desvio entre o desempenho esperado e o observado vem de habilidade e 60 por cento de sorte; em temporada de 38 jogos o desvio padrão de habilidade é cerca de 6 pontos e o de sorte cerca de 7; a sorte desloca a classificação final em média 1,8 posição. Fonte: https://research.hhs.se/esploro/outputs/journalArticle/Skills-vs-Luck-Decomposing-Deviations-from/991001653099606056
- EVIDÊNCIA: Brechot e Flepp (Journal of Sports Economics, 2020, 21(4), 335-362; documento de trabalho 374 da Universidade de Zurique): xG baseado em chances de gol quantificadas prevê o desempenho futuro melhor que os resultados recentes. O resumo não traz números. Fonte: https://econpapers.repec.org/RePEc:zrh:wpaper:374
- EVIDÊNCIA (imprensa): Anderson e Sally, "The Numbers Game": "coincidência e sorte são o fator decisivo em quase metade dos gols" (resumo da Cornell) e "vencer é 50 por cento sorte" (resumo da Dartmouth). O livro não foi consultado; a fonte é imprensa. Fontes: https://news.cornell.edu/node/282193 e https://tuck.dartmouth.edu/news/articles/book-seeks-truth-behind-the-statistics-in-soccer
- EVIDÊNCIA: Flepp afirma que são marcados em média cerca de 2,7 gols por jogo e que jogos são decididos por um gol com frequência (resumo da Universidade de Zurique). Fonte: https://www.oec.uzh.ch/de/current/magazine/luck-vs-skill-the-role-of-sport-data-analytics.html
- EVIDÊNCIA: Reep: a maioria dos gols vem de posses com poucos passes. Em dados da MLS, cerca de 48 por cento dos gols vieram de posses com três passes ou menos, mas cerca de 52 por cento de todas as posses eram tão curtas; a crítica é que Reep olhou a fração dos gols por tamanho de sequência, e não a probabilidade de gol por sequência. Fontes: https://www.americansocceranalysis.com/home/2019/6/7/reep-revisited e https://fivethirtyeight.com/features/what-analytics-can-teach-us-about-the-beautiful-game
- Lames (2018) e estudos de mercado de apostas: não foram achados números nas fontes lidas.

**HIPÓTESE DE DESIGN.** Em uma temporada de 38 rodadas, a variação por sorte deve ficar perto de 7 pontos de desvio padrão em relação ao esperado, e a variação por habilidade perto de 6. O simulador não deve ter "efeitos dramáticos" que reduzam a sorte abaixo disso; a variância vem da conversão de chutes (Seção 1), não de rolagens fora do jogo.

---

## 7. Estilo tático: pressão (PPDA), posse versus jogo direto, bolas paradas e contra-ataque

**PPDA.**

- EVIDÊNCIA: PPDA é o número de passes do adversário dividido pelas ações defensivas da equipe em uma zona do campo; as zonas variam por fornecedor (Wyscout usa 60 por cento finais do campo; StatsBomb "PPDA Beyond40" usa a partir de x = 40). O menor PPDA da Premier League em 2021/22 foi o do Liverpool, 8,62. Fonte: https://www.premierleague.com/news/4250153
- EVIDÊNCIA: o valor de 19,96 foi o percentil 10 de PPDA na Premier League nas quatro temporadas anteriores a 2014, na definição de zona da StatsBomb da época. Fonte: resultado de busca de https://blogarchive.statsbomb.com/articles/soccer/premier-league-after-7-games-how-have-teams-pressed/
- EVIDÊNCIA: PPDA baixo depende também do domínio de posse (o PSG sempre aparece com PPDA baixo na Ligue 1 por dominar a bola). Fonte: https://www.premierleague.com/news/4250153
- COMUNIDADE: um blog fala em PPDA médio de 5 a 6 na Premier League; a definição de zona difere das oficiais e o valor não bate com as fontes acima. Não usar.

**Posse e jogo direto.**

- EVIDÊNCIA: Lago-Peñas e Dellal (2010), 380 jogos da primeira divisão espanhola 2008-09: equipes têm mais posse quando perdem que quando ganham ou empatam; mandantes têm mais posse que visitantes; enfrentar adversário forte reduz a posse; a variação da posse é menor nas equipes mais bem colocadas. Fonte: resumo de busca de https://jssm.org/jssm-09-288.xml-Fulltext e https://portalcientifico.uvigo.gal/documentos/5fa083ef299952440aaec68e
- Hughes e Franks (2005): foi achada apenas a citação da dicotomia posse versus jogo direto, sem os resultados. Os resultados de posse e comprimento da sequência não foram verificados.

**Bolas paradas.**

- EVIDÊNCIA (revisão sistemática, resumo de busca): 30 a 40 por cento dos gols vêm de bolas paradas no futebol internacional masculino e na Premier League 2012-2016. Fonte: https://pmc.ncbi.nlm.nih.gov/articles/PMC7052713
- EVIDÊNCIA: Copa de 2018: 66 gols (39,1 por cento) de bola parada e 103 (60,9 por cento) de jogo corrido em um estudo; 68 gols (40,24 por cento) em outro; análise da FIFA que exclui pênaltis e gols contra: 19 por cento. Dentro das bolas paradas: pênaltis 34,9 por cento, escanteios 31,8 por cento, faltas 30,3 por cento, laterais 3,0 por cento. A FIFA acha 6,5 por cento dos gols de falta direta na Copa do Clube 2025, igual à Copa de 2022. Fontes: https://lida.sport-iat.de/twm/Record/4075040?lng=en e https://www.fifatrainingcentre.com/en/game/tournaments/fcwc/2025/team-analyses/more-goalscoring-opportunities-generated-from-set-plays.php
- A diferença entre 19 e 40 por cento é de definição (pênalti, gol contra e lateral contam ou não).

**Contra-ataque.**

- EVIDÊNCIA: Copa de 2018, 103 gols de jogo corrido: 85 (82,5 por cento) de ataque elaborado e 18 (17,5 por cento) de contra-ataque; referência anterior: 60 por cento de ataque posicional, 20 por cento de ataque direto e 20 por cento de contra-ataque. Copa do Mundo Feminina de 2019, por oportunidades: contra-ataque 12,7 por cento contra 7,5 por cento de ataque organizado. Fontes: https://pmc.ncbi.nlm.nih.gov/articles/PMC7052713 e https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1394621/pdf (resumos de busca).
- Não foi achada taxa de conversão por chute de contra-ataque versus ataque elaborado em liga masculina.

**HIPÓTESE DE DESIGN.** Estilo como vetor de 3 a 4 parâmetros (altura da linha de pressão, risco do passe, uso de bola parada, velocidade de transição) que alteram a distribuição de ações; os resultados observados (posse, PPDA, tipo de gol) são saídas a validar, não entradas. Meta de validação: 19 a 40 por cento dos gols de bola parada conforme a definição (ver calibragem).

---

## 8. Clima, altitude, calor e qualidade do gramado

**Altitude.**

- EVIDÊNCIA: McSharry (BMJ 2007; 335:1278-81), 1.460 jogos internacionais em 10 países da América do Sul ao longo de mais de 100 anos: cada 1.000 m de diferença de altitude a favor aumenta o saldo de gols em cerca de 0,5 gol; em mesma altitude o mandante vence com probabilidade de 0,537; com diferença de +3.695 m (por exemplo, Bolívia contra o Brasil no nível do mar) o mandante vence com 0,825; com -3.695 m, 0,213. Fonte: https://www.eurekalert.org/news-releases/725987 (comunicado do BMJ; artigo não lido). Há crítica de que o resultado reflete diferença de qualidade das equipes e não altitude.
- EVIDÊNCIA (resumo de busca): estudo com eliminatórias sul-americanas de 1954 a 2010 separa vantagem de mandante e de altitude; a maior parte das vitórias da Bolívia em casa e cerca de metade das do Equador podem ser atribuídas à altitude. Fonte: https://core.ac.uk/download/29404456.pdf
- EVIDÊNCIA (imprensa): clubes brasileiros acima de 2.500 m: 121 jogos, 59 derrotas, 35 vitórias e 27 empates (Placar); outra fonte cita 123 jogos, 35 vitórias e 61 derrotas. Os totais divergem. Fontes: https://placar.com.br/?p=172907 e https://www.goal.com/br/not%C3%ADcias/numeros-times-brasileiros-jogos-altitude-libertadores/blt356f078bcd958fa5 (resumos de busca; a página do Placar aberta não continha os números, portanto a origem deles é só o resumo da busca).
- EVIDÊNCIA: a 1.600 m a distância total cai cerca de 3,1 por cento e a distância em alta velocidade cerca de 15 por cento (Garvican e colegas, 2014, citado em https://pmc.ncbi.nlm.nih.gov/articles/PMC4709924).

**Calor.**

- EVIDÊNCIA: Nassis et al. (2015, BJSM), 64 jogos da Copa de 2014 no Brasil, classificados por WBGT: sprints foram cerca de 10 por cento menos numerosos em estresse alto que em moderado ou baixo (p < 0,05), sem efeito na velocidade máxima; os jogadores modulam a atividade, com menos corrida de alta intensidade e mais de baixa. Fonte: resumo de busca de https://pubmed.ncbi.nlm.nih.gov/ (a consulta ao PubMed foi bloqueada por cookies, o número vem de resumo de busca).
- EVIDÊNCIA: análise de 1.610 jogos da Bundesliga 1 e 2, J-League e Süper Lig: condições mais quentes associadas a menor distância total, em alta velocidade e em sprint. Fonte: resultado de busca com https://lida.sport-iat.de/ta/Record/4091710
- EVIDÊNCIA: 43 °C, Mohr et al. (2012): distância total cerca de 7 por cento menor e alta velocidade cerca de 26 por cento menor. Simulação em esteira a 30 °C: distância total -4 por cento, alta velocidade -7 a -8 por cento, sprint inalterado, velocidade máxima +4 por cento; calor mais altitude de 1.000 m: distância total -9 por cento, alta velocidade -15 por cento, sprint -8 por cento. Fonte: https://pmc.ncbi.nlm.nih.gov/articles/PMC4709924 (a página foi lida até o caractere 100.000 de 124.454).
- EVIDÊNCIA: temperaturas na Copa de 2014 frequentemente acima de 30 °C, com máximo de 35 °C. Mesma fonte.

**Gramado, chuva e vento.**

- EVIDÊNCIA (pré-impresso, não revisado): em estudo da Research Square, equipes em grama natural subótima têm queda marcante de acerto de passe e continuidade de posse comparadas com grama artificial uniforme. Fonte: https://www.researchsquare.com/article/rs-10540488
- COMUNIDADE: colunista de apostas do Racing Post reporta mais gols em campo molhado na terceira e quarta divisões inglesas e temperatura como a variável seguinte mais ligada a gols. Fonte: https://www.racingpost.com/sport/kevin-pullein/some-football-forecasts-should-wait-until-you-have-studied-the-weather-forecast/407819 . Sem rigor acadêmico.
- Não foi achado estudo confiável de efeito do vento nos gols nem números de passe sob chuva (as páginas encontradas citam valores sem fonte primária).

**HIPÓTESE DE DESIGN.** Altitude e calor como multiplicadores de resistência (stamina) e velocidade de alta intensidade, aplicados ao time **visitante não aclimatado** (e ao mandante em menor grau), com escala por faixa: sem efeito até 1.000 m, -3 por cento de distância total e -15 por cento de alta velocidade a 1.600 m, e vantagem de 0,5 gol por 1.000 m para o time habituado como teto de calibragem; calor com WBGT alto reduz sprints em cerca de 10 por cento. Gramado ruim reduz precisão de passe e controle, com valor a definir.

---

## Parâmetros de calibragem sugeridos

Estes são alvos numéricos para o simulador. Os de fonte direta têm referência na seção indicada; os marcados "design" são escolhas minhas.

**Gols e placar (Série A, Série B).**

1. Série A: 2,44 gols por jogo em média por jogo (2024); aceitar a faixa 2,40 a 2,55 (2023 e 2025 agregados ficaram em 2,49 e 2,52). Série B: 2,19 gols por jogo (2024); faixa 2,10 a 2,30 (design).
2. Série A: mandante vence cerca de 47 por cento, empate cerca de 27 por cento, visitante cerca de 26 por cento (2024; visitante entre 26 e 28 por cento em 2022-2024).
3. Placar: validar a distribuição de placares com Dixon-Coles (ρ entre -0,05 e -0,2 como faixa de verificação, a conferir no artigo original) e a taxa de empates acima.
4. Divisão de gols entre mandante e visitante: **não foi achada** a média de gols de mandante e visitante no Brasil. Design: partir de aproximadamente 1,40 contra 1,05 gol (razão de 1,33, coerente com γ de 1,3 a 1,4 de Dixon-Coles e 37 por cento a mais de gols do mandante citado na imprensa inglesa) e ajustar para fechar 47 por cento, 27 por cento e 26 por cento de resultados.

**Chutes e conversão.**

5. Conversão média por chute: 10 por cento (faixa 9,9 a 11,9; ver Seção 1). Chutes no alvo: 37 por cento nas dez ligas (9,18 de 24,68), 45 a 50 por cento na Premier League, portanto adotar 37 a 45 por cento (design, a refinar por liga).
6. Chutes por jogo (soma dos dois times): alvo 24 a 27 (24,68 nas dez ligas; 27,60 na Premier League em 2023/24). Para a Série A, **a média da liga não foi achada**; os melhores times têm 15 a 17,5 chutes por jogo e os piores cerca de 10; um total de partida de 22 a 26 é compatível com 2,44 gols a 10 por cento de conversão (2,44 / 0,10 = 24,4 chutes; design).
7. Cabeceio: cerca de 10 por cento dos chutes.
8. Pênalti: conversão de 77 a 82 por cento (ASA 0,77; Opta 0,79; Europa 82,00 por cento); disputa de pênaltis mais baixa, em torno de 68 a 73 por cento em torneios.
9. Bolas paradas: 19 por cento dos gols (definição FIFA, sem pênalti nem gol contra) a 30 a 40 por cento (definição ampla, com pênalti). Escolher uma definição e registrar. Dentro delas, escanteios e faltas em quantidade parecida (31,8 por cento e 30,3 por cento das bolas paradas na Copa de 2018).
10. Contra-ataque: 17,5 por cento dos gols de jogo corrido (Copa de 2018); referência de 20 por cento em estudo anterior.

**Física e fadiga.**

11. Distância de alta intensidade por jogo na Premier League: média de 1.151±337 m; sprints por jogo: 57±20; distância em sprint: 350±139 m; sprint médio de 5,9 m; 47 por cento de sprints explosivos (2012-13). Máxima absoluta de jogo: 37,4 km/h; faixa comum 33 a 36 km/h.
12. Queda de alta intensidade no fim do jogo: -26 por cento nos últimos 15 minutos em relação aos primeiros 15 (meio-campista lateral); recuperação 28 por cento mais lenta.
13. Primeiro tempo com mais corrida de intensidade média que o segundo; meio-campistas cobrem mais distância total que zagueiros e atacantes.
14. Calor: sprints -10 por cento em WBGT alto; distância em alta velocidade de -8 a -26 por cento conforme a intensidade do calor; altitude de 1.600 m: -3 por cento de distância total e -15 por cento de alta velocidade.

**Eventos de partida.**

15. Cartão vermelho no minuto 1: +0,61 xG para 11 e -0,47 xG para 10 (total 1,08), com decaimento ao longo do jogo; expulsão média aos 66 por cento da partida.
16. Substituições (3 trocas): minutos médios 60, 74 e 83; (5 trocas): primeira troca em torno do minuto 60 a 71 conforme a regra; substitutos marcam 13 a 16 por cento dos gols.
17. Sorte e habilidade em uma temporada de 38 jogos: desvio padrão de sorte de cerca de 7 pontos e de habilidade de cerca de 6; a sorte move a posição final em média 1,8 posição.

**Vantagem de mandante e ambiente.**

18. Vantagem de mandante: cerca de 60 por cento dos pontos em casa em ligas inglesas (métrica de Pollard); partir daí e calibrar à Série A pelo item 2 (53 por cento do Placar não foi confirmado).
19. Decomposição: cerca de um terço da vantagem some sem público (dez temporadas), cerca de um sexto no modelo apenas de 2019/20; domínio em chutes cai à metade; viés de cartão e falta contra o visitante some. Design: canal "torcida e árbitro" com peso de 1/6 a 1/3 da vantagem total, ao qual se somam efeitos de familiaridade, viagem e tática, que não dependem da torcida.
20. Altitude: +0,5 gol de saldo por 1.000 m de diferença de altitude (teto de calibragem); probabilidade de vitória do mandante de 0,537 em mesma altitude, 0,825 com +3.695 m, 0,213 com -3.695 m. Aplicar apenas a jogos com diferença real de altitude (por exemplo, clubes de altitude em copas continentais), não ao Campeonato Brasileiro de forma geral.

**Motor espacial (design, partindo do código público do modelo de Spearman).**

21. Velocidade máxima de 5 m/s, tempo de reação 0,7 s, σ de interceptação 0,45, λ 4,3, velocidade média da bola 15 m/s (parâmetros públicos de implementação; para o simulador, parametrizar por atributo do jogador em torno desses valores).
22. Passo de decisão: 100 ms (10 Hz), partida de 6.000 passos por 10 minutos no RoboCup, ou 54.000 passos para 90 minutos reais; visão a cada 150 ms e sentido do corpo a cada 100 ms.

---

## Lacunas

Itens que não foram verificados ou não foram achados:

1. **Chutes por jogo médios da Série A e Série B** (por liga). Só foram achados dados por time. Também não foram achados chutes no alvo, faltas, cartões ou escanteios médios da liga brasileira; FBref, soccerstats e futdados responderam 403 ou conteúdo vazio.
2. **Média de gols de mandante e de visitante** no Brasil, e porcentagem de empates de 2022 e 2023 (só 2024 foi contado). A contagem de 180 vitórias do mandante em 2024 foi feita à mão por uma ferramenta de leitura de página e pode ter erro pequeno.
3. **Artigos originais não lidos.** PDFs retornaram binário comprimido, então Dixon-Coles (1997), Spearman (2018), Fernández e Bornn (2018), Fernández-Bornn-Cervone (2021), Karlis-Ntzoufras (2003), McSharry (2007), Barnes (2014), Bradley (2009), Di Salvo (2007), Nassis (2015) e Brechot-Flepp (2020) foram lidos apenas por abstract, comunicado ou resumo secundário. Os números dessas fontes têm confiança menor.
4. **Valores de ρ e γ do Dixon-Coles** e fórmula exata de τ: os resumos divergem (-0,1 a -0,2 contra -0,15 a -0,05; γ de 1,3 a 1,4). A forma clássica de τ na seção 2 vem de memória e deve ser conferida no artigo.
5. **Covariância e inflação de empates do Poisson bivariado** por liga.
6. **Coeficientes reais de regressão de xG** (distância, ângulo, tipo de finalização) em dados abertos; o único valor achado (-0,31 por metro) vem de um resumo e não foi verificado no artigo. Também não foi achada taxa de conversão de cabeceio nem tabela de conversão por faixa de distância com fonte primária.
7. **Probabilidade de passe e "dangerousity"**: nenhum coeficiente ou fórmula publicada achada.
8. **Artigo de SBSP (Reis e Lau)** e documentos técnicos do HELIOS foram vistos só por resumo; nenhum detalhe da triangulação de Delaunay (número de pontos de fixação, interpolação) foi lido. Utility AI e steering em futebol: sem fonte primária.
9. **Velocidade máxima média por posição**, distância total média por posição (o valor de 11,4 km do meio-campo não foi confirmado) e consumo de energia por minuto.
10. **Lames (2018)** sobre sorte no futebol e **estudos de mercado de apostas** sobre eficiência e sorte: sem números. Anderson e Sally só por imprensa.
11. **Hughes e Franks (2005)** e conversão de contra-ataque por chute em liga masculina.
12. **Altitude em jogos de clubes** (Libertadores, Sul-Americana): não foi achado estudo de saldo de gols; os números de Placar e Goal divergem (121 contra 123 jogos), e a página do Placar aberta não confirmou os números.
13. **Gramado e clima**: nenhum estudo revisado por pares sobre chuva ou vento e gols; só o pré-impresso de superfície e a coluna de apostas.
14. **Efeito de cartão vermelho no segundo tempo** e valores por minuto além do minuto 1.
15. **Efeito da regra de cinco substituições na Série A** e fadiga acumulada no calendário brasileiro (viagens longas): não foi pesquisado o dado de distância e fuso, só a vantagem de mandante em geral.
