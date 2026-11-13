# Modo Clube — visão e especificação de produto

Data: 2026-11-13, revisão 3 (duas revisões do dono no mesmo dia). Status: Fase 0, aguardando aprovação. Substitui `docs/superpowers/specs/2026-11-12-modo-clube-design.md` onde houver conflito (§11).

Legenda usada em todos os documentos desta pasta: **FATO** (código, documento ou fonte citada), **HIPÓTESE** (precisa de teste), **DECISÃO** (escolha de desenho), **PARÂMETRO** (número provisório, muda com calibragem), **NÃO PESQUISADO** (falta fonte).

## 1. O que é

A pessoa é técnico e dirigente do mesmo clube e o conduz por temporadas: organiza o departamento de futebol, monta elenco, define como o time joga, treina, intervém na partida, forma jogadores, negocia, constrói.

A promessa central: **tudo o que a pessoa decide altera uma variável que a simulação usa, e o jogo conta com fatos o que aconteceu.** Nenhuma instrução é só visual. Explicar não é garantir: o time pior pode ganhar (§8).

### 1.1 Dois modos de início (`CareerStartMode`)

- **`free_choice`, escolha livre**: qualquer clube das divisões nacionais do pacote. O clube começa com elenco, comissão, finanças, estrutura, torcida e reputação do pacote.
- **`job_offers`, começar por baixo**: três propostas de clubes da última divisão nacional do pacote, escolhidas para serem desafios diferentes entre si (um sem dinheiro e com torcida, um estruturado e sem elenco, um ambicioso e endividado, por exemplo). As propostas dependem da reputação e da experiência do treinador; na primeira carreira ele não tem nenhuma.

Os dois modos usam as mesmas regras depois do início. Demitido em qualquer modo, o treinador recebe propostas compatíveis com a reputação.

## 2. Cadeia causal (teste de coerência dos sistemas de jogo)

Identidade e filosofia → diretoria e comissão → planejamento e orçamento → contratações e formação → modelo de jogo → treinamento → execução tática → partidas → moral e resultados → torcida e reputação → receitas → infraestrutura → observação e base → desenvolvimento → vendas e história → sustentabilidade financeira → volta ao começo. Os rivais percorrem a mesma cadeia.

A comissão é o que liga os elos: o preparador transforma agenda de treino em forma física, o analista transforma jogo em relatório, o olheiro transforma viagem em informação, o médico transforma lesão em prazo, o diretor comercial transforma torcida em contrato.

Regra: um **sistema de jogo** só entra se liga pelo menos dois elos. A regra não vale para acessibilidade, configurações, tradução e melhorias de interface.

## 3. Para quem e em que formato

- Uma aplicação só, responsiva: celular primeiro, desktop com o mesmo código e mais informação por tela. Toque, mouse e teclado (FATO: `docs/QUALITY_GATES.md` já exige teclado e 360 px).
- Sessão de 2 a 10 minutos no celular; a unidade de sessão é **um dia de jogo** (preparar, jogar, ler o resultado). Partida assistida dura 3 a 6 minutos reais com aceleração; partida rápida, menos de 30 segundos. "Avançar até a próxima decisão" pula dias sem pendência.
- **Idiomas**: arquitetura pronta para `pt-BR`, `en` e `es`; só `pt-BR` é escrito agora. Todo texto de interface, de narração e de carta sai de chave de tradução; datas, moeda, número e plural pelo `Intl` do navegador (FATO: o site já usa `Intl` em quatro telas e não tem biblioteca de tradução). Nomes de clubes, jogadores e competições são dado do pacote, não tradução. Detalhe em ADR-017.
- Sem IA generativa em tempo de execução: narração e histórias por modelos de frase sobre fatos gravados.

## 4. Dinheiro de verdade

FATO: o site já tem assinatura, loja de cosméticos e presente (`ClubePage`, `Purchase`, `GiftCode`, `CosmeticChoice`) e anúncio discreto (ADR-012).

DECISÃO: o Modo Clube vende pelo mesmo caixa, só o que não muda força:

| Pode vender | Nunca vende |
|---|---|
| Remoção de anúncios (já é benefício da assinatura) | Atributo, moeda do jogo, jogador |
| Aparência: uniformes alternativos, escudo personalizado, temas de estádio e de interface, comemorações, pacotes de narração e de torcida | Relatório de olheiro privilegiado, treino mais rápido |
| Aparência do treinador | Resultado, replay de partida perdida |
| Vagas extras de carreira simultânea | Qualquer atalho de tempo |
| Cenários opcionais (começar com clube em crise, desafio histórico) | Dificuldade menor |
| Editor de clube e de competição para carreiras próprias, sem ranking | |

A venda não é construída nesta fase. A arquitetura só precisa de: itens de aparência como dado, limite de carreiras por conta e cenário como arquivo. Nada disso tranca o jogo grátis. Referências de mercado: `docs/pesquisa/modo-clube/07-regras-financeiras-e-receitas.md` §6.

Estrelas dos outros jogos do site dão vantagem pequena, opcional e com teto diário (`04-CLUBE-E-MUNDO.md` §11). Conhecimento ajuda, nunca tranca.

## 5. Escopo: o que existe no modelo e o que entra em cada etapa

O modelo de competição, de clube e de calendário é geral desde o início (ADR-016). O conteúdo entra por etapas, porque cada etapa depende de dado.

| Etapa | Competições | Dado necessário |
|---|---|---|
| Jogável 1 | Séries A, B, C e D no formato oficial da temporada do pacote | elencos reais das quatro divisões |
| Jogável 2 | Copa do Brasil e Supercopa | nada além da etapa 1 (os clubes já existem) |
| Jogável 3 | Estaduais e copas regionais (Nordeste, Verde, Sul-Sudeste) | clubes e elencos que só disputam estadual; divisões estaduais de acesso |
| Jogável 4 | Libertadores, Sul-Americana, Recopa | clubes e elencos sul-americanos |
| Depois | Europa | pacote europeu |

**Jogadores reais nas quatro divisões** (decisão do dono): o pacote público traz jogadores reais nas Séries A, B, C e D. Elenco real incompleto não é completado em silêncio com jogador inventado; o pacote só é publicado quando passa no critério de cobertura (`03-JOGADORES-E-BASE.md` §1.6). O pacote de desenvolvimento continua fictício.

**Número de clubes** é o que o regulamento da temporada do pacote disser (FATO: em 2026 as quatro divisões nacionais somam 156 clubes, 96 deles na Série D, que se joga em grupos e mata-mata; Série C com 24 clubes em 2027; formato da Série D de 2027 ainda não publicado; ver `docs/pesquisa/modo-clube/05-competicoes-e-calendario.md`). Nada no código assume 80 clubes, 20 por divisão ou 38 rodadas.

Fora de qualquer etapa por enquanto: multijogador, mercado entre usuários, 3D, narração por IA. O Modo Carreira de jogador (`docs/GAME_DESIGN/CAREER_MODE.md`, `apps/api/src/modules/career`) não é tocado.

## 6. Os 17 sistemas

Cada linha: o que a pessoa decide, o que isso causa, do que depende, onde está especificado.

| # | Sistema | Decisões | Consequência principal | Depende de | Documento |
|---|---|---|---|---|---|
| 1 | Partidas | assistir, pausar, instruir, substituir, gritar | resultado, fadiga, moral, lesão | 2, 3, 5 | `02` |
| 2 | Tática | formação por fase, instruções, funções, marcação, bola parada, modelo de jogo | como o time se comporta e o que cobra do elenco | 5, 3 | `02` §8 |
| 3 | Treinamento, saúde e desempenho | agenda da semana, foco individual, carga, retorno de lesionado, preparação por modelo de jogo | atributos, familiaridade, forma, disponibilidade | 4, 11 | `03` §5, `08` |
| 4 | Comissão e departamentos | contratar, demitir, atribuir função, acumular, terceirizar | qualidade de treino, saúde, análise, observação, comercial | 8, 13 | `06` |
| 5 | Elenco e mercado | contratar, vender, renovar, emprestar, inscrever, negociar com agentes, firmar parcerias | força, folha, idade do elenco, rede de clubes | 6, 8, 12 | `07` |
| 6 | Observação profissional | onde procurar, quem acompanhar, que perfil | informação sobre jogadores e adversários | 4 | `03` §7.4, `06` §4 |
| 7 | Base e bem-estar dos jovens | escolinhas, convênios, categorias, promoção, escola, alojamento, metodologia | jogadores formados, permanência, receita de formação, identidade | 4, 6, 11 | `03` §7, `08` §7 |
| 8 | Finanças | orçamento, dívida, prazos, cortes | o que cabe fazer; crise ou folga | 9, 10, 12, 13 | `04` §4 |
| 9 | Patrocínio e comercial | cotas, prazos, metas, produtos, licenças | receita recorrente | 10, 12, 4 | `04` §5 |
| 10 | Torcida e comunidade | preço, campanhas, resposta a pressão | público, sócios, mando, paciência | 1, 16 | `04` §7 |
| 11 | Infraestrutura | obras de estádio, centro de treino, base, médico | tetos de treino, capacidade, saúde, receita | 8 | `04` §6 |
| 12 | Competições | inscrição, prioridade entre torneios, rodízio | calendário, premiação, desgaste | 5 | `05` |
| 13 | Diretoria, governança e licenciamento | negociar metas, pedir verba, lidar com dono ou conselho, cumprir requisitos de participação | orçamento, autonomia, emprego, direito de disputar | 8, 14 | `06` §2.7, §5 |
| 14 | Carreira do treinador | aceitar proposta, licenças, reputação, estilo | que clubes o querem; o que a comissão o segue | 13 | `06` §6 |
| 15 | Operações e logística | viagem e roteiro, pré-temporada, amistosos, onde mandar os jogos, nível de operação do estádio | frescor, custo, receita de jogo, punições | 8, 12 | `05` §6, `04` §6.1–6.2 |
| 16 | História e identidade | rumo da escola do clube, aposentar camisa, ídolos, escudo e uniforme, rivalidades | apego, torcida, crônica, quem o clube atrai | 1, 2, 7 | `04` §2.1, §9.4 |
| 17 | Relatórios e análise | o que pedir ao analista, que adversário estudar | leitura de jogo, preparação, explicação | 4, 1 | `02` §11, `06` §4 |

Cortados na revisão 4 (sem tarefa em nenhum corte): imprensa como sistema (`04` §9.5) e memória tática como sistema autônomo (`02` §8.7). Sistemas previstos no modelo e fora dos cortes iniciais: futebol feminino (`08` §8), observação e mercado internacionais (`07` §9), rede de clubes do mesmo dono (`06` §5.1), base histórica de clubes e pessoas.

### 6.0 O que está ativo no corte 1

Os 17 sistemas existem no **modelo**. No corte 1 (`ROADMAP.md` §2) cada um está em um de três estados. Esta tabela é a referência quando outro documento parecer dizer o contrário.

| # | Sistema | Estado no corte 1 | O que existe |
| --- | --- | --- | --- |
| 1 | Partidas | ativo | assistir, pausar, substituir, instrução de time; pular |
| 2 | Tática | ativo, raso | duas formações por fase, cerca de doze instruções de time, funções padrão |
| 3 | Treinamento, saúde e desempenho | mecânica de mundo | evolução por idade e minutos; fôlego, lesão simples e frescor (`08` §9); sem agenda de treino |
| 4 | Comissão e departamentos | parâmetro fixo | nível por departamento vindo do pacote (`06` §2.8) |
| 5 | Elenco e mercado | ativo, raso | comprar, vender, renovar, inscrever; uma rodada de oferta por janela |
| 6 | Observação profissional | inativo | todo jogador visível com faixa de incerteza fixa pelo nível do departamento |
| 7 | Base e bem-estar | mecânica de mundo | safra anual gerada, sem decisão (`03` §7) |
| 8 | Finanças | ativo, raso | livro-caixa, seis linhas de receita, cinco de despesa |
| 9 | Patrocínio e comercial | parâmetro fixo | um contrato fixo por clube |
| 10 | Torcida e comunidade | mecânica de mundo | público por jogo e efeito de mando; sem decisão |
| 11 | Infraestrutura | parâmetro fixo | capacidade e níveis do pacote; sem obra |
| 12 | Competições | ativo | quatro divisões nacionais, acesso e descenso |
| 13 | Diretoria e governança | ativo, raso | meta, confiança da direção, demissão |
| 14 | Carreira do treinador | ativo, raso | dois modos de início; propostas depois de demissão |
| 15 | Operações e logística | inativo | viagem sem custo de frescor além do descanso entre jogos |
| 16 | História e identidade | inativo | só o registro de resultados e títulos |
| 17 | Relatórios e análise | ativo | relatório e explicação de partida |

"Mecânica de mundo" quer dizer: roda para todos os clubes, tem efeito, não pede decisão. "Parâmetro fixo": vem do pacote e não muda na carreira.

### 6.1 Para quem é cada camada

| Perfil | O que procura | O que o jogo dá |
| --- | --- | --- |
| Quem vem de Brasfoot e Elifoot | temporada rápida, subir de divisão, simplicidade | partida rápida, delegação de quase tudo, Centro de Decisões |
| Quem vem de Football Manager | tática, observação, formação, controle | editor tático, armadilhas de pressão, bola parada, central de desempenho, mundo da base |
| Quem já joga o De Cabeça | sessão curta, conhecimento de futebol | um dia de jogo por sessão, vantagem por reconhecer jogadores |

HIPÓTESES. Nenhuma foi testada com gente; a pesquisa com jogadores está no `ROADMAP.md` §6.

## 7. Profundidade sem excesso de tela

DECISÃO: três camadas de leitura em toda tela.

1. **Resumo**: uma frase e um indicador ("Meio-campo perdeu 62% das disputas").
2. **Motivo**: os três fatores que mais pesaram, com número.
3. **Detalhe**: tabela completa, só para quem abre. No desktop o detalhe pode ficar aberto ao lado.

DECISÃO: a tela inicial da carreira é o **Centro de Decisões**: o que pede escolha agora, em ordem de prazo. O resto fica em seis abas (Time, Tática, Base, Clube, Comissão, Mundo). Nenhuma decisão obrigatória fica a mais de dois toques.

DECISÃO: delegação. Cada sistema tem um responsável na comissão; "deixar com ele" produz decisões com a qualidade e a autonomia dele, e a pessoa recebe relatório e pode intervir. Clube sem o profissional não tem a quem delegar: ou a pessoa faz, ou fica sem fazer. É assim que a pobreza de um clube pequeno aparece no jogo.

| Sistema | À mão | Delegado a |
| --- | --- | --- |
| Treino e carga | monta a semana | preparador e auxiliar |
| Mercado | negocia cada jogador | diretor de futebol |
| Observação | escolhe regiões e alvos | chefe de observação |
| Base | decide promoções e convites | coordenador da base |
| Saúde | decide retornos | médico |
| Comercial | escolhe campanhas, política de ingresso, patrocínios | diretor comercial |
| Viagens e operação | define roteiros e nível de operação | responsável de operações |
| Escalação e rodízio | escala | auxiliar |

Meta de tempo: quem delega tudo menos tática e mercado fecha uma semana de jogo em menos de 5 minutos.

### 7.1 Direção visual: imersiva e premium

DECISÃO do dono (2026-11-13): o Modo Clube tem design **imersivo e premium**, não de painel administrativo.

- **Imersivo**: o modo tem palco próprio em tela cheia, sem colunas laterais do site nem anúncio dentro da partida; o campo 2D é a peça central da partida e ocupa o máximo da tela em 360 px e em 1.280 px.
- **Premium**: identidade visual própria do modo (paleta, tipografia, iluminação do campo, escudos e uniformes do pacote), acabamento consistente em toda tela, hierarquia clara das três camadas de leitura (§7), transições curtas com propósito.
- **Limites que continuam valendo**: desempenho vale mais que animação (60 quadros por segundo no campo, 30 como piso, `01` §7); `prefers-reduced-motion` respeitado; contraste e forma distinta das cores de time (`02` §13); só chaves de tradução.
- A direção visual é fixada uma vez (MC-262) antes da primeira tela de produto (MC-250) e vale para todas as telas seguintes; a sandbox não é referência visual.

## 8. Zebras e explicação

FATO: em 38 jogos, o acaso desloca a tabela em cerca de 7 pontos, contra 6 de habilidade (`docs/pesquisa/modo-clube/01-engine-de-partida.md` §6). Futebol tem zebra, e time pior ganha na raça.

DECISÃO:

- O time inferior pode vencer por mérito tático, defesa, transição, bola parada, eficiência, goleiro, pressão, resistência ou por um lance fortuito. A engine não protege o favorito nem o azarão.
- "Raça" existe como estado mental dos jogadores (intensidade, compostura, concentração sob pressão, resposta a jogo grande e a torcida), não como bônus solto.
- Depois do jogo, o relatório narra fatos e as principais causas observadas, incluindo "criou mais e perdeu" e "o goleiro deles fez a diferença". Ele nunca inventa uma justificativa tática para um resultado de acaso: quando o fator dominante foi conversão acima ou abaixo do esperado, é isso que ele diz.
- Nenhum bônus secreto compensa dificuldade.

Testes específicos em `TEST_STRATEGY.md` §4: vitória do azarão, favorito que perde criando mais, goleiro decisivo, bola parada determinante, expulsão, lesão, domínio sem conversão, baixa eficiência.

## 9. O que seria fracasso mesmo funcionando

- Relatório de jogo que contradiz o que aconteceu, ou que explica acaso como se fosse tática.
- Favorito que nunca perde, ou zebra tão frequente que força não importa (faixas em `02` §11).
- Instrução que não muda nenhuma métrica em teste.
- Temporada 6 igual à temporada 2, ou clube imbatível depois de cinco anos.
- Estratégia única dominante.
- Rivais que montam elenco sem lógica.
- Mais de dois toques para a decisão do momento; partida rápida acima de 30 segundos.
- Dado gritante errado, ou jogador inventado dentro de elenco real, num pacote publicado.
- Texto fixo no código em vez de chave de tradução.

## 10. Riscos principais e resposta

1. **Escopo.** Com 17 sistemas, o projeto pode não terminar. Resposta: `ROADMAP.md` define um **corte jogável 1** pequeno (engine, tática básica, elenco, mercado simples, finanças simples, comissão em nível de departamento, quatro divisões) e deixa cada sistema entrar em versão rasa antes da versão funda. Nenhum sistema é aprofundado antes de o corte 1 estar jogável.
2. **A engine espacial não fica convincente.** Resposta: construir primeiro, sozinha, com testes estatísticos, causais e de zebra; portão de revisão do dono antes de qualquer tela de gestão.
3. **Dados reais das Séries C e D.** São 116 clubes em 2026 (20 na C, 96 na D), cerca de 3.000 jogadores com elencos que mudam muito e têm pouca fonte. Resposta: critério de cobertura para publicar; o jogo funciona com o pacote fictício até lá. A origem dos arquivos é assunto do dono.
4. **Custo de servidor.** Resposta: engine por posses para as partidas dos rivais (ADR-013) e medição desde a sandbox. O número de partidas cresce com estaduais e copas; a meta de custo é por dia de calendário, não por rodada.
5. **Estratégia dominante.** Resposta: torneio automático entre presets táticos a cada mudança da engine.
6. **Tela demais num celular.** Resposta: §7 e revisão de interface por tela.

## 11. Conflitos resolvidos

| Tema | Antes | Agora | Onde |
|---|---|---|---|
| Início | três propostas da Série D | dois modos: escolha livre e propostas | §1.1 |
| Jogadores reais | Séries A e B | quatro divisões nacionais | §5, `03` §1.6 |
| Universo | 80 clubes, 4 × 20, 38 rodadas | o que o regulamento do pacote disser | ADR-016 |
| Copas, estaduais, continentais | fora | no modelo desde já; conteúdo por etapa | §5, `05` |
| Rodada | `round/close` | avanço de calendário por dia | ADR-016, `01` §4 |
| Comissão | sete cargos com um efeito cada | domínio completo com departamentos, acúmulo e terceirização | `06` |
| Dono e diretoria | "diretoria" genérica | associação ou SAF, com alçadas | `06` §5 |
| Engine | lances sorteados por posse | 22 agentes para o usuário, engine por posses para os rivais | ADR-013 |
| Equivalência entre engines | estatística e causal exata | estatística, mais coerência tática por testes próprios | ADR-013 |
| Sorte | meta 70/30 e trava de goleada | sem meta fixa, sem trava; zebra é resultado legítimo | §8 |
| Atributos | 12 de linha e 3 de goleiro | 28 de linha e 6 de goleiro | `03` §2.2 |
| Fair play | folha até 70% da receita para todos | regra da CBF por divisão e por ano | `04` §4.5 |
| Idioma e aparelho | português, celular | chaves de tradução; celular e desktop | ADR-017 |
| Personalidade de jogador real | sorteada em faixa neutra | real, campo do pacote com origem e confiança | `03` §1.8 |
| Venda | nada | aparência, vagas, cenários; nunca força | §4, ADR-017 |

## 12. Decisões que ainda são do dono

Lista viva em `ROADMAP.md` §4. As que travam mais coisa:

1. Nome público do modo e rota (hoje `/tecnico`; `/clube` já é a página de assinatura).
2. Temporada do primeiro pacote real: 2026 (formatos publicados) ou 2027 (Série D ainda sem regulamento).
3. Estaduais na etapa 3 exigem centenas de clubes pequenos com elenco real. Aceita estadual só com os clubes que já estão nas quatro divisões nacionais, como passo intermediário?
4. No modo de escolha livre, a diretoria pode demitir quem escolheu um gigante? (Proposta: sim, com paciência maior no primeiro ano.)
5. Lançar primeiro com pacote fictício revisado, e o pacote real depois: **decidido, sim** (2026-11-13).
6. "Justo" entre nível 1 e nível 2 = mesmas distribuições de resultado e de estatística, sem exigir o mesmo efeito por instrução: **decidido, sim** (2026-11-13).
