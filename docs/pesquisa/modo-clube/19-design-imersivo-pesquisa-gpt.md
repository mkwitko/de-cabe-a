# Design imersivo da carreira do Modo Clube — pesquisa e proposta

**Data de corte:** 17/11/2026  
**Projeto:** Modo Clube — De Cabeça F.C.  
**Plataforma-alvo:** web responsiva; primeiro alvo 360 px em retrato; desktop até 1.280 px  
**Status:** pesquisa de referência e proposta de UX; recomendações ainda precisam de validação com protótipos e testes de usabilidade.

---

## Como ler este documento

- **FATO** identifica algo documentado por uma fonte externa. Cada afirmação factual relevante aponta para uma fonte numerada na bibliografia.
- **OPINIÃO / RECOMENDAÇÃO** identifica uma interpretação ou proposta para o Modo Clube. Não é apresentada como dado observado no mercado.
- **Sem dado público** significa que a pesquisa não encontrou um benchmark confiável para responder à pergunta. Não substituímos a lacuna por um número inventado.
- Os custos de performance são **estimativas relativas de engenharia** (baixo, médio, alto), não medições laboratoriais. A medição real depende do aparelho, navegador, resolução, densidade de pixels, quantidade de elementos e implementação.
- A expressão **“diferenciação”** significa que não foi localizado um equivalente exato nas fontes analisadas. Não prova que nenhum jogo do mundo tenha implementado a ideia.

## Síntese executiva

O Modo Clube deve evitar dois extremos: o painel administrativo disfarçado de jogo e a interface cinematográfica que esconde informação atrás de interações sucessivas. A proposta é uma **central de comando de um clube**, com linguagem visual de transmissão esportiva, navegação previsível e dados que podem ser aprofundados progressivamente.

A principal lição contemporânea vem da sequência FM26 → FM27. O FM26 reorganizou a experiência em Portal, blocos e cartões expansíveis, com a intenção declarada de melhorar contexto e exploração. Jogadores criticaram fragmentação, excesso de cliques e perda de densidade informativa. No FM27, a Sports Interactive voltou a tornar os menus primários e secundários o eixo da navegação, deixando os blocos sobretudo como apresentação de informação e ampliando a personalização. Isso não prova que cards sejam ruins; demonstra que **um card não deve substituir uma arquitetura de navegação clara**. [S01–S05]

A oportunidade do Modo Clube é unir:

1. **A visão compacta de gestão:** tabelas, filtros, comparações e listas úteis sem obrigar a abrir vários painéis.
2. **O ritmo de sessão curta:** uma agenda do clube, tarefas realmente pendentes, resumo do período e avanço de calendário com controle.
3. **A sensação de mundo vivo:** notícias, personagens, torcida, imprensa, rivalidades e memória do clube geradas a partir dos acontecimentos simulados.
4. **A explicabilidade da simulação:** cada decisão apresenta o resultado em linguagem simples, os três fatores principais com valores e o detalhe técnico opcional.
5. **Uma apresentação premium de baixo custo:** tipografia, som ambiente opcional, transições curtas, grafismos de TV, animações pontuais e sprites pré-renderizados — não cenários 3D pesados.

**Princípio central:** a imersão deve nascer de consequências, continuidade e contexto. Efeitos visuais são pontuação; não podem ser a estrutura da experiência.

---

# 1. Football Manager 2024, 26 e 27

## 1.1 FM24: a eficiência da navegação clássica

**FATO.** O manual de FM24 descreve o botão **Continue** como o mecanismo central de avanço do tempo. O botão pode mudar de rótulo para sinalizar que há uma notícia que exige resposta. O calendário é acessível pela data na barra de menu e exibe a semana, a data atual e compromissos próximos. O manual também documenta menus de contexto em objetos do jogo, que permitem executar ações diretamente sem navegar primeiro até outra página. [S06]

**FATO.** No Touch/Console de FM24, o Continue também avança o tempo e pode indicar que é preciso responder uma notícia. O Inbox concentra notícias ligadas ao usuário e ao clube; itens obrigatórios ficam destacados e bloqueiam o avanço até que a ação necessária seja tomada. [S07–S08]

**OPINIÃO.** O que funciona nesse modelo não é simplesmente ter uma caixa de entrada. É a separação entre:

- **Fluxo temporal:** avançar a simulação.
- **Pendências:** decisões que impedem ou alteram o avanço.
- **Consulta:** informação que pode ser lida sem interromper o fluxo.

O Modo Clube deve preservar essa distinção. Uma notícia comum não pode competir visualmente com uma renovação que vence hoje ou com a necessidade de registrar a escalação.

## 1.2 FM26: Portal, Tiles e Cards

**FATO.** A Sports Interactive explicou que os dados de navegação mostravam uso elevado do Inbox e uso limitado da antiga tela Home. A resposta foi combinar Home e Inbox no **Portal**, tornando-o um hub com mensagens, notícias, calendário de duas semanas, próximos jogos, resultados e atalhos. O Portal tem filtros All, New, Tasks e Unread e um painel de ações. [S02]

**FATO.** O sistema de interface do FM26 foi construído em torno de **Tiles e Cards**: os blocos apresentam informação contextual e, ao serem acionados, abrem cartões com mais detalhes. A barra superior agrupa as áreas centrais; Search passa a procurar também telas, objetos, notícias e guias; FMPedia funciona como glossário contextual. Bookmarks dão atalhos configuráveis para áreas frequentes. [S02]

**FATO.** O estúdio declarou três princípios para a nova interface: eficiência, familiaridade e previsibilidade. Também afirmou que o trabalho incluía rever tamanhos de fonte e contrastes. [S03]

**Crítica externa.** Avaliações e discussões de jogadores após o lançamento reclamaram de telas essenciais difíceis de encontrar, mais cliques, informações distribuídas em widgets e perda de visão compacta. O PC Gamer registrou reclamações de que a interface separava dados que antes estavam visíveis juntos; discussões de Reddit e Steam repetem que os cartões e pop-ups aumentavam a navegação e dificultavam a leitura da lista. São relatos qualitativos, não uma pesquisa representativa de todos os usuários. [S09–S12]

**OPINIÃO.** A falha a evitar é transformar “progressive disclosure” em uma sequência de caixas fechadas. Revelar detalhes gradualmente é útil; esconder a informação essencial atrás de três cliques não é. Em celular, os cards têm função de resumo ou detalhe contextual, mas não devem substituir uma lista, uma ficha ou uma tabela quando a pessoa precisa comparar vários itens.

## 1.3 FM27: correção explícita de navegação e ritmo

**FATO.** A página oficial do FM27 informa que o jogo completo foi lançado em 10/11/2026. Portanto, na data deste documento (17/11/2026), FM27 é uma referência disponível e não uma promessa de produto futuro. [S01]

**FATO.** No FM27, as tiles do FM26 passam a priorizar informação. A navegação principal volta a ser organizada por Portal, Squad, Tactics, Recruitment, Training e Club; uma navegação secundária dá acesso às páginas específicas. A tela Squad abre diretamente o elenco; Tactics abre a tática; Training abre o treino. O estúdio relata redução de cliques, composição adaptável, bookmarks com texto e reordenação, e possibilidade de substituir determinadas tiles. O objetivo declarado é recuperar comportamentos familiares sem perder personalização. [S04]

**FATO.** A mudança de fluxo após Continue é particularmente relevante: o FM27 deixa de retornar sempre ao feed de notícias. O jogador pode circular por áreas-chave diferentes e configurar como as mensagens são percorridas e com que frequência o jogo o leva a outra área. [S05]

**FATO.** FM27 também amplia notícias por fase de temporada — pré-temporada, balanço de meio de época, disputa contra rebaixamento, reta final — e introduz ou recupera momentos de calendário como sorteios de copas e deadline day. Clubes, competições e países passam a apresentar mais contexto: situação atual, técnico, artilheiro, transferências, história e notícias ligadas à entidade. [S05]

**FATO.** O sistema Tactical Effectiveness liga entendimento tático, capacidade dos jogadores, adesão dos jogadores e informação sobre o próximo adversário. A efetividade aparece em Tactics, Training e Recruitment. Tactical Complexity cria um custo de execução para instruções mais sofisticadas, dependendo da qualidade/perfil do elenco. [S13]

**FATO.** O FM27 declara melhorias de ambientação para dia de jogo: variação de torcida, estádio, clima, horário, luz, sombra, gramado e cenas de pré e pós-jogo. As mudanças de tempo e luz podem acompanhar a partida; a reação da torcida pode variar conforme o acontecimento. [S14]

**FATO.** O FM27 ainda divulga melhorias no visual 2D, com discos e bola menores, sombra mais forte para a bola e alterações de representação dos jogadores, explicitamente relacionadas a feedback da comunidade. [S15]

**OPINIÃO.** O movimento mais importante do FM27 não é “menos tiles”; é o reconhecimento de que **a navegação deve ser previsível e a home deve ser adaptável**. O Modo Clube deve começar com seis destinos primários no máximo e oferecer acesso contextual ao restante. Não precisa ter navegação idêntica em toda tela, mas o mapa mental do usuário não pode mudar a cada módulo.

## 1.4 FM26 Mobile, Touch e Console: o que muda com menos espaço

**FATO.** O manual do FM26 Mobile mantém uma tela Home e um menu lateral/inferior, com botão Continue no topo junto à data. Em telas maiores, Home pode virar um dashboard com calendário, finanças, jogos, resultados e centro médico; em telas menores, a mesma função é apresentada como conjuntos de botões que levam às áreas do jogo. [S16–S17]

**FATO.** No FM26 Mobile, o dia de jogo possui um hub pré-jogo e outro pós-jogo. O pré-jogo reúne tática, relatório do adversário, análise, estatísticas, expectativa da diretoria e torcida, humor de jogadores e previsões. O pós-jogo concentra reflexão, conversa com a equipe e preparação do que vem a seguir. Durante a partida existem visões de resumo, notas, estatísticas, zonas de ação, zonas de ataque, personalidade, placares paralelos e classificação ao vivo. O jogador pode escolher campo completo ou somente comentários, velocidade dos lances, tempo sem ação, overlays e replays. [S18]

**FATO.** O Touch foi desenhado para Nintendo Switch e mostra menos tiles por tela do que as edições PC/Console. A própria página de produto o descreve como uma adaptação para esse contexto. [S19]

**FATO.** O FM26 Console possui navegação própria e menos tiles do que o PC, com atalhos de controle e navegação por botões/shoulders; o estúdio declara que isso simplifica o uso em televisão e controle. No FM27 Console, há escalas de interface para distância de TV e mapeamento de botões reconfigurável. [S20–S21]

**OPINIÃO.** O aprendizado para 360 px não é comprimir a tela de desktop. É mudar a composição: em retrato, uma tarefa por vez com resumo fixo, lista rolável e painel de decisão; em desktop, comparação lado a lado, tabela densa e dashboard em colunas. O modelo de dados e os comandos devem ser os mesmos, mas a hierarquia visual pode mudar.

## 1.5 Leitura por sistema do Football Manager

| Sistema pedido | Evidência observável / padrão de interface | Aplicação ao Modo Clube |
|---|---|---|
| Elenco | FM Mobile mostra visão detalhada com múltiplas estatísticas, ordenação por coluna, escolha de jogadores e ações do assistente. [S22] | Lista compacta com posição, condição, forma, moral e adequação à tática; detalhes em ficha sem perder filtros. |
| Tática | FM Mobile oferece assistente de criação, estilo, formação, papéis e reposicionamento por toque ou arrasto. [S23] | O arrasto nunca pode ser a única forma de escalar; permitir selecionar jogador → selecionar posição. Mostrar o comportamento coletivo por fase. |
| Treino | FM27 coloca Training na navegação primária, permite copiar planos, mostra carga futura e liga sessão à preparação do próximo jogo. [S13] | Planner semanal simples com efeito esperado em atributos, fadiga, coesão e preparação; delegar sessões repetitivas. |
| Mercado e observação | FM26 descreve ferramentas de recrutamento, requirements e opportunities apoiadas por TransferRoom, além de relatórios de olheiros. [S24] | Busca orientada por necessidade tática e financeira; cada candidato deve mostrar preço, salário, risco, adaptação e motivo do encaixe. |
| Finanças e diretoria | FM24 e FM Mobile organizam finanças, expectativas e tarefas no universo do clube; Hattrick documenta receitas, gastos, estádio, torcedores e patrocinadores. [S06–S08, S25] | Mostrar caixa, fluxo, compromissos futuros e margem de segurança antes de qualquer decisão que comprometa o clube. |
| Base e jovens | Hattrick documenta academia, prospecção, desenvolvimento e promoção; FM Mobile inclui estrutura e desenvolvimento no conjunto do clube. [S25–S26] | Tratar o jovem como pessoa em desenvolvimento, com bem-estar, educação, minutos e plano de transição, não só como potencial numérico. |
| Pré-jogo / partida / pós-jogo | FM Mobile traz hubs pré e pós-jogo e múltiplas visões ao vivo. [S18] | Um Match Center resumido com decisões críticas e explicação pós-jogo; não obrigar a abrir cada painel para saber como a partida aconteceu. |
| Cor do clube | As páginas oficiais consultadas documentam personalização de identidade e telas, mas não fornecem um guia completo que permita afirmar uma regra cromática universal do FM. | Use a cor do clube como acento de dados e ambientação, não como cor de texto para todos os elementos. A legibilidade do produto tem precedência. |

**Conclusão desta seção:** FM continua sendo a maior referência de profundidade e interconexão sistêmica; o FM27 mostra que mesmo um produto dominante precisa recuperar densidade e previsibilidade. O Modo Clube deve aprender com FM Mobile sobre hubs de partida e com FM27 sobre navegação direta, mas entregar uma explicação de consequências mais consistente em todos os seus 17 sistemas.

---

# 2. Outros jogos de gestão: onde procurar boas soluções

Os jogos abaixo não são equivalentes diretos. Alguns são browser games persistentes; outros são jogos mobile rápidos, simuladores financeiros ou títulos de estatística muito profunda. A comparação abaixo procura **lições específicas**, não declara um vencedor absoluto.

| Jogo | O que oferece / fato documentado | Ponto forte a estudar | O que não copiar literalmente |
|---|---|---|---|
| **Brasfoot** | O site oficial alerta que não existe uma versão oficial chamada “Brasfoot 2026” e identifica 22–23 como a última edição oficial. A descrição destaca compra e venda, tática, competições, edição de equipes e leveza. [S27] | Rapidez, foco no núcleo da gestão e baixa dependência de apresentação gráfica. | A interface datada, a baixa densidade de história e a ausência de uma web UX mobile-first moderna. Evitar baixar versões falsas que usam o nome Brasfoot 2026. |
| **Hattrick** | Browser game de gestão de longo prazo, com partidas, treino, finanças, estádio, torcida, patrocinadores, funcionários, transferências e base; declara que o usuário pode entrar uma ou duas vezes por semana. [S25–S26] | Ritmo assíncrono e planejamento de longo prazo; a decisão estratégica continua significativa mesmo sem sessões longas. Comunidade e contexto persistente sustentam o mundo. | Uma cadência lenta demais para quem espera uma experiência de carreira mais cinematográfica; não replicar a espera como retenção artificial. |
| **Top Eleven** | App Store descreve clube personalizável, treino, campus, competições e motor 3D ao vivo; a edição 2027 comunica partidas em tempo real e PvP. [S28] | Partida como evento ao vivo e progresso visual de estádio/instalações. A sessão tem um objetivo claro: preparar o jogo e assistir ao resultado. | A estrutura de F2P e pressão comercial não deve guiar um produto cujo foco é simulação explicável e carreira offline/persistente. |
| **Soccer Manager 2026** | A ficha do Google Play descreve montagem de elenco, scouting, ação 3D, instalações, base, estádio, ligas e clubes personalizáveis. [S29] | A combinação de partida representada visualmente e evolução das instalações fora de campo. | Não confundir quantidade de recursos declarados com integração sistêmica profunda; avaliar na prática a consequência de cada tela. |
| **OSM** | A ficha oficial da App Store descreve a temporada 26/27, clubes e jogadores licenciados, formação, escalação e sistema tático profundo. [S30] | Onboarding simples com uma identidade de clube conhecida e uma preparação de partida centrada em decisões de técnico. | O Modo Clube usa universo ficcional; pode construir identidade própria em vez de depender de licenças reais. |
| **New Star Manager** | A listagem oficial descreve instalações, treino, patrocinador, staff, táticas, substituições, conversa de intervalo, preocupações dos jogadores, diretoria, imprensa e finanças. Também inclui interação direta no campo. [S31] | Misturar gestão e momentos de controle ativo cria variedade de sessão. Personagens com preocupações fazem o clube parecer povoado. | Não adicionar minijogos de campo que interrompam a simulação tática ou criem uma segunda mecânica sem função sistêmica. |
| **Football Chairman / Pro 2** | O site oficial destaca carreira de presidente, contratação/demissão de técnicos, estádio, transferências, contratos, torcida e banco. Pro 2, anunciado para 2026–27, declara nova UI, cenários, Hall da Fama, personas de técnicos e kits por temporada. [S32] | Ritmo acelerado de decisões executivas, ascensão de divisões e narrativa de construção do clube; boa referência para a carreira de dirigente. | Reduzir jogadores a números e a carreira a uma sequência de menus financeiros. O Modo Clube também precisa ser forte no campo. |
| **Club Boss** | Listagens oficiais descrevem gestão offline, evolução do clube, finanças, instalações, mercado, jovens, personalidades, propensão a lesões e cobertura de jogo ampliada. A versão Android informa atualização em agosto de 2026. [S33] | Gestão de clube em sessões curtas e funcionamento offline; personalidade e risco de lesão dão forma aos jogadores. | A cobertura de partida não deve ser o único espaço onde a simulação comunica consequências. |
| **Motorsport Manager** | Atualizações oficiais da comunidade incluem UI de race day, HUD de sessão, desgaste e aquecimento de pneus com leitura direta, relatório de corrida e informação sobre reparos. [S34] | Mostrar estado operacional no momento da decisão. Uma métrica é útil quando está perto da ação que ela explica. | Painel com telemetria excessiva para um usuário leigo. Deve haver níveis de detalhe e linguagem contextual. |
| **Out of the Park Baseball** | O site oficial descreve controle da franquia e do dugout, agentes livres, draft, trocas, scouting, desenvolvimento de prospects, ligas online e universos históricos. [S35] | Profundidade de franquia e memória histórica. O histórico do atleta e da organização é parte da experiência, não um relatório isolado. | A densidade de dados não pode ser o padrão inicial de cada tela mobile. |
| **Franchise Hockey Manager** | A ficha oficial de Steam documenta treino direcionado, experiência de draft com notícias e negociações, notícias de trocas com explicação e ajuda contextual. [S36] | O draft/mercado como evento narrativo, com informação editorial e motivo da troca. Ajuda contextual embutida. | Evitar excesso de microtexto na tela inicial; trazer a história no momento de relevância. |
| **Eleven: Football Manager (jogo de tabuleiro)** | A regra oficial descreve gestão semanal em dias distintos: produção, reunião de diretoria, contratações, vendas, staff, patrocinadores, infraestrutura e matchday. [S37] | A semana dividida em fases torna o ritmo de clube legível e dá ritual às decisões. | É um jogo de tabuleiro, não uma referência de UI digital; serve como modelo de cadência, não de interface web. |

### Comparação por objetivo

- **Melhor referência de sessões assíncronas:** Hattrick. [S25]
- **Melhor referência de progressão executiva de clube:** Football Chairman. [S32]
- **Melhor referência de partida com preparação e evento ao vivo em mobile:** Top Eleven e FM Mobile. [S18, S28]
- **Melhor referência de gestão de personagens e drama extra-campo:** New Star Manager. [S31]
- **Melhor referência de profundidade estatística/histórica:** OOTP e FHM. [S35–S36]
- **Melhor referência de estado operacional na hora da ação:** Motorsport Manager. [S34]

**OPINIÃO.** Não existe um vencedor único para “melhor UX de jogo de gestão”. O Modo Clube deve combinar o ritmo Hattrick/Football Chairman com a centralidade do matchday de FM Mobile e a legibilidade dos estados de Motorsport Manager, sem assumir a densidade padrão de um simulador desktop.

---

# 3. Jogos fora do gênero: imersão de interface com pouco custo

| Referência | Técnica de experiência | Ideia transferível | Limite / risco |
|---|---|---|---|
| **Persona 5** | Menus com identidade visual própria, movimento, diagonais, tipografia e composição. A direção de Persona reconheceu que menus muito estilizados exigem trabalho e ajustes de legibilidade; as primeiras versões eram difíceis de ler. [S38] | Dar ao Modo Clube uma gramática visual consistente: cabeçalho editorial, transições de seção e telas especiais para título, contratação e demissão. | Não fazer cada tela parecer um pôster diferente. A identidade não deve prejudicar leitura, localização ou manutenção. |
| **Hades** | HUD e menus integram ícones ilustrados, hierarquia e ritmo de jogo; a equipe Supergiant já descreveu produção específica de conceitos de menus, HUD e ícones com requisitos de motion graphics, jogo e acessibilidade. [S39] | Criar um conjunto pequeno de ícones com silhuetas reconhecíveis e ilustrações para eventos raros, mantendo a maior parte da UI em componentes reutilizáveis. | Fontes pequenas e informações com tempo curto podem prejudicar legibilidade; relatos de acessibilidade sobre Hades identificam tamanho de texto e opções limitadas como pontos de atenção. [S40] |
| **Balatro** | Estado estratégico complexo condensado em áreas fixas, tooltips e um conjunto pequeno de interações. Uma análise detalhada da UI mostra hierarquia em camadas e alternativas de controle no mobile. [S41–S42] | Deixar sempre visíveis as variáveis necessárias à decisão atual; tooltip contextual e detalhe sob demanda. | O tema CRT, a fonte pixelada e a baixa escala de texto não são apropriados ao Modo Clube. |
| **Into the Breach** | O jogo comunica antecipadamente o que os inimigos farão; os desenvolvedores defenderam sacrificar ideias “legais” quando a clareza falha e apontaram tooltips animados para explicar padrões complexos. [S43] | Antes de confirmar uma decisão tática, mostrar o comportamento provável da equipe e os riscos; animar uma jogada tática em miniatura quando texto não bastar. | Não representar uma previsão como certeza se a simulação tiver aleatoriedade, informação incompleta ou habilidade individual. |
| **Frostpunk** | Direção de arte, ambiente e detalhes visuais são usados para transmitir sentimento e estado do mundo. A equipe de arte discute a importância de uma sensação geral coerente e da narrativa visual. [S44] | O clube pode parecer próspero, decadente, tenso ou em reconstrução sem uma cena 3D: paleta, pequenos detalhes, manchetes, clima, iluminação e estado das arquibancadas. | Efeitos atmosféricos que não refletem estado real da simulação viram decoração vazia. |
| **Two Point** | Referência de gestão leve e legível; a lição recomendada é transformar estado operacional em feedback visual simples, com personagens e instalações legíveis. A pesquisa atual não encontrou uma fonte primária técnica suficiente para afirmar custos ou padrões exatos de implementação. | Mostrar instalações e pessoas com pequenos elementos ilustrados, evitando dashboards de BI em todos os módulos. | Não presumir métricas de acessibilidade ou desempenho sem testes específicos. |
| **FM Mobile** | Hub pré-jogo/pós-jogo, abas horizontais no matchday, placar paralelo e resumo de zonas. [S18] | Enxergar a rodada como um evento que pode ser resolvido em poucos minutos e ampliado sob demanda. | Evitar transformar cada estatística em uma aba que exige swipe para encontrar a informação crítica. |
| **EA SPORTS FC** | A crítica de FC26 destacou apresentações de transmissão, introduções cinematográficas, reações de torcedores e mascotes como recursos de atmosfera; também observou menus fora de campo menos polidos. [S45] | Usar linguagem de TV em momentos específicos: escalações, placar, gol, acréscimos, substituições, fim de jogo. | Não tentar reproduzir o orçamento, quantidade de assets ou fidelidade visual de um jogo AAA. |
| **NBA 2K MyGM / MyNBA** | **Sem evidência primária suficiente nesta rodada para descrever com precisão a UI atual de MyGM em 2026.** A referência é útil como categoria de carreira de franquia, mas deve ser verificada por captura direta do jogo antes de virar requisito. | Estudar a ligação entre decisões de front office, calendário, contratos e legado da franquia. | Não atribuir funcionalidades específicas sem captura/versão confirmada. |
| **Transmissões Globo / Premier League** | A Globo divulgou pacote gráfico de placar com cores dos times, estatísticas, substituições e cartões, além de mesa tática em realidade aumentada. A Premier League documenta a coleta de estatísticas via Opta, incluindo eventos por jogador e posição no campo. [S46–S47] | Grafismos de transmissão como camada narrativa: placar, mudança de liderança, jogador em destaque, comparativo de pressão/território. | Evitar tabelas sobrepostas ao campo; o overlay precisa ser temporário e acionado por evento. |

**OPINIÃO.** A linguagem visual premium deve ter uma hierarquia de “espetáculo por exceção”: a maior parte da gestão é rápida, clara e discreta; os eventos que mudam a história recebem apresentação especial. Assim, uma promoção, final, título, demissão ou proposta de outro clube pode ter uma assinatura visual memorável sem custar 60 FPS continuamente.

---

# 4. Imersão barata e premium na web

## 4.1 Regra de performance antes da escolha de técnica

60 FPS correspondem a cerca de **16,7 ms por quadro**; 30 FPS, a cerca de **33,3 ms por quadro**. Esse é o orçamento matemático de tempo por frame, não uma promessa de que qualquer navegador manterá esse ritmo. A simulação, o canvas, o DOM, o áudio e o navegador disputam recursos. A meta deve ser validada no conjunto, não em uma demonstração isolada.

A MDN recomenda, para Canvas, agrupar chamadas, evitar alterações desnecessárias de estado, desenhar apenas diferenças quando possível, evitar `shadowBlur` pesado, limitar texto e usar `requestAnimationFrame`. Ela também recomenda pré-renderizar elementos repetidos em canvas fora da tela. [S48]

`OffscreenCanvas` pode deslocar renderização para um Worker e reduzir a dependência do thread principal, mas não remove o custo total de rasterização, preenchimento de pixels ou transferência de dados. [S49]

## 4.2 Matriz das técnicas

| Técnica | Uso recomendado | Custo estimado | Risco em celular modesto | Cuidados / fontes |
|---|---|---:|---|---|
| **CSS 3D leve** (`transform`, `perspective`) | Profundidade discreta em cartões de evento, túnel de entrada, escudos e painéis de destaque. Preferir camadas pequenas e animação curta. | Baixo–médio | Médio se houver muitos elementos promovidos a camadas, filtros, blur ou superfícies grandes. | Não usar `translateZ(0)` indiscriminadamente. Medir memória de GPU e repaint em aparelhos reais. Animar `transform`/`opacity` antes de `width`, `height`, sombras ou filtros. [S50] |
| **View Transitions API** | Transição de identidade entre Portal → ficha do jogador; tabela → perfil; resumo → detalhe do jogo, mantendo continuidade espacial. | Baixo–médio | Baixo–médio se usar poucas transições e snapshots pequenos; médio se capturar grandes áreas ou bloquear interação. | Suporte moderno melhorou: MDN indica Baseline 2025 para a API em navegadores atuais, mas dispositivos antigos exigem fallback imediato sem animação. Evitar transições longas em navegação frequente. [S51–S52] |
| **Scroll-driven animations** | Progresso visual da temporada, linha do tempo da carreira ou entrada discreta de seções numa página editorial. | Baixo–médio | Médio por suporte heterogêneo e risco de acoplar animação ao scroll. | Em 27/10/2026, a tecnologia passou a Baseline Newly Available segundo Web Features Explorer; feature detection e fallback são recomendados. Animar transform/opacity, respeitar reduced motion. [S53–S54] |
| **`@property`** | Interpolar variáveis CSS tipadas para barras de progresso, intensidade de forma, medidor de moral e acentos de estado. | Baixo | Baixo, desde que não se anime grande quantidade de propriedades que forcem layout. | MDN classifica a regra como Baseline 2024 e explica registro de tipos, valores iniciais e interpolação. Não é solução automática de performance; a propriedade animada ainda pode acionar pintura. [S55] |
| **Canvas 2D** | Campo 2,5D, mapas táticos, heatmaps, shot maps e gráficos de rede com quantidade controlada de elementos. | Médio–alto | Alto no caso de muitos sprites, sombras, texto, filtros e escala alta de DPR. | Pré-renderizar gramado, linhas, arquibancada e sprites; limitar DPR no modo econômico; agrupar paths; minimizar texto e shadows; usar `requestAnimationFrame`. [S48] |
| **Sprites / atlas** | Jogadores, bola, bandeiras, sinalização, ícones grandes e reações simples de torcida. | Baixo–médio | Baixo se os sprites forem pequenos, atlas forem organizados e animações forem seletivas; médio por memória de textura se tudo carregar de uma vez. | Preferir sprite sheets e reutilização; carregar assets por cena; limitar variações e resolução em aparelhos de baixa memória. A redução de draw calls é uma hipótese de implementação a medir, não um número garantido. |
| **Som ambiente / trilha** | Camada de estádio em matchday, ruído leve de escritório/centro de treino, sting de gol, apito, torcida reagindo. | Baixo–médio | Baixo em CPU depois de carregado; médio em memória, decodificação, rede e bateria se muitos loops ou samples forem mantidos. | Web Audio costuma exigir gesto do usuário para iniciar/resumir `AudioContext`; oferecer controle de volume, mute e trilhas separadas. Não tocar automaticamente sem consentimento. [S56–S57] |
| **Vibration API** | Toque curto opcional para gol, confirmação de decisão ou alerta importante. Nunca para notícias comuns. | Baixo | Baixo em processamento; alto risco de incompatibilidade de plataforma. | A API tem disponibilidade limitada e não funciona em Safari/iOS, conforme MDN e Can I Use consultados. Deve ser melhoria opcional, nunca requisito para perceber um evento. [S58] |
| **Microinterações de toque** | Pressão de botão, mudança de estado, seleção de jogador, feedback de salvamento, swipe em carrossel. | Baixo | Baixo se as animações forem pequenas; médio se gerar layout/repaint desnecessário. | Estado visual precisa ser instantâneo; animação não pode atrasar a ação. Para listas, preferir highlight de seleção e movimento de transform curto. |
| **Partículas / luz / fumaça** | Só em eventos raros: gol, título, anúncio de contratação e entrada no estádio. | Médio–alto | Alto em telas grandes e contagem alta de partículas, transparências sobrepostas e filtros. | Limitar quantidade, duração, área e simultaneidade; substituir por sprites estáticos no modo econômico; desligar/reduzir em `prefers-reduced-motion`. |

## 4.3 O que sabemos — e o que não sabemos — sobre custo

**FATO.** As fontes técnicas documentam mecanismos e boas práticas, mas não publicam um custo universal em milissegundos para “CSS 3D”, `@property`, View Transitions ou Canvas em um aparelho de entrada específico. O custo muda com aparelho, resolução, navegador, número de pixels, camadas e conteúdo. [S48–S58]

**Sem dado público.** Não foi encontrado um benchmark comparável de todas as técnicas no mesmo conjunto de aparelhos de entrada em 360 px, com o mesmo navegador e mesma carga de jogo. Portanto, o documento não atribui custos numéricos por técnica.

**Protocolo recomendado:**

1. Definir aparelhos reais representativos de entrada, intermediário e topo; registrar modelo, RAM, navegador e sistema operacional.
2. Testar a mesma cena 2,5D e a mesma tela de gestão em 360 × 800 CSS px e com o DPR real do aparelho.
3. Medir frame time p50/p95/p99, long tasks, uso de memória, tempo de carregamento de assets, consumo de bateria em sessão e quedas de quadro em momentos intensos.
4. Rodar quatro modos: completo, econômico, reduced motion e sem áudio.
5. Testar tela quente e fria, primeiro carregamento e repetição, dispositivo em modo economia de energia e aba em segundo plano.
6. Não aceitar que um teste isolado de desktop represente o desempenho mobile.

**Recomendação.** Implementar três perfis de apresentação: **Automático**, **Economia** e **Completo**. Automático detecta condições e reduz adornos quando necessário; Economia desativa partículas, reduz DPR do canvas e limita animações; Completo habilita todos os efeitos que passaram pelos testes.

## 4.4 Som, toque e preferência de movimento

O som deve ser ambientação, não trilha sonora obrigatória. Separar volume de estádio, efeitos de UI e música; permitir desligar cada canal; lembrar a preferência. A primeira interação explícita pode liberar o contexto de áudio; a página não deve surpreender a pessoa com som automático. [S56–S57]

A Vibration API deve ser facultativa e tratada como capability, porque a compatibilidade em iOS é ausente na tabela consultada. O mesmo resultado precisa ter feedback visual e sonoro equivalente. [S58]

`prefers-reduced-motion` precisa reduzir não apenas animações grandes, mas também parallax, zoom, tremor, partículas, transições de tela e movimento contínuo decorativo. MDN alerta que zoom e pan de objetos grandes podem causar desconforto vestibular. [S59]

---

# 5. Narrativa emergente e mundo vivo

## 5.1 O que faz o clube parecer ter história

**FATO.** O FM27 descreve uma expansão de notícias ligadas a fases da temporada, sorteios de copas, janela de transferências e notícias do mundo do futebol. O jogo relaciona notícias a clubes, competições e contexto atual e histórico. [S05]

**FATO.** Football Chairman Pro 2 declara Hall da Fama, cenários, personas de treinadores e continuidade de carreira; OOTP destaca história de temporadas, ligas e carreiras. [S32, S35]

**OPINIÃO.** Um mundo vivo não é uma timeline infinita de textos aleatórios. É a memória de fatos com consequências. O jogo deve manter entidades com identidade e relações:

- Pessoas: jogadores, técnicos, membros da comissão, dirigentes, jornalistas e torcedores.
- Instituições: clube, patrocinador, competição, academia, estádio, federação e imprensa.
- Relações: rivalidade, promessa, conflito, empréstimo, formação, parceria, confiança e dívida.
- Acontecimentos: contratação, lesão, estreia, gol decisivo, recorde, demissão, título, rebaixamento, promoção, obra e protesto.
- Memória: a temporada, o motivo, quem participou, qual variável mudou e como o clube reagiu.

## 5.2 Arquitetura de conteúdo

Cada história deve ser derivada de um evento real da simulação e apontar para a entidade correspondente. Exemplo:

> **Manchete:** “Jovem da base ganha espaço após sequência de lesões”.  
> **Resumo:** o jogador entrou em 4 partidas nas últimas 3 semanas e aumentou a confiança da comissão.  
> **Três fatos:** 212 minutos; 2 titularidades; nota média 6,8 (amostra de 4 jogos).  
> **Detalhe:** treinador, evolução física/técnica, carga, reação da torcida e impacto na hierarquia do elenco.

O exemplo acima é um formato ilustrativo; os valores são fictícios e não devem ser usados como dados reais.

### Tipos de conteúdo

| Canal | Função | Regra de qualidade |
|---|---|---|
| Inbox do clube | Comunicações acionáveis: renovação, inscrição, orçamento, lesão, reunião, prazo. | Uma ação principal identificável; prazo e consequência explícitos. |
| Notícias / imprensa | Contextualizar resultados, rivalidades, mercado, temporada e mundo externo. | Não inventar causa ou opinião; cada texto tem evento-fonte e fatos associados. |
| Torcida / comunidade | Mostrar percepção, expectativa, protesto, orgulho, comparecimento e reputação. | Opiniões podem ser simuladas, mas precisam ser coerentes com fatos e perfil da torcida. |
| Rede social fictícia | Reação rápida e variada a momentos quentes. | Não transformar cada partida em spam; usar volume proporcional à importância. |
| Sala de troféus | Legado institucional e recordes. | Guardar dados históricos consultáveis; não substituir memória persistente por imagens decorativas. |
| Linha do tempo da carreira | Narrar temporadas, clubes, propostas, títulos, fracassos e reputação do treinador. | Mostrar causa e consequência e permitir abrir o acontecimento original. |

## 5.3 Atributos que dão personalidade ao mundo

Cada personagem pode ter um perfil de comunicação e comportamento, usado como contexto e não como variável invisível que manipula o usuário:

- Jogador: personalidade, ambição, estabilidade, vínculo com o clube, adaptação, liderança, histórico físico e relação com companheiros.
- Técnico/assistente: filosofia, competência por domínio, estilo de comunicação, confiança e tolerância a risco.
- Torcida: tradição, expectativa, rivalidades, sensibilidade a preço e desempenho, vínculo regional.
- Diretoria: horizonte, tolerância financeira, prioridade esportiva, paciência e modelo de governança.
- Imprensa: foco editorial, histórico de cobertura e relação com o treinador.

**Recomendação:** criar uma *memória do clube* com marcos objetivos e histórias curtas, evitando geração procedural desconectada. O jogador deve conseguir perguntar “por que isso virou notícia?” e abrir o evento relacionado.

---

# 6. Ritmo e retenção de sessão curta: 2–10 minutos no celular

## 6.1 Princípio de sessão

O objetivo não deve ser obrigar o usuário a visitar 17 áreas por rodada. Uma sessão bem desenhada começa por uma visão de estado e deixa a pessoa resolver uma ou mais decisões significativas.

**Loop recomendado:**

1. **Abrir o Portal (10–20 segundos):** uma frase explica o estado do clube e mostra o próximo marco do calendário.
2. **Centro de Decisões (30–120 segundos):** lista pendências por prazo, impacto e reversibilidade.
3. **Decisão principal (1–4 minutos):** tela específica com comparação, prévia de consequência e confirmação.
4. **Resumo do dia/semana (20–60 segundos):** registra o que mudou, por que mudou e o próximo compromisso.
5. **Avançar tempo:** o jogo pausa em decisões de alto impacto; o usuário pode configurar delegação para rotinas de baixo risco.

Os tempos acima são metas de design para prototipagem, não tempos de uso medidos em um concorrente.

## 6.2 Centro de Decisões

O Centro de Decisões deve mostrar apenas decisões ativas e ordenadas por:

1. Prazo: vence agora, próximo jogo, esta semana, sem prazo.
2. Impacto: esportivo, financeiro, humano, institucional.
3. Reversibilidade: irreversível, cara para desfazer, reversível.
4. Dependência: decisão bloqueia outra ação.

Cada item tem: título, consequência se ignorado, origem da informação, ação recomendada, ação alternativa e responsável delegado.

**Não fazer:** badges vermelhos em todo item; falsa urgência; timer real de pressão; notificação por evento irrelevante; avanço automático passando por uma decisão importante.

## 6.3 Delegação sem perder agência

Delegar é uma escolha de gestão, não uma forma de remover o sistema do jogo. Toda delegação deve permitir configurar:

- Quem assume (assistente, diretor, scout, preparador, financeiro).
- Escopo (ex.: treino semanal, amistosos, renovação abaixo de determinado custo, observação de uma região).
- Limite de autoridade (informar, recomendar, executar dentro de um intervalo, executar sem perguntar).
- Regra de exceção (lesão grave, custo alto, jogador-chave, prazo curto, conflito com filosofia do clube).
- Relatório de auditoria com decisão tomada, dados consultados e efeito na simulação.

## 6.4 Cadência por fase da temporada

- **Dia normal:** treino, saúde, confiança e agenda; resumo em uma linha.
- **Véspera de jogo:** escalação, plano de jogo, preparação do adversário e disponibilidade.
- **Dia de jogo:** evento com apresentação especial e acesso rápido ao campo.
- **Pós-jogo:** explicação de resultado e três prioridades do próximo ciclo.
- **Mercado:** oportunidades e prazos, com comparação financeira e tática.
- **Virada de temporada:** revisão de objetivos, orçamento, contratos, premiações, elenco e história do clube.

## 6.5 Redução de cliques sem perda de profundidade

- Ação primária perto do contexto, mas disponível também no módulo original.
- Pesquisa global que retorna jogador, clube, assunto e ação.
- Filtros preservados ao abrir e voltar de uma ficha.
- Ações em lote para decisões repetitivas (ex.: atribuir plano de treino a um grupo).
- Botão de avançar sempre no mesmo lugar, com estado e motivo claros.
- Resumo por evento com drill-down opcional.
- Atalhos personalizáveis no desktop e favoritos no mobile.

**Meta de produto proposta:** nenhuma decisão de rotina deve exigir mais de 3 toques a partir do Portal; decisões raras ou de alto risco podem exigir 4–5, desde que cada etapa acrescente informação essencial. Isso é uma meta a validar em teste, não um benchmark de mercado.

---

# 7. Visualização de dados de futebol: leigos e especialistas

## 7.1 Evidências e referências

- **Premier League / Opta:** o site da liga explica que os dados são coletados por analistas que registram eventos, jogador e localização no campo, com controle de qualidade posterior; sua taxonomia inclui passes, ações defensivas e xG. [S47]
- **Opta Analyst:** páginas de Match Centre incluem estatísticas de equipe e jogador, xG, redes de passe e chalkboard para partidas. [S60]
- **SofaScore:** lançou mapas de passes, dribles e ações defensivas em novembro de 2025, como camada visual para ler contribuição do jogador no campo. [S61]
- **FotMob:** documenta mapas de finalização, xG ao vivo e estatísticas detalhadas como ferramentas de acompanhamento. [S62]
- **FBref:** documentou relatórios de scouting com percentis para comparar jogadores na mesma posição e manteve consistência de indicadores entre posições; a própria página informa que os relatórios foram descontinuados por falta de dados avançados. Não apresentar essa ferramenta como ativa em 2026. [S63]
- **StatsBomb:** o projeto de dados abertos e exemplos associados permitem experimentar mapas de passes, finalizações, ações, redes e zonas, respeitando as licenças do dataset. [S64]
- **The Athletic:** nesta pesquisa não foi encontrada documentação pública suficiente para descrever um padrão de visualização específico do produto sem paywall ou dependência de contexto editorial; usar como referência editorial apenas após captura de tela validada.

## 7.2 Camadas de leitura

A mesma visualização deve funcionar em três níveis:

1. **Leigo:** uma frase e uma comparação (“o time conseguiu chegar mais vezes ao último terço, mas finalizou pouco”).
2. **Intermediário:** três métricas e uma visualização simples, com comparação à média do clube, do campeonato ou do período.
3. **Especialista:** filtros, amostra, per-90, recorte por fase, mapa e tabela completa.

## 7.3 Guia de visualizações

| Visualização | Pergunta que responde | Melhor forma de apresentar | Cuidados |
|---|---|---|---|
| Mapa de calor | Onde o jogador/time esteve mais presente? | Campo com gradiente e legenda relativa à frequência. | Não chamar de “posição” se representa frequência; depende da amostra e da função. |
| Mapa de passes | De onde para onde o jogador passou? | Linhas com espessura/estilo por frequência ou resultado; direção clara. | Não desenhar centenas de linhas de uma vez sem filtro; separar passe progressivo, chave e circulação. |
| Rede de passes | Quem conectou o time? | Nós em posição média e linhas proporcionais a conexões; destaque aos jogadores centrais. | Não inferir importância só por grau; considerar função, minutos e contexto. |
| xG / mapa de chutes | Qual foi a qualidade das chances? | Pontos no campo com tamanho proporcional ao xG e timeline acumulada. | xG é probabilidade modelada, não “gol esperado” literal nem julgamento de qualidade individual isolado. [S65] |
| Radar | Em que dimensões dois atletas diferem? | 4–6 métricas no máximo, normalizadas para papel/posição e mesma competição. | Radar com 12 eixos é ilegível; indicar percentil, período, amostra e grupo de comparação. |
| Forma | Como o desempenho vem mudando? | Linha temporal e barra por jogo, com minutos jogados e faixa de referência. | Uma nota média sem minutos/contexto distorce a leitura. |
| Comparação de jogadores | Quem atende melhor à necessidade do elenco? | Tabela comparativa fixa + destaque contextual por função tática. | Não usar rating geral como resposta automática; mostrar trade-offs e custo. |
| Classificação | O que o resultado muda na competição? | Tabela com zona de título, acesso, playoff, permanência e rebaixamento. | A zona precisa refletir regras reais da competição simulada; destacar cenários apenas se calculados. |
| Território / zonas | Onde o jogo foi disputado? | Campo dividido em zonas com posse, entradas ou ações. | Definir precisamente o indicador; não misturar posse, toque e ataque. |
| Linha do tempo do jogo | Em que momento a partida mudou? | Eventos do jogo alinhados a placar, substituições e momentum. | Momentum precisa de definição matemática e não deve ser tratado como medida oficial. |

## 7.4 Recomendação de design

No campo do Modo Clube, usar **gráfico espacial primeiro e tabela depois** quando a pergunta é geográfica. Para decisões de elenco e finanças, usar **tabela primeiro e gráfico depois**. O visual deve sempre explicitar:

- unidade e definição da métrica;
- período e tamanho da amostra;
- posição ou papel de comparação;
- se o número é observado, calculado ou estimado;
- se maior é melhor ou pior;
- uma frase em linguagem comum explicando a leitura.

O jogo não deve mostrar xG, PPDA ou percentis a novatos sem tradução e glossário acessível. FMPedia demonstra o valor de ajuda contextual dentro do ambiente de gestão; o Modo Clube deve construir sua própria enciclopédia contextual. [S02]

---

# 8. Erros a evitar e acessibilidade

## 8.1 Antipadrões de interface

1. **Cards dentro de cards:** cada ação abre outro painel e perde a posição de origem.
2. **Densidade baixa artificial:** uma tela com um título e três números, obrigando abertura de novos cartões para comparar elenco.
3. **Tabelas sem prioridades:** dezenas de colunas, todas com o mesmo peso visual.
4. **Dashboard como home sem tarefa:** um mosaico bonito sem informar o que precisa ser decidido.
5. **Cromatismo como única linguagem:** verde/vermelho sem texto, ícone, padrão ou rótulo.
6. **Hover como requisito:** descrição ou ação que aparece somente com mouse.
7. **Drag-and-drop exclusivo:** escalação e ordenação precisam de alternativa por toque/teclado. WCAG 2.2 AA exige que ações de arrastar tenham alternativa de ponteiro simples, salvo exceções. [S66]
8. **Ação sem prévia:** transferir, renovar, emprestar ou investir sem mostrar efeito em caixa, salários, disponibilidade, moral ou governança.
9. **Notificação sem consequência:** mensagens que só repetem dados e não ajudam a decidir.
10. **Animação contínua para decorar:** consome recurso, distrai e pode causar desconforto.

## 8.2 Base WCAG 2.2 AA

**FATO.** WCAG 2.2 é a recomendação do W3C publicada em 12/12/2024. Para texto normal, o critério 1.4.3 exige contraste mínimo de 4,5:1; texto grande pode usar 3:1. [S66–S67]

**FATO.** Critério 2.5.8 exige alvo mínimo de 24 × 24 CSS px em nível AA, com exceções específicas. [S68]

**Recomendações do Modo Clube:**

- Projetar alvos primários mobile entre 44 e 48 CSS px quando possível, sem confundir esse alvo de projeto com o mínimo normativo AA.
- Nunca usar dourado claro em fundo verde escuro sem checar o contraste medido; cor institucional não garante legibilidade.
- Arquivo e jogo devem permitir zoom de texto sem perda de função ou corte de controles.
- Usar texto real, não texto rasterizado dentro do canvas.
- Campo 2,5D deve ter alternativa de resumo textual acessível: placar, eventos, substituições, posição e estatísticas.
- Navegação integral por teclado, foco visível, ordem lógica e sem armadilha de foco.
- Labels acessíveis para ícones; leitores de tela devem ouvir nome, valor, estado e ação.
- Informações nunca podem depender apenas de vermelho/verde ou de áudio.
- Preferências para tamanho do texto, alto contraste, intensidade de animação e áudio.
- `prefers-reduced-motion` precisa funcionar em todas as cenas, não apenas na página de configurações. [S59]
- Legendas/descrições para sons importantes; opção de silenciar sem perder alertas visuais. [S56–S57]

## 8.3 Dados de acessibilidade em jogos de gestão

**Sem dado público.** Não foi encontrada uma pesquisa representativa e recente que meça quantos jogadores de Football Manager, Hattrick, Brasfoot, Top Eleven ou outros jogos de gestão têm deficiência, nem um comparativo WCAG de suas interfaces. Não é correto extrapolar números gerais de deficiência da população para afirmar a distribuição de jogadores deste gênero.

O critério prático recomendado é auditar o Modo Clube com WCAG 2.2 AA, testes com teclado/leitor de tela, testes de daltonismo, zoom e reduced motion, mais sessões com pessoas com diferentes necessidades de acesso.

---

# 9. Referências visuais para estudar

Os links abaixo levam a páginas oficiais, manuais, imagens integradas ou vídeos. O objetivo é observar composição, fluxo, densidade e hierarquia — não copiar assets, marca, tipografia ou identidade visual.

| Jogo/site | Tela ou momento a observar | Ideia a extrair | Link |
|---|---|---|---|
| FM24 | Menu, calendário, Continue e menu de contexto | Um único mecanismo claro de avanço de tempo e ações contextuais | [Manual da UI FM24](https://community.sports-interactive.com/sigames-manual/football-manager-2024/the-user-interface-r4951/) |
| FM26 | Portal, inbox, filtros, tiles/cards, bookmarks | Visão editorial do clube e filtragem de pendências | [Deep dive da UI FM26](https://www.footballmanager.com/fm26/features/fm26s-reimagined-user-interface) |
| FM27 | Navegação, Portal, Squad, Tactics, Club e bookmarks | Navegação direta e personalização sem sacrificar tela compacta | [Deep dive da navegação FM27](https://www.footballmanager.com/fm27/features/fm27-clearer-interface-smoother-navigation) |
| FM27 | News, clube, país e competição | Conteúdo contextual e história ligado à fase da temporada | [Deep dive do mundo imersivo](https://www.footballmanager.com/fm27/features/deeper-more-immersive-world) |
| FM27 | Pré-jogo, estádio e torcida | Variação de luz, clima, torcida e ritual de partida | [Match Day Atmosphere](https://www.footballmanager.com/fm27/features/fm27-elevated-match-day-atmosphere) |
| FM26 Mobile | Hub pré/pós-jogo, timeline, action zones, live table | Como condensar dados de partida para celular | [Manual Match Day Mobile](https://community.sports-interactive.com/sigames-manual/football-manager-mobile-2026/match-day-r5263/) |
| FM26 Mobile | Home em tela maior e menor | Dashboard adaptativo versus atalhos em aparelhos pequenos | [Manual Home Screen Mobile](https://community.sports-interactive.com/sigames-manual/football-manager-mobile-2026/the-home-screen-r5246/) |
| Hattrick | Home, semana e calendário de jogo | Sessão assíncrona e planejamento de longo prazo | [Site oficial](https://www.hattrick.org/en/) |
| Top Eleven | Matchday, estádio, campus e evolução do clube | Evento de partida e progressão visual de estrutura | [App Store / Top Eleven](https://apps.apple.com/us/app/top-eleven-be-a-soccer-manager/id459035295) |
| Soccer Manager 2026 | Elenco, partida 3D, instalações | Carreira com crescimento do clube em múltiplas frentes | [Google Play / SM26](https://play.google.com/store/apps/details?id=com.invinciblesstudioltd.soccermanager2025) |
| New Star Manager | Gestão fora de campo, preocupações dos jogadores e controle em campo | Personalidade e variedade de sessão | [Google Play / New Star Manager](https://play.google.com/store/apps/details?id=uk.fiveaces.nsfc) |
| Football Chairman Pro 2 | Progressão de divisões, Hall da Fama, interface 2026–27 | Carreira de dirigente e legado | [Site oficial](https://www.football-chairman.com/) |
| Club Boss | Visão de elenco, juventude, matchday e recursos | Gestão offline e cadência de decisões | [Google Play / Club Boss](https://play.google.com/store/apps/details?id=com.GamesbyJoe.ClubBoss) |
| OOTP Baseball | Franquia, scouting, draft, histórico | História e gestão de franquia em profundidade | [Site oficial](https://www.ootpdevelopments.com/out-of-the-park-baseball-home/) |
| Franchise Hockey Manager | Draft, trocas, relatórios de liga e ajuda contextual | Notícias que explicam a razão de movimentos | [Steam / FHM 12](https://store.steampowered.com/app/3739670/Franchise_Hockey_Manager_12/) |
| Motorsport Manager | HUD da corrida, relatório e estado de pneus | Estado operacional conectado à decisão | [Atualizações oficiais na Steam](https://steamcommunity.com/app/415200/announcements/) |
| Persona 5 | Menus, transições e identidade visual | Uma assinatura visual própria, mas com testes de legibilidade | [Análise sobre menus e entrevista com direção](https://www.theverge.com/2024/10/7/24262357/persona-metaphor-menu-design) |
| Hades | HUD, ícones e tela de Keepsakes | Ícones ilustrados em linguagem consistente | [Supergiant — UI Illustrator](https://www.supergiantgames.com/blog/job-opportunity-ui-illustrator-for-hades-ii/) |
| Balatro | HUD, mão, estado de rodada e tooltips | Estado complexo sempre visível | [Análise de UX/UI](https://teemo.dev/game-design/balatro/systems/ux-ui-and-accessibility/) |
| Into the Breach | Previsão de ação e tooltip animado | Explicar uma decisão com movimento, não só texto | [Game Developer — UI clarity](https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-) |
| EA SPORTS FC | Entrada de jogo, HUD e reação de torcida | Ritmo e linguagem de transmissão | [Crítica de apresentação FC26](https://soccergaming.com/ea-sports-fc-26-a-critical-review/) |
| Globo | Placar, cards de estatística e mesa tática | Grafismos de TV com dados em contexto | [Pacote gráfico Globo](https://redeglobo.globo.com/google/amp/esporte/noticia/cheio-de-novidades-nas-transmissoes-da-globo-brasileirao-comeca-neste-fim-de-semana.ghtml) |
| Premier League | Glossário de estatísticas e dados | Definição explícita de métricas | [Stats clarification](https://www.premierleague.com/en/stats/clarification) |
| Opta Analyst | Match Centre, xG, passing network e chalkboard | Dados avançados com narrativa editorial | [Exemplo de Match Centre](https://theanalyst.com/articles/everton-vs-man-utd-stats-premier-league-09-2026) |
| SofaScore | Mapa de passes, dribles e defesa | Mapas temáticos com leitura espacial | [Novos mapas SofaScore](https://www.sofascore.com/news/introducing-sofascores-new-maps-a-smarter-way-to-read-the-game) |
| FotMob | Shot maps e xG | Mapa de finalização e chance | [Guia de estatísticas FotMob](https://www.fotmob.com/my/topnews/3949) |
| FBref | Scouting report e percentis (referência histórica) | Normalizar números por posição e grupo | [Scouting Reports Explained](https://fbref.com/en/about/scouting-reports-explained) |
| StatsBomb | Dados abertos e mapas | Criar um laboratório de dados reproduzíveis | [Open Data](https://github.com/statsbomb/open-data) |

---

# 10. Vinte e cinco ideias de diferenciação para o Modo Clube

As ideias abaixo são propostas. **Não foi localizado um equivalente exato em todos os concorrentes examinados**, mas não se afirma exclusividade global. O custo indica esforço/impacto técnico relativo, não estimativa de horas.

| # | Ideia | Problema que resolve / valor | Custo | Risco de performance |
|---:|---|---|---|---|
| 1 | **Centro de Decisões unificado** | Pendências de todos os 17 sistemas ficam numa fila priorizada por prazo, impacto e reversibilidade; elimina a caça a telas. | Médio | Baixo |
| 2 | **Prévia de consequência antes de confirmar** | Compara estado atual e projetado: caixa, folha, moral, disponibilidade, efetividade tática e risco de governança. | Médio–alto | Baixo |
| 3 | **Rastro causal da decisão** | Abre “o que aconteceu e por quê”, com evento, regra, variáveis e fatores; combate a sensação de aleatoriedade opaca. | Alto | Baixo |
| 4 | **Assistente que mostra incerteza** | Distingue fato, estimativa e recomendação; evita que a comissão apresente opinião como certeza. | Médio | Baixo |
| 5 | **Modo de sessão de 3 minutos** | Apresenta só o que vence, mudou ou precisa de atenção; deixa a simulação profunda acessível sem obrigar leitura longa. | Médio | Baixo |
| 6 | **Resumo de rodada em formato de transmissão** | Converte estatísticas e ocorrências em uma sequência editorial de 30–60 segundos, com drill-down. | Médio | Médio |
| 7 | **Memória viva do clube** | Linha do tempo de jogadores, treinadores, torcida, diretoria, títulos, obras, recordes e rivalidades. | Alto | Baixo |
| 8 | **Rivalidade com memória factual** | Partidas decisivas, provocações, transferências entre rivais e histórico de confrontos formam contexto ao longo de temporadas. | Alto | Baixo |
| 9 | **Identidade tática visível em recrutamento** | Cada candidato recebe leitura de encaixe na filosofia, custo de adaptação e necessidade de treino, não só nota de atributo. | Alto | Baixo |
| 10 | **Mapa de responsabilidades da comissão** | Visualiza quem recomenda, quem decide e quem executa, com limites de autoridade configuráveis. | Médio | Baixo |
| 11 | **Delegação com auditoria** | Toda ação delegada registra premissa, alternativa, resultado e exceções; o usuário mantém agência. | Alto | Baixo |
| 12 | **Termômetro de saúde institucional** | Resume finanças, contratos, moral, base, torcida, infraestrutura e confiança da diretoria sem reduzir tudo a um rating oculto. | Alto | Baixo |
| 13 | **Simulador de cenários de tabela** | Mostra o efeito de vitórias/empates/derrotas na classificação, com probabilidade apenas quando calculada pela simulação. | Médio | Baixo |
| 14 | **Explicador tático em miniatura** | Mostra como uma instrução muda o comportamento de uma jogada, com animação simplificada e antes/depois. | Médio | Médio |
| 15 | **Pós-jogo com causalidade e amostra** | Separa placar, desempenho, criação de chances e erros individuais; impede que “resultado” seja confundido com “desempenho”. | Médio | Baixo |
| 16 | **Identidade de temporada** | Cada temporada tem arte gráfica, slogan, objetivos, destaques e retrospectiva derivados dos acontecimentos. | Médio | Baixo |
| 17 | **Sala de troféus interativa em 2D** | Torna títulos, recordes e ídolos permanentes; sem modelagem 3D do estádio. | Médio | Baixo |
| 18 | **Jornal local do clube** | Notícias locais reagem a infraestrutura, comunidade, torcida, rivalidade, base e resultados. | Médio–alto | Baixo |
| 19 | **Mapa de influência na comunidade** | Mostra quais ações do clube afetam bairro, formação, torcedores, reputação e receita. | Alto | Baixo |
| 20 | **Perfil psicológico contextual do elenco** | Relações, liderança, ambição e reação à gestão são lidos em contexto, sem “barra de moral” isolada. | Alto | Baixo |
| 21 | **Linha do tempo das promessas** | Acompanha promessas feitas ao elenco, diretoria e torcida, com status e custo de descumprimento. | Médio | Baixo |
| 22 | **Mercado por necessidade, não só por busca** | “Preciso de lateral que sustente largura sem quebrar o orçamento” vira critérios e filtros transparentes. | Médio–alto | Baixo |
| 23 | **Relatório de desgaste do estilo de jogo** | Aponta quando pressão, calendário ou carga podem degradar o modelo de jogo; usa simulação real, não alerta genérico. | Alto | Baixo |
| 24 | **Matchday compacto / broadcast** | Alterna câmera do campo 2,5D, resumo de eventos e painel tático, com modo silencioso e acessível. | Alto | Médio–alto |
| 25 | **Clube responsivo ao contexto** | A home muda a prioridade conforme pré-temporada, mercado, decisão de título, crise financeira ou rebaixamento, mas mantém navegação fixa. | Médio | Baixo |

**Prioridade recomendada:** ideias 1, 2, 3, 5, 7, 9, 11, 14 e 15 formam o diferencial de produto. Efeitos cinematográficos e sala de troféus ficam depois da estrutura de consequência e memória.

---

# 11. Proposta de mapa de telas da carreira

## 11.1 Navegação global

### Mobile 360 px — retrato

- **Barra superior persistente:** data do jogo, competição/temporada, status de caixa resumido e acesso à pesquisa.
- **Área principal:** conteúdo da tela atual, uma coluna, com cabeçalho que resume o estado.
- **Barra inferior de 5 destinos:** Portal, Clube, Elenco, Jogo, Carreira. Ícone + rótulo textual; área tocável confortável.
- **Botão de avanço temporal:** ação primária persistente, sempre no mesmo local, com rótulo dinâmico (“Avançar”, “Ir para o jogo”, “Resolver pendência”).
- **Centro de Decisões:** acessível pelo Portal e por indicador persistente de pendências; abre como tela própria, não um modal sobre outro modal.
- **Ações contextuais:** bottom sheet de uma camada; se o fluxo for complexo, abrir uma tela completa com título e botão voltar preservando filtros/scroll.

### Desktop até 1.280 px

- Barra superior com data, pesquisa, avanço e atalho para pendências.
- Navegação primária em trilho lateral compacto ou barra superior, com 6 áreas agrupadas.
- Conteúdo com coluna principal e lateral contextual para alertas, calendário e recomendação.
- Tabelas com colunas selecionáveis, filtros, comparação lado a lado e atalhos de teclado.
- O canvas da partida ocupa área central; painéis de decisão não cobrem eventos importantes.

**Regra:** a navegação pode mudar de disposição, mas não de nomenclatura e destino entre mobile e desktop.

## 11.2 Grupos de navegação

| Destino primário | Subáreas | Sistemas cobertos |
|---|---|---|
| **Portal** | Resumo, Inbox, Centro de Decisões, Notícias, Calendário, Últimos resultados | Relatórios e análise (resumo), operações e logística, agenda de todos os sistemas |
| **Clube** | Diretoria, finanças, comercial, torcida, infraestrutura, governança, história | Finanças; patrocínio e comercial; torcida e comunidade; infraestrutura; diretoria e governança; história e identidade |
| **Elenco** | Plantel, jogadores, mercado, observação, base, saúde, treino, comissão | Elenco e mercado; observação; base e bem-estar; treino, saúde e desempenho; comissão e departamentos |
| **Jogo** | Próxima partida, tática, preparação, campo ao vivo, pós-jogo | Partidas; tática; relatórios pós-jogo |
| **Carreira** | Perfil do treinador, reputação, propostas, histórico, objetivos | Carreira do treinador; histórico; governança e progressão |
| **Competições** | Tabela, calendário, regulamento, resultados, estatísticas | Competições; análise competitiva |

Operações/logística aparece contextualmente em Clube e Jogo (viagem, descanso, agenda); não precisa de um item de navegação de primeiro nível no mobile.

## 11.3 Mapa das 17 áreas — três camadas e quantidade de toques

Os toques partem do Portal aberto. O número é uma **meta de arquitetura**, não observação de um concorrente.

| Área / tela | Camada 1 — resumo em uma frase | Camada 2 — três motivos com número | Camada 3 — detalhe completo | Toques desde o Portal |
|---|---|---|---|---:|
| 1. Partidas / Match Center | “Você chega ao jogo com 2 titulares em dúvida e a equipe em boa fase ofensiva.” | Disponibilidade; desempenho recente; risco do adversário. | Escalação, banco, eventos, mapa de ações, estatísticas, replay, comentário textual. | 1–2 |
| 2. Tática | “A equipe entende o bloco médio, mas ainda perde cobertura no corredor direito.” | Efetividade; complexidade; fraqueza detectada. | Formação por fase, funções, instruções coletivas/individuais, comportamento esperado e teste visual. | 1–2 |
| 3. Treino, saúde e desempenho | “A carga está elevada antes de uma sequência de 3 jogos.” | Fadiga; risco físico; preparo para o próximo adversário. | Plano semanal, minutos, lesões, recuperação, forma, carga por atleta, desenvolvimento. | 1–2 |
| 4. Comissão e departamentos | “O departamento médico está no limite de capacidade.” | Capacidade; confiança; entregas pendentes. | Contratos, competências, salários, metas, desempenho e delegação. | 2 |
| 5. Elenco e mercado | “O elenco tem profundidade no meio e falta alternativa de velocidade na ponta.” | Cobertura posicional; custo da folha; idade/contratos. | Jogador, contrato, comparação, transferências, empréstimos, shortlist e negociação. | 1–2 |
| 6. Observação | “Há 3 alvos que atendem à necessidade sem ultrapassar o orçamento.” | Encaixe tático; custo; risco de adaptação. | Rede de scouting, relatórios, partidas observadas, qualidade/amostra e negociação. | 2 |
| 7. Base e bem-estar dos jovens | “Dois jovens precisam de plano de minutos e acompanhamento escolar.” | Evolução; bem-estar; caminho ao profissional. | Potencial estimado, educação, minutos, família, mentor, treino e promoção. | 2 |
| 8. Finanças | “O caixa cobre a temporada, mas a folha reduz a margem para o mercado.” | Caixa projetado; folha; receitas/compromissos. | Fluxo de caixa, DRE/balancete do jogo, dívida, orçamento, contratos e cenários. | 2 |
| 9. Patrocínio e comercial | “A proposta aumenta receita, mas limita exposição de uniforme e ativações.” | Receita; prazo; obrigações. | Ofertas, contratos, ativações, bilheteria, merchandising, parceiros e reputação. | 2 |
| 10. Torcida e comunidade | “A confiança melhorou após 3 jogos sem derrota, mas o preço do ingresso preocupa.” | Confiança; presença; satisfação/comunidade. | Segmentos de torcedores, pesquisas, protestos, ações locais, receita e histórico. | 2 |
| 11. Infraestrutura | “A instalação atual limita recuperação e formação.” | Capacidade; condição; custo de manutenção. | Estádio, campo, CT, academia, base, obras, fases, orçamento e impacto projetado. | 2 |
| 12. Competições | “O clube está a 2 pontos da zona de acesso e tem confronto direto na próxima rodada.” | Pontos; saldo; jogos restantes/confrontos. | Tabelas, regras, calendário, chaveamento, histórico, premiações e cenários calculados. | 1–2 |
| 13. Diretoria e governança | “A diretoria mantém apoio, mas a meta financeira está em risco.” | Confiança; metas; sustentabilidade. | Reuniões, conselho, orçamento, compromissos, objetivos, decisões e histórico de apoio. | 2 |
| 14. Carreira do treinador | “Sua reputação cresceu no desenvolvimento de jovens, mas ainda é baixa fora da liga.” | Reputação; resultados; especialidades. | Licenças, filosofia, atributos, clubes anteriores, ofertas, entrevistas e legado. | 1–2 |
| 15. Operações e logística | “A viagem reduz o período de recuperação antes do próximo jogo.” | Distância/tempo; descanso; custo operacional. | Viagens, hospedagem, agenda, transporte, recuperação, staff e orçamento. | 2–3 |
| 16. História e identidade | “O clube completa 30 anos e a torcida relembra o primeiro acesso.” | Marcos; ídolos; recordes. | Linha do tempo, escudos fictícios, kits, troféus, recordes, lendas, rivalidades e arquivo. | 2 |
| 17. Relatórios e análise | “O time cria chances, mas permite finalizações perigosas em transição.” | Ataque; defesa; comparação temporal. | xG, mapas, redes, radar, zonas, vídeo/representação de eventos, exportação e filtros. | 1–2 |

## 11.4 Regras da arquitetura de três camadas

**Camada 1 — sentença:** uma frase em português simples, ligada ao estado atual do jogo. Evitar adjetivos vagos (“ótimo”, “ruim”) sem contexto.

**Camada 2 — três razões:** sempre que houver números, mostrar unidade, período e comparação. Exemplos: “2 de 4 laterais disponíveis”; “folha = 68% da receita recorrente”; “3 chances claras cedidas em transições nos últimos 2 jogos”. São exemplos de formato, não números da simulação existente.

**Camada 3 — auditoria:** gráficos, tabela, filtros, histórico e dados completos. Deve ser acessível, não um labirinto.

O detalhe deve poder abrir em rota própria, mantendo o estado da tela anterior. O botão voltar não deve apagar filtros, seleção de jogador ou posição de scroll.

---

# 12. Momentos de imersão: coreografia recomendada

| Momento | Apresentação | Informação essencial | Ação do jogador | Duração visual sugerida |
|---|---|---|---|---|
| **Chegada ao estádio** | Breve cartão com nome do estádio, cidade fictícia, competição, horário, clima e estado da torcida; campo aparece gradualmente. | Contexto e importância do jogo. | Ir para escalação ou entrar na partida. | 2–4 s, pulável |
| **Pré-jogo** | Escalações estilo TV, confronto de formações, três chaves táticas e expectativa do público. | Lesões, encaixe, pontos fortes/fracos e plano. | Confirmar XI, conversa, plano. | 5–12 s, pulável |
| **Apito inicial** | Transição curta para campo e placar de transmissão. | Tempo, adversário, competição, estado do jogo. | Assistir ou abrir tática. | 1–2 s |
| **Gol** | Congelar por um instante o overlay, sting de áudio opcional, placar atualizado e nome do marcador. | Minuto, assistência, mudança no placar. | Reprise, continuar ou ver mudança tática. | 2–5 s, pulável |
| **Fim de jogo** | Placar final, reação da torcida, resumo dos três fatos principais e notícia de tabela. | Resultado, desempenho, consequência para competição. | Relatório, conversa, próxima ação. | 5–10 s, pulável |
| **Virada de temporada** | Identidade visual da temporada, retrospectiva e mudança de objetivos. | Posição final, receitas, recordes, contratos e expectativas. | Aprovar plano, orçamento e metas. | 10–20 s, pulável |
| **Título** | Cena editorial de celebração, troféu ilustrado em 2D, torcida e registro no histórico. | Competição, campanha e recordes. | Ver sala de troféus, premiação, próxima temporada. | 8–15 s, pulável |
| **Demissão** | A interface muda para comunicado oficial com contexto do conselho e resumo da carreira no clube. | Motivos documentados, decisão, consequências e próximo caminho. | Aceitar comunicado, revisar histórico, procurar emprego. | 5–12 s, pulável |
| **Proposta de emprego** | Convite com identidade do clube, projeto esportivo e condições. | Orçamento, objetivo, elenco, risco e duração. | Negociar, aceitar ou recusar. | 5–10 s, pulável |

**Princípios para todas as cenas:** pular sempre disponível; sem bloqueio de progresso por animação; reduced motion substitui movimentos por dissolução ou mudança instantânea; áudio opcional; texto e ícones equivalentes; sem efeitos que comprometam o campo ou os dados.

---

# 13. Prioridade: maior sensação premium pelo menor custo

| Prioridade | Entrega | Custo | Motivo |
|---:|---|---|---|
| P0 | Tipografia bem hierarquizada, espaçamento, grid e contrastes validados | Baixo | Melhora imediatamente a percepção de qualidade e legibilidade em todas as telas. |
| P0 | Navegação fixa + Centro de Decisões + Continue previsível | Médio | Resolve fricção estrutural; é mais importante que animação. |
| P0 | Cabeçalho de contexto e três camadas de leitura | Médio | Faz cada área explicar seu estado e permite aprofundar sem sobrecarregar. |
| P0 | Prévia de consequência e rastro causal | Médio–alto | É a assinatura de confiança do produto e conecta UX à simulação. |
| P0 | Persistência de filtros, seleção, scroll e contexto | Médio | Reduz cliques repetidos e frustração em listas grandes. |
| P1 | Grafismos de transmissão em placar, gols, substituições e fim de jogo | Médio | Aumenta imersão nos momentos de maior emoção sem renderização 3D contínua. |
| P1 | Som ambiente com controle granular | Baixo–médio | Dá atmosfera com baixo custo visual, se for opt-in e bem comprimido. |
| P1 | Sprites para torcida, bola, bandeiras e pequenos movimentos | Médio | Cria personalidade em canvas com custo controlável e assets reutilizáveis. |
| P1 | View Transitions pontuais | Baixo–médio | Ajuda a manter continuidade entre listas e fichas; fallback simples. |
| P1 | Histórico, linha do tempo e sala de troféus 2D | Médio | Transforma temporadas em memória e aumenta vínculo com o clube. |
| P2 | CSS 3D em eventos especiais | Médio | Complementa a identidade, mas não resolve problema central de UX. |
| P2 | Partículas, luz dinâmica e fumaça | Médio–alto | Reservar para títulos, gols e grandes momentos; testar bateria e FPS. |
| P2 | Vibration API | Baixo | Só como refinamento facultativo; não é compatível com iOS. |
| P2 | Visualizações avançadas em todos os módulos | Alto | Só depois de validar as perguntas que realmente ajudam o usuário a decidir. |

**Ordem recomendada:** arquitetura e informação → explicabilidade → ritmo → identidade editorial → microinterações → espetáculo. O Modo Clube parecerá premium primeiro quando for rápido, coerente e confiável; depois, quando se mover de forma elegante.

---

# 14. Critérios de validação antes de implementar em escala

## 14.1 Testes de UX

Prototipar 5 fluxos essenciais e testar em 360 px:

1. Abrir o Portal e encontrar a tarefa urgente.
2. Trocar um titular lesionado e entender o custo tático.
3. Comparar dois jogadores e contratar um deles.
4. Entender por que o time perdeu mesmo tendo mais posse.
5. Delegar treino e conferir o que a comissão executou.

**Métricas sugeridas:** número de toques, tempo para concluir, taxa de erro, retorno involuntário, solicitações de ajuda, compreensão da consequência, confiança declarada e proporção de decisões concluídas sem abrir o detalhe completo.

## 14.2 Testes de desempenho

- 60 FPS como alvo de aparelho intermediário/topo e 30 FPS como piso de aparelho modesto, medidos em sessões de 10 minutos e em cenas de pico.
- Registrar frame time p50/p95/p99; não usar só FPS médio.
- Testar DPR nativo versus DPR reduzido para canvas em aparelho modesto.
- Testar a simulação no Worker com UI ativa, e simulação suspensa em background.
- Medir carregamento e memória de sprites e áudio.
- Comparar com e sem sombras, transparências, partículas e CSS 3D.
- Avaliar calor/bateria em sessões repetidas.

Essas são metas/protocolos propostos; ainda não existem resultados de teste do Modo Clube.

## 14.3 Regras para conteúdo gerado

- Toda notícia precisa apontar para um evento ou estado do modelo de simulação.
- Todo número precisa trazer período, unidade e amostra.
- Toda recomendação precisa dizer qual variável tenta otimizar e qual trade-off existe.
- Toda previsão deve indicar incerteza ou faixa, quando aplicável.
- Não usar opinião de torcida/jornalista fictício como explicação causal da partida.
- Mensagem repetida sem mudança de estado não deve reaparecer como nova notícia.
- Guardar memória de temporadas e relações para evitar contradições narrativas.

---

# 15. Recomendações finais

1. **Não copiar o FM26 como modelo de navegação.** Usar o caso como alerta: tiles e cards podem enriquecer contexto, mas não devem fazer o jogador atravessar uma sequência de painéis para realizar decisões comuns. FM27 oferece uma correção importante ao privilegiar menus primários e secundários claros. [S04–S05]
2. **Adotar uma navegação de 5 destinos mobile e 6 grupos conceituais no desktop.** Os 17 sistemas existem como profundidade interna, não como 17 itens de menu.
3. **Fazer do Centro de Decisões a principal inovação de ritmo.** É o elo entre sessão curta, delegação, prazo e avanço da simulação.
4. **Fazer da explicabilidade o diferencial estrutural.** A frase-resumo, os três motivos e o detalhe completo devem aparecer de modo consistente em todas as áreas.
5. **Dar vida ao clube com memória, não com feed infinito.** Notícias e redes sociais fictícias precisam nascer de eventos e manter relação com pessoas, instituições e temporadas.
6. **Tratar matchday como espetáculo seletivo.** Entrada, gol, fim de jogo, título e demissão ganham identidade visual; a gestão cotidiana continua leve.
7. **Usar Canvas 2D e sprites para o campo 2,5D.** Pré-renderizar tudo que não muda; limitar sombras, textos e efeitos; considerar OffscreenCanvas no Worker; testar resolução e DPR. [S48–S49]
8. **Implementar acessibilidade desde o design system.** WCAG 2.2 AA, teclado, foco, contraste, alvo de toque, texto escalável, reduced motion e alternativa textual ao canvas. [S59, S66–S68]
9. **Não afirmar performance sem medir no aparelho-alvo.** O orçamento por quadro é 16,7 ms a 60 FPS e 33,3 ms a 30 FPS; a alocação real precisa vir de perfil de execução.
10. **Construir o produto em camadas.** Primeiro confiança, navegação e decisão; depois personalização e história; por último, espetáculo avançado.

A ambição de “ser o jogo mais completo da categoria” não deve ser interpretada como colocar todos os sistemas na primeira tela. A interface ideal faz o jogador perceber que há um clube inteiro funcionando, mas só exige atenção para o que importa agora.

---

# 16. Fontes

**Data de acesso de todas as fontes:** 17/11/2026. Quando a página não informa uma data editorial estável, a referência é marcada como “s.d.” (sem data explícita) e a data de acesso é mantida.

### Football Manager

- **[S01]** Sports Interactive / Football Manager. *FM27 — Play Now / release status*. Data exibida no site consultado: página atual; a página de lançamento informa lançamento completo em 10/11/2026. https://www.footballmanager.com/fm27
- **[S02]** Sports Interactive. *FM26's Reimagined User Interface*. s.d. (página oficial da edição FM26; consultada em 17/11/2026). https://www.footballmanager.com/fm26/features/fm26s-reimagined-user-interface
- **[S03]** Sports Interactive. *FM26's Reimagined User Interface* — princípios de eficiência, familiaridade, previsibilidade e acessibilidade. s.d. https://www.footballmanager.com/fm26/features/fm26s-reimagined-user-interface
- **[S04]** Sports Interactive. *FM27: Clearer Interface & Smoother Navigation*. 22/09/2026 (anúncio comunitário oficial associado à publicação). https://www.footballmanager.com/fm27/features/fm27-clearer-interface-smoother-navigation
- **[S05]** Sports Interactive. *FM27: A Deeper, More Immersive Football World*. s.d. (página oficial consultada em 17/11/2026). https://www.footballmanager.com/fm27/features/deeper-more-immersive-world
- **[S06]** Sports Interactive Community. *The User Interface — Football Manager 2024*. s.d. https://community.sports-interactive.com/sigames-manual/football-manager-2024/the-user-interface-r4951/
- **[S07]** Sports Interactive Community. *The User Interface — Football Manager 2024 Touch and Console Edition*. s.d. https://community.sports-interactive.com/sigames-manual/football-manager-2024-touch-and-console/the-user-interface-r4972/
- **[S08]** Sports Interactive Community. *Inbox and News — Football Manager 2024 Touch and Console Edition*. s.d. https://community.sports-interactive.com/sigames-manual/football-manager-2024-touch-and-console/inbox-and-news-r4976/
- **[S09]** PC Gamer. *Football Manager 26 launches straight into a relegation battle as Steam reviews plummet to Mostly Negative*. 2025. https://www.pcgamer.com/games/sim/football-manager-26-launches-straight-into-a-relegation-battle-as-steam-reviews-plummet-to-mostly-negative-been-playing-since-1993-and-this-is-the-worst-one/
- **[S10]** The Guardian. *Football Manager 26 review — a modern sim for the modern game*. 04/11/2025. https://www.theguardian.com/games/2025/nov/04/football-manager-26-review-sports-interactive-sega
- **[S11]** Reddit / r/footballmanagergames. *My Thoughts on FM 26 so far after finishing my first season*. 25/10/2025. Relato qualitativo da comunidade; não representativo. https://www.reddit.com/r/footballmanagergames/comments/1ofn8mk
- **[S12]** Steam Community. *Football Manager 26 user reviews*. s.d.; conteúdo dinâmico. Relatos qualitativos da comunidade; não representativos. https://steamcommunity.com/app/3551340/reviews/?browsefilter=toprated&snr=1_5_100010_
- **[S13]** Sports Interactive. *FM27: Training & Tactical Effectiveness*. s.d. (página oficial consultada em 17/11/2026). https://www.footballmanager.com/fm27/features/fm27-training-and-tactical-effectiveness
- **[S14]** Sports Interactive. *FM27: An Elevated Match Day Atmosphere*. s.d. https://www.footballmanager.com/fm27/features/fm27-elevated-match-day-atmosphere
- **[S15]** Sports Interactive. *FM27: 2D Match Engine, In-Game Editor and Deeper World Upgrades*. 16/10/2026 (página regional oficial com data). https://www.footballmanager.com/fm27/features/fm27-2d-match-engine-game-editor-and-deeper-world-upgrades
- **[S16]** Sports Interactive Community. *The Interface — Football Manager 2026 Mobile*. s.d. https://community.sports-interactive.com/sigames-manual/football-manager-mobile-2026/the-interface-r5245/
- **[S17]** Sports Interactive Community. *The Home Screen — Football Manager 2026 Mobile*. s.d. https://community.sports-interactive.com/sigames-manual/football-manager-mobile-2026/the-home-screen-r5246/
- **[S18]** Sports Interactive Community. *Match Day — Football Manager 2026 Mobile*. s.d. https://community.sports-interactive.com/sigames-manual/football-manager-mobile-2026/match-day-r5263/
- **[S19]** Sports Interactive. *FM26 Touch: New Features Revealed*. s.d. https://www.footballmanager.com/fm26/features/fm26-touch-new-features-revealed
- **[S20]** Sports Interactive. *Football Manager 26 Console: New Features Unveiled*. s.d. https://www.footballmanager.com/fm26/features/football-manager-26-console-new-features-unveiled
- **[S21]** Sports Interactive. *FM27 Console: New Features and Returning Favourites*. 2026, página publicada cerca do lançamento; data relativa indicada pelo site. https://footballmanager.sega.com/asia-en/info/details/000248.html
- **[S22]** Sports Interactive Community. *Your Team — Football Manager 2026 Mobile*. s.d. https://community.sports-interactive.com/sigames-manual/football-manager-mobile-2026/your-team-r5248/
- **[S23]** Sports Interactive Community. *Tactics — Football Manager 2026 Mobile*. s.d. https://community.sports-interactive.com/sigames-manual/football-manager-mobile-2026/tactics-r5249/
- **[S24]** Sports Interactive. *FM26 Key Features*. s.d. https://www.footballmanager.com/fm26/features

### Jogos de gestão e referências de jogos

- **[S25]** Hattrick. *Help / Rules — Introduction and manual*. s.d. https://www.hattrick.org/en-us/help/rules/
- **[S26]** Hattrick. *Official website — Manage at your own pace*. s.d. https://www.hattrick.org/en/
- **[S27]** Brasfoot. *Site oficial — Brasfoot 2026*. s.d.; página consultada em 17/11/2026, com alerta de que não existe uma versão oficial chamada Brasfoot 2026. https://www.brasfoot.com/
- **[S28]** Nordeus. *Top Eleven — App Store listing*. Versão atual consultada em 17/11/2026; descrição da temporada 2027. https://apps.apple.com/us/app/top-eleven-be-a-soccer-manager/id459035295
- **[S29]** Invincibles Studio. *Soccer Manager 2026 — Google Play listing*. Atualização exibida: 31/07/2026. https://play.google.com/store/apps/details?id=com.invinciblesstudioltd.soccermanager2025
- **[S30]** Gamebasics. *Online Soccer Manager (OSM) — App Store listing*. Temporada 26/27; consultado em 17/11/2026. https://apps.apple.com/us/app/online-soccer-manager-osm/id400201466
- **[S31]** Five Aces Publishing. *New Star Manager — Google Play listing*. Consultado em 17/11/2026. https://play.google.com/store/apps/details?id=uk.fiveaces.nsfc
- **[S32]** Underground Creative. *Football Chairman — official website*. Página Pro 2 identifica novidades 2026–27. https://www.football-chairman.com/
- **[S33]** Mallat Entertainment. *Club Boss — Google Play listing*. Atualização exibida: 28/08/2026. https://play.google.com/store/apps/details?id=com.GamesbyJoe.ClubBoss
- **[S34]** Playsport Games. *Motorsport Manager — Steam announcements*. Conteúdo dinâmico consultado em 17/11/2026. https://steamcommunity.com/app/415200/announcements/
- **[S35]** Out of the Park Developments. *Out of the Park Baseball — Core Features*. s.d. https://www.ootpdevelopments.com/out-of-the-park-baseball-home/
- **[S36]** Out of the Park Developments. *Franchise Hockey Manager 12 — Steam store page*. 2025 (edição consultada; página dinâmica). https://store.steampowered.com/app/3739670/Franchise_Hockey_Manager_12/
- **[S37]** Portal Games. *Eleven: Football Manager Board Game — Rulebook*. PDF consultado em 17/11/2026. https://cdn.1j1ju.com/medias/a9/1a/de-eleven-football-manager-board-game-rulebook.pdf
- **[S38]** The Verge. *Persona director says making beautiful menus is actually really annoying*. 07/10/2024. https://www.theverge.com/2024/10/7/24262357/persona-metaphor-menu-design
- **[S39]** Supergiant Games. *Job Opportunity: UI Illustrator for Hades II*. 08/12/2022. https://www.supergiantgames.com/blog/job-opportunity-ui-illustrator-for-hades-ii/
- **[S40]** Game Design Lab. *UX, UI & Accessibility: Hades systems*. s.d. (análise secundária, consultada em 17/11/2026). https://teemo.dev/game-design/hades/systems/ux-ui-and-accessibility/
- **[S41]** Game Design Lab. *UX, UI & Accessibility: Balatro systems*. s.d. (análise secundária, consultada em 17/11/2026). https://teemo.dev/game-design/balatro/systems/ux-ui-and-accessibility/
- **[S42]** Game Design Lab. *Controls & Hand-Building Interface: Balatro systems*. s.d. https://teemo.dev/game-design/balatro/systems/controls-and-hand-building-interface/
- **[S43]** Game Developer. *Into the Breach dev on UI design: sacrifice cool ideas for clarity*. 05/03/2018. https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-
- **[S44]** 11 bit studios / Steam Community. *Frostpunk — art and storytelling interview*. s.d. https://steamcommunity.com/app/323190/announcements/?l=brazilian
- **[S45]** Soccer Gaming. *EA SPORTS FC 26: A Critical Review*. 2025. https://soccergaming.com/ea-sports-fc-26-a-critical-review/
- **[S46]** Rede Globo. *Cheio de novidades nas transmissões da Globo, Brasileirão começa neste fim de semana*. 2025. https://redeglobo.globo.com/google/amp/esporte/noticia/cheio-de-novidades-nas-transmissoes-da-globo-brasileirao-comeca-neste-fim-de-semana.ghtml
- **[S47]** Premier League. *Player & Club Statistics, Stats Explained*. s.d. https://www.premierleague.com/en/stats/clarification

### Web APIs, desempenho e acessibilidade

- **[S48]** MDN Web Docs. *Optimizing canvas*. s.d.; versão consultada em 17/11/2026. https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- **[S49]** MDN Web Docs. *OffscreenCanvas*. s.d.; Baseline desde março de 2023, conforme documentação consultada. https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- **[S50]** Chrome for Developers. *Scrollytelling — best practices*. s.d. https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/scrollytelling
- **[S51]** MDN Web Docs. *View Transition API*. s.d.; a interface `ViewTransition` é identificada como Baseline 2025 em documentação correlata. https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- **[S52]** MDN Web Docs. *ViewTransition*. Disponibilidade Baseline indicada desde outubro de 2025. https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition
- **[S53]** Web Platform DX. *Scroll-driven animations — Web Features Explorer*. Suporte Baseline Newly Available em 27/10/2026. https://web-platform-dx.github.io/web-features-explorer/features/scroll-driven-animations/
- **[S54]** Chrome for Developers. *Animate elements on scroll with scroll-driven animations*. Publicado em 2023. https://developer.chrome.com/docs/css-ui/scroll-driven-animations
- **[S55]** MDN Web Docs. *Registering custom properties / `@property`*. s.d.; Baseline 2024 na documentação consultada. https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Properties_and_values_API/Registering_properties
- **[S56]** MDN Web Docs. *Web Audio API best practices*. s.d. https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- **[S57]** MDN Web Docs. *Autoplay guide for media and Web Audio APIs*. s.d. https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- **[S58]** MDN Web Docs. *Vibration API*. s.d.; classificação “Limited availability” consultada em 17/11/2026. https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- **[S59]** MDN Web Docs. *prefers-reduced-motion*. s.d.; Baseline desde janeiro de 2020. https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion
- **[S60]** Opta Analyst. *Everton 2–2 Man Utd Stats — Match Centre*. 06/09/2026. https://theanalyst.com/articles/everton-vs-man-utd-stats-premier-league-09-2026
- **[S61]** SofaScore. *Introducing Sofascore's new Maps*. 26/11/2025. https://www.sofascore.com/news/introducing-sofascores-new-maps-a-smarter-way-to-read-the-game
- **[S62]** FotMob. *Setting you up for the Premier League season*. s.d. https://www.fotmob.com/my/topnews/3949
- **[S63]** FBref. *Scouting Reports Explained*. s.d.; a página consultada indica descontinuação dos relatórios por falta de dados avançados. https://fbref.com/en/about/scouting-reports-explained
- **[S64]** StatsBomb. *Open Data repository*. Repositório consultado em 17/11/2026. https://github.com/statsbomb/open-data
- **[S65]** Opta Analyst. *What Is Expected Goals (xG)?* s.d. https://theanalyst.com/articles/what-is-expected-goals-xg
- **[S66]** W3C. *Web Content Accessibility Guidelines (WCAG) 2.2*. Recomendação de 12/12/2024. https://www.w3.org/TR/2024/REC-WCAG22-20241212/
- **[S67]** W3C. *WCAG 2.2 — 1.4.3 Contrast (Minimum)*. 12/12/2024. https://www.w3.org/TR/WCAG22/#contrast-minimum
- **[S68]** W3C. *WCAG 2.2 — 2.5.8 Target Size (Minimum)*. 12/12/2024. https://www.w3.org/TR/WCAG22/#target-size-minimum

---

**Limitações desta pesquisa:** não foram obtidos benchmarks laboratoriais próprios de performance em celulares modestos; não foi localizado um levantamento representativo de acessibilidade específico para jogos de gestão de futebol; algumas comparações de jogos menores usam descrições oficiais de produto e não auditorias de usabilidade; a análise de NBA 2K MyGM e The Athletic requer captura e verificação direta de versão para sustentar recomendações mais específicas. Esses pontos estão explicitamente marcados para impedir que hipóteses sejam confundidas com fatos.
