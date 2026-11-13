# Pesquisa 04 — Design de jogos de gestão de futebol e teoria tática

Data da pesquisa: 2026-11-13. Escopo: especificação de um jogo web de gestão de futebol, mobile-first.

## Como ler este documento

Cada afirmação carrega uma etiqueta:

- **FATO DOCUMENTADO (URL)**: li a página indicada (ou o resultado de busca que a cita) e a afirmação está nela. Quando a fonte é guia de fã e não documentação oficial, isso é dito na própria frase.
- **COMUNIDADE**: opinião, relato ou prática de jogadores, fóruns ou blogs. Não é documentação.
- **HIPÓTESE DE DESIGN**: inferência minha para o nosso jogo. Não é fato sobre nenhum jogo.

Limites do método: várias páginas oficiais responderam 403 ou 404 (manual do Hattrick, manual do Football Manager no site da comunidade da Sports Interactive, página de táticas do footballmanager.com). Onde isso impediu leitura primária, a seção "Lacunas" no fim lista o que ficou sem confirmação. Livros (Inverting the Pyramid, Pep Confidential, The Mixer, Zonal Marking) não foram lidos; nada é atribuído a eles aqui.

---

## 1. Football Manager: motor de jogo e táticas, como documentado publicamente

### 1.1 Estrutura tática

- **FATO DOCUMENTADO** (https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html): no FM24 a tática se divide em três áreas, Com a Bola (In Possession), Transição (In Transition) e Sem a Bola (Out of Possession). O estilo tático e a Mentalidade são a base; as Instruções de Equipe moldam o estilo; a Intensidade indica o quanto os jogadores correm e, portanto, a rapidez com que cansam; a tática criada vira a "tática primária treinada" e dá a identidade do clube; o jogador pode definir duas táticas alternativas que também treinam familiaridade. Esse texto também diz que a tática escolhida influencia o tipo de treino.
- **FATO DOCUMENTADO** (https://www.passion4fm.com/explaining-in-out-of-possession-formations/, guia de fã, publicado em 22/10/2025): no FM26 cada jogador tem um papel Com a Bola e outro Sem a Bola, e há formações separadas para as duas fases. O guia afirma que antes disso o jogador montava a tática pensando no desenho defensivo e equilibrando funções (Defender, Apoiar, Atacar). O mesmo guia dá exemplos de uso: um ponta que joga como segundo atacante com a bola e volta como ponta sem a bola; um volante central que passa de MC (com a bola) para AMC (sem a bola), formando 4-4-2 sem a bola em um 4-3-3 com a bola.
- **FATO DOCUMENTADO** (mesma fonte): o guia recomenda escolher o papel sem a bola de acordo com os movimentos do papel com a bola (ex.: meia avançado com a bola combina com meio-campista pressionador sem a bola). Isso é recomendação de guia, não regra do jogo.
- **COMUNIDADE**: resultados de busca sobre o FM26 (guias de terceiros) descrevem a separação dos papéis em duas fases como uma das maiores evoluções táticas da série. É opinião de guias.
- Não consegui ler a lista oficial completa de instruções de equipe do FM; a página oficial de táticas devolveu 404. Existem guias de fãs (https://www.passion4fm.com/football-manager-team-instructions/, https://www.fmscout.com/a-fm26-team-instructions-guide.html) que não li por completo. Ver "Lacunas".

### 1.2 Gritos (shouts), bola parada e treino

- **FATO DOCUMENTADO** (resultado de busca citando guia da era Sports Interactive e o site oficial; https://www.gamepressure.com/footballmanager2015/make-a-substitution-shout-instructions/z16f4a): gritos são instruções do lado de fora durante o jogo para mudar o comportamento da equipe; só podem ser dados a cada dez minutos; podem ser dirigidos ao time inteiro ou a jogadores/unidades. Isto é do FM2015; o FM26 pode diferir (ver https://www.operationsports.com/understanding-shouts-in-fm26-and-how-they-affect-your-team, não lido).
- **FATO DOCUMENTADO** (resultado de busca com página oficial https://www.footballmanager.com/ja/features/setsutohisunoshuaxinkochinotehiyu e guia https://www.fmscout.com/a-fm24-set-pieces-guide.html): o FM24 introduziu o Criador de Bola Parada (Set Piece Creator) e Treinadores de Bola Parada; o ranking de jogadores para cada função na bola parada é feito por atributos adequados, não pela posição na tática; uma Lista de Prioridade define quais funções importam mais.
- **FATO DOCUMENTADO** (resultado de busca citando os manuais oficiais https://community.sports-interactive.com/manual/football-manager-2020/training-r565 e https://community.sports-interactive.com/manual/football-manager-2022/training-r984, que dão 403 para leitura direta): o treino se organiza em Unidades, Sessões e Calendários (Schedule); há calendários pré-definidos e o jogador pode montar o seu; algumas sessões são feitas pelo time inteiro em vez de por unidades.
- **FATO DOCUMENTADO** (https://www.footballmanager.com/node/1120, página oficial do FM27, indexada, só trechos de rodapé recuperados; confirmação parcial por resultado de busca): o FM27 anuncia motor de partida 2D, editor dentro do jogo e a possibilidade de definir o tipo de preparação para cada sessão agendada antes de um jogo. Não consegui extrair os detalhes técnicos do motor 2D.

### 1.3 Familiaridade tática, coesão e dinâmica de elenco

- **FATO DOCUMENTADO** (guia https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html): a tática primária e duas alternativas são treinadas "para familiaridade". Não encontrei descrição numérica de como a familiaridade é calculada.
- **FATO DOCUMENTADO** (resultados de busca citando PC Gamer, https://pcgamer.com/football-manager-2018s-dynamics-system-lets-you-win-or-lose-the-dressing-room, e o site oficial https://footballmanager.com/node/722): o sistema de Dinâmica (desde o FM18) cobre Coesão da Equipe, Atmosfera do Vestiário e Apoio ao Treinador; há uma hierarquia de jogadores ordenada por influência e grupos sociais: Grupo Central, Secundário A, Secundário B e "Outros"; jogadores podem mudar de grupo com o tempo; contratar jogadores com profissionalismo muito diferente pode dividir o elenco.
- **COMUNIDADE** (https://www.videogamer.com/guides/football-manager-2024-fm24-how-to-improve-team-cohesion): fatores citados para coesão: forma, parcerias, personalidade, adaptabilidade, idioma comum, treino, moral, grupos sociais, mentoria e tempo de clube; escalar os mesmos onze com frequência ajuda. É guia de terceiros.

### 1.4 Atributos ocultos, CA/PA, newgens, conhecimento de scouting e máscara de atributos

- **FATO DOCUMENTADO** (guia de fã https://www.passion4fm.com/?p=14158, lido): atributos ocultos incluem Propensão a Lesões (afeta frequência de lesões, não gravidade, segundo o guia; aparece no relatório do olheiro em frases como "pode ter problemas com lesões") e Partidas Importantes (desempenho melhora ou piora em jogos de alta pressão, como derbis e finais; o relatório traz frases como "gosta de jogos grandes"). O mesmo guia trata Consistência como o fator de variação geral de desempenho.
- **COMUNIDADE** (resultado de busca citando https://www.fmscout.com/a-guide-to-current-ability-in-football-manager.html e https://fminside.net/tag/potential-ability/): CA e PA numa escala de 0 a 200; CA calculado a partir de atributos ponderados por posição; PA é um teto predefinido; estrelas são estimativas. Fontes divergem sobre se Consistência e Partidas Importantes entram no CA. Isto é conhecimento de comunidade, pois o motor não é publicado.
- **FATO DOCUMENTADO** (guia https://www.passion4fm.com/?p=1547): instalações de treino melhores aumentam a taxa de progresso de CA rumo ao PA; instalações ruins removem opções de treino individual (Sem a Bola, Marcação, Posicionamento).
- **FATO DOCUMENTADO** (https://www.passion4fm.com/youth-intake-guide-how-clubs-produce-newgens/, lido): cada nação tem uma "Youth Rating" de 1 a 200 que define a qualidade média dos newgens; listada como exemplo: Brasil 163, Alemanha 155, França 155 (valores de versão antiga do guia); a Youth Rating passou a ser dinâmica e depende de fatores como importância do jogo, economia, finanças da federação e estágio de desenvolvimento, além de instalações dos clubes. A localização do clube afeta o tipo de jogador gerado.
- **FATO DOCUMENTADO** (resultado de busca citando https://www.passion4fm.com/youth-intake-guide-how-clubs-produce-newgens/ e outros): newgens existem no banco de dados antes de aparecerem no dia da base e servem para repor aposentadorias.
- **COMUNIDADE** (resultado de busca): um texto sobre o FM24 sugere que, por volta de 2035/36, o mundo do jogo é preenchido só por newgens. Fonte única.
- **FATO DOCUMENTADO** (resultado de busca citando guia de fã e manuais): com a máscara de atributos ligada, jogadores fora do seu clube e sem scouting completo mostram atributos como faixas (ranges); o conhecimento de nações/competições, a atribuição de olheiros ou assistir a jogos estreita as faixas; o conhecimento ganho por olheiro numa nação fica em 100% por cerca de um mês e depois decai. Aumentar o conhecimento mundial melhora os newgens recebidos na base, segundo um artigo da Passion4FM (fan guide).
- **FATO DOCUMENTADO** (https://en.wikipedia.org/wiki/Championship_Manager_01/02, lido): o CM 01/02 trouxe o modo "attribute masking", em que o jogador só vê detalhes de atletas que realisticamente conheceria. Ou seja, a máscara de atributos é anterior ao FM moderno.

---

## 2. Outros motores e jogos

### 2.1 Championship Manager 01/02
- **FATO DOCUMENTADO** (https://en.wikipedia.org/wiki/Championship_Manager_01/02): implementou o sistema de transferências regulamentado da UE (setembro de 2001), trouxe o modo de máscara de atributos; em dezembro de 2008 a Eidos liberou o jogo gratuitamente.
- **COMUNIDADE** (resultados de busca: TechRadar, fóruns): jogadores preferem a interface enxuta e rápida do CM01/02 e acham o FM moderno carregado; voluntários publicam atualizações de elencos duas vezes por ano; o jogo vendeu mais de 300 mil cópias no Reino Unido. O "lore" do motor (dados ocultos, desenvolvimento rápido) não foi confirmado: nenhuma fonte lida cobre isso.

### 2.2 Hattrick
- **FATO DOCUMENTADO** (resultado de busca citando o manual oficial https://hattrick.org/Help/Rules/MatchBasics.aspx, que deu 403 na leitura direta): o meio-campo decide quantos ataques cada time recebe em cada tempo; o time com meio-campo mais forte tem mais posse e tende a ter mais ataques; ataque e defesa determinam a probabilidade de gol; ao fim da partida o jogador recebe as notas de cada setor, e são essas notas que contam no cálculo; a posse é maior em casa; espírito de equipe e atitude afetam o meio-campo/posse.
- **FATO DOCUMENTADO** (https://arxiv.org/abs/2504.09499, Constantinou et al., 2025, lido o resumo): artigo de aprendizado de redes bayesianas sobre o motor do Hattrick; o resumo e a busca indicam que o manual dá pistas, mas muitos detalhes críticos não são divulgados e os dados nem sempre batem com o manual.
- **FATO DOCUMENTADO** (resultado de busca com páginas oficiais en-us.hattrick.org/Help/Rules/Players.aspx e PlayerAttributes.aspx): 8 habilidades básicas, resistência importa para todos; forma atual aplicada nos jogos, com forma de fundo oculta; cerca de metade dos jogadores tem uma "Especialidade"; jogador promovido da base recebe bônus de 1,5 nível nas habilidades (exceto resistência) enquanto não for vendido.
- **COMUNIDADE** (fórum de 2003-2004): posse viria do "playmaking" no 1º tempo e de playmaking mais resistência no 2º. Pode estar desatualizado.

### 2.3 Brasfoot, Elifoot
- **FATO DOCUMENTADO** (resultado de busca citando https://labra.com.br/historia-do-jogo-brasfoot-e-elifoot/ e https://trivela.com.br/games/gamepedia-do-futebol-25-elifoot/): Brasfoot foi lançado em 2003, inspirado no Elifoot (português), e fez sucesso entre jovens em PCs domésticos e lan houses. As fontes divergem sobre o criador; uma lista cita Emmanuel dos Santos, mas não confirmei. Núcleo: comprar e vender jogadores, escolher tática, escalar manualmente, preço de ingresso, disputar campeonatos.
- **COMUNIDADE** (descrições de listagens): valorizado por ser simples e rápido, sem inchaço. Não li o manual do Brasfoot nem o do Elifoot.

### 2.4 Football GM / Basketball GM (ZenGM, código aberto)
- **FATO DOCUMENTADO** (https://football-gm.com/manual/, lido): avaliações de 0 a 100, "ovr" por posição; o potencial (pot) é só uma estimativa dos olheiros e não influencia o desenvolvimento; o desenvolvimento depende de avaliações atuais, idade e posição do treino/coaching; o pot é calculado simulando trajetórias de carreira e pegando o 75º percentil, então, em média, o jogador supera o pot 25% das vezes.
- **FATO DOCUMENTADO** (https://zengm.com/blog/2020/06/league-creation-options/, lido): há opção de "determinismo do desenvolvimento real" (0% = trajetória imprevisível; 100% = curva real); modos de desafio incluem sem avaliações visíveis, sem trocas, sem agentes livres, sem draft.
- **FATO DOCUMENTADO** (https://zengm.com/blog/2014/02/new-improved-trade-ai, lido): a IA de trocas foi reescrita; corrigiram brechas: trocar contratos expirados após a temporada, comprar e revender o mesmo jogador de imediato (agora exige 15 jogos), pegar ativos subvalorizados (picks distantes, novatos), empurrar contratos grandes para times com espaço (IA ficou mais relutante). A IA já avaliava bem produção atual; o foco foi picks, contratos e lesionados.
- **FATO DOCUMENTADO** (https://zengm.com/blog/, lido): em outubro de 2026 o valor de trocas de picks passou a considerar loteria e regras de playoffs; antes, o valor do pick N era o valor do N-ésimo melhor jogador da classe real do draft.
- **COMUNIDADE** (resultado de busca, Reddit): jogadores dizem que a IA valoriza jovens por ovr e pot e que um bônus de coaching pode dar cerca de ±9,5% de progressão. Não verificado no código.

### 2.5 Out of the Park Baseball (OOTP)
- **COMUNIDADE** (fóruns oficiais, resultado de busca; sem manual): o jogo pega as avaliações reais e devolve a "visão" do olheiro, moldada pela nota do olheiro, orçamento de scouting e precisão do relatório; jovens e estrangeiros têm mais erro; maior precisão ajuda a prever a trajetória; relatórios atualizam gradualmente; usuários divergem sobre o impacto real da precisão.
- **FATO DOCUMENTADO** (https://en.wikipedia.org/wiki/Out_of_the_Park_Baseball, indexado): descrição geral da série. Não extraí um modelo numérico de precisão de scouting.

### 2.6 Motorsport Manager, New Star Manager
- **FATO DOCUMENTADO** (https://en.wikipedia.org/wiki/Motorsport_Manager, indexado; sem detalhes de mecânica extraídos nesta pesquisa).
- **COMUNIDADE** (resultados de busca com análises de New Star Manager em PocketGamer, Nintendo Life e outras): sequência de New Star Soccer; você gerencia clube, imprensa, diretoria e patrocinadores numa tela de Clube; influencia momentos-chave de ataque na partida; resenhistas dizem ser mais acessível que o FM, "profundo, mas não irritantemente"; notas de 6/10 a 8/10; críticos acham pouco desafiador.

### 2.7 Top Eleven e simuladores móveis
- **FATO DOCUMENTADO** (resultado de busca citando https://arxiv.org/pdf/1703.03831 e https://www.pocketgamer.biz/the-iap-inspector/62768/a-new-season-the-monetisation-of-top-eleven/): artigo acadêmico usa Top Eleven como caso para validar design por parâmetros de sessão; partidas são agendadas contra outros jogadores em horários fixos; patrocínio e contratos de TV fazem parte da economia; clãs ("Football Associations") são, segundo o desenvolvedor, o principal motor de engajamento entre jogadores; um sistema de progressão de treino com exercícios destravados visa retenção a longo prazo.
- Não encontrei dados atuais confiáveis de sessão ou retenção do Top Eleven. Soccer Manager, Football Chairman, Club Soccer Director, Sokker e Anstoss/On the Ball: não pesquisei com profundidade suficiente para afirmar nada (ver Lacunas).

### 2.8 Open Football e simuladores de código aberto
- **FATO DOCUMENTADO** (https://github.com/ZOXEXIVO/open-football, lido): motor de simulação de futebol "como o Football Manager" em Rust; recursos listados: simulação autônoma, hierarquia clube/liga/país, simulação de partidas com páginas detalhadas, desenvolvimento gerado de jogadores, lógica de transferências e avaliação de elenco, interface web com layouts desktop e móvel, escalabilidade de CPU. Não li o código nem a arquitetura interna.

---

## 3. O que jogadores do gênero elogiam e criticam

- **COMUNIDADE** (resenhas do FM26, via busca: Mashable, Operation Sports, PC Gamer, Digitec/Galaxus, Ragequit; https://www.pcgamer.com/games/sim/football-manager-26-launches-straight-into-a-relegation-battle-as-steam-reviews-plummet-to-mostly-negative-been-playing-since-1993-and-this-is-the-worst-one): crítica à interface: informação enterrada em camadas de menus e submenus; tela de visão geral compacta trocada por layout amigável ao toque que atrapalha o fluxo em desktop; barras de navegação superior que não cumprem o papel (um crítico sugere usar só marcadores); abstrações por papel escondem informação; a avaliação do Operation Sports é de que a tentativa de agradar novatos desagradou a todos. Steam passou a "majoritariamente negativas". Isso é opinião de resenhistas, com alguns elogios ao motor de partida.
- **COMUNIDADE** (resenhas passadas, via busca): o FM2017 foi elogiado por simplificar; um resenhista do FM2020 achou o menu claro, mas avisou do risco de se afogar nele.
- **COMUNIDADE** (fórum oficial de bugs e imprensa, via busca: https://community.sports-interactive.com/bugtracker/football-manager-2024-early-access-bugs-tracker/finances-training-medical-and-development-centres/ai-squad-building-is-still-terrible-seems-exactly-the-same-as-fm-23-r16983, https://www.pcgamer.com/football-manager-players-are-exploiting-a-bug-in-its-naive-ai-to-buy-the-best-players-in-history-for-less-than-1-of-their-value): IA compra jogadores que não usa, não rotaciona, mantém jovens parados atrás de veteranos, raramente empresta promessas; após algumas temporadas elencos ficam irreais; a IA era explorável (aceitava um conjunto específico de termos de transferência). Um moderador da Sports Interactive respondeu que as mudanças do FM24 tiveram impacto positivo; usuários discordaram.
- **COMUNIDADE** (https://www.passion4fm.com/youth-intake-guide-how-clubs-produce-newgens/ e guias): a base é vista como fonte de emoção (a descoberta de um "wonderkid"); a aleatoriedade é parte do apelo.
- **COMUNIDADE** sobre tédio de fim de jogo e longevidade de saves: não encontrei discussão direta nas fontes lidas. O que existe é a sugestão (fonte única) de que o mundo vira só newgens por volta de 2035/36. Isto é uma lacuna.
- **COMUNIDADE** sobre resultados opacos: a crítica de que abstrações escondem informação aparece nas resenhas do FM26; não encontrei estudo sobre opacidade de resultados de partida em si.

**HIPÓTESE DE DESIGN**: a principal lição é que o público do gênero pune tanto o excesso de menus quanto a ocultação de informação por abstração. Em mobile, o equilíbrio é "poucas telas, cada uma com explicação de causa de resultado".

---

## 4. Técnicas de IA para oponentes de gestão

- **FATO DOCUMENTADO** (resultado de busca citando https://gameai.com/iaus.php e intrinsicalgorithm.com): Dave Mark propõe o "Infinite Axis Utility System", arquitetura baseada inteiramente em utilidade, aplicável a agentes, esquadrões e exércitos; foi mencionada na GDC AI Summit de 2013. Não consegui ler as curvas de resposta nem o livro.
- **FATO DOCUMENTADO** (https://zengm.com/blog/2014/02/new-improved-trade-ai): ver 2.4. A lição documentada é que sistemas de valor de troca são explorados por atalhos específicos (revenda imediata, picks distantes, empurrar contratos) e precisam de travas (carência de 15 jogos, relutância com contratos grandes).
- **COMUNIDADE**: ver seção 3 sobre falhas de montagem de elenco da IA do FM.
- **FATO DOCUMENTADO** (resultado de busca; fontes mistas, incluindo https://gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment e um resumo de pesquisa da Newcastle): a crítica a ajuste dinâmico de dificuldade e "rubber banding" é que jogadores perspicazes percebem e acham injusto; designers defendem versões sutis; mitigações sugeridas: avisar quando e por que a dificuldade muda e permitir congelá-la. Quase tudo é opinião; só há um resumo acadêmico, não verificado além do abstract.
- **HIPÓTESE DE DESIGN**: para IA de oponentes em jogo de clube, usar utilidade por necessidades de posição (déficit de profundidade por setor, idade, contrato) com pesos por "personalidade" do clube, mais travas anti-exploração como as do ZenGM, e nenhuma ajuda silenciosa de dificuldade nos resultados de partida; dificuldade deve entrar por recursos visíveis (orçamento, scouting).

---

## 5. Progressão de longo prazo e retenção

- **FATO DOCUMENTADO** (resultado de busca citando GameAnalytics, https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile): mediana de retenção D1 de 22,91%, D7 de 4,2%, D28 de 0,85% (todos os jogos, 1º tri/2024); top 25% em 2025 perto de 26-28% no D1.
- **COMUNIDADE** (blogs de fornecedores): tabelas de rule of thumb dão simulação com D1 45-60% e D30 20-30%; outra fonte (Mistplay 2026, tabela mal lida) dá D1 30,1%, D7 8,7%, D30 3,0%. As duas divergem muito; não use como meta.
- Duração de sessão em jogos de simulação: não encontrei benchmark confiável.
- **FATO DOCUMENTADO** (https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-, lido): Reigns começou como gestão enxuta de 4 pilares (igreja, povo, exército, dinheiro) com perguntas aleatórias; cada decisão pesa nos 4 e dá sentido a um gesto simples; o jogo "era divertido por 10 minutos" e foi preciso prender por mais duas horas; jogadores já inventavam histórias ligando cartas independentes (fome e pedido de casamento); o jogo usa o estado global (qualidades) para recompor o baralho a cada deslize, no espírito de narrativa baseada em qualidades da Failbetter; misturar cartas aleatórias com cartas autoradas faz o jogador achar que qualquer carta pode ser significativa.
- **FATO DOCUMENTADO** (https://www.emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/, lido): a pergunta central é "como escolher qual trecho de conteúdo mostrar a seguir"; descreve estruturas baseadas em qualidade, em saliência e em pontos de passagem como alternativas à ramificação.
- **FATO DOCUMENTADO** (resultado de busca citando fóruns da Paradox, dev diaries do CK3): visão de que eventos devem parecer relevantes à simulação para o jogador lembrar das suas histórias; diário 75: evento de personagem cabe cerca de três parágrafos e 3-4 opções antes de ficar ruim; **COMUNIDADE** reclama que eventos aleatórios com gatilhos muito específicos fazem a campanha repetir os mesmos 7-8 eventos; um diário cita que a chance de ver um evento cai quanto mais complexa a situação.
- **FATO DOCUMENTADO** (https://en.wikipedia.org/wiki/Dwarf_Fortress): o jogo gera mundo e história antes de jogar; o modo Legends lista eventos de figuras, locais e civilizações em frases, com exportação em XML.
- **FATO DOCUMENTADO** (https://en.wikipedia.org/wiki/Reigns_(video_game)): decisões afetam o exército, o povo, a igreja e a riqueza; objetivo é durar no trono.
- **HIPÓTESE DE DESIGN**: o "mais um turno" de futebol é o calendário (próxima rodada, janela, base). Sessões de 3 a 8 minutos em mobile se encaixam em "um dia de jogo"; as cartas de evento (estilo Reigns) devem ser pequenas, com no máximo 2 a 3 opções, ligadas a qualidades do clube (moral, finanças, vestiário).

---

## 6. Teoria tática

### 6.1 Conceitos e fontes lidas
- **FATO DOCUMENTADO** (https://spielverlagerung.com/2021/07/05/tactical-theory-the-various-forms-of-rest-defence/, lido): a defesa de descanso (rest defence) pode ser orientada ao homem, homem +1 ou zonal; para uma estrutura com primeira e segunda linha ao mesmo tempo capaz de participar da posse, parecem necessários ao menos quatro jogadores, e mais de cinco deixa poucos jogadores para atacar; formas zonais costumam ter quatro ou cinco jogadores, com a primeira linha de zagueiros e a segunda de meio-campistas ou laterais; formas zonais cobrem os meios-espaços e o centro. Exemplo citado: um lateral pode sair da estrutura após inversão de jogo mantendo o equilíbrio (papel de Kyle Walker sob Guardiola).
- **FATO DOCUMENTADO** (resultado de busca citando Coaches' Voice e Spielverlagerung): rest defence é a estrutura que fica atrás da bola enquanto o time ataca, geralmente na base de "mais um" contra os atacantes adversários; no marcação individual o risco é deixar espaços grandes se o contra-pressing inicial falhar.
- **FATO DOCUMENTADO** (resultado de busca citando FourFourTwo e Medium): meio-espaços são zonas ao lado do corredor central; geram dilema para defensores (marcar ou deixar livre).
- **FATO DOCUMENTADO** (https://spielverlagerung.com/2020/05/23/understanding-the-tactical-periodization-methodology/, lido): na Periodização Tática, o Modelo de Jogo conecta-se ao treino pelo princípio supremo da especificidade (todo exercício se relaciona ao Modelo de Jogo, sem decompor em exercícios isolados técnicos ou físicos); exercícios devem conter pelo menos um (normalmente os quatro) momentos do jogo, espaço apropriado, intensidade de jogo e tomada de decisão; princípio das propensões: criar exercícios onde as situações desejadas ocorram com frequência; os princípios metodológicos são especificidade, progressão complexa, alternância horizontal na especificidade e propensões (Mallo, 2015).
- **FATO DOCUMENTADO** (resultado de busca citando spielverlagerung.com e jobsinfootball.com): Vítor Frade (Universidade do Porto) é creditado com a metodologia; os quatro momentos são organização ofensiva, transição defesa-ataque, organização defensiva e transição ataque-defesa; o morfociclo é o plano semanal que sequencia princípios táticos.
- Temas que **não** consegui confirmar em fonte lida: cinco corredores, terceiro homem, gatilhos de pressão como lista, alturas de bloco defensivo detalhadas, relatórios da UEFA e do Centro de Treinamento da FIFA. Ver Lacunas.

### 6.2 História tática brasileira
- **FATO DOCUMENTADO** (https://en.wikipedia.org/wiki/Brazil_national_football_team, lido em trechos): na Copa de 1958, com Zito, Garrincha e Pelé na escalação, o Brasil aplicou pressão desde o início contra a URSS; Mário Zagallo foi campeão como jogador (1958 e 1962) e como treinador (1970). A página não define o 4-2-4 nos trechos que li; a página "4-2-4" da Wikipedia deu desambiguação de ano.
- **FATO DOCUMENTADO** (https://en.wikipedia.org/wiki/Fernando_Diniz, lido): Diniz é conhecido no Brasil por estrutura tática que prioriza o controle da bola, saída de bola jogada e ataque "sem posições"; é chamado de "Dinizismo", sua versão do relacionismo.
- **FATO DOCUMENTADO** (https://www.passion4fm.com/explaining-in-out-of-possession-formations/): o guia afirma que o FM26 aumenta a chance de criar táticas "relacionistas", com rotações posicionais e superioridade numérica em zonas-chave.
- O debate "funcional versus posicional" e as formações 4-2-2-2 brasileiras não foram confirmados em fontes lidas.

---

## 7. Renderização 2D em navegador e simulação determinística

- **FATO DOCUMENTADO** (https://pixijs.com/blog/pixi-v8-launches, lido): o v8 é mais rápido nos dois renderizadores porque o laço de render atualiza só o que precisa; na bunnymark de 100 mil sprites, CPU por quadro ~50 ms (v7) para ~15 ms (v8) com sprites movendo, e ~21 ms para ~0,12 ms com sprites parados. O mesmo texto diz que WebGPU não garante ganho automático sobre WebGL, pois o PixiJS esbarra mais na CPU que na GPU, e pode ajudar em cenas com muitas quebras de lote (filtros, máscaras, blend modes). Esses são números de desktop em teste sintético.
- **FATO DOCUMENTADO** (resultado de busca citando posts oficiais do PixiJS, p.ex. https://pixijs.com/blog/8.16.0): uma versão posterior trocou o renderizador padrão do `autoDetectRenderer` de WebGPU para WebGL e adicionou renderizador Canvas experimental como fallback.
- **COMUNIDADE** (páginas de terceiros): conselho de reduzir resolução e desligar antialias em mobile, já que dobrar resolução pode cortar a taxa de quadros pela metade e 3x de DPR significa 9x mais pixels. Não é benchmark medido.
- **FATO DOCUMENTADO** (https://react.pixijs.io/, só a página inicial foi indexada): existe uma biblioteca oficial Pixi React. Não li sobre desempenho nem sobre compatibilidade de versão com o v8.
- **FATO DOCUMENTADO** (https://gafferongames.com/post/fix_your_timestep/, lido): a abordagem de passo fixo com acumulador; limitar o tempo de quadro (o exemplo corta em 0,25 s) para evitar espiral; interpolar entre estado anterior e atual com o restante do acumulador para evitar tremor visual; passo fixo permite que a simulação se comporte exatamente igual independentemente da taxa de quadros.
- **FATO DOCUMENTADO** (https://gafferongames.com/post/floating_point_determinism/, lido): pontos flutuantes são determinísticos só "se": mesma máquina e mesma entrada, com algum trabalho, replays de entradas funcionam; entre máquinas, só com mesmo compilador, mesma arquitetura e truques específicos; replays gravados como entradas não tocam entre arquiteturas, compiladores ou otimizações diferentes (exemplo do MotoGP).
- **FATO DOCUMENTADO** (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random): `Math.random()` tem semente escolhida pela implementação e não pode ser definida nem redefinida pelo usuário.
- **FATO DOCUMENTADO** (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sin): a especificação ECMAScript define `Math.sin`; não li o trecho da especificação sobre aproximação dependente de implementação, então não afirmo que funções transcendentais diferem entre motores. A pesquisa não confirmou isso.
- **COMUNIDADE** (resultados de busca sobre PRNGs): mulberry32 e sfc32 são geradores com semente comuns em JS; um repositório mantém o estado do gerador dentro do estado do jogo para que semente mais registro de comandos reproduzam a partida. Não achei fonte sobre `Math.fround` nem sobre lockstep.
- **HIPÓTESE DE DESIGN**: simular a partida como função pura de (semente, escalação, instruções, versão do motor) usando só aritmética de inteiros ou operações básicas de ponto flutuante (+, -, *, /, sqrt) e PRNG próprio; gravar semente e comandos; desenhar a tela 2D interpolando eventos já resolvidos, nunca recalculando o resultado a partir do desenho. Versionar o motor junto de cada replay.

---

## 8. Acessibilidade e UX móvel para interfaces densas

- **FATO DOCUMENTADO** (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, lido): WCAG 2.2 critério 2.5.8 (AA): alvos de pelo menos 24 por 24 pixels CSS, com exceções: espaçamento (um círculo de 24 px no centro do alvo pequeno não pode cruzar outro alvo), equivalente, em linha, controle do agente do usuário e essencial.
- **FATO DOCUMENTADO** (https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html, lido): critério 2.5.5 (AAA): 44 por 44 pixels CSS, com exceções de equivalente, em linha, controle do agente do usuário e essencial.
- **HIPÓTESE DE DESIGN**: adotar 44 px como padrão para controles de escalação e 24 px com espaçamento só em tabelas densas com alternativa equivalente; arrastar e soltar de jogadores precisa de alternativa por toque (tocar no jogador, tocar na posição); cor nunca como único canal para status de lesão e moral.
- Padrões específicos para gestão densa em móvel (tabelas com colunas fixas, cartões expansíveis, painéis de resumo): não encontrei fonte lida; ver Lacunas.

---

## Ideias de recursos

Legenda de valor esperado (V) e custo (C): A alto, M médio, B baixo. Prioridade = V alto com C baixo primeiro. A coluna "Inédito?" diz "Não encontrado nos jogos pesquisados" (limitado ao que li nesta pesquisa, não é afirmação de que nenhum jogo no mundo tem) ou cita onde algo parecido existe. Todas são HIPÓTESE DE DESIGN.

| # | Ideia | V | C | Inédito? |
|---|---|---|---|---|
| 1 | Relatório pós-jogo "por que perdemos": 3 causas ranqueadas (setor fraco, bola parada, fadiga) com números | A | B | Hattrick dá notas por setor; causa ranqueada não encontrada |
| 2 | Notas por setor (defesa, meio, ataque) visíveis antes do jogo, calculadas das mesmas fórmulas do motor | A | B | Existe no Hattrick |
| 3 | Escalação por toque (tocar jogador, tocar posição), sem depender de arrastar | A | B | Prática comum; não verificada |
| 4 | Tela de início do dia com no máximo 3 decisões pendentes e botão "simular até a próxima decisão" | A | B | Não encontrado |
| 5 | Formação dupla simplificada: um desenho com bola e um sem bola, só em 2 presets cada | A | M | Dupla formação existe no FM26 (versão complexa) |
| 6 | Papéis com 2 funções (com bola, sem bola) mas rótulos curtos e comparação visual | M | M | FM26 |
| 7 | Estilos de jogo pré-definidos (jogo posicional, relacional, contra-ataque, pressão alta) que preenchem as instruções | A | B | Estilos no FM; "relacional" brasileiro como preset é não encontrado |
| 8 | Preset "Dinizismo": fluidez posicional alta, saída de bola jogada, risco de transição | M | B | Não encontrado |
| 9 | Preset "funcional" versus "posicional" como escolha de filosofia que altera treino | M | M | Não encontrado |
| 10 | Rest defence explícita: slider "quantos ficam atrás da bola" (3, 4, 5) com efeito em contra-ataque sofrido | A | M | Não encontrado como controle direto |
| 11 | Gatilho de pressão simples (perda no terço final, passe para lateral, bola alta) escolhido entre 3 | M | M | Não encontrado |
| 12 | Altura do bloco defensivo (baixo, médio, alto) com custo de fôlego visível | A | B | FM tem altura de linha; custo visível não verificado |
| 13 | Familiaridade tática por jogador com barra e prazo para chegar a 100% via treino | A | M | FM tem familiaridade; visual simples não verificado |
| 14 | Até 2 táticas reservas treinadas, como no FM, mas com custo de foco semanal | M | M | FM |
| 15 | Treino por momento do jogo (organização ofensiva, transição, organização defensiva, transição) em vez de "físico/técnico" | A | M | Não encontrado; baseado em Periodização Tática |
| 16 | Morfociclo semanal: 3 blocos de carga (dia de intensidade, dia de recuperação, dia de ajuste) com efeito em lesão e forma | M | M | Não encontrado |
| 17 | Modelo de Jogo do clube (4 momentos) definido uma vez, que dá bônus de coesão e atrai jogadores compatíveis | A | M | Não encontrado |
| 18 | Vestiário com hierarquia e 3 grupos sociais visíveis num grafo simples | A | M | FM Dinâmica (mais complexa) |
| 19 | Capitão e lideranças como cartas que mudam moral do grupo | M | B | Parecido no FM |
| 20 | Atributos ocultos (consistência, jogos grandes, lesões) revelados por relatório de olheiro com texto, não número | A | B | FM |
| 21 | Máscara de atributos como faixas que estreitam com olheiros e tempo observando | A | M | FM, CM01/02, OOTP |
| 22 | Olheiro com viés pessoal (superestima ponta, subestima zagueiro), aprendido pelo jogador ao longo do tempo | A | M | Não encontrado (OOTP tem erro, não viés nomeado) |
| 23 | Conhecimento de região que decai sem olheiros ativos | M | B | FM |
| 24 | Base com "Youth Rating" regional e dia de peneira como evento | A | B | FM |
| 25 | Newgens com histórias de origem (filho de ex-jogador do clube, jogador de clube-escola) | M | B | Não encontrado |
| 26 | Revelação em cartas: cada promessa da base chega como carta com 2 escolhas (promover, emprestar) | A | B | Não encontrado |
| 27 | Potencial como faixa e percentil, como no ZenGM, mostrado como "teto provável / teto raro" | A | B | ZenGM tem pot de percentil 75 |
| 28 | Modo desafio: sem avaliações visíveis | M | B | ZenGM |
| 29 | Eventos em estilo qualidades (storylets): cartas escolhidas pelo estado do clube | A | M | Reigns, CK3 |
| 30 | Eventos com no máximo 3 parágrafos e 2 a 3 opções, com regra de autoria | M | B | CK3 diário 75 |
| 31 | Crônica automática do clube (estilo Legends do Dwarf Fortress): linha do tempo de jogos, contratações, feitos | A | M | Dwarf Fortress; não em jogos de futebol pesquisados |
| 32 | Livro de recordes e "camisa aposentada" como retenção emocional de longo prazo | M | B | Não encontrado |
| 33 | Rivalidade que nasce de eventos reais da simulação (briga, pênalti polêmico) | A | M | Não encontrado |
| 34 | IA de clubes por utilidade com necessidade por setor e personalidade de clube | A | M | Teoria de utilidade geral; não encontrada em jogos de futebol pesquisados |
| 35 | Travas anti-exploração de trocas: carência de revenda, relutância com contratos longos | A | B | ZenGM |
| 36 | Sem rubber banding oculto: toda dificuldade vem de recursos visíveis | A | B | Contrasta com crítica a DDA |
| 37 | Rodada simultânea com mercado fechado para todos (sem IA comprando antes do jogador) com janela de turnos | M | M | Não encontrado |
| 38 | Escudo de interface: mostrar sempre a causa de qualquer número ao tocar nele (explicador contextual) | A | M | Não encontrado |
| 39 | Modo "gestão mínima" para sessões curtas: delegar escalação a um auxiliar com política escolhida | A | M | FM tem auxiliar; política explícita não verificada |
| 40 | Replay curto de 30 a 60 s dos 3 melhores lances, gerado de eventos já resolvidos | A | M | Não encontrado |
| 41 | Visão 2D tática simples (pontos e linhas) em Pixi, com interpolação de estado | M | A | FM27 anuncia 2D; versão móvel leve não verificada |
| 42 | Replay compartilhável por link: semente mais escolhas, para reproduzir uma partida | M | M | Não encontrado |
| 43 | Bola parada com Lista de Prioridade enxuta (3 funções) | M | B | FM tem Criador completo |
| 44 | Gritos limitados (3 a 4) com recarga de 10 minutos simulados | M | B | FM |
| 45 | Estádio e torcida como sistema de humor da cidade, com derbi como evento | M | M | Não encontrado |
| 46 | Orçamento de scouting versus treino versus base como trio de alavancas visíveis | A | B | Parecido no FM e OOTP |
| 47 | Árvore de treinadores e especialidades dos auxiliares (ex.: especialista em transições) | M | M | FM tem staff; especialidade por momento do jogo não encontrada |
| 48 | Metas da diretoria ligadas ao estilo ("jogar bonito") com efeito em renda e moral | M | B | FM (entrevista de emprego/filosofia) |
| 49 | Mundo de newgens com "era dourada" regional, narrada pela crônica | M | M | FM tem Youth Rating dinâmico |
| 50 | Modo acessível: alto contraste, texto grande, alvos de 44 px, sem informação só por cor | A | B | Prática padrão WCAG |

Ranking sugerido para o primeiro corte (V alto, C baixo): 1, 2, 3, 4, 12, 20, 24, 26, 27, 35, 36, 46, 50. Segundo corte: 5, 7, 10, 13, 15, 17, 18, 21, 22, 29, 31, 34, 38, 39, 40.

---

## Lacunas

Itens que a tarefa pedia e que **não** foram confirmados em fonte lida; nada acima os afirma como fato:

1. Manual oficial do Hattrick (403): fórmulas de setores, estilos de ataque e valores exatos de posse não foram lidos. O que vale é o resumo de busca e o artigo da arXiv (apenas o resumo).
2. Manual do FM no site da comunidade da Sports Interactive (403): lista oficial de instruções de equipe, familiaridade tática, instruções de partida e unidades de treino. A página oficial de táticas (404) também falhou.
3. Cálculo de CA/PA, regras de geração de newgens (além de Youth Rating) e fórmulas de máscara: motor não é publicado; só há guias de fãs.
4. "Lore" do motor do CM 01/02 e o motivo do seu desenvolvimento rápido de jogadores: nenhuma fonte lida.
5. Elifoot, Sokker, Anstoss/On the Ball, Football Chairman, Club Soccer Director e Soccer Manager: não pesquisei a fundo. Brasfoot: só história geral, sem manual.
6. Motorsport Manager: apenas a página da Wikipedia, sem análise de mecânica. OOTP: sem manual oficial; modelo de precisão de scouting só por fóruns.
7. Open Football: li apenas o README; arquitetura interna não foi lida.
8. ZenGM: não li o código de desenvolvimento de jogadores nem a função de valor de trocas; só o post de 2014, o manual e posts de blog.
9. Dave Mark (IAUS): curvas de resposta não confirmadas. Sem fonte sobre planejamento de elenco por necessidades em simuladores esportivos além do ZenGM.
10. Retenção e duração de sessão em jogos de simulação móveis: dados conflitantes e de baixa qualidade; sem benchmark confiável de sessão.
11. CK3: pesos e gatilhos de eventos (diário 30) não lidos; Dwarf Fortress: só a Wikipedia.
12. Teoria tática: livros (Inverting the Pyramid, Zonal Marking, Pep Confidential, The Mixer) não lidos; FIFA Training Centre e relatórios técnicos da UEFA não lidos; cinco corredores, terceiro homem, gatilhos de pressão e alturas de bloco sem fonte lida; "funcional versus posicional" e 4-2-4/4-2-2-2 sem fonte lida.
13. Pixi v8 com React em celulares de faixa média: nenhum benchmark móvel oficial encontrado; Canvas versus WebGL em mobile sem medição.
14. Determinismo em JavaScript: não confirmei a precisão de funções transcendentais entre motores nem o comportamento de `Math.fround`; recomendação é testar nos navegadores-alvo.
15. UX móvel para interfaces densas de gestão: nenhuma fonte primária lida além dos critérios de alvo do WCAG 2.2; falta pesquisa sobre tabelas densas em telas pequenas, navegação e leitores de tela.
16. Críticas de comunidade sobre opacidade de resultados, tédio de fim de jogo e longevidade de saves: sem fonte direta.
