# Modo Clube: mercado, olheiros e empresários — realismo e diversão

Data: 2026-11-18. Pedido do dono: oferecer jogador a um clube deve passar pelo empresário, que tem rede de clubes e influência. Antes de construir isso, pesquisar como funcionam no mundo real os processos que já temos, e como os jogos do gênero os equilibram com diversão.

Fontes: duas pesquisas na web, uma sobre o futebol real (Brasil primeiro) e uma sobre jogos (Football Manager 24–26, OOTP Baseball, EA FC, Hattrick, Top Eleven). Os links completos estão nas seções de fontes no fim. "Não verificado" quer dizer que a pesquisa não achou fonte para o dado; trate como hipótese.

## Resumo

- **Empresários.** É o maior buraco do jogo. No Brasil o poder está concentrado em poucas agências grandes, algumas com mais recursos que muitos clubes, e há empresário que chega a financiar clube. Os tetos de comissão da FIFA (3% / 6% / 10%) estão suspensos desde dezembro de 2023, então a comissão é livre na prática. Nos jogos, os agentes são fonte de profundidade e também de raiva: exigências que sobem sem explicação e comissões absurdas.
- **O que já temos está bem calibrado em volume:** valores de mercado, êxodo para o exterior e o tamanho do mercado entre clubes daqui. As regras de calendário e de registro estão desatualizadas: janelas, limites de empréstimo, estrangeiros e solidariedade.
- **O desenho de conhecimento em % está alinhado com o que funciona nos jogos.** Faltam três coisas: mostrar há quanto tempo o jogador foi visto, um viés por olheiro com erro maior em jovens, e um custo para observar.

## Sistema por sistema

### 1. Empresários (não existe no jogo)

**Real**
- Agente precisa de licença FIFA desde outubro de 2023.
- Os tetos de comissão e a regra "quem contrata paga" estão suspensos no mundo inteiro (Circular FIFA 1873). A comissão típica de 5% a 10% é não verificada.
- No Brasil, o regulamento novo da CBF está suspenso por liminar, e voltou a valer o regulamento antigo de intermediários.
- Agências grandes concentram atletas da Série A (Bertolucci, Cury, Fred Pena, Carlos Leite). Há agência com acordo com vários clubes, mas esse dado é não verificado.
- Empresário também é credor de clube: o Vasco devia R$ 10 mi a Bertolucci.
- Que o empresário oferece o jogador a vários clubes, empurra a ida para o exterior e negocia a volta é prática conhecida, mas não verificada em documento.

**Jogos**
- Football Manager:
  - o técnico pergunta ao agente sobre o mercado, escolhendo um tom;
  - o clube contrata intermediário para vender;
  - o agente lista exigências e o técnico contesta uma por uma;
  - passar por cima do agente tem custo no vestiário.
- Queixas da comunidade:
  - exigência que sobe cerca de 40% por qualquer contraproposta (bug no FM24);
  - comissão de 10 mi sobre um jogador de 15 mi;
  - caixa de entrada lotada.

**Proposta**
- **Empresários com traços:**
  - Um conjunto fixo de empresários. Cada jogador tem um.
  - Poucas agências grandes concentram os melhores jogadores, e muitos agentes pequenos ficam com o resto.
  - Três traços por empresário: ganância (comissão de 5% a 15%), paciência (rodadas até endurecer) e influência (tamanho da rede).
  - Os traços aparecem aos poucos, conforme o clube negocia com ele, com a mesma mecânica do % de conhecimento.
- **Rede de clubes:**
  - Cada empresário tem afinidade com alguns clubes daqui e com destinos no exterior.
  - O êxodo, as voltas e as ofertas passam preferencialmente pela rede. Isso explica por que um jogador vai para um clube e não para outro.
  - A afinidade sobe com negócios fechados e cai com negociações rompidas.
- **Empresário oferece jogador:**
  - É o canal da volta do exterior (refaz o PR #123), de jogadores sem clube e de jogadores que o empresário quer mudar de clube.
  - No máximo 1 ou 2 ofertas por semana, filtradas pelo que o seu elenco precisa, num resumo semanal na caixa de entrada.
- **Negociação previsível:**
  - A exigência sobe no máximo 3% a 5% por rodada e só depois que a paciência acaba, sempre com o motivo dito.
  - A comissão tem teto: 10% a 15% da taxa, ou alguns meses de salário quando o jogador vem sem clube.
- **Custo:** a comissão sai do caixa e aparece no relatório do negócio.

### 2. Volta do exterior (#120 na main; #123 em espera)

**Real**
- Volume grande: 745 brasileiros voltaram contra 635 que saíram de janeiro a julho. O ano da reportagem não foi confirmado, e a conta inclui todos os níveis.
- Quase sempre a volta é de graça, por contrato terminado ou rescindido, ou por empréstimo com salário dividido. Coutinho voltou assim ao Vasco.
- Os motivos são família ou clube de coração, seleção e aceitar ganhar menos.
- Exemplos: Hulk, Oscar, Thiago Silva e Coutinho.

**Hoje no jogo:** cerca de 30 por temporada, sempre de graça e indo para o clube de maior reputação que precisa dele.

**Proposta**
- A volta passa pelo empresário, que oferece o jogador aos clubes da rede dele, incluindo o seu se houver afinidade. Peso extra para o clube onde ele foi formado ou é ídolo.
- O jogador aceita salário menor, entre 30% e 60% do que ganhava fora, um número a calibrar.
- Uma parte das voltas é por empréstimo com salário dividido.

### 3. Olheiros e conhecimento (#115 e #121 na main)

**Real**
- O departamento de mercado filtra os nomes e o diretor decide.
- As ferramentas são Wyscout e outras plataformas de vídeo e dados.
- As equipes são pequenas: o Flamengo tinha 1 chefe de olheiros e 5 analistas em 2024.

**Jogos**
- No FM, o conhecimento por região decide quem aparece na busca.
- No OOTP:
  - a precisão vem do diretor de olheiros e do orçamento;
  - o erro é maior em jovens e estrangeiros;
  - há viés aleatório por jogador, o que cria joias escondidas;
  - uma agência da liga dá uma segunda opinião genérica, uma vez por ano.
- Queixa recorrente: conhecimento que zera ou some sem explicação.

**Hoje no jogo:**
- O conhecimento vai de 0 a 100% e tem piso de 25% para jogadores visíveis.
- Sobe com relatórios e partidas, e cai 1 ponto a cada 10 dias até o piso.
- Viagens de olheiro e relatórios de um jogador são de graça.

**Proposta**
- Mostrar "visto há X meses" junto do %.
- A queda atual é de cerca de 3 pontos por mês. Desacelerar para 1 a 2 pontos por mês, alinhado com a lição dos jogos.
- Viés por olheiro e erro maior em jovens, para criar joias e furadas plausíveis.
- Custo das viagens (diárias), maior para estados distantes. Dá peso à escolha.

### 4. Mercado entre clubes da IA (#117 na main)

**Real**
- Há só cerca de 8 semanas de janela em cada metade do ano.
- O Brasil foi o país com mais transferências internacionais em 2024.
- A participação das transferências entre clubes daqui no total é não verificada.

**Jogos**
- Clubes de IA que mandam uma oferta baixa e somem depois de recusada irritam.
- O FM26 pesa o fair play financeiro, inclui cláusulas de revenda e permite publicar uma "carência" (posição, idade, teto) para receber nomes.

**Proposta**
- Um clube de IA recusado volta uma vez com proposta melhor.
- Mais tarde, publicar carência no estilo TransferRoom: você diz posição, idade e teto, e empresários e clubes respondem.

### 5. Regras e calendário (desatualizados)

**Janelas.** O jogo usa janeiro a abril e julho.

| Janela 2026 (CBF) | Período |
|---|---|
| 1ª | 5/1 a 3/3 |
| Doméstica, depois dos estaduais | 4/3 a 27/3 |
| 2ª | 20/7 a 11/9 |

Proposta: seguir o calendário da CBF.

**Jogador sem clube.** Pode ser registrado fora da janela se o contrato terminou antes do fim dela. O jogo já permite.

**Empréstimos (FIFA).**
- Até 6 emprestados e 6 recebidos ao mesmo tempo.
- Até 3 por temporada entre os mesmos dois clubes.
- Jogadores formados no clube, até 21 anos, ficam fora do teto.
- O jogo não tem nenhum desses limites.

**Estrangeiros.** Até 9 por jogo, 8 em 2027, caindo até 5 em 2030. Só passa a importar quando houver clubes estrangeiros.

**Solidariedade e formação.**
- Até 5% de cada venda para o exterior vai aos clubes formadores (dos 12 aos 23 anos).
- Nas vendas internas são 6%.
- O jogo não tem. Proposta: pagar ao clube formador, o que dá valor à base.

**Multa rescisória.**
- O teto nacional é 2.000 vezes o salário médio, e não há teto internacional (Lei Pelé de 2011). Não está confirmado se a Lei Geral do Esporte de 2023 manteve o teto.
- O jogo usa 3 vezes o valor de mercado.
- Proposta: multa nacional limitada pelo salário e multa internacional maior, o que explica por que só clubes de fora pagam multas grandes.

### 6. Êxodo para o exterior (na main)

**Real (2025, Banco Central):**
- US$ 554 mi em vendas para o exterior e US$ 235 mi em compras.
- Os destinos com mais jogadores são Portugal (182), Japão e Coreia do Sul.

**Hoje no jogo:** cerca de R$ 2,8 bi por temporada (perto de US$ 500 mi), o que bate com o real. Os destinos são faixas virtuais: elite europeia, Europa, Golfo, Ásia e EUA, e "Exterior".

**Proposta**
- Separar Portugal como destino próprio, porque é o principal em número de jogadores.
- O êxodo passa pela rede do empresário.

### 7. Caixa de entrada

**Jogos.** Excesso de mensagens é queixa crônica, e o FM empurrou a solução para filtros configuráveis.

**Proposta**
- Por padrão, a caixa mostra só o que exige decisão.
- Ofertas de empresários e relatórios de olheiro vão para um resumo semanal agrupado.
- O resto vai para um feed.

## Prioridades sugeridas

1. **Empresários:** traços, rede de clubes, comissão com teto e ofertas pela rede. Isso inclui refazer a volta do exterior (PR #123) para passar pelo empresário. É a base de vários itens abaixo.
2. **Calendário e regras:** janelas da CBF, limites de empréstimo, solidariedade e multa nacional e internacional. São baratos e muito realistas.
3. **Olheiros:**
   - mostrar "visto há X meses" e desacelerar a queda;
   - viés por olheiro e erro maior em jovens;
   - custo das viagens.
4. **Negociação e IA:** endurecimento limitado e explicado; um clube recusado volta uma vez.
5. **Caixa de entrada:** resumo semanal e só o que exige decisão.
6. **Publicar carência (TransferRoom):** depois dos empresários.
7. **Testes de exploração em massa:** revenda imediata com lucro, empréstimo seguido de compra barata e oferta absurda aceita. Rodar antes do lançamento.

## Fontes

Futebol real:
- FIFA, agentes (FAQ): https://inside.fifa.com/legal/football-regulatory/agents/faq-agents
- Suspensão dos tetos (Circular 1873): https://lewissilkin.com/en/insights/the-new-football-agent-regulations-where-are-we-now
- Liminar contra o regulamento de agentes da CBF: https://www.migalhas.com.br/quentes/400065/juiz-impede-cbf-de-aplicar-regras-para-agentes-de-futebol-no-brasil
- Empresários no futebol brasileiro: https://www.tupi.fm/esportes/os-empresarios-estao-moldando-carreiras-no-futebol-brasileiro/
- Dívida do Vasco com Bertolucci: https://www.netvasco.com.br/n/368635/vasco-deve-r-10-milhoes-a-giuliano-bertolucci-empresario-de-philippe-coutinho
- Proibição da TPO: https://www.migalhas.com.br/depeso/216919/o-fim-dos-investidores-no-futebol---reflexos-juridicos-e-mercadologicos
- Mecanismo de solidariedade: https://maquinadoesporte.com.br/analise/mecanismo-de-solidariedade-o-que-e-e-quando-se-aplica/
- Janelas de 2026: https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/veja-todas-as-datas-do-novo-calendario-do-futebol-brasileiro-em-2026/
- Janela doméstica complementar: https://descomplica.com.br/blog/janela-extra-ate-27-3-quem-vai-chegar-no-seu-time-2/
- Regras de empréstimo da FIFA: https://inside.fifa.com/en/news/fifa-to-introduce-new-loan-regulations
- Limite de estrangeiros: https://www.lance.com.br/lancepedia/limite-de-estrangeiros-no-brasileirao.html
- Redução gradual de estrangeiros: https://sbtnews.sbt.com.br/noticia/brasil/cbf-aprova-reducao-gradual-de-estrangeiros-no-brasileirao
- Lei 12.395/2011 (cláusula indenizatória): https://legis.senado.leg.br/norma/585392/publicacao/15760470
- Lei 14.597/2023, art. 86: https://www.admdireito.com.br/legislacao/art/lei_00145972023-86
- Departamento de scout do Vasco: https://www.netvasco.com.br/n/361338/daniel-de-brito-fala-sobre-o-trabalho-do-departamento-de-scout-do-vasco
- Palmeiras e Wyscout: https://www.hudl.com/blog/palmeiras-hudl-pt
- Repatriados contra vendidos: https://www.lance.com.br/futebol-nacional/brasil-repatriou-mais-que-vendeu-mas-jovens-saem-cada-vez-mais-cedo.html
- Coutinho no Vasco: https://www.lance.com.br/lance-negocios/financas/qual-o-impacto-de-philippe-coutinho-nas-financas-do-vasco.html
- Transferências internacionais em 2024 (FIFA): https://inside.fifa.com/en/news/international-transfers-reach-historic-high-in-2024
- Números de 2025: https://tnh1.com.br/noticia/nid/o-que-o-futebol-brasileiro-representa-no-mundo-hoje-os-numeros-de-uma-potencia-em-transformacao/

Jogos:
- FM24, intermediários e venda de jogadores: https://www.footballmanager.com/features/introducing-intermediaries-and-offloading-players
- FM24, novo mercado e finanças: https://www.fmscout.com/a-fm24-new-transfer-and-finance-systems.html
- FM26, recrutamento com TransferRoom: https://footballmanager.com/fm26/features/powered-transferroom-fm26s-recruitment-revamp
- FM24, bug do agente que pede cerca de 40% a mais: https://community.sports-interactive.com/bugtracker/football-manager-2024-early-access-bugs-tracker/transfers-scouting-contracts-and-agentsintermediaries/agent-demanding-~40-more-money-on-wages-bonuses-due-to-one-suggested-change-r22144
- Comissões de agente: https://www.fmscout.com/q-2362-Agent-Fees.html
- Caixa de entrada lotada: https://steamcommunity.com/app/872790/discussions/0/3647273545685361167
- Scouting no OOTP: https://baseballreplayjournal.substack.com/p/scouting-in-ootp
- Scouting no EA FC: https://ea.com/games/fifa/fifa-23/news/fifa-23-scounting-the-right-player
- Leilão no Hattrick: https://en-us.hattrick.org/Help/Rules/Transfers.aspx
