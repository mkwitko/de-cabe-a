# Prompt de pesquisa para o GPT: design imersivo da carreira do Modo Clube

Data: 2026-11-17. Cole o bloco abaixo numa pesquisa profunda do GPT. Salve a resposta em
`docs/pesquisa/modo-clube/19-design-imersivo-pesquisa-gpt.md` e indique a fonte de cada fato.

---

Você é pesquisador de design de jogos e de interface. Preciso de uma pesquisa profunda, com fontes, para desenhar a interface da carreira de um jogo de gestão de futebol no navegador. O objetivo é ser o jogo mais completo da categoria e ter o melhor design dela.

## O produto

- Jogo: "Modo Clube", dentro do site De Cabeça F.C. (minijogos de futebol em português do Brasil).
- Gênero: carreira de treinador e dirigente, como Football Manager, Brasfoot, Hattrick, Top Eleven, Soccer Manager, OSM, Club Boss, New Star Manager, Football Chairman e Championship Manager.
- Plataforma: web responsiva. O primeiro alvo é o celular em retrato com 360 px de largura; no desktop, a largura máxima é 1.280 px. Usa toque, mouse e teclado.
- Simulação: roda no navegador da pessoa, num Web Worker. A partida é um campo 2,5D desenhado em canvas, com câmera de transmissão.
- Identidade atual: um palco noturno de estádio. Fundo verde muito escuro, dourado como cor de destaque e tipografia Archivo condensada em caixa alta. Os escudos são círculos nas cores do clube com as iniciais, nunca logotipos.
- Restrições:
  - Desempenho vem antes de efeito: 60 quadros por segundo, com 30 como mínimo em celular modesto.
  - Sem WebGL pesado. CSS 3D leve é permitido.
  - Respeitar `prefers-reduced-motion`.
  - Acessibilidade WCAG AA.
  - Todo texto vem de chave de tradução (pt-BR, en, es).
  - Os clubes e jogadores são fictícios.
- Sistemas previstos (17): partidas; tática; treino, saúde e desempenho; comissão e departamentos; elenco e mercado; observação; base e bem-estar dos jovens; finanças; patrocínio e comercial; torcida e comunidade; infraestrutura; competições; diretoria e governança; carreira do treinador; operações e logística; história e identidade; relatórios e análise.
- Regra de produto: toda decisão muda uma variável da simulação, e o jogo explica com fatos o que aconteceu. A leitura tem três camadas: resumo em uma frase, os três motivos principais com número, e o detalhe completo só para quem abrir.

## O que pesquisar

1. **Football Manager 2024, 26 e 27, a fundo.**
   - Portal (antiga tela inicial e caixa de entrada) e o botão Continuar.
   - Navegação superior e calendário.
   - Telas de elenco, tática, treino, mercado, observação, finanças, diretoria e base.
   - Dia de jogo: pré-jogo, preleção, durante a partida e pós-jogo.
   - Uso das cores do clube.
   - O que a crítica e os jogadores elogiaram e reclamaram na mudança da FM26 (excesso de painéis, cliques demais, perda da visão compacta).
   - A versão Touch e a versão de console: o que muda com pouco espaço.
2. **Outros jogos de gestão:** Brasfoot, Hattrick, Top Eleven, Soccer Manager 2025/26, OSM, New Star Manager, Football Chairman, Club Boss, Motorsport Manager, Out of the Park Baseball, Franchise Hockey Manager, Eleven Football Manager. Para cada um, diga o que fazem melhor que o FM na interface, na sensação de imersão e no ritmo da sessão.
3. **Jogos fora do gênero com imersão de interface:** Persona 5 (menus como identidade), Hades, Balatro, Slay the Spire, Into the Breach, Frostpunk, Two Point, Football Manager Mobile, e os gráficos de transmissão da EA FC, da NBA 2K MyGM e da Premier League ou Globo. Diga como criam sensação de "estar lá" com pouco custo de processamento.
4. **Imersão barata e premium na web:**
   - CSS 3D, View Transitions API, scroll-driven animations, `@property`, canvas 2D e sprites.
   - Som de estádio e trilha de menu.
   - Microinterações de toque e vibração (Vibration API).
   - Para cada técnica: custo medido em celular modesto, sites ou jogos que usam bem, e armadilhas.
5. **Narrativa emergente e mundo vivo:** caixa de entrada, imprensa, torcida, redes sociais fictícias, rivalidades, ídolos, aniversários de título, linha do tempo da carreira e sala de troféus. O que faz a pessoa sentir que o clube tem história.
6. **Ritmo e retenção de sessão curta (2 a 10 minutos no celular):** como reduzir cliques entre rodadas sem perder profundidade. Delegação à comissão, resumo do dia e decisões por prazo (o "Centro de Decisões").
7. **Visualização de dados de futebol para leigos e para especialistas:** mapas de calor, redes de passe, xG, radar de atributos, barras de forma, comparação de jogadores e tabela com zonas de acesso e rebaixamento. Exemplos bons, com link: The Athletic, FBref, Opta Analyst, StatsBomb, SofaScore e FotMob.
8. **Erros a evitar:** interfaces de gestão criticadas por parecer planilha ou painel administrativo, ou por esconder informação. Dados de acessibilidade em jogos de gestão.

## Formato da resposta

- Uma seção por item acima, cada fato com link da fonte e data. Separe FATO (com fonte) de OPINIÃO (sua).
- Uma tabela de referências visuais: jogo ou site, tela, o que copiar como ideia (nunca o visual literal), link de imagem ou vídeo.
- Pelo menos 20 ideias novas para o nosso jogo que nenhum concorrente faz, cada uma com o problema que resolve, o custo estimado (baixo, médio ou alto) e o risco de desempenho.
- A proposta de mapa de telas da carreira, do celular ao desktop:
  - quais telas existem, o que cada uma mostra nas três camadas de leitura e quantos toques separam cada decisão da tela inicial;
  - os momentos de imersão: chegada ao estádio, pré-jogo, gol, fim de jogo, virada de temporada, título, demissão e proposta.
- Uma lista priorizada: o que dá mais sensação de jogo premium pelo menor custo.
- Não invente números. Quando não houver fonte, diga que não há.
