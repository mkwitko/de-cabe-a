# 20 — Catálogo de fontes e dados para o Modo Clube

**Data da pesquisa:** 2026-11-18  
**Escopo:** base real do Modo Clube, com prioridade Brasil, América do Sul e competições CONMEBOL.  
**Estado:** inventário inicial pesquisado; nenhuma API paga contratada; nenhuma coleta nova executada.  
**Documentos relacionados:** DATA_SOURCES.md (minijogos Career Path/Grid), DATA_MODEL.md, DATA_QUALITY.md, GAME_DESIGN/MODO_CLUBE/03-JOGADORES-E-BASE.md, 04-CLUBE-E-MUNDO.md, 05-COMPETICOES-E-CALENDARIO.md, ADR-014, ADR-016 e ADR-019.

---

## 1. Objetivo e decisões

O Modo Clube precisa de um universo real, versionado por temporada, que cubra clubes, jogadores, comissões, competições, regulamentos, estádios, economia e contexto local. A base não será uma cópia de um provedor: será uma camada canônica construída a partir de fontes diferentes, preservando origem, licença, período de validade, precisão e confiança de cada dado.

Este catálogo é específico para o Modo Clube. Não substitui nem reabre as decisões da base dos minijogos descritas em docs/DATA_SOURCES.md.

### Decisões de partida

1. **Priorizar dados abertos e documentos oficiais.** APIs comerciais são candidatas a fechar lacunas, não requisito da primeira entrega.
2. **Separar fonte de descoberta, fonte de validação e fonte autorizada para distribuição.** Uma informação encontrada num site não fica automaticamente liberada para entrar no pacote comercial.
3. **Não automatizar sites que já foram excluídos no projeto.** Transfermarkt, FBref, Sofascore, Flashscore e ogol permanecem fora de scraping/coleta automatizada. Uma pesquisa humana pontual não concede direito de reprodução de banco, imagens ou textos.
4. **Não copiar ratings de jogos comerciais.** Os 54 atributos do atleta definidos no ADR-019 devem ser próprios, derivados de evidências permitidas ou de avaliação original documentada.
5. **Não preencher lacunas com fatos inventados.** Dado não divulgado fica ausente. Estimativa precisa ser explicitamente estimated, com método, intervalo e confiança.
6. **Pacote real não recebe jogador fictício para completar elenco.** A cobertura mínima definida em ADR-014 é um portão de publicação; pacote fictício de desenvolvimento continua separado.
7. **Regras de competição são dados por edição.** Manual geral, regulamento específico, circular, retificação e decisão disciplinar precisam ser associados à temporada e à competição corretas.
8. **Guardar o documento bruto e o dado normalizado separadamente.** O pacote do jogo recebe projeções enxutas; o processo de ingestão mantém evidência, hashes, versões e diferenças.
9. **Não contratar nem ativar serviços pagos sem autorização explícita.** Os preços abaixo são referências públicas consultadas, não orçamento aprovado.
10. **Não pressupor uma cobertura uniforme.** Cobertura de uma API varia por competição, temporada, partida e campo.

### 1.1 O que significa cada status deste catálogo

| Status | Significado | Uso permitido no projeto |
|---|---|---|
| OPEN_DATA_CANDIDATE | Licença aberta identificada para o conjunto ou artefato específico | Pode ser testado após conferir licença, versão e atribuição |
| OPEN_DATA_CONFIRMED | Política/arquivo de licença foi consultado e cobre os dados estruturados descritos | Importação possível dentro do escopo da licença |
| OFFICIAL_REFERENCE | Fonte primária e oficial, mas sem licença ampla de republicação identificada | Consultar, citar, extrair regra/fato e manter referência; validar reprodução do documento |
| COMMERCIAL_EVALUATION | Provedor comercial com API/preço/cobertura pública | Fazer prova de cobertura e pedir autorização contratual antes do uso no jogo |
| MANUAL_RESEARCH | Material útil para pesquisa humana, sem autorização comprovada para automação/redistribuição | Referência editorial; não fazer scraping nem copiar conteúdo protegido |
| LICENSE_REQUIRED | Uso de arquivo, áudio, imagem, banco ou estatística depende de licença específica | Não incluir em pacote até obter autorização escrita |
| RESTRICTED_DO_NOT_INGEST | Termos conhecidos incompatíveis com a finalidade comercial ou com redistribuição | Não coletar para o produto nem usar para treinar/calibrar o produto |
| UNVERIFIED | Cobertura, termos ou licença não foram confirmados | Não tratar como fonte operacional |

**Importante:** licença do código de um repositório não é necessariamente licença dos dados coletados por ele. Licença de um arquivo de imagem não se estende automaticamente ao escudo, à marca, à camisa ou à fotografia representada.

---

## 2. Resumo executivo: fontes recomendadas

| Fonte | Domínio principal | Situação | Decisão inicial |
|---|---|---|---|
| Wikidata | IDs, pessoas, clubes, lugares, datas e relações | OPEN_DATA_CONFIRMED para dados estruturados CC0 | Usar como identificador e complemento, nunca como única fonte |
| Reep | Reconciliação de IDs entre provedores | OPEN_DATA_CANDIDATE; CC0 para direitos próprios do registro | Usar como crosswalk; não tratar como base de carreira/estatísticas |
| Brasileirão Data | História das competições nacionais brasileiras | OPEN_DATA_CANDIDATE; licença do artefato precisa ser conferida no repositório/manifesto antes da importação | Fazer spot-check e importar apenas o escopo liberado |
| RSSSF Brasil | História de campeonatos, resultados e clubes | MANUAL_RESEARCH até confirmar autorização | Referência e reconciliação histórica; sem scraping |
| OpenFootball | Clubes, ligas e resultados em conjuntos abertos | OPEN_DATA_CANDIDATE; conferir licença por repositório | Importar clubes/ligas/fixtures onde houver dados úteis |
| CBF e federações estaduais | Competições, registros, súmulas, calendários e regulamentos | OFFICIAL_REFERENCE | Fonte de verdade esportiva para o Brasil |
| CONMEBOL | Regulamentos e manuais continentais | OFFICIAL_REFERENCE | Fonte de verdade continental |
| Associações nacionais sul-americanas | Competições, registros e regras locais | OFFICIAL_REFERENCE | Expandir país por país |
| Sportmonks | Estatísticas, escalações, jogadores, clubes e histórico | COMMERCIAL_EVALUATION | Candidato comercial mais completo para prova comparativa |
| API-Football | Fixtures, eventos, escalações, estatísticas, jogadores e treinadores | COMMERCIAL_EVALUATION | Concorrente direto para prova de cobertura e custo |
| EY / Sports Value | Finanças, receitas, dívida, custos e valuation | MANUAL_RESEARCH / relatório proprietário | Usar para referências e benchmarks; preferir demonstrações originais |
| Central de Balanços / SPED | Demonstrações contábeis depositadas | OFFICIAL_REFERENCE | Buscar documentos primários de entidades identificadas |
| IBOPE Repucom | Popularidade e presença de marcas em uniformes | MANUAL_RESEARCH | Extrair metadados publicados; licenciar estudos para uso sistemático |
| Fontes oficiais de clubes e fabricantes | Uniformes, cores, patrocinadores, CT, elenco e história | OFFICIAL_REFERENCE | Fonte preferencial para identidade atual |
| INMET / IBGE | Clima, população, renda e contexto geográfico brasileiro | OFFICIAL_REFERENCE | Construir atributos regionais e climáticos |
| OpenStreetMap | Coordenadas, rede viária e geografia | OPEN_DATA_CANDIDATE, ODbL | Usar com análise de obrigações ODbL |
| FanChants | Catálogo e gravações de cantos de torcida | LICENSE_REQUIRED | Só áudio licenciado; metadados podem ser pesquisados |
| Football Kit Archive | Referência visual histórica de uniformes | MANUAL_RESEARCH | Consulta humana; não baixar/republicar imagens sem licença |
| Wikimedia Commons | Fotografias e mídia com licença por arquivo | LICENSE_REQUIRED / por arquivo | Usar somente assets individualmente elegíveis e com atribuição |

---

## 3. Catálogo de fontes — identificação e história

### S01. Wikidata

- **URL:** https://www.wikidata.org/
- **Consulta estruturada:** https://query.wikidata.org/
- **Licença:** dados estruturados em domínio público via CC0; texto de outras páginas/áreas do projeto pode ter outra licença.
- **Cobertura:** global; jogadores, treinadores, clubes, federações, estádios, cidades, nacionalidades, datas, títulos e relações declaradas.
- **Formato/acesso:** dumps, SPARQL Query Service, API Wikibase.
- **Campos úteis:** QID, nomes/aliases, nascimento, local de nascimento, nacionalidade, altura quando declarada, ocupação, membro de equipe, datas qualificadoras, posição, estádio, sede, fundação, competição e títulos.
- **Histórico:** depende da qualidade e da granularidade dos itens; datas de passagem por clube podem estar ausentes ou inconsistentes.
- **Limitações:** empréstimos e vínculos temporários são modelados de formas diferentes; não é um cadastro oficial de atletas; posições e nomes históricos nem sempre são completos; a cobertura brasileira pré-2000 precisa ser medida.
- **Decisão:** fonte aberta de identidade e fatos básicos. Não publicar carreira sem reconciliação e validação.
- **Coleta:** preferir dump ou consultas em lote; respeitar política e limites do serviço; user-agent descritivo; cache local. Evitar uma consulta SPARQL por entidade.
- **Prioridade:** P0.

### S02. Reep — open ID bridge

- **URL:** https://reep.football/data/
- **Cobertura anunciada no snapshot consultado:** release 2026-10-19.1, aproximadamente 1,99 milhão de entidades e 10,94 milhões de ligações de IDs entre provedores. O manifesto da versão deve ser a referência exata de cada importação.
- **Conteúdo útil:** IDs e aliases de provedores para jogadores, equipes, treinadores, árbitros, competições, temporadas, fases e partidas, conforme entidade/cobertura de cada release.
- **Licença:** CC0 para os direitos que o próprio projeto Reep possui sobre o registro aberto. Isso não libera conteúdo de provedores externos apontados pelos IDs.
- **Formato/acesso:** snapshot para download, incluindo artefatos tabulares/DuckDB/Parquet conforme release.
- **Limitações críticas:** o registro aberto é uma ponte de identificadores, não uma base completa de estatísticas, aparições ou histórico de carreira; não contém necessariamente DOB nem todos os atributos básicos. O projeto informa que career histories, squad memberships e appearances não fazem parte do bridge register aberto. IDs de Football Manager foram retirados das versões hospedadas mais recentes; não depender desse mapeamento.
- **Decisão:** importar apenas como external ID crosswalk, sem inferir que um ID de provedor autoriza importar os dados desse provedor.
- **Prioridade:** P0 para reconciliação de IDs.

### S03. Brasileirão Data

- **URL:** https://brasileirao.murakams.com/
- **Dados públicos:** https://brasileirao.murakams.com/data/
- **Cobertura informada na página consultada:** 679 clubes, 8 competições, 170 temporadas, 46.217 partidas, 11.441 participações, 4.438 linhas de tabela e 130 registros de artilharia.
- **Competições citadas:** Série A, B, C, D, Taça Brasil, Robertão, Copa União 1987 e Copa João Havelange 2000.
- **Formato:** 16 artefatos JSON públicos com schemas, contagem de linhas e hashes; manifesto em data/public/manifest.json.
- **Proveniência:** cada registro histórico aponta para página-fonte do RSSSF Brasil; scores, datas e nomes de equipes são transcritos, não reconstruídos.
- **Limitações:** não é feed ao vivo; as linhas de tabela são linhas de origem, não necessariamente classificações finais reconstruídas; artilheiros são source-only e não possuem IDs canônicos de jogadores; há registros parciais ou não resolvidos sinalizados.
- **Licença:** não assumir licença comercial apenas pela expressão “open data”. Conferir LICENSE, manifesto, termos e direitos do material RSSSF subjacente antes de importar/republicar. A permissão do pipeline/código e a permissão do conteúdo-fonte são questões diferentes.
- **Decisão:** forte candidato para histórico de jogos, clubes e participações. Fazer auditoria de licença por artefato e spot-check contra registros oficiais antes de torná-lo fonte do pacote.
- **Prioridade:** P0, condicionado à verificação da licença de dados.

### S04. RSSSF Brasil

- **URL:** https://rsssfbrasil.com/historical.htm
- **Cobertura:** arquivos históricos de competições nacionais, estaduais, regionais, interestaduais, amistosos e outras modalidades/recortes brasileiros.
- **Campos úteis:** campeões, participantes, resultados, datas, tabelas e registros de temporadas.
- **Formato:** páginas HTML, tabelas editoriais e arquivos de referência.
- **Licença/acesso:** a política aplicável à compilação e aos textos deve ser confirmada. Fato esportivo e compilação editorial não são a mesma coisa.
- **Decisão:** usar como fonte de pesquisa e reconciliação humana, não automatizar scraping nem republicar tabelas/compilações sem autorização. Brasileirão Data pode ser uma camada de acesso mais estruturada para o subconjunto que ele documenta.
- **Prioridade:** P0 como referência histórica; P3 para ingestão automática.

### S05. OpenFootball — clubes, ligas e resultados

- **Organizações:** https://github.com/openfootball
- **Clubes:** https://github.com/openfootball/clubs
- **Ligas:** https://github.com/openfootball/leagues
- **Resultados:** https://github.com/openfootball
- **Licença:** os conjuntos abertos avaliados no projeto foram identificados como CC0; confirmar licença no repositório e commit exatos antes de cada ingestão.
- **Cobertura útil:** identificação de clubes, nomes de ligas e resultados de temporadas em alguns países/competições. A pesquisa interna de 2026-11-17 encontrou dados de clubes brasileiros e sul-americanos com cidade, estádio e capacidade em parte dos registros; não encontrou cores dos clubes.
- **Formato:** arquivos de texto/JSON por competição/temporada; adequado a download e versionamento.
- **Limitações:** cobertura irregular, nem todos os torneios/anos têm resultados; não é uma base de jogadores, atributos, eventos detalhados ou regulamentos completos.
- **Decisão:** importar como fonte auxiliar de clubes/estádios e fixtures, e medir taxa de cobertura por país/temporada. Não presumir cobertura completa com base no nome da coleção.
- **Prioridade:** P0.

### S06. Wikipedia (PT/EN e demais idiomas)

- **URLs:** https://pt.wikipedia.org/ e https://en.wikipedia.org/
- **Licença textual:** CC BY-SA 4.0, sujeita às condições da licença e atribuição; não tratar fotografias ou outros assets das páginas como parte da licença textual.
- **Uso útil:** pesquisa editorial de carreira, cronologia, escalações históricas, títulos, nomes populares, referências para localizar documentos.
- **Formato:** páginas e APIs MediaWiki; dumps e histórico de revisões.
- **Limitações:** conteúdo colaborativo e variável em qualidade; tabelas podem ter inconsistência; atribuição/share-alike quando reutilizar texto; não copiar texto longo nem importar automaticamente como dado autoritativo.
- **Decisão:** corroborar fatos e preservar URL/revisão da fonte quando for usada; preferir extrair fatos mínimos e confirmar com fonte oficial ou segunda fonte independente. Para conteúdo do modo, produzir texto original.
- **Prioridade:** P1.

### S07. Repositórios de dados derivados do Transfermarkt

- **Exemplo já identificado no projeto:** dcaribou/transfermarkt-datasets.
- **Conteúdo:** tabelas de jogadores, transferências, clubes e competições derivadas de scraping do Transfermarkt.
- **Licença aparente do repositório:** CC0 para o material próprio do repositório; isso não apaga os termos que se aplicam ao conteúdo subjacente extraído do Transfermarkt.
- **Decisão vigente no projeto:** commercialUseAllowed = false; não publicar os dados ao jogador, não construir pacote comercial com eles e não rodar scraping próprio. No máximo, referência interna para gerar uma pergunta de verificação que será resolvida por fonte livre/autorizada — sem transportar o valor restrito para o produto.
- **Cuidados:** não inserir os CSVs brutos no Git; manter cache fora do repositório; não converter estimativa de valor de mercado em fato financeiro do jogo.
- **Prioridade:** P3 / referência restrita, não fonte do pacote.

---

## 4. Catálogo — competições, regulamentos e registros oficiais

### S08. CBF

- **URL:** https://www.cbf.com.br/
- **Manual de Competições 2026:** publicado em 27/01/2026 e substituiu o antigo Regulamento Geral das Competições, consolidando diretrizes técnicas e circulares.
- **Documentos a procurar por temporada/competição:** Manual de Competições, Regulamento Específico da Competição (REC), tabelas básicas, tabelas detalhadas, calendário, circulares, decisões do STJD quando aplicáveis, regulamentos de registro e transferência, súmulas e documentos de inscrição.
- **Dados úteis:** formato, participantes, datas, critérios de desempate, acesso/descenso, inscrição, substituições, suspensão, logística, premiação, direitos e obrigações de clubes.
- **Registros de atletas:** consultar o BID e os canais oficiais de registro/transferência como fonte de vínculo e status cadastral; disponibilidade de exportação/API pública e termos de reutilização precisam ser confirmados. Não assumir endpoint nem automatizar portal sem verificar política.
- **Acesso:** PDFs, HTML, páginas oficiais e consultas em portais.
- **Limitação:** documento publicado não significa banco de dados aberto para redistribuição. Cada edição deve ser preservada como referência com data, URL, hash, página/artigo e vigência.
- **Decisão:** fonte de verdade para o futebol nacional; representar regras em dados próprios, com interpretação e citação do artigo, sem republicar integralmente manuais protegidos.
- **Prioridade:** P0.

### S09. Federações estaduais brasileiras

Lista inicial de entidades a cobrir: FCF (Santa Catarina), FPF (São Paulo), FERJ (Rio de Janeiro), FMF (Minas Gerais), FGF (Rio Grande do Sul), FPF (Paraná), FGF (Goiás), FBF (Bahia), FPF (Pernambuco), FAF (Amazonas), FCF (Ceará), FNF (Rio Grande do Norte), FPF (Piauí), FFMS (Mato Grosso do Sul), FMF (Mato Grosso), FES (Espírito Santo), FPF (Pará), FTF (Tocantins), e demais federações filiadas à CBF.

- **Dados:** regulamentos estaduais e divisões de acesso, calendário, participantes, registros, súmulas, estádios, arbitragem, base e futebol feminino.
- **Acesso:** site oficial de cada federação e seus sistemas de competição/registro.
- **Cobertura e licença:** variam por federação. Parte das páginas pode não ter API, exportação ou histórico navegável.
- **Decisão:** construir um diretório de federações e um coletor independente por domínio somente após checar os termos. Começar por SC, SP, RJ, MG, RS, PR, BA, PE, CE, GO e PA; depois ampliar para todos os estados.
- **Prioridade:** P0 para regras/participantes do Brasil.

### S10. CONMEBOL

- **URL:** https://www.conmebol.com/
- **Documentos de exemplo:** manuais de clubes Libertadores 2026 e Sudamericana 2026, regulamentos específicos, Código Disciplinar, regulamento de licença de clubes, regulamentos antidoping, segurança e circulares.
- **Dados:** formato e fases, inscrição, elegibilidade, prazos, disciplina, viagens, premiações, obrigações operacionais, estádios, direitos comerciais e vagas.
- **Acesso:** PDFs e documentos oficiais por competição/edição.
- **Limitações:** várias regras dependem de circulares e regulamentos incorporados por referência. O Manual de Clubes não deve ser confundido com o regulamento esportivo completo.
- **Decisão:** fonte de verdade continental. Cada regra do interpretador deve apontar para o documento, edição e artigo que a justifica.
- **Prioridade:** P0.

### S11. Associações nacionais da América do Sul

Diretório inicial:
- Argentina — AFA: https://www.afa.com.ar/
- Uruguai — AUF: https://www.auf.org.uy/
- Chile — ANFP: https://www.anfp.cl/
- Paraguai — APF: https://www.apf.org.py/
- Bolívia — FBF: https://www.fbf.com.bo/
- Equador — FEF: https://www.fef.ec/
- Colômbia — FCF: https://fcf.com.co/ e DIMAYOR: https://dimayor.com.co/
- Peru — FPF: https://fpf.org.pe/
- Venezuela — FVF: https://www.fvf.com.ve/

- **Dados:** ligas nacionais, copas, divisões, calendários, regulamentos, registros de jogadores, árbitros, punições e infraestrutura.
- **Limitações:** nomes de domínios e portais podem mudar; cobertura histórica e disponibilidade de dados variam fortemente.
- **Decisão:** tratar cada país como subprojeto de aquisição com checklist idêntico ao Brasil. Não assumir que o órgão federativo publica todos os registros.
- **Prioridade:** P1, começando Argentina e Uruguai, depois Chile, Colômbia, Paraguai, Equador, Peru, Bolívia e Venezuela.

### S12. FIFA e IFAB

- **FIFA:** https://www.fifa.com/
- **IFAB Laws of the Game:** https://www.theifab.com/laws-of-the-game-documents/
- **Dados úteis:** regras gerais do jogo, substituições e protocolos, janelas internacionais, transferências internacionais e regulamentos de competição.
- **Limitações:** a regra geral não substitui regulamento específico da federação/competição. Regulamentos FIFA podem ter licença e restrições de reprodução.
- **Decisão:** fonte normativa de referência; regras são estruturadas como configuração própria, com artigo e versão.
- **Prioridade:** P0 para regras globais.

---

## 5. Catálogo — jogadores, partidas e estatísticas

### S13. Sportmonks Football API

- **URL:** https://www.sportmonks.com/football-api/
- **Documentação:** https://docs.sportmonks.com/
- **Cobertura:** anuncia mais de 2.200 competições; a cobertura real de campos varia conforme competição e temporada.
- **Dados anunciados:** fixtures, livescores, eventos, tabelas, estatísticas por partida/temporada, artilheiros, equipes, elencos, jogadores, treinadores, árbitros, estádios, lesões, suspensões e histórico. xG e Pressure Index aparecem como pacote adicional.
- **Planos publicados consultados:** Starter a partir de €29/mês (5 ligas), Growth €99/mês (30), Pro €249/mês (120) e Enterprise sob consulta (mais de 2.200); limites de 2.000/2.500/3.000/5.000 chamadas por entidade por hora. Histórico anterior às três últimas temporadas tem adicional único a partir de €29 nos planos Starter/Growth/Pro; Enterprise anuncia histórico completo.
- **Cobertura:** página de cobertura: https://www.sportmonks.com/football-api/coverage/ . Conferir competição por competição, não apenas o número global.
- **Limitações:** a API de cobertura e o plano não provam que o usuário possa manter e redistribuir os dados em um videogame. Necessário esclarecer licença de uso comercial, cache persistente, arquivo histórico, output derivado, atributos calculados, atribuição, sublicenciamento, término do contrato e obrigação de apagar dados.
- **Decisão:** candidato principal para prova de cobertura comparativa. Não contratar antes de comparar com API-Football e receber resposta escrita sobre direitos de jogo comercial.
- **Prioridade:** P1 para avaliação; P2 para contratação.

### S14. API-Football (API-SPORTS)

- **URL:** https://www.api-football.com/
- **Documentação:** https://www.api-football.com/documentation-v3
- **Cobertura:** 1.253 ligas e copas indicadas na página consultada, atualizada em 18/11/2026. A própria página informa que a cobertura pode variar por temporada ou fixture.
- **Endpoints/categorias anunciados:** países, temporadas, ligas, classificações, equipes, partidas, H2H, eventos, escalações, artilheiros, jogadores, treinadores, transferências, troféus, suspensões, lesões, estatísticas, odds e previsões.
- **Planos públicos consultados:** Free 100 requisições/dia; Pro US$16/mês e 7.500/dia; Ultra US$26/mês e 75.000/dia; Mega US$36/mês e 150.000/dia. Taxas por minuto publicadas: 10/min Free, 300/min Pro, 450/min Ultra e 900/min Mega. Preço pode mudar; verificar na contratação.
- **Limitações:** plano Free é útil para um experimento pequeno, não para importar milhares de partidas/jogadores; cobertura detalhada tem flags por campo e por edição; histórico de carreira pode não atingir o nível de completude esperado. Licença de redistribuição/uso em jogo comercial não foi confirmada.
- **Decisão:** candidato direto para comparação com Sportmonks. A primeira prova deve medir as mesmas 10 competições brasileiras e 8 continentais, com amostras de temporadas antigas e recentes.
- **Prioridade:** P1 para avaliação; P2 para contratação.

### S15. Sportradar

- **URL:** https://developer.sportradar.com/
- **Dados possíveis:** calendário, eventos, escalações, estatísticas, jogadores, equipes, temporadas e feeds profissionais, conforme pacote de futebol.
- **Acesso/custo:** comercial/enterprise, geralmente por proposta e escopo contratual.
- **Limitações:** preço, cobertura por liga, histórico, granularidade e redistribuição exigem proposta formal.
- **Decisão:** opção de referência para orçamento futuro se as APIs de preço público não atenderem aos requisitos de qualidade, histórico e SLA.
- **Prioridade:** P3, não necessária para o corte inicial.

### S16. Opta / Stats Perform

- **URL:** https://www.statsperform.com/opta/
- **Dados possíveis:** eventos de partida, estatísticas avançadas, tracking e feeds profissionais em diferentes produtos/licenças.
- **Acesso/custo:** contrato comercial; preço e direitos dependem do pacote e uso.
- **Limitações:** fonte profissional não significa direito automático de reutilizar atributos ou dados derivados no jogo; licenciar arquivo, histórico, reprodução e distribuição separadamente.
- **Decisão:** referência enterprise se houver orçamento e necessidade comprovada. Não construir dependência antes de um piloto.
- **Prioridade:** P3.

### S17. Wyscout

- **URL:** https://wyscout.com/
- **Dados possíveis:** scouting, jogadores, partidas, vídeo, eventos e relatórios, conforme plano.
- **Acesso/custo:** produto comercial; cobertura, exportação e direitos precisam ser negociados.
- **Limitações:** acesso de usuário a uma plataforma não equivale a uma licença de base de dados para redistribuição num jogo.
- **Decisão:** potencial para avaliação profissional/observação, não fonte aberta de pacote.
- **Prioridade:** P3.

### S18. Transferências e contratos — fontes primárias de clubes/federações

- **Fontes:** registros oficiais CBF/BID e sistemas das demais associações; comunicados oficiais de contratação, renovação, empréstimo e saída dos clubes; demonstrações financeiras e documentos societários.
- **Campos possíveis:** jogador, clube de origem/destino, data do anúncio, tipo do vínculo, duração declarada, opção/cláusula quando divulgada, agente apenas quando fonte confiável e pertinente.
- **Limitações:** valores, salários, comissões, direitos econômicos e cláusulas frequentemente não são publicados. Data do anúncio não é necessariamente data de registro nem início do contrato.
- **Decisão:** modelar separadamente announced_at, registered_at, contract_start, contract_end, transfer_effective_at e loan_return_at. Guardar valor como undisclosed quando não houver fonte.
- **Prioridade:** P1.

### S19. FBref / Sports Reference

- **URL:** https://fbref.com/
- **Dados possíveis:** estatísticas de clubes, jogadores, ligas e temporadas, incluindo métricas avançadas em determinadas competições.
- **Status:** RESTRICTED_DO_NOT_INGEST para scraping. O projeto já documenta as restrições e não deve automatizar extração.
- **Decisão:** não construir scraper, não usar datasets espelhados sem prova de direito, não usar para alimentar ratings comerciais. Procurar licença direta se a cobertura for indispensável.
- **Prioridade:** bloqueada.

### S20. Sofascore e Flashscore

- **URLs:** https://www.sofascore.com/ e https://www.flashscore.com/
- **Dados:** resultados, eventos, escalações, ratings e estatísticas.
- **Status:** RESTRICTED_DO_NOT_INGEST no projeto; não usar endpoints não oficiais, API privada, scraping ou mirrors.
- **Decisão:** não automatizar. Procurar fonte licenciada ou federação.
- **Prioridade:** bloqueada.

### S21. StatsBomb Open Data

- **URL:** https://github.com/statsbomb/open-data
- **Dados:** competições, partidas, eventos, escalações e 360 para partidas selecionadas.
- **Licença/termos:** acordo público consultado pelo projeto limita finalidade a análise/pesquisa e proíbe redistribuição e exploração comercial, inclusive análises derivadas, conforme cláusulas descritas em docs/pesquisa/modo-clube/08-verificacao-de-fontes.md.
- **Decisão:** não importar nem usar para calibrar mecânica/ratings comerciais sem autorização escrita. O fato do repositório ser público não torna seus dados livres para uso no jogo.
- **Prioridade:** excluída.

### S22. Metrica Sports sample data

- **URL:** https://github.com/metrica-sports/sample-data
- **Dados:** amostras de tracking e eventos sincronizados, jogos anonimizados.
- **Licença:** não foi encontrada licença formal inequívoca no repositório consultado; o README recomenda reconhecimento da fonte, mas isso não substitui licença.
- **Decisão:** não usar para produto comercial nem para derivar/calibrar valores sem autorização por escrito.
- **Prioridade:** excluída até esclarecimento.

---

## 6. Catálogo — clubes, estádios, cidades e ambiente

### S23. Sites oficiais dos clubes

- **Dados úteis:** denominação, fundação, cidade, história oficial, estádio/mando, CT, departamentos, categorias, comissão, elenco, comunicados de contrato, cores e kit atual, patrocinadores anunciados.
- **Cobertura:** os 156 clubes das Séries A–D brasileiras de 2026 são apenas o primeiro recorte; o cadastro deve abranger clubes históricos e os que podem entrar por acesso/descenso.
- **Limitações:** sites não têm esquema uniforme; releases antigos podem desaparecer; conteúdo/escudos/fotos têm direitos próprios; a existência de uma marca em um uniforme não divulga o valor do patrocínio.
- **Decisão:** fonte oficial preferencial para dados atuais de cada clube. A coleta inicial deve ser assistida e documentada; automatização apenas após avaliar termos e estabilidade.
- **Prioridade:** P0.

### S24. OpenStreetMap

- **URL:** https://www.openstreetmap.org/
- **Dados úteis:** coordenadas, localização, geometria, vias, acessos e alguns atributos de estádios/instalações.
- **Licença:** Open Database License (ODbL), com atribuição e obrigações específicas para bases derivadas/compartilhadas. Tiles e serviços de mapas também têm termos próprios.
- **Limitações:** cobertura e detalhe variam por cidade; nome/capacidade/propriedade de estádio não é garantido; não tratar como fonte de propriedade legal.
- **Decisão:** candidato para geocodificação e distâncias após avaliar implicações ODbL. Guardar source, data, ID OSM e atribuição; não copiar tiles para o jogo.
- **Prioridade:** P1.

### S25. IBGE — população, território e economia municipal

- **URL:** https://www.ibge.gov.br/
- **SIDRA:** https://sidra.ibge.gov.br/
- **APIs:** https://servicodados.ibge.gov.br/api/docs/
- **Dados úteis:** população estimada/censo, área territorial, PIB municipal, renda/indicadores demográficos e geográficos, conforme tabela e período.
- **Uso no jogo:** contexto de mercado local, alcance potencial de torcida, tamanho da cidade, deslocamentos e capacidade comercial.
- **Limitações:** indicadores municipais não representam automaticamente torcedores do clube; pesquisa e período precisam ser preservados; população da cidade não é tamanho da torcida.
- **Decisão:** fonte pública estruturada para contexto geográfico, não para deduzir diretamente número de fãs.
- **Prioridade:** P1.

### S26. INMET — clima brasileiro

- **URL:** https://portal.inmet.gov.br/
- **BDMEP:** https://bdmep.inmet.gov.br/
- **Dados úteis:** precipitação, temperatura, umidade, vento, pressão, radiação e séries de estações meteorológicas.
- **Formato/acesso:** CSV por estação/período e pacotes anuais de dados históricos; parte do serviço exige solicitar e-mail/link temporário.
- **Cobertura:** estações automáticas e convencionais; séries e granularidade variam por estação. O portal informa atualização periódica e disponibilidade histórica.
- **Limitações:** a estação mais próxima pode não representar o estádio; dados horários têm fuso/UTC, dados ausentes e mudanças de layout. Política de uso/redistribuição precisa ser confirmada antes de republicar os dados brutos.
- **Decisão:** calcular perfis climáticos mensais/estacionais para cidade/estádio, guardar estação de referência e metodologia. Não carregar séries horárias completas no pacote do jogo.
- **Prioridade:** P1.

### S27. Fontes nacionais de estatística (fora do Brasil)

Para Argentina, Uruguai, Chile, Colômbia, Paraguai, Equador, Peru, Bolívia e Venezuela, usar institutos nacionais de estatística e serviços meteorológicos oficiais para população, economia, altitude, clima e geografia. A lista de endpoints e licenças deve ser levantada por país na fase de expansão; não assumir que os dados são compatíveis entre si.

- **Decisão:** criar uma tabela de metadados de países e fontes; mapear unidades, ano-base, revisão e metodologia antes de comparar indicadores.
- **Prioridade:** P2.

---

## 7. Catálogo — finanças e governança

### S28. Demonstrações financeiras publicadas pelos clubes

- **Fonte primária:** sites oficiais dos clubes, páginas de transparência, relatórios anuais, demonstrações auditadas e documentos depositados em federações.
- **Dados:** balanço patrimonial, DRE, fluxo de caixa quando publicado, notas explicativas, receita por segmento, custos de futebol, salários, transferências, dívida, ativo intangível, caixa, patrimônio líquido, contingências e auditoria.
- **Cobertura:** desigual. Clubes grandes tendem a publicar mais; clubes menores podem não publicar ou divulgar só documentos sintéticos. SAF pode separar companhia de futebol, associação, arena e outras entidades.
- **Decisão:** armazenar o PDF/relatório de origem com hash; extrair linhas normalizadas e manter perímetro contábil. Não consolidar duas entidades sem regra explícita.
- **Prioridade:** P0 para Série A; P1 para demais divisões.

### S29. Central de Balanços / SPED

- **Serviço:** https://www.gov.br/pt-br/servicos/consultar-balancos-contabeis
- **Dados:** demonstrações contábeis publicadas/depositadas por empresas participantes, quando disponibilizadas no sistema.
- **Acesso:** consulta gratuita; alguns fluxos do SPED dependem de autenticação/cadastro.
- **Limitações:** não há garantia de que todos os clubes, associações, SAFs ou empresas relacionadas participem; identificar corretamente CNPJ, perímetro e tipo societário é obrigatório.
- **Decisão:** buscar documentos primários e complementar os sites dos clubes. Não supor cobertura total.
- **Prioridade:** P1.

### S30. EY — Levantamento Financeiro dos Clubes Brasileiros

- **URL:** https://www.ey.com/pt_br/insights/media-entertainment/levantamento-financeiro-clubes-brasileiros
- **Edição consultada:** levantamento referente a 2025, publicado em 25/05/2026.
- **Dados divulgados:** consolidação de demonstrações publicadas pelos clubes da Série A de 2025; receitas totais/recorrentes e divisões por fonte, dívida líquida, empréstimos e dívida tributária.
- **Papel:** benchmark agregado para conferir ordem de grandeza e consistência das nossas extrações.
- **Limitações:** não é API pública nem base livre. Os relatórios e gráficos são obra protegida; não copiar tabelas completas para o pacote sem autorização. A cobertura do recorte é Série A, não as divisões inferiores.
- **Decisão:** fonte de pesquisa/benchmark; validar números individuais com os demonstrativos originais.
- **Prioridade:** P1.

### S31. Sports Value

- **URL:** https://www.sportsvalue.com.br/
- **Estudos consultados:** finanças TOP 20 clubes 2025 (relatório com 170 páginas) e Valuation TOP 30 clubes 2025.
- **Dados divulgados:** receitas, transferências, TV, marketing, custos do futebol, lucratividade/déficit, dívidas, valuation e marcas; recorte depende do estudo.
- **Papel:** benchmark e conferência de tendências. O relatório de 2025 apresenta dados financeiros e comparações; o valuation tem metodologia própria e ajustes de dívida.
- **Limitações:** relatório proprietário, sem API aberta identificada; metodologia não deve ser confundida com valor contábil ou valor de mercado efetivamente transacionado.
- **Decisão:** usar para confrontar extrações e estimativas, sem reproduzir conteúdo protegido integralmente.
- **Prioridade:** P1.

### 7.1 Normalização financeira obrigatória

Cada linha financeira deve ter, no mínimo:

- entidade jurídica e clube esportivo relacionados;
- exercício/período;
- moeda e unidade (R$, R$ mil, R$ milhões, USD etc.);
- regime/critério contábil informado;
- individual ou consolidado;
- auditado, revisado ou não auditado;
- documento, página/nota e URL;
- valor original e valor normalizado;
- categoria canônica e regra de mapeamento;
- tratamento de inflação/câmbio, se aplicado;
- versão/restatement do documento;
- confiança e observação.

Nunca juntar diretamente “dívida total”, “dívida líquida”, “dívida operacional”, “passivo”, “empréstimos” e “contingências”. São medidas diferentes. Valuation de marca/empresa também não é caixa disponível para contratação.

---

## 8. Catálogo — patrocinadores, uniformes e marca

### S32. IBOPE Repucom — Mapa do Patrocínio

- **URL:** https://www.iboperepucom.com/br/
- **Exemplo consultado:** mapa de patrocínio de uniformes no Brasil em 2025.
- **Dados publicados:** marcas presentes em uniformes de clubes de Série A masculina e Brasileirão Feminino A1, categorias comerciais e posições de exposição.
- **Papel:** referência de inventário comercial, categorias e posição de logos; não é feed de contratos nem API pública.
- **Limitações:** recorte competitivo e temporal; valor dos contratos normalmente não publicado; relatório pode ter direitos próprios.
- **Decisão:** usar publicação aberta para pesquisa editorial e construir inventário próprio a partir de anúncios oficiais de cada clube. Licenciar relatório se for preciso copiar base estruturada.
- **Prioridade:** P1.

### S33. Comunicados oficiais de clubes, patrocinadores e fabricantes

- **Fontes:** newsroom do clube, página da empresa patrocinadora, fabricante de material esportivo, release de lançamento de uniforme e comunicados de renovação.
- **Dados:** empresa/marca, segmento, posição do uniforme, vigência anunciada, tipo de parceria, escopo, bônus/entregas quando publicados, fabricante e temporada do kit.
- **Limitações:** valores contratuais raramente divulgados; anúncio não garante vigência integral nem informa todos os direitos; fotografia/arte do uniforme pode ser protegida.
- **Decisão:** fonte preferencial para patrocínio e uniforme atual. Guardar fato, data e link; não armazenar a imagem de campanha como asset do jogo sem licença.
- **Prioridade:** P0.

### S34. Football Kit Archive

- **URL:** https://www.footballkitarchive.com/
- **Uso:** pesquisa humana de camisa titular/reserva/terceira, fabricante, temporadas, patrocinadores, padrões e variações históricas.
- **Limitações:** imagens de uniformes e compilações do site não devem ser presumidas livres; não foi confirmada uma licença geral que permita baixar e redistribuir todo o catálogo.
- **Decisão:** MANUAL_RESEARCH. Use para descobrir temporada/modelo e depois confirme em fontes oficiais; não extrair imagens em lote nem publicar assets sem licença.
- **Prioridade:** P2.

### S35. Wikimedia Commons — mídia por arquivo

- **URL:** https://commons.wikimedia.org/
- **Uso:** fotografia de jogadores, estádios e cenas de jogos, somente quando o arquivo individual tiver licença compatível, autoria e atribuição verificáveis.
- **Limitações:** licença varia por arquivo; marca/escudo pode ter direitos adicionais; uma licença livre da fotografia não significa autorização para usar uma marca ou imagem de personalidade em qualquer contexto comercial.
- **Decisão:** asset opcional, curado por arquivo, com autor, licença, URL da revisão e obrigações de atribuição. Não usar como desculpa para incluir escudos no produto.
- **Prioridade:** P2.

### S36. FanChants — áudio de torcida

- **URL:** https://www.fanchants.com/commercial/sound-of-the-crowd-catalogue/
- **Catálogo anunciado (snapshot consultado em 2026):** aproximadamente 29 mil cantos, 4.734 equipes, 399 ligas e 22.653 gravações ao vivo. A disponibilidade do recorte Brasil/América do Sul deve ser confirmada por equipe/clube.
- **Licenciamento divulgado:** faixas de licença para jogos/uso comercial em bandas indicativas de menos de US$1.000, US$1.000–5.000, US$5.000–25.000 e projetos bespoke acima disso; preço efetivo depende do escopo e negociação.
- **Direitos:** master recording e direito de composição/publicação podem ser distintos; autorização para usar a gravação não necessariamente libera a letra/música.
- **Acesso:** catálogo comercial e contato para acordo/API; não há API pública para extração livre identificada.
- **Decisão:** não incorporar áudio sem licença por gravação/território/uso/plataforma/prazo. Para primeiro corte, usar ambiente sonoro original/licenciado genericamente, sem letra ou canto reconhecível.
- **Prioridade:** P3.

---

## 9. Fontes sem autorização suficiente — lista de bloqueio

| Fonte/conjunto | Motivo | Ação |
|---|---|---|
| Scraping direto de Transfermarkt | Termos e restrições já registrados no projeto; dados derivados não ganham licença por aparecerem em mirror | Não automatizar; não publicar dados de mirror |
| FBref / Sports Reference | Restrições de scraping e reutilização já documentadas | Não automatizar |
| Sofascore / Flashscore | Endpoints não oficiais e termos não confirmados para redistribuição | Não automatizar |
| ogol / zerozero | Direitos/termos não verificados para uso automatizado/comercial | Consulta humana pontual; não scraping |
| StatsBomb Open Data | Acordo proíbe distribuição e exploração comercial de dados/análises derivadas | Excluído sem autorização escrita |
| Metrica sample data | Licença formal não encontrada no repositório | Excluído até esclarecimento |
| Dados Kaggle sem licença clara | Licença varia por dataset; muitas cópias de outras fontes | Avaliar dataset individualmente; padrão é rejeitar |
| Imagens de camisa/escudo de agregadores | Direitos de fotografia, marca e compilação não resolvidos | Só usar com licença apropriada |
| Gravações/letras de cantos sem licença | Direitos de master, composição e letra podem ser diferentes | Não distribuir |

---

## 10. Matriz de domínios: qual fonte cobre qual necessidade?

Legenda: Forte = candidato direto; Parcial = cobre parte dos campos/temporadas; Manual = consulta humana; Licença = depende de contrato; Não = não é fonte adequada.

| Domínio de dados | Fontes prioritárias | Cobertura inicial | Lacuna esperada |
|---|---|---|---|
| Identidade de jogador | Wikidata, Reep, CBF, sites oficiais | Parcial/Forte | Jogadores de Série C/D e base; aliases e homônimos |
| Carreira por clube e datas | Wikidata, fonte oficial, API licenciada | Parcial | Datas exatas, empréstimos e passagem por clubes pequenos |
| Elenco atual | CBF/BID, federações, sites oficiais, Sportmonks/API-Football | Forte/Parcial | Registro atual de todos os 156 clubes e categorias |
| Estatísticas de partida | APIs comerciais, súmulas/documentos oficiais | Licença/Parcial | Profundidade de eventos e histórico de Série C/D/estaduais |
| Atributos técnicos derivados | Estatísticas autorizadas + modelo próprio | Parcial | Medidas que não se inferem de box score, p.ex. velocidade |
| Atributos mentais/táticos | Relatórios licenciados, scouting original e proxies | Fraca | Evidência pública confiável e comparável |
| Competições e regras | CBF, federações, CONMEBOL, FIFA/IFAB | Forte | Histórico de versões e circulares |
| Resultados históricos | Brasileirão Data, OpenFootball, RSSSF, federações | Forte/Parcial | Jogos estaduais/regionais e anos muito antigos |
| Clubes e fundação | Wikidata, OpenFootball, sites oficiais, federações | Forte/Parcial | Mudança de nome, sucessão jurídica e identidade histórica |
| Cores do clube | Manual de marca e sites oficiais | Manual | Paleta histórica e valores HEX oficiais |
| Escudo e fotografia | Site oficial, Commons arquivo a arquivo | Licença | Direitos de marca e imagem |
| Estádios | OpenFootball, Wikidata, OSM, clubes/municípios | Parcial/Forte | Capacidade atual, propriedade, setores e condição |
| CT/academia | Sites oficiais, relatórios dos clubes, federações | Manual | Qualidade, níveis, manutenção e dados de base |
| Finanças | Demonstrações, Central de Balanços, EY, Sports Value | Parcial | Cobertura de divisões inferiores e perímetro SAF/associação |
| Patrocinadores | Clubes, patrocinadores, IBOPE Repucom | Parcial/Manual | Valor, duração, exclusividade e entregas contratuais |
| Kits/uniformes | Clube/fabricante, Kit Archive como referência | Manual | Licença de imagem e arquivo histórico completo |
| Torcida/popularidade | Pesquisas IBOPE, dados de público, clubes | Parcial | Distribuição geográfica, perfil e confiança da estimativa |
| Comportamento de torcida | Dados de público e estudos específicos | Fraca | Dados públicos raros; não estereotipar torcidas |
| Cantos/áudio | FanChants/licenciamento e áudio original | Licença | Custo e liberação de master + composição |
| Cidades/renda/população | IBGE e institutos nacionais | Forte no Brasil | Comparabilidade internacional |
| Clima/altitude | INMET, serviços nacionais, OSM/IBGE | Parcial | Estação representativa e cobertura continental |
| Árbitros/disciplina | CBF, federações, CONMEBOL e APIs | Parcial | Histórico completo e consistência de identificadores |
| Staff/treinadores | CBF/BID, clubes, Reep, APIs | Parcial | Funções de comissão e datas de vínculo |

---

## 11. Plano de prova de cobertura antes de escolher API

Não escolher fornecedor pelo número “2.200 ligas” ou “1.253 competições”. O teste precisa usar exatamente o nosso escopo e retornar campos observáveis.

### 11.1 Competições de teste

**Brasil — núcleo:**
- Série A, B, C e D.
- Copa do Brasil.
- Estaduais: Catarinense, Paulista, Carioca, Mineiro, Gaúcho, Paranaense, Baiano, Pernambucano, Cearense, Goiano e Paraense.
- Brasileiro Sub-20 e Copinha como testes de base.

**América do Sul:**
- Libertadores e Sul-Americana.
- Campeonatos nacionais de Argentina, Uruguai, Chile, Colômbia e Paraguai.
- Equador, Peru, Bolívia e Venezuela como segunda onda.

### 11.2 Amostra de temporadas

Para cada competição:
- temporada corrente (2026);
- última temporada completa;
- 3 temporadas atrás;
- 5 temporadas atrás;
- 10 temporadas atrás, se existir;
- recorte histórico mais antigo anunciado pelo fornecedor.

### 11.3 Campos que devem ser testados

1. Competição/temporada: ID, nome, país, fase, rodada; regulamento não — API costuma não fornecer texto integral.
2. Clube: ID, nome, aliases, país, cidade, estádio.
3. Elenco: jogador, posição, DOB, nacionalidade, camisa, vínculo/temporada.
4. Partida: data, mando, estádio, placar, status.
5. Escalação: titulares, reservas, posição e treinador.
6. Eventos: gol, cartão, substituição, pênalti, VAR, minuto/tempo extra.
7. Estatísticas: posse, finalizações, passes, faltas, cartões, escanteios, desarmes, interceptações, defesas, grandes chances, duelos aéreos.
8. Métricas avançadas: xG, xA, passes progressivos, PPDA e pressão, quando oferecidos e licenciados.
9. Atleta por temporada: minutos, titularidade, jogos, gols, assistências e métricas por 90.
10. Histórico: transferências, empréstimos, equipes por temporada, técnicos e lesões — quando disponíveis.

### 11.4 Métricas de aceitação

| Métrica | Critério inicial |
|---|---|
| Cobertura de competições do corte 1 | 100% das competições obrigatórias presentes ou alternativa aberta definida |
| Elencos das Séries A–D | Medir percentual de clubes com elenco e percentual de jogadores identificados |
| Jogadores com DOB + nacionalidade + posição | Reportar separado, sem esconder nulos |
| Histórico de temporada | Contagem por liga/ano, não uma afirmação geral |
| Escalação | Percentual de partidas com titulares/reservas |
| Estatísticas | Percentual por campo e por competição |
| Consistência de IDs | Taxa de mapeamento para identidade interna |
| Duplicatas | Zero duplicatas não resolvidas no pacote publicado |
| Termos de uso | Aprovação escrita para armazenamento e uso em jogo comercial |
| Custo | Custo mensal, histórico one-off, excedentes e limites de requisição |

**Amostra mínima:** 20 partidas por competição/temporada onde a API tiver dados; 5 clubes por divisão; 30 jogadores conhecidos por país. Para Série D e estaduais, incluir clubes de menor visibilidade, não só os mais populares.

### 11.5 Decisão de fornecedor

A planilha de avaliação deverá comparar Sportmonks e API-Football por:
- cobertura real dos campos e competições;
- profundidade de histórico;
- precisão de elenco/IDs;
- taxa de nulos e inconsistências;
- atualizações/correções;
- estabilidade e limites;
- preço para a quantidade de ligas necessária;
- licença comercial e retenção;
- direito de criar estatísticas/ratings derivados;
- direito de guardar snapshots após término do contrato.

Não contratar até que o uso em videogame comercial, cache persistente e derivados estejam explícitos no contrato.

---

## 12. Estratégia de normalização proposta

O catálogo é o inventário de proveniência. O modelo canônico precisa permitir que duas fontes contribuam para uma mesma entidade ou fato, sem que uma substitua silenciosamente a outra.

### 12.1 Camadas

1. **Raw:** documento/arquivo/API original, metadados de coleta, hash, versão, licença, URI e, quando permitido, snapshot.
2. **Staging:** parsing fiel do formato de origem; nomes e IDs externos ainda não resolvidos.
3. **Canonical:** clubes, jogadores, pessoas, competições, temporadas, partidas, contratos, estádios e fatos normalizados.
4. **Evidence:** vínculo entre campo/fato canônico e uma ou mais fontes, incluindo precisão, período de validade, confiança e decisão editorial.
5. **Game projection:** pacote real por região/temporada e schemas da engine. Somente campos elegíveis por licença e cobertura passam para cá.

### 12.2 Resolução de entidade

- O ID interno é estável e nunca é o ID de um provedor.
- ExternalId é único por (provider, entity_type, external_id).
- Reep, Wikidata e IDs oficiais são pistas fortes, mas não infalíveis; conflito deve gerar revisão.
- Não unir jogadores só por nome. Nome normalizado é candidato, não prova.
- Para jogador: combinar data de nascimento, nacionalidade, nome/aliases e contexto de carreira; quando houver ambiguidade, não casar automaticamente.
- Para clube: combinar país, cidade, entidade histórica, nome/aliases e sucessão; não fundir homônimos nem equipe principal com B/U20/feminina.
- Para partidas: competição, temporada, fase/rodada, data local, mandante e visitante; placar é verificação adicional, não a única chave.
- Para staff e árbitros: tipo da pessoa/role separado de jogador; nomes homônimos não podem ser fundidos automaticamente.
- Mudança de nome, fusão, sucessão e transformação em SAF são eventos/relacionamentos temporais, não sobrescrita de identidade.

### 12.3 Temporalidade

Cada fato que muda com o tempo precisa distinguir:
- observed_at: quando a fonte foi consultada/coletada;
- valid_from / valid_to: quando o fato é válido no mundo real;
- published_at: quando a fonte publicou;
- season_id: temporada à qual se aplica;
- date_precision: dia, mês, ano, intervalo ou desconhecido.

Nunca inferir que o dia do comunicado é automaticamente o início do contrato, nem que uma transferência anunciada é o registro federativo.

### 12.4 Conflitos e precedência

Precedência por tipo de campo — não por “uma fonte melhor para tudo”:

| Campo/fato | Precedência sugerida |
|---|---|
| Regulamento esportivo | Documento oficial da organizadora e edição aplicável |
| Registro ativo do atleta | Federação/registro oficial, quando consultável |
| Elenco anunciado | Clube oficial; comparar com registro federativo |
| Data de nascimento | Registro oficial/fonte biográfica confiável + Wikidata como ponte |
| Passagem histórica | Documento oficial/arquivo primário; cruzar duas fontes independentes |
| Estatística de partida | Provedor licenciado escolhido para aquela competição; súmula oficial quando disponível |
| Demonstração financeira | Documento publicado pela entidade; EY/Sports Value como reconciliação |
| Patrocinador e posição | Clube/patrocinador + estudo independente |
| Cor institucional | Manual de marca/comunicação oficial; valor HEX estimado identificado como tal |
| Capacidade de estádio | Clube/operador/município; OSM/Wikidata como complemento |
| Torcida | Pesquisa de opinião identificada e datada; público observado não equivale a torcida total |
| Canto/áudio | Titular dos direitos ou licenciante comprovado |

Não existe regra geral “última fonte vence”. Uma atualização de 2026 não altera automaticamente um fato histórico válido em 1998.

### 12.5 Proveniência por campo/fato

O contrato canônico deve suportar:
- source_id;
- source_record_id ou external_id;
- source_uri;
- retrieved_at;
- published_at;
- valid_from e valid_to;
- source_license_id e versão dos termos;
- commercial_use_status;
- redistribution_status;
- confidence;
- verification_status;
- date_precision;
- raw_document_hash;
- transformation_id para dados derivados.

Um valor derivado deve registrar inputs e fórmula/versão. Se a fórmula de reputação, força ou atributo mudar, podemos reconstruir os resultados.

---

## 13. Atributos dos jogadores: política própria

O ADR-019 define 54 atributos de jogador e 10 de treinador. Nenhum rating pronto de FM, EA FC, Sofascore ou outro jogo entra no pacote real.

Separar três grupos:

### A. Observáveis derivados de estatísticas

Exemplos: passe curto, passe longo, cruzamento, finalização, desarme, interceptação, disputa aérea, recuperação, faltas e defesa de goleiro. Derivar por temporada, minutos, posição/função, competição e força relativa do adversário, com shrinkage para amostras pequenas.

### B. Observáveis que exigem dados de evento/tracking

Exemplos: scanning, orientação corporal, awareness espacial, reação à perda, posicionamento sem bola, timing de corrida, cobertura, disciplina tática, pressão e coordenação coletiva. Não inferir com confiança a partir de gols/assistências ou estatísticas agregadas. Exigir eventos/tracking/licença ou marcar como estimativa fraca.

### C. Características não inferíveis diretamente

Exemplos: velocidade máxima, aceleração, pé fraco, personalidade, determinação, profissionalismo, liderança, potencial e consistência. Exigem scouting, medição, observação ou modelo explícito com incerteza. Ausência de fonte não autoriza preencher com um valor médio apresentado como real.

### Regras

- atributos do jogo não são percentis brutos de estatística;
- normalizar por posição, idade, competição, temporada e exposição/minutos;
- manter intervalo/confiança e sample size;
- não comparar 30 minutos de amostra com uma temporada completa;
- separar valor observado, derivado e avaliado;
- potencial é estimativa de trajetória, não fato;
- ratings só entram no pack depois de teste de distribuição e impacto na engine;
- cada atributo deve ter efeito demonstrável na simulação (ADR-019).

---

## 14. Torcida, cultura e cantos — modelar sem estereótipo

Não existe uma base pública ampla que entregue, com qualidade comparável, “padrão da torcida” de todos os clubes brasileiros e sul-americanos.

Usar evidências separadas:
- tamanho estimado de torcida: pesquisas, com data, amostra, universo e margem de erro;
- sócios: clube, com data e definição (sócio adimplente, cadastrado, plano ativo);
- público: borderôs/súmulas/relatórios por partida;
- ocupação: público dividido pela capacidade oficialmente disponível para aquela partida;
- deslocamento de visitante: borderô/relatório, quando publicado;
- grupos organizados: apenas relações públicas documentadas, sem tratar grupo como representativo de toda a torcida;
- cantos: metadados e temas gerais; letras e áudio dependem de direitos;
- humor/pressão no jogo: derivado por regras de simulação e contexto esportivo, não por rótulos fixos de uma cidade/torcida.

**Não** inferir violência, racismo, classe social, comportamento ilegal ou “temperamento” de toda a torcida a partir de incidentes isolados ou de associações geográficas. Eventos públicos específicos podem ser registrados com fonte e contexto, mas não caracterizam todos os torcedores.

---

## 15. Lacunas já identificadas e tratamento

| Lacuna | Impacto | Tratamento |
|---|---|---|
| Elencos completos da Série D e clubes de estaduais menores | Alto | Coleta oficial clube a clube, portão de cobertura e janela de corte por temporada |
| Carreira histórica anterior a 2000 | Alto para histórico | Wikidata + registros históricos + validação; manter precisão anual quando só ano for conhecido |
| Atributos físicos/mentais/táticos | Alto para simulação | Não inventar; desenvolver modelo por evidência e confidence |
| Regras antigas e circulares não arquivadas | Alto para simular temporadas passadas | Capturar documentos por edição e manter unknown onde não há evidência |
| Finanças de clubes pequenos | Médio/alto para economia | Demonstrações públicas quando houver; estimativa calibrada separada de dado real |
| Valores de patrocínio e salário | Médio | Não divulgados = nulo; estimativa só em camada derivada |
| Cores históricas | Baixo para lógica, alto para apresentação | Manual de marca/imagens oficiais como referência; palette estimada com provenance |
| Imagens de escudos/uniformes | Alto risco de propriedade intelectual | Não incluir sem licença; manter representação por iniciais e cores |
| Popularidade e comportamento | Médio | Pesquisas, borderôs e proxies declarados; sem estereótipo |
| Áudio de torcida | Médio para imersão, alto custo legal | Áudio original/licenciado no primeiro corte; FanChants sob orçamento posterior |
| Histórico completo de transferências | Alto para mercado | Comunicado oficial + registro; valor e contrato como não divulgado quando necessário |

---

## 16. Próximos passos operacionais

### Sprint de pesquisa A — fontes abertas e oficiais

1. Confirmar licença do snapshot Brasileirão Data e baixar manifesto/schema sem copiar assets não autorizados.
2. Auditar versões atuais de OpenFootball clubs/leagues e medir clubes BR/SA sem duplicatas.
3. Fazer amostra Wikidata de 100 jogadores brasileiros (anos 1970–2026) e 50 jogadores por país prioritário, medindo passagem/datas/posição/nacionalidade.
4. Construir lista de URLs oficiais de CBF, federações e CONMEBOL para regulamentos 2024–2027.
5. Listar documentos financeiros 2024/2025 publicados por entidades dos clubes Série A–D.

### Sprint de pesquisa B — provedores comerciais, sem contratar

1. Rodar checklist de 20 competições brasileiras e 8 continentais em Sportmonks e API-Football.
2. Comparar 20 partidas por edição e campos críticos.
3. Pedir confirmação escrita dos direitos de uso comercial em videogame, cache, retenção histórica, derivados, atribuição e término.
4. Fazer avaliação de custo sem inserir credencial ou dados pagos no repositório.
5. Decidir se há lacuna que justifique contratar um único fornecedor.

### Sprint de pesquisa C — clubes, marcas e cultura

1. Criar planilha de 156 clubes brasileiros 2026 e respectivas fontes oficiais.
2. Coletar identidade textual, cidade, estádio, fundação e paleta institucional com provenance.
3. Fazer mapa de patrocinadores por clube/temporada/posição, sem estimar valores não divulgados.
4. Levantar público por jogo e capacidade do estádio com fonte.
5. Avaliar licenciamento de áudio somente quando o núcleo da base estiver fechado.

### Artefatos seguintes

- 21-matriz-de-cobertura-por-competicao.md: matriz por país/competição/temporada/campo para fornecedores e fontes abertas.
- 22-modelo-canonico-e-proveniencia.md: modelo relacional completo e contratos de staging/canonical/evidence/game projection.
- 23-contrato-de-fontes-e-licencas.md: schema e checklist de direitos para aprovar/rejeitar fonte.
- 24-plano-de-importacao-e-qualidade.md: pipelines, idempotência, DQ, reconciliation e gates de publicação.

---

## 17. Fontes verificadas nesta revisão

A lista abaixo identifica páginas oficiais ou páginas de catálogo consultadas em 18/11/2026. O link é o ponto de partida; antes de importar, salvar o arquivo/versão/hash e revalidar licença/termos.

1. Wikidata Licensing — https://www.wikidata.org/wiki/Wikidata:Licensing
2. Reep Data — https://reep.football/data/
3. Reep Documentation — https://www.reep.football/docs/
4. Brasileirão Data — https://brasileirao.murakams.com/
5. Brasileirão Data Downloads/Manifest — https://brasileirao.murakams.com/data/
6. RSSSF Brasil — https://rsssfbrasil.com/historical.htm
7. OpenFootball — https://github.com/openfootball
8. CBF Manual de Competições — https://www.cbf.com.br/a-cbf/noticias/cbf-social/a/cbf-divulga-manual-de-competicoes-documento-que-substituira-o-regulamento-geral-das-competicoes
9. CONMEBOL Libertadores 2026 — https://cdn.conmebol.com/wp-content/uploads/2025/12/CL-2026-Manual-de-Clubes-POR-1.pdf
10. CONMEBOL Sudamericana 2026 — https://cdn.conmebol.com/wp-content/uploads/2025/12/CS-2026-Manual-de-Clubes-POR-1.pdf
11. Sportmonks Pricing — https://www.sportmonks.com/football-api/plans-pricing/
12. Sportmonks Coverage — https://www.sportmonks.com/football-api/coverage/
13. Sportmonks API Docs — https://docs.sportmonks.com/
14. API-Football Pricing — https://www.api-football.com/pricing
15. API-Football Coverage — https://www.api-football.com/coverage
16. EY Levantamento Financeiro — https://www.ey.com/pt_br/insights/media-entertainment/levantamento-financeiro-clubes-brasileiros
17. Sports Value Finanças TOP 20 2025 — https://www.sportsvalue.com.br/case-studies/financas-top-20-clubes-brasileiros-em-2025-em-busca-do-crescimento-financeiro-sustentavel/
18. Sports Value Valuation TOP 30 2025 — https://www.sportsvalue.com.br/case-studies/valuation-top-30-clubes-do-brasil-2025-6a-edicao/
19. Central de Balanços — https://www.gov.br/pt-br/servicos/consultar-balancos-contabeis
20. IBOPE Repucom — https://www.iboperepucom.com/br/
21. FanChants licensing — https://www.fanchants.com/commercial/sound-of-the-crowd-catalogue/
22. INMET BDMEP — https://bdmep.inmet.gov.br/
23. IBGE APIs — https://servicodados.ibge.gov.br/api/docs/
24. OSM Foundation Licensing — https://osmfoundation.org/wiki/License/Licence_and_Legal_FAQ
25. IFAB Laws — https://www.theifab.com/laws-of-the-game-documents/
26. FIFA — https://www.fifa.com/
27. StatsBomb Open Data terms — https://github.com/statsbomb/open-data
28. Metrica sample data — https://github.com/metrica-sports/sample-data
29. Football Kit Archive — https://www.footballkitarchive.com/
30. Wikimedia Commons — https://commons.wikimedia.org/
