# Plano de crescimento: premium, comunidade, conteúdo e monetização

Data: 2026-11-07. Consolida a resposta do GPT ao prompt de redesign (diagnóstico por tela, direção premium, comunidade, retenção, monetização, creators, Oficina de desafios, reputação) com a pesquisa feita aqui e com o estado real do repositório. Substitui a visão de "6 jogos" por **8 jogos** (Craque Misterioso e Conexões entraram no PR #32) e corrige o que o GPT não podia ver.

Legenda: **F** = fato com fonte; **H** = hipótese; **✔** = já existe no repo; **✖** = contraria uma decisão registrada.

## 1. O que a pesquisa adiciona ao plano do GPT

### 1.1 O jogo que o CazéTV jogou é o 7a0 ("Sete a Zero")

- **F** Draft de seleções da Copa (1970 em diante): sorteia seleção e edição, escolhe um craque por posição, simula a Copa; meta é ser campeão invicto e "7 a 0". Viralizou em junho de 2026, na Copa ([O Povo](https://www.opovo.com.br/esportes/futebol/copa-do-mundo/2026/06/08/7-a-0-veja-o-que-e-o-jogo-da-copa-do-mundo-que-tem-viralizado.html), [Diário de Pernambuco](https://www.diariodepernambuco.com.br/esportes-dp/copa-do-mundo/2026/06/11715924-jogo-7-a-0-viraliza-com-a-chance-de-escalar-jogadores-historicos-da-copa-do-mundo-confira.html), [World Soccer Talk](https://worldsoccertalk.com/world-cup/what-is-7a0-sete-a-zero-how-to-play-the-viral-world-cup-browser-game-taking-over-social-media/)).
- **F** Sem cadastro, sem download, sem pagamento ([Folha Vitória](https://www.folhavitoria.com.br/copa-do-mundo/joguei-7-a-0-a-nova-febre-da-copa-do-mundo-na-internet-e-fui-humilhado/)).
- **F** Tem **Desafio Diário** (mesmo baralho para todos, ranking mundial) e **multiplayer em sala** com link de convite, modos "Cup Final" e "Full Cup" de 4/8/16 times, CPU preenchendo vagas, indicador de turno de 20/30/45 s ([7a0.org multiplayer](https://7a0.org/en/7a0-multiplayer), [7a0.com.br como jogar](https://7a0.com.br/de/como-jogar)).
- **F** Engenharia reversa publicada no TabNews conclui: gerador com seed, "jogo de sorte com camada fina de habilidade" ([TabNews](https://www.tabnews.com.br/yagovf/engenharia-reversa-no-7a0-a-matematica-por-tras-do-jogo-que-viralizou-no-brasil)). **Nossa vantagem:** De Cabeça é conhecimento, não sorte. Um draft nosso deve pontuar conhecimento (ver 2.4).
- **F** Clones: 38-0 (Premier League, Monte Carlo com 1.000 simulações, modos Clássico com notas e Expert sem notas, "química" por temporada compartilhada) ([38-0.io](https://www.hunted.space/product/38-0-io), [Khel Now](https://khelnow.com/football/how-play-38-0-football-game-premier-league-team-builder-inspired-82-0-202606)). Versão com só jogadores de Portugal existe ([38-0 Portugal](https://38-0-game.com/38-0-portugal)).

### 1.2 Onda argentina: Copero e El Ídolo (julho de 2026)

- **F** "Copero: convertite en leyenda" e "El Ídolo" (Potrero): simulam a carreira de um jogador por decisões, em menos de 2 minutos, com tela final compartilhável. A imprensa resume a fórmula viral como **futebol + acaso + resultado compartilhável** ([Canal 26](https://www.canal26.com/deportes/2026/07/28/los-minijuegos-de-futbol-gratuitos-que-se-volvieron-tendencia-al-igual-que-copero-de-que-tratan-7-0-y-el-idolo/), [El Litoral](https://www.ellitoral.com/internet-y-tecnologia/juegos-nuevos-simulador-carreras-futbol-potrero-elidolo-copero-auge_0_6NJt6V6ww0.html), [minutouno](https://www.minutouno.com/deportes/el-idolo-el-juego-viral-que-te-permite-crear-tu-carrera-como-futbolista-solo-unos-clics-n6304095)).
- **Leitura:** nosso Modo Carreira já é isso com conhecimento no lugar de acaso. Falta a **tela final de 2 minutos**: resumo da trajetória pronto para compartilhar (a "Imagem do craque" ✔ é o começo; falta a trajetória resumida em texto para WhatsApp e um link que abre o modo).

### 1.3 Wordle: o que de fato gerou o crescimento

- **F** A grade de emojis entrou no jogo depois que uma jogadora digitava o resultado à mão no Twitter; compartilhar **sem spoiler** e **um enigma por dia** (escassez) foram os dois motores ([TechCrunch](https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth), [buildd](https://buildd.co/product/wordle-the-viral-sensation)).
- **F** NYT: dos ~250 mil novos assinantes digitais no 1T2025, ~110 mil vieram de Games; quem usa Notícias e Games cancela na metade da taxa ([Pelcro](https://www.get.pelcro.com/blog/the-new-york-times-delivers-strong-q1-2025-results-as-bundle-strategy-gains-momentum), [inkl](https://www.inkl.com/news/the-news-game-bundle-why-the-new-york-times-q1-2025-performance-is-a-win-for-wall-street)).
- **H** Viralidade sem retenção é faísca ([MoEngage](https://www.moengage.com/blog/wordle-viral-growth-story/)). Vale medir D1/D7 antes de investir em creators.

### 1.4 Cartola: ligas de amigos como padrão brasileiro

- **F** Cartola da Copa 2026: 527 mil times ativos e 2,8 milhões de escalações em 5 semanas ([Lance](https://www.lance.com.br/fora-de-campo/cartola-entra-em-campo-com-fantasy-game-inedito-para-a-copa-do-mundo-de-2026.html)). Limite de 5 ligas por tipo no grátis, 10 no PRO ([Goal](https://www.goal.com/br/listas/como-ganhar-dinheiro-jogando-cartola/blt5b1a5fbf385cebe3)).
- **Leitura:** o brasileiro já sabe o que é "liga de amigos". Não precisamos explicar o conceito, só entregar com um link de WhatsApp.

### 1.5 GeoGuessr: lição sobre conteúdo da comunidade

- **F** Em maio de 2025 os criadores dos mapas mais populares desativaram seus mapas em protesto e a empresa recuou de um evento ([OpenCritic](https://opencritic.com/news/17026/-update-geoguessrs-most-popular-map-creators-have-disabled-their-maps-to-cripple-the-competitive-scene)). Criadores não são pagos; manutenção dos mapas fica com eles.
- **Leitura para a Oficina:** desafios da comunidade devem ser **configurações sobre nossos dados** (o GPT acertou). O criador nunca é dono do gabarito, então não há como "desligar" conteúdo competitivo. Termos de uso precisam dizer isso.

### 1.6 Concorrência direta em PT (sem mudança)

- **F** Renderfoot tem Grid diário em PT com virada à **meia-noite UTC** (21h no Brasil), base "atualizada pelo provedor de dados" ([Renderfoot Grid](https://www.renderfoot.com/pt/games/soccer-grid)). Continua sem Career Path, sem trilhas, sem escalações históricas. Nossa virada em Brasília segue sendo diferença concreta.
- Nenhum concorrente brasileiro encontrado com modos de conhecimento em trilha, comunidade ou creators.

## 2. Correções ao plano do GPT (o que ele não viu)

| Afirmação do GPT | Realidade no repo | Efeito no plano |
|---|---|---|
| Domínio retornou 502 | Domínio ainda **não comprado**; nada no ar | Nenhum diagnóstico ao vivo. Deploy e domínio entram na onda 1 |
| 6 jogos | **8**: Career Path, Grid, Impostor, Linha do Tempo, Mais ou Menos, Escalação, **Craque Misterioso, Conexões** ✔ | Os prints eram anteriores; refazer prints antes de qualquer nova rodada com o GPT |
| Intersticial "opcional" entre sessões | ✖ ADR-012: sem intersticial, sem vídeo, só 3 pausas | Manter ADR-012 |
| Anúncios recompensados | ✖ "nada de vender atalho/vantagem" | Fora |
| Streak | ✖ PRD menciona streak, decisão posterior: sem streak punitivo | Streak só informativo, nunca "você vai perder" |
| Assinatura "Clube De Cabeça" | Fora do MVP (PRODUCT_VISION) | Onda 3, só com demanda medida |
| Navegação fixa cobre conteúdo no mobile | Há `pb-28` (112 px) no contêiner e a barra é `fixed bottom-0` ✔; **falta** `env(safe-area-inset-bottom)` | Item pequeno na onda 1; validar em iPhone com barra inferior |
| Busca confunde homônimos | Busca já mostra **clube · ano de nascimento · posição** e foto em cada opção ✔ | Nada a fazer; manter |
| Barlow Condensed + Inter | Site usa Archivo (variável, eixo condensado) | Manter Archivo; aplicar a regra "condensada só em títulos" |
| Trilha como tabela de 400 números | Trilha pagina de 10 em 10 ✔, mas sem capítulos | Capítulos na onda 1 |
| Ficha/créditos | Ficha ✔, `/creditos` ✔ | Nada |
| Resultado universal | `LevelEnd` em `LevelParts.tsx` já é compartilhado pelos 8 modos ✔ | Só animar estrelas e reordenar |
| Imagem compartilhável | Só no Modo Carreira ✔ | Estender aos resultados de fase (onda 2) |
| Desafio do Dia | PRD original previa daily; hoje tudo é trilha | Volta como **ritual**, por cima das trilhas, não no lugar delas |

## 3. Backlog em três ondas

Critério de ordem: impacto por esforço para time de uma pessoa + agente. Cada item tem tela, mudança, "pronto".

### Onda 1: acabamento e ritual diário (próximas 2–3 semanas)

| # | Tela | Mudança | Pronto quando |
|---|---|---|---|
| 1.1 | Global | Tokens: escala 4 px, 3 superfícies (gramado / papel / figurinha especial), textura de pontos a 3–5 %, borda tracejada só para "vazio" ou "bloqueado" | `index.css` tem os tokens; nenhum card comum com tracejado; os 8 modos usam `ui.tsx` |
| 1.2 | Global | Botão com `scale(0.98)` 100 ms, `--ease-standard`, `--ease-emphasis`; `prefers-reduced-motion` já respeitado | Pressionar qualquer botão primário responde; e2e de movimento reduzido passa |
| 1.3 | Global mobile | `padding-bottom: calc(7rem + env(safe-area-inset-bottom))`; barra com safe area; foco nunca escondido | Teste de usabilidade em 320/360/390 cobre foco atrás da barra |
| 1.4 | Home | Ordem: Desafio do Dia → Continuar de onde parei → 8 jogos (cards sem tracejado, sem número) → Meu progresso → Ranking | Usuário vê ação principal sem rolar no 360 px |
| 1.5 | Trilha | Capítulos de 10 fases; só o atual expandido; estrelas como estrelas, não número; estados bloqueada / nova / jogada distintos | Trilha de 454 fases cabe em 2 telas no celular |
| 1.6 | Resultado | Sequência: tabuleiro estabiliza → resposta → estrelas uma a uma (110 ms) → cartão → ações; melhor pessoal; Compartilhar em destaque | Os 8 modos usam a mesma sequência; derrota com 0 estrelas não parece punição |
| 1.7 | Ranking | Mobile em lista vertical; apelido sem truncar; contexto (período, participantes); estado vazio convida a criar liga | Nenhum apelido cortado em 320 px |
| 1.8 | Como jogar | 8 cartões curtos com miniatura do jogo, 3 passos e "Experimentar fase 1" | Página não excede 1,5 tela por jogo |
| 1.9 | **Desafio do Dia** | Mesma fase para todos, por modo, virada à meia-noite de Brasília, "X % acertaram" com mínimo de 30 jogadas, arquivo de dias anteriores, link `/d/{data}`; **sem streak** | Duas contas recebem a mesma fase; percentual só aparece após 30 jogadas válidas |
| 1.10 | Compartilhar | Texto sem spoiler + link que abre a mesma fase; card de imagem como no Modo Carreira | Link aberto por anônimo cai na fase, sem conta |
| 1.11 | Deploy | Comprar domínio, VM, Google OAuth, Resend, AdSense (ver DEPLOY.md e ADR-012) | Site no ar em decabecafc.com.br |
| 1.12 | Prints | Refazer os 28 prints com os 8 modos e nomes curtos | Pasta nova entregue antes da próxima rodada com o GPT |

### Onda 2: comunidade e progressão (1–2 meses)

| # | Mudança | Pronto quando |
|---|---|---|
| 2.1 | **Ligas de amigos** por link (nome, código, 4–20 pessoas, ranking semanal de estrelas, sair, denunciar; sem chat) | Pessoa cria liga, outra entra pelo WhatsApp e aparece no ranking |
| 2.2 | Perfil público opcional (apelido, título, estatísticas, conquistas; privado por padrão) | Toggle em /conta; URL pública só quando ligado |
| 2.3 | Conquistas: 12–15 permanentes em 3 categorias (progressão, especialidade, experiência), como figurinhas especiais | Cada uma com condição verificável no servidor |
| 2.4 | **Draft de conhecimento** (novo modo): sorteia seleção e Copa como o 7a0, mas cada escolha é um **palpite de conhecimento** (ex.: "quem foi titular nessa posição nessa final?", usa `MatchLineup` ✔); pontua acerto, não sorte; tela final compartilhável | Fase completa em < 2 min; e2e |
| 2.5 | Reações pré-definidas no resultado ("Craque!", "Na trave!", "Que memória!"), uma por pessoa | Reagir e desfazer |
| 2.6 | Temporadas de 4 semanas com tema, ranking que zera e histórico que fica | Troféu permanente no perfil |
| 2.7 | Rodada semanal: 5 desafios, contam os 3 melhores | Ausência não elimina |
| 2.8 | Apelidos: gerador amigável + filtro de ofensas | Nenhum "Shot mobile 760" no ranking |
| 2.9 | Notificações opt-in (PWA): novo desafio, liga fechou rodada | Sem "você está perdendo" |

### Onda 3: ecossistema (3–6 meses, condicionado a D7 e ligas criadas)

| # | Mudança | Condição |
|---|---|---|
| 3.1 | **Creator Mode**: `/criador/{nome}` com sessão, modos escolhidos, link rastreável, ranking da audiência, "criador contra audiência" | 10 criadores pequenos/médios testados antes de qualquer abordagem a CazéTV |
| 3.2 | **Oficina De Cabeça**: criar desafio = configurar um modo existente (Grid, Impostor, Conexões, Draft) sobre nossos dados; prévia jogável; validação automática (reusa `buildSnapshot` ✔ e elegibilidade); aprovação manual no começo | Nenhuma fase publicada sem gabarito validado pelo servidor |
| 3.3 | Curadoria: voto só após tentativa válida; qualidade = Wilson inferior da recomendação + conclusão + repetição + compartilhamento + integridade; listas "Recomendados / Populares / Novos"; reputação do criador separada da qualidade do desafio; denúncia gera revisão, não remoção automática | Estados Draft → Em revisão → Publicado → Destaque → Sob revisão → Arquivado |
| 3.4 | Eventos em dia de jogo (preparados, janela de horas, sem chat) | Calendário editorial a partir de `Match` ✔ |
| 3.5 | Patrocínio de desafios temáticos ("apresentado por"), com selo | Audiência medida |
| 3.6 | Clube De Cabeça (sem anúncios, estatísticas avançadas, cosméticos); nunca vantagem | Demanda medida |
| 3.7 | Fantasy histórico ("monte seu time da Copa de 2002") pontuado por desafios | Depois do Draft 2.4 |

## 4. O que não fazer (confirmado)

Feed social, chat aberto, multiplayer síncrono antes de validar ligas, streak punitivo, vantagem paga, escudos, fotos pessoais obrigatórias, intersticiais, anúncios recompensados, conquistas às centenas, eventos que somem sem histórico, fantasy com dinheiro (exigiria avaliação jurídica).

## 5. Métrica norte e instrumentação

- **Norte:** % de jogadores que compartilham ou convidam alguém após completar um desafio, e quantos chegados por link completam uma fase.
- Já existe `ANALYTICS.md` + eventos; adicionar: `daily_started`, `daily_completed`, `share_clicked` (por modo), `league_created`, `league_joined`, `link_opened` (com origem), D1/D7 por coorte semanal.
- Sem metas numéricas até 2 semanas de baseline (mantém PRODUCT_VISION).

## 6. Próximo passo

Começar a onda 1 pelos itens 1.1–1.3 (tokens, movimento, safe area) em um PR; depois 1.4–1.6 (home, trilha, resultado) em outro; 1.9–1.10 (Desafio do Dia e compartilhar) em um terceiro, com ADR-013. Deploy (1.11) depende do dono.
