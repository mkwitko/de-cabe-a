# 21 — Matriz de cobertura por competição e temporada

**Data-base:** 2026-11-18  
**Estado:** plano de avaliação; a cobertura dos provedores ainda não foi testada por endpoint.  
**Relacionado:** 20-catalogo-de-fontes-e-dados.md, ADR-016, 05-COMPETICOES-E-CALENDARIO.md.

## 1. Regra de leitura

Este documento não afirma que uma API cobre as competições listadas. Ele define o conjunto que precisamos verificar. Uma competição aparecer na página geral do provedor não prova que todos os campos, temporadas ou jogos tenham dados.

Status:
- NOT_TESTED: ainda não consultado na API/dump.
- LISTED: aparece no catálogo geral, sem verificação de campo.
- SAMPLE_PASS: amostra real consultada e campo retornado.
- PARTIAL: cobertura abaixo do necessário ou com lacunas.
- NO_DATA: não foi encontrada informação na amostra.
- LICENSE_BLOCKED: existe dado, mas o direito de uso no produto não está liberado.
- ACCEPTED: passou cobertura, qualidade, identidade e licenciamento.

Nenhuma fonte pode receber ACCEPTED sem um registro de evidência e aprovação dos direitos.

## 2. Competições — Brasil

### 2.1 Nacionais profissionais

| ID interno proposto | Competição | Prioridade | Temporadas a testar | Fontes abertas/oficiais | Sportmonks | API-Football |
|---|---|---:|---|---|---|---|
| BRA-SERIE-A | Campeonato Brasileiro Série A | P0 | 2026, 2025, 2023, 2021, 2016 | CBF, Brasileirão Data, OpenFootball | NOT_TESTED | NOT_TESTED |
| BRA-SERIE-B | Campeonato Brasileiro Série B | P0 | 2026, 2025, 2023, 2021, 2016 | CBF, Brasileirão Data, OpenFootball | NOT_TESTED | NOT_TESTED |
| BRA-SERIE-C | Campeonato Brasileiro Série C | P0 | 2026, 2025, 2023, 2021, 2016 | CBF, Brasileirão Data | NOT_TESTED | NOT_TESTED |
| BRA-SERIE-D | Campeonato Brasileiro Série D | P0 | 2026, 2025, 2023, 2021, 2016 | CBF, Brasileirão Data | NOT_TESTED | NOT_TESTED |
| BRA-COPA-BRASIL | Copa do Brasil | P0 | 2026, 2025, 2023, 2021, 2016 | CBF, OpenFootball (verificar anos) | NOT_TESTED | NOT_TESTED |
| BRA-SUPERCOPA | Supercopa do Brasil | P1 | 2026, 2025, 2023, 2021 | CBF | NOT_TESTED | NOT_TESTED |
| BRA-COPA-NE | Copa do Nordeste | P1 | 2026, 2025, 2023, 2021 | CBF, federações regionais | NOT_TESTED | NOT_TESTED |
| BRA-COPA-VERDE | Copa Verde | P1 | 2026, 2025, 2023, 2021 | CBF, federações regionais | NOT_TESTED | NOT_TESTED |
| BRA-COPA-SUL-SUDESTE | Copa Sul-Sudeste | P1 | 2026 e futuras edições | CBF | NOT_TESTED | NOT_TESTED |
| BRA-COPA-FGF-OUTRAS | Copas e torneios nacionais/regionais especiais | P2 | por edição | CBF e federações | NOT_TESTED | NOT_TESTED |

**Atenção à temporada:** a estrutura da Série C e da Série D muda por edição. Não inferir 2027 a partir de 2026. A quantidade de clubes, as fases, o acesso/descenso e as datas precisam ser lidos do regulamento específico daquela temporada.

### 2.2 Estaduais prioritários

| ID interno proposto | Competição | Prioridade | Temporadas | Fonte primária | Provedor |
|---|---|---:|---|---|---|
| BRA-SC-1 | Catarinense Série A | P0 | 2026, 2025, 2023, 2021 | FCF | NOT_TESTED |
| BRA-SC-2 | Catarinense Série B | P1 | 2026, 2025, 2023 | FCF | NOT_TESTED |
| BRA-SC-3 | Catarinense Série C | P1 | 2026, 2025, 2023 | FCF | NOT_TESTED |
| BRA-SP-1 | Paulista Série A1 | P0 | 2026, 2025, 2023, 2021 | FPF-SP | NOT_TESTED |
| BRA-SP-2 | Paulista A2 | P1 | 2026, 2025, 2023 | FPF-SP | NOT_TESTED |
| BRA-RJ-1 | Carioca Série A | P0 | 2026, 2025, 2023, 2021 | FERJ | NOT_TESTED |
| BRA-MG-1 | Mineiro Módulo I | P0 | 2026, 2025, 2023, 2021 | FMF-MG | NOT_TESTED |
| BRA-RS-1 | Gauchão Série A | P0 | 2026, 2025, 2023, 2021 | FGF-RS | NOT_TESTED |
| BRA-PR-1 | Paranaense Série A | P1 | 2026, 2025, 2023 | FPF-PR | NOT_TESTED |
| BRA-BA-1 | Baiano Série A | P1 | 2026, 2025, 2023 | FBF | NOT_TESTED |
| BRA-PE-1 | Pernambucano Série A1 | P1 | 2026, 2025, 2023 | FPF-PE | NOT_TESTED |
| BRA-CE-1 | Cearense Série A | P1 | 2026, 2025, 2023 | FCF-CE | NOT_TESTED |
| BRA-GO-1 | Goiano Série A | P1 | 2026, 2025, 2023 | FGF-GO | NOT_TESTED |
| BRA-PA-1 | Paraense Série A | P2 | 2026, 2025, 2023 | FPF-PA | NOT_TESTED |

A lista é deliberadamente uma amostra prioritária, não o universo final. O universo brasileiro inclui os demais estaduais, divisões de acesso e torneios regionais. A inclusão deve ser dirigida por participantes reais e pela lógica de acesso/descenso do pacote.

### 2.3 Base e futebol feminino

| ID interno proposto | Competição | Prioridade | Temporadas | Fonte primária | Provedor |
|---|---|---:|---|---|---|
| BRA-U20 | Brasileiro Sub-20 | P1 | 2026, 2025, 2023 | CBF | NOT_TESTED |
| BRA-U17 | Brasileiro Sub-17 | P2 | 2026, 2025 | CBF | NOT_TESTED |
| BRA-COPINHA | Copa São Paulo de Futebol Júnior | P1 | 2026, 2025, 2023 | FPF-SP | NOT_TESTED |
| BRA-FEM-A1 | Brasileiro Feminino A1 | P1 | 2026, 2025, 2023 | CBF | NOT_TESTED |
| BRA-FEM-A2 | Brasileiro Feminino A2 | P2 | 2026, 2025 | CBF | NOT_TESTED |
| BRA-FEM-A3 | Brasileiro Feminino A3 | P2 | 2026, 2025 | CBF | NOT_TESTED |

Base e futebol feminino não devem ser tratados como um campo opcional do elenco masculino. A identidade do clube precisa distinguir equipes, categoria, sexo/categoria competitiva e temporada.

## 3. Competições — América do Sul e CONMEBOL

### 3.1 Competições continentais

| ID interno proposto | Competição | Prioridade | Temporadas | Fonte primária | Sportmonks | API-Football |
|---|---|---:|---|---|---|---|
| CONM-LIB | Copa Libertadores | P0 | 2026, 2025, 2023, 2021, 2016 | CONMEBOL | NOT_TESTED | NOT_TESTED |
| CONM-SUD | Copa Sul-Americana | P0 | 2026, 2025, 2023, 2021, 2016 | CONMEBOL | NOT_TESTED | NOT_TESTED |
| CONM-RECOPA | Recopa Sul-Americana | P1 | 2026, 2025, 2023, 2021 | CONMEBOL | NOT_TESTED | NOT_TESTED |
| CONM-LIB-U20 | Libertadores Sub-20 | P2 | 2026, 2025, 2023 | CONMEBOL | NOT_TESTED | NOT_TESTED |
| CONM-LIB-FEM | Libertadores Feminina | P2 | 2026, 2025, 2023 | CONMEBOL | NOT_TESTED | NOT_TESTED |

Não confundir a cobertura do torneio principal com suas fases preliminares. Verificar IDs separados para classificação, fase de grupos, playoffs e mata-mata.

### 3.2 Primeira divisão de cada país

| País | Competição-alvo | Prioridade | Fonte primária | Sportmonks | API-Football |
|---|---|---:|---|---|---|
| Argentina | Liga Profesional | P1 | AFA / organizador oficial | NOT_TESTED | NOT_TESTED |
| Uruguai | Primera División | P1 | AUF | NOT_TESTED | NOT_TESTED |
| Chile | Primera División | P1 | ANFP | NOT_TESTED | NOT_TESTED |
| Colômbia | Categoría Primera A | P1 | DIMAYOR / FCF | NOT_TESTED | NOT_TESTED |
| Paraguai | Primera División | P1 | APF | NOT_TESTED | NOT_TESTED |
| Equador | LigaPro Serie A | P2 | LigaPro / FEF | NOT_TESTED | NOT_TESTED |
| Peru | Liga 1 | P2 | FPF / organizador oficial | NOT_TESTED | NOT_TESTED |
| Bolívia | División Profesional | P2 | FBF | NOT_TESTED | NOT_TESTED |
| Venezuela | Primera División | P2 | FVF / organizador oficial | NOT_TESTED | NOT_TESTED |

### 3.3 Copas nacionais sul-americanas

Levantar conforme o calendário oficial e a temporada vigente:
- Argentina: Copa Argentina e supercopas, quando aplicáveis.
- Uruguai: Copa AUF Uruguay.
- Chile: Copa Chile.
- Colômbia: Copa Colombia.
- Paraguai: Copa Paraguay.
- Equador: Copa Ecuador, quando disputada.
- Peru: copas nacionais oficiais, conforme calendário.
- Bolívia e Venezuela: copas nacionais, quando organizadas.

A existência e o nome de uma competição devem ser verificados na temporada. Não criar uma competição fictícia para preencher uma tabela de cobertura.

## 4. Campos por domínio a verificar em cada competição

| Grupo | Campos obrigatórios | Campos de aprofundamento |
|---|---|---|
| Competição/temporada | ID, nome, país, temporada, datas, status, formato | fases, regras de inscrição, critérios de desempate, vagas e premiação |
| Clube | ID, nome, país, cidade | aliases, estádio, histórico de participação |
| Elenco | jogador, equipe, temporada, posição | número, status de registro, datas do vínculo, empréstimo |
| Partida | ID, data, mandante, visitante, placar, status | rodada, fase, estádio, público, árbitro |
| Escalação | titulares e reservas | posição, esquema, capitão, treinador |
| Eventos | gols, cartões e substituições | VAR, pênaltis, lesões, minuto/tempo extra |
| Estatísticas coletivas | posse, finalizações, passes, faltas, cartões, escanteios | duelos aéreos, grandes chances, PPDA, passes progressivos |
| Estatísticas individuais | minutos, partidas, gols, assistências | ações defensivas, criação, métricas por 90 |
| Histórico | resultados e participantes por temporada | transferências, artilharia, campeões, classificações finais |

**Regulamento integral:** não considerar a API como fonte de regra normativa. O texto primário continua sendo CBF, federação, CONMEBOL ou IFAB.

## 5. Protocolo de amostragem

### 5.1 API

Para cada competição:
1. localizar o ID de competição e season ID;
2. consultar metadados e guardar a resposta original;
3. consultar ao menos 20 partidas distribuídas por fases/rodadas;
4. consultar elenco de cinco clubes, variando porte e região;
5. consultar histórico de 30 jogadores conhecidos;
6. verificar paginação, rate limit, IDs, campos nulos e datas;
7. registrar request, endpoint, parâmetros, status HTTP e timestamp;
8. repetir a consulta para verificar estabilidade e atualização.

### 5.2 Open data e bases históricas

Para cada coleção:
- fixar URL, commit/release, licença e hash;
- comparar IDs e aliases com nosso catálogo canônico;
- detectar clubes duplicados, clubes B, equipes femininas e equipes de base;
- conferir partidas com súmulas/documentos oficiais numa amostra;
- comparar anos e número de partidas com a fonte de origem;
- documentar lacunas sem preencher automaticamente.

### 5.3 Regulamentos

Para cada temporada e competição:
- localizar documento geral e específico;
- localizar circulares, adendos e retificações;
- guardar PDF/HTML original e hash;
- extrair artigo, regra, vigência e efeito sobre o interpretador;
- verificar se o documento citado foi substituído;
- comparar com calendário, participantes e resultado final;
- deixar regra não localizada como unknown, nunca copiar valor da temporada anterior sem uma regra de transição explícita.

## 6. Resultado que o teste deve gerar

Um registro por combinação de competição, temporada, provedor e campo:

| Campo | Exemplo |
|---|---|
| competition_key | BRA-SERIE-D |
| season | 2026 |
| provider | sportmonks |
| provider_competition_id | valor retornado |
| provider_season_id | valor retornado |
| field_group | lineups |
| sample_size | 20 |
| populated_count | valor medido |
| coverage_rate | populated_count / sample_size |
| data_quality | pass / partial / fail |
| license_status | pending / approved / blocked |
| checked_at | timestamp |
| evidence_uri | arquivo/resposta guardada |
| notes | exceções observadas |

O relatório deve gerar tabela comparativa e CSV/JSON de evidências. A matriz deste documento só muda de NOT_TESTED para SAMPLE_PASS/PARTIAL/NO_DATA depois da execução e armazenamento do registro.

## 7. Ordem de execução

1. Série A–D, Copa do Brasil, Libertadores, Sul-Americana.
2. Catarinense A/B/C e Paulista A1, por serem úteis para o escopo inicial brasileiro e para testar cobertura fora da elite nacional.
3. Argentina, Uruguai, Chile e Colômbia.
4. Copas regionais, base e futebol feminino.
5. Demais países sul-americanos e estaduais brasileiros.

**Gate de pacote:** nenhuma temporada real é publicada enquanto clubes obrigatórios, elencos, registros e regulamentos não atingirem os critérios do documento 03-JOGADORES-E-BASE.md e do 05-COMPETICOES-E-CALENDARIO.md.
