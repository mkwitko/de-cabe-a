# 23. Mapa de conhecimento do futebol

Estado: proposta, 2026-11-18. Documento de projeto; nenhum código muda.

## 0. Objetivo e escopo

Este mapa lista o que o jogo precisa saber do futebol e liga cada dado a um efeito em jogo. Todo dado novo responde três perguntas antes de entrar:

1. Qual entidade ele enriquece?
2. Qual comportamento do jogo ele pode mudar?
3. Qual evidência sustenta a inclusão?

Sem as três respostas, o dado não entra. Assim o projeto não vira enciclopédia.

Fora do escopo, por decisão do dono: carreiras em eras históricas diferentes, futebol feminino, futsal, praia e amador. Eventos e estados temporais valem só para o jogo atual.

Estado do código lido em `packages/club-domain/src`, `docs/ADR` (020, 021), a pesquisa `2026-11-18-mercado-realismo-e-diversao.md` e `scripts/club-pack` (`import-fm.ts`, `data/FONTES.md`).

## 1. Princípios

1. **Observado, calculado e estimado nunca se misturam.** Cada campo declara o tipo. Valor estimado não vira "fato" ao ser lido por outro módulo.
2. **Todo fato guarda fonte, confiança e validade.** Sem `sourceIds` e período, o fato é tratado como palpite.
3. **Relação com pessoa ou organização real nunca é inferida por coincidência** de nome, sobrenome, cidade ou empresário em comum. Só entra com fonte que a afirme.
4. **`null` é resposta válida.** "Não encontrado" fica registrado (como em `finances-audited.json`), não preenchido.
5. **Dado só vale se muda o jogo.**
6. **Derivar antes de guardar.** Se uma função pura com seed produz o dado (ADR-021: conhecimento do clube sem armazenamento), não se grava no save.
7. **Desempenho primeiro.** O mundo roda com milhares de carreiras. Leituras em lote, sem N+1.

Estado: **existe** / **parcial** / **falta**. Prioridade: P0 a P3.

## 2. Módulos

### 2.1 Identidade

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado no código | Prio |
| --- | --- | --- | --- | --- | --- |
| Jogador | nome, `knownAs`, nascimento, nacionalidade, cidade natal, posições, pé | Reconhecer o jogador; idade e curva física; regra de estrangeiro | Save FM26, Wikidata | existe: `pack/schema.ts` | P0 |
| Clube | nome, cidade, cores, rivais | Rivalidade, torcida, derbi | FM26, Wikidata | existe: `pack/schema.ts` | P0 |
| Cidade | região, estado, coordenadas | Viagem, clima, mercado regional | `br-club-geo.json`, IBGE | parcial: `br-club-geo.json`, `cityId` | P1 |
| Alias | variantes de nome e grafia | Casar fontes sem duplicar jogador | Wikidata, ptwiki | parcial: `enrich-wikidata.ts`, `enrich-ptwiki.ts`; só `knownAs` | P1 |
| Treinador/staff | licença, papéis, laços (`worksWith`, `trainedBy`, `enemy`) | Comissão, contratação, química | FM26 | existe: `pack/schema.ts` | P1 |
| Árbitro | nome, federação | Ver 2.12 | CBF | falta | P3 |

### 2.2 Histórico e eventos

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Passagem por clube | clube, `validFrom/validUntil` | Origem de formação; ex-clube | Wikidata, `squads-ptwiki.json` | parcial: `origin` do jogador, sem períodos | P1 |
| Lesão, suspensão, transferência | tipo, data, `announcedAt` | Disponibilidade; notícia na caixa de entrada | Simulado | existe: `career/health.ts`, `career/inbox.ts` | P0 |
| Contrato vigente | salário, fim, multa (`releaseFee`) | Renovação, saída de graça, multa | FM26 | existe: `market/contracts.ts`, `market/clause.test.ts` | P0 |
| Estado do mundo no dia | janela aberta, fase da temporada | Quando negociar e registrar | Regras CBF | existe: `competition/calendar.ts`, `market/rounds.ts` | P0 |

Só o necessário para o jogo atual: o passado sem efeito não entra.

### 2.3 Mercado

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Valor e salário | valor, salário por nível e idade | Preço pedido, oferta | Calculado | existe: `market/value.ts` | P0 |
| Rodadas de janela | oferta, contraoferta, prazo | Ritmo e pressão do mercado | Pesquisa de mercado | existe: `market/rounds.ts`, `market/deals.ts` | P0 |
| Conversas, proposta de volta | recusa, nova proposta | Clube recusado volta uma vez | Design | existe: `market/talks.ts` | P0 |
| Êxodo ao exterior | compradores virtuais por faixa | Saída de talentos, receita | Pesquisa de mercado | existe: `market/abroad.ts` | P1 |
| Empréstimos | dono, tomador, taxa | Elenco, desenvolvimento | CBF (limites), pesquisa | parcial: `market/loans.ts` (versão simples, sem limites CBF) | P1 |
| Orçamento e folha | teto de gasto, risco do dono | Quanto o clube pode pagar | Calculado | existe: `market/books.ts`, `market/fairplay.ts` | P0 |
| Agente | pessoa ou empresa, comissão | Preço, quem o jogador aceita | Pesquisa; fonte pública a achar | falta (em andamento) | P0 |
| Agência e rede de clubes | agência, clubes com laço | Atalho de negociação, favores | Só fonte que afirme a relação | falta (em andamento) | P0 |
| Direito econômico vs federativo | fatias por parte | Quem recebe numa venda | Modelo de contrato, pesquisa | falta | P2 |
| Solidariedade e formação | % por clube formador | Parte da venda vai a clubes antigos | FIFA RSTP, pesquisa | falta (descrita na pesquisa de mercado) | P2 |
| Multa nacional e internacional | cláusula e regra | Saída forçada | CBF, FIFA | parcial: `market/clause.test.ts` | P2 |

### 2.4 Institucional

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Modelo jurídico | associação, SAF | Folga de caixa, tolerância a prejuízo | Balanços, Wikidata | parcial: `profile.financialRisk` genérico | P0 |
| Estabilidade do conselho | mandato, eleição, facções | Confiança do cargo, paciência | Estatuto; imprensa (baixa confiança) | parcial: `career/board.ts` (uma meta, uma confiança) | P1 |
| Velocidade de decisão | quem aprova gasto | Demora de contratação, prazo de resposta | Modelagem sobre o modelo jurídico | falta | P1 |
| Dono ou investidor | grupo, histórico | Injeção de caixa, venda do clube | Balanços, notícias | falta | P2 |

### 2.5 Tático

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Identidade do clube | posse, verticalidade, pressão, bloco | Quem o clube contrata; estilo base | FM26; jogos observados | existe: `pack/schema.ts` (`profile.playingStyle`, `origin`, `confidence`) | P0 |
| Treinador | estilo, flexibilidade | Esquema e mudanças | FM26 | parcial: staff sem estilo explícito | P1 |
| Comportamento atual | estilo em campo nos últimos N jogos | Compara o estilo vivo com o rótulo | Dados de jogo | parcial: `match/` e `bench/` simulam; sem leitura do real | P2 |

### 2.6 Contextual

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Clima | temperatura e chuva por cidade e mês | Fadiga, gramado, lesão | INMET (série pública) | falta (só `pitch`, `drainage`) | P1 |
| Altitude | metros da cidade | Fôlego do visitante | IBGE, Wikidata | falta | P1 |
| Matriz de distância e logística | km, voo ou ônibus, tempo | Cansaço, custo, calendário | Calculado das coordenadas | falta | P0 |
| Economia regional | PIB, população | Público, patrocínio, salário | IBGE | parcial: `cityId` sem economia | P2 |

### 2.7 Regulatório

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Regra executável | id, `validFrom/validUntil`, jurisdição, fonte, testes | Todo limite legal do jogo | REC CBF, FIFA RSTP | parcial: `rules.json`, `rules-official.json`; regras também em constantes de código | P1 |
| Janelas, empréstimo, estrangeiros | datas, contagens | O que se pode registrar e quando | REC Séries A e B, Copa do Brasil | parcial: `competition/calendar.ts` | P1 |
| Fair play financeiro | teto de custo por divisão | Punição por gastar acima da receita | CBF, art. 106 | existe: `market/fairplay.ts` | P0 |

Meta: cada regra vira dado com teste (entrada, saída esperada, artigo citado), não constante solta.

### 2.8 Observação (conhecimento assimétrico)

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Conhecimento do clube sobre o jogador | alcance, erro de nível e teto | O que cada IA enxerga e erra | Design, ADR-021 | existe: `market/judgement.ts`, `market/scouting.ts` (derivado, sem save) | P0 |
| Observação da pessoa | relatórios, jogos vistos | Tela mostra incerteza | ADR-021 (passo 4) | parcial: `scouting.ts`; ADR própria pendente | P1 |
| Rede do agente como canal | agente leva nome ao clube | Quem chega ao radar | Pesquisa | falta (liga a 2.3) | P0 |

### 2.9 Formação

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Base do clube | nível da base (`youth`), política | Safra anual e qualidade | FM26 | existe: `career/development.ts` | P0 |
| Clube formador | clubes e idades de formação | Solidariedade, orgulho da torcida | Wikidata, ptwiki | parcial: `origin`, sem períodos | P2 |
| Mapa de circulação de talento | fluxos entre clubes e regiões | Onde nascem, vendem e voltam | Calculado do histórico | falta | P1 |

### 2.10 Finanças

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Caixa, dívida, receitas | `initialCash`, `initialDebt`, TV, patrocínio | Teto de gasto, ultimato do conselho | Balanços publicados | parcial: 7 de 40 clubes lidos (`finances-audited.json`) | P0 |
| Tipos de dívida | bancária, fiscal, trabalhista, com atletas | Quem executa o clube, prazos | Notas dos balanços | falta (só dívida total) | P1 |
| Dependência de venda | % da receita vinda de vendas | Obriga a vender | Balanços | falta | P1 |
| Livro mensal | lançamentos com chave idempotente | Fluxo de caixa dia a dia | Calculado | existe: `career/finance.ts` | P0 |

### 2.11 Estádios e operação de jogo

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Estádio | capacidade, gramado, arranjo (próprio, municipal, alugado) | Público, mando, custo | FM26, clubes | existe: `pack/schema.ts` (`stadium`) | P1 |
| Público e bilheteria | média, preço, sensibilidade | Receita de jogo, peso da torcida no mando | ge e mktesportivo 2025 (`scripts/club-pack/data/attendance.json`) | existe: `match/stadium.ts`; 39 clubes de A e B com público e ingresso reais; C e D a confirmar | P1 |
| Interdição e mando alternativo | jogos fora, punição | Perda de mando | RGC art. 64; casos Vitória, Ceará, Santos | existe: portões fechados em `match/stadium.ts` (sem mando em outra cidade) | P3 |

### 2.12 Arbitragem e disciplina (baixa prioridade)

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Árbitro | rigor, média de cartões | Cartões, pênaltis | Súmulas CBF | falta | P3 |
| Disciplina | cartões, suspensão, STJD | Desfalques | Regulamento | parcial: suspensão simples, sem STJD | P3 |

### 2.13 Cultura e torcida (baixa prioridade)

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Torcida | tamanho, lealdade, paciência, identidade local | Pressão, público, humor | Pesquisas públicas; valores estimados | existe: `pack/schema.ts` (`fans`) | P2 |
| Rivalidades e clássicos | pares, intensidade | Peso do jogo | Wikidata, FM26 | parcial: `rivals` sem intensidade | P3 |

### 2.14 Calibração

| Entidade/relação | Atributos-chave | Comportamento que altera | Evidência/fonte | Estado | Prio |
| --- | --- | --- | --- | --- | --- |
| Bancada de calibração | métricas da simulação (gols, pontos, folha, vendas) contra as reais | Ajusta PARÂMETROS; barra regressão de realismo | Tabelas oficiais, balanços | parcial: `bench/calibrate.ts` (políticas fixas, sem alvo real) | P0 |
| Alvos reais | distribuição de pontos, gols, público, transferências | Define "o mundo está certo" | CBF; sites de mercado só para conferir | falta | P0 |

## 3. Modelo de relação temporal

Todo fato relacional é uma linha:

| Campo | Significado |
| --- | --- |
| `subject` | entidade (jogador X) |
| `predicate` | tipo de relação (`contratado_por`, `representado_por`, `emprestado_a`, `formado_em`) |
| `object` | outra entidade ou valor |
| `validFrom` / `validUntil` | quando é verdade no mundo; `validUntil` nulo = vigente |
| `announcedAt` | quando foi anunciado (pode ser antes do início) |
| `observedAt` | quando o jogo ou a fonte viu o fato |
| `sourceIds` | fontes (ver `FONTES.md`) |
| `confidence` | alta, média ou baixa, mais o tipo: observado, calculado ou estimado |

Um fato novo fecha o anterior (`validUntil`) em vez de apagá-lo. A consulta "no dia D" filtra `validFrom <= D < validUntil`.

**PostgreSQL relacional basta no começo.** Uma tabela de relações com índices em `(subject, predicate)` e `(object, predicate)` cobre as consultas necessárias (agentes de um clube, passagens de um jogador). Os saltos têm 2 ou 3 níveis, não caminhos arbitrários. Banco de grafos só se surgir consulta de caminho longo que o SQL não atenda; hoje não há. O jogo também roda no navegador (ADR-020) sobre um pack derivado, não sobre o banco ao vivo.

## 4. Dependências entre módulos

```
Identidade ──► Histórico/Eventos ──► Mercado ──► Observação
    │                │                 ▲ ▲           │
    │                └──► Formação ────┘ │           ▼
    ├──► Contextual (clima, logística) ► Estádios   Calibração ◄── todos
    └──► Institucional ──► Finanças ──► Mercado (orçamento, ritmo)
                  └──► Conselho (career/board.ts)
Regulatório ──► Mercado, Competição, Finanças (limites e janelas)
```

- **Agentes** dependem de Identidade (pessoa e empresa sem duplicata) e de Mercado (comissão, preço), e alimentam Observação (rede como canal).
- **Institucional** altera o Conselho (`career/board.ts`) e o orçamento (`market/books.ts`).
- **Regulatório** é base: sem regra versionada, Mercado e Finanças repetem constantes.
- **Calibração** lê todos e testa se o conjunto reproduz o real.
- **Contextual** alimenta Estádios (clima) e calendário (viagem).

## 5. Plano de desenvolvimento (10 entregas)

| # | Entrega | Definição de pronto | Comportamento que altera |
| --- | --- | --- | --- |
| 1 | Agentes com redes (em andamento) | Agente e agência como entidades com laços datados a clubes e jogadores, só com fonte; teste de que nenhuma relação nasce de coincidência | Preço, quem aceita proposta, canal de chegada de nomes ao radar |
| 2 | Bancada de calibração | `bench/calibrate.ts` compara a saída com alvos reais (pontos, gols, folha, vendas) e falha acima da tolerância | Parâmetros do mundo deixam de ser chute |
| 3 | Institucional | Modelo jurídico, estabilidade do conselho e velocidade de decisão por clube no pack, com fonte e confiança | Paciência do conselho, demora de contratação, tolerância a prejuízo |
| 4 | Logística e clima | Matriz de distância e série de clima e altitude por cidade; fadiga e custo de viagem usam a matriz | Cansaço do elenco, custo, calendário |
| 5 | Mapa de formação e talento | Passagens com período e fluxo de formadores por região, derivados do pack | Safra da base, orgulho da torcida, quem vende e quem compra |
| 6 | Finanças profundas | Tipos de dívida e dependência de venda nos clubes com balanço; lacuna `null` nos demais | Obriga a vender; executa clubes endividados; ultimato do conselho |
| 7 | Regulamentos como dados | Regras (janelas, empréstimo, estrangeiro, solidariedade) com vigência, jurisdição, fonte e teste | Limites legais de mercado e inscrição |
| 8 | Operação de estádio | Público médio real e preço por clube; interdição e mando alternativo | Receita de bilheteria e vantagem de mando |
| 9 | Arbitragem e disciplina | Perfil de rigor do árbitro e suspensões com tribunal; só se a calibração mostrar desvio | Cartões, pênaltis, desfalques |
| 10 | Cultura e torcida | Intensidade de rivalidade e humor da torcida calibrados com dados públicos | Pressão, público e peso de clássicos |

Ordem por valor em jogo e dependência: agentes e calibração primeiro (mercado e prova de realismo); institucional antes de finanças profundas (o modelo jurídico explica a dívida); regulamentos antes de estádios.

## 6. Como adicionar um dado

Antes de abrir a tarefa, preencher: entidade enriquecida; comportamento alterado (função ou tela que muda); fonte, tipo (observado, calculado ou estimado), confiança e validade. Sem comportamento, o dado não entra.
