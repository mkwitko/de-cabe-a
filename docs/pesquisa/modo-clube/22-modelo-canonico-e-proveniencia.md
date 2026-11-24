# 22 — Modelo canônico, proveniência e projeção para o Modo Clube

**Data:** 2026-11-18  
**Estado:** proposta de arquitetura de dados; não altera o PackSchema nem as ADRs aceitas.  
**Base atual:** ADR-014, ADR-016, ADR-019, packages/club-domain/src/pack/schema.ts, GAME_DESIGN/MODO_CLUBE/03, 04, 05, 06 e 07.

---

## 1. Decisão arquitetural central

O projeto precisa de uma base interna mais rica que o pacote consumido pela simulação. Não devemos colocar toda a evidência, documentos, snapshots de API, versões de termos e divergências dentro do Pack.

A recomendação é separar dois produtos de dados:

1. **Football Knowledge Base (F-KB):** área de pesquisa e normalização. Contém entidades canônicas, identificadores externos, histórico, observações por fonte, documentos, evidências, conflitos, licenças e transformações.
2. **Game Data Pack:** projeção compacta, imutável e validada por temporada, consumida pelo Modo Clube conforme ADR-014. Só recebe os campos liberados por licença, suficientemente completos para o jogo e validados pelo gate de publicação.

O F-KB não é uma segunda fonte concorrente do Pack: é o processo rastreável que produz o Pack. O Pack continua sendo a fotografia mestre imutável de uma carreira.

## 2. Compatibilidade com o PackSchema atual

O PackSchema já tem as famílias necessárias para o jogo: competitions, clubs, players, staff, assignments, governance, cities, academies, youthCompetitions e pools de nomes. Não recriar essas entidades num novo pacote paralelo.

### 2.1 Mapeamento

| F-KB / entidade canônica | Projeção existente | Observações |
|---|---|---|
| Person + PlayerProfile | PackPlayer | Identidade, nascimento, nacionalidade e posição; carreira e estatísticas completas ficam no F-KB |
| PlayerAttributeAssessment | PackPlayer.attributes / personality / hidden / potential | Atributos são avaliações/modelos; manter marks e confiança |
| Club + ClubIdentity + ClubSeasonProfile | PackClub | Projetar cidade, cores, estádio, reputação, finanças iniciais, instalações, departamentos, torcida e rivalidades |
| LegalEntity + OwnershipRelationship | PackGovernance | Associação/SAF/grupo e perfil de controle |
| Competition + CompetitionSeason + RuleSet | PackCompetition | A edição deve carregar regras e participantes corretos; usar schema existente |
| City + ClimateProfile | PackCity | Projeto regional; hoje o pacote é Brasil-only |
| Academy + YouthCompetition | PackAcademy / PackYouthCompetition | Manter origem geográfica e estrutura de formação |
| StaffPerson + StaffRole + StaffAssessment | PackStaff / PackStaffAssignment | Separar pessoa, função, avaliação e vínculo temporal no F-KB |
| Sponsor + SponsorshipAgreement | PackClub.sponsors | Projeção atual é simplificada; contrato detalhado fica no F-KB e só campos necessários vão ao Pack |

### 2.2 Limites encontrados no schema atual

O schema atual é uma projeção de jogo, não um modelo de pesquisa completo. As seguintes lacunas devem ser resolvidas por ADR ou por ajuste de schema antes de entrar no Pack real:

1. **Região:** PackSchema usa region: BR. Isso atende à primeira entrega Brasil, mas não representa um universo sul-americano multi-país. Não mudar para um enum amplo sem decidir como o Modo Clube vai separar pacotes nacionais, continentais e ligas estrangeiras.
2. **Proveniência de clubes e cidades:** PackPlayer possui marks por campo e PackStaff tem marks; PackClub não oferece atualmente um mapa de procedência por campo para cores, estádio, torcida, patrocinadores e valores iniciais; PackCity também não tem marks próprios. A documentação 03 prevê procedência fora do pacote e marca simplificada por campo publicado. Precisamos alinhar essa regra ao schema, provavelmente adicionando field marks compactos para as projeções importantes.
3. **Cores:** PackClub.colours guarda duas cores HEX, sem tipo (primária/secundária/terceira), período, método de extração ou origem. O F-KB deve suportar paletas temporais e fonte; o Pack escolhe duas cores para renderização.
4. **Estádio:** PackClub.stadium é objeto embutido, sem stadiumId estável, histórico, setores ou coordenadas. O F-KB precisa de Stadium como entidade canônica relacionada a clube por período; a projeção atual pode continuar embutida no primeiro corte.
5. **Patrocínios:** PackClub.sponsors hoje armazena name, annual e until. Isso é insuficiente para marca, categoria, empresa jurídica, propriedade do uniforme, contrato, bônus, exclusividade e data inicial. Não aumentar o Pack com o contrato inteiro sem avaliar o custo de simulação; projetar apenas os valores necessários e manter o contrato rico no F-KB.
6. **Torcida:** PackClub.fans contém size, loyalty, demand, patience, priceSensitivity, localIdentity, youthPride e ambition. O F-KB deve distinguir pesquisa de tamanho de torcida, sócios, público por jogo, ocupação e avaliação/proxy de comportamento. Esses indicadores não são intercambiáveis.
7. **Finanças:** initialCash e initialDebt são valores de abertura de carreira, não um balanço financeiro histórico. O F-KB deve preservar demonstrações e períodos; o pack projeta somente caixa/dívida inicial e orçamento necessário ao cenário.
8. **Jogadores:** PackPlayer não contém o histórico completo de carreira, appearances ou estatísticas por competição/temporada. O F-KB deve conservar essas tabelas para gerar atributos, mercado, reputação e relatório de scouting.
9. **Contrato de atleta:** PackPlayer.contract contém wage, until e releaseFee. Contratos e transferências completos, com precisão de datas e cláusulas, ficam no F-KB; o Pack recebe apenas o estado inicial relevante.
10. **Temporadas e regulamentos:** a edição das competições já é parte do Pack via ADR-016. A F-KB precisa guardar documentos e artigos fonte que justificam cada regra, sem colocar PDFs no Pack.
11. **Clubes históricos e sucessões:** PackClub tem ID, nome e país via cidade; o F-KB deve representar aliases, mudanças de nome, fusão, sucessão, SAF, entidade jurídica e equipes B/femininas/base sem fundi-las incorretamente.
12. **Assets:** o Pack atual não inclui escudos e evita assets sem licença. Manter essa restrição: asset só entra quando a licença estiver documentada e permitir uso comercial no produto.

Estas lacunas não são autorização para alterar silenciosamente o contrato. Antes de acrescentar campos ao PackSchema, registrar ADR e atualizar os exemplos de pack e testes de qualidade.

## 3. Camadas de dados

### L0 — Source Registry

Catálogo versionado das fontes, direitos e capacidade de uso:
- fonte e identificador;
- domínio/país/competição cobertos;
- tipo de acesso (API, dump, documento, consulta manual);
- versão dos termos/licença e data de verificação;
- uso interno, comercial, redistribuição, derivados e retenção;
- restrições de chamada e atribuição;
- contato/contrato, quando aplicável.

### L1 — Raw Evidence

Objeto original imutável, quando a licença permitir:
- resposta JSON/XML/CSV original;
- PDF/HTML original ou referência/hash quando armazenamento não for permitido;
- arquivo tabular;
- imagem/áudio apenas se a licença autorizar;
- metadados de captura, URL, data, status HTTP, headers úteis, checksum.

Se a fonte proíbe armazenamento, guardar somente metadados mínimos e referência autorizada. Não criar cópia raw que viole o contrato.

### L2 — Staging

Parsing fiel à estrutura da origem:
- nomes e IDs como recebidos;
- campos sem normalizar;
- formatos e unidades originais;
- campos nulos e flags do fornecedor;
- erros de parsing;
- relação com SourceRecord e IngestionRun.

Staging não resolve identidade e não corrige informação original.

### L3 — Canonical Knowledge Base

Entidades estáveis e fatos tipados:
- pessoas, jogadores, treinadores, árbitros;
- clubes, equipes, entidades jurídicas, marcas;
- cidades, estádios, academias;
- competições, temporadas, fases e regulamentos;
- partidas, participações e eventos;
- contratos, vínculos, transferências;
- estatísticas;
- demonstrativos financeiros;
- patrocínios, kits, torcida e áudio;
- atributos observados/estimados/derivados.

### L4 — Evidence & Reconciliation

- evidências de cada campo/fato;
- conflitos e candidatos alternativos;
- regras de precedência;
- aprovação/recusa editorial;
- versão do normalizador e da transformação;
- confiança e precisão temporal;
- estado jurídico do dado;
- auditoria da decisão humana.

### L5 — Game Projection / Pack Builder

- escolhe temporada e conjunto de competições;
- resolve identidades e vínculos;
- calcula atributos;
- deriva perfis de clubes, economia, torcida e reputação;
- aplica critérios de cobertura;
- checa direitos;
- valida com PackSchema e checkCompetitions;
- cria manifesto e checksum;
- publica uma versão imutável do Pack.

## 4. Entidades canônicas

A seguir estão grupos lógicos. Não é uma proposta de criar todas as tabelas num único migration; cada grupo só vira schema físico quando houver consumidor e fonte.

### 4.1 Fonte, coleta e proveniência

| Entidade | Campos essenciais | Chave/regra |
|---|---|---|
| DataSource | id, code, name, domain, accessMode, owner, status | code único |
| SourceTermsVersion | sourceId, version, checkedAt, licence, commercialUse, redistribution, derivatives, retention, attribution, termsUrl, notes | manter histórico dos termos |
| SourceCoverage | sourceId, country, competitionExternalId, seasonRange, fieldGroup, status, checkedAt | cobertura por campo/temporada |
| SourceArtifact | sourceId, URI, contentHash, mediaType, revision, retrievedAt, publishedAt | hash identifica o conteúdo capturado |
| IngestionRun | sourceId, startedAt, completedAt, importerVersion, parameters, counts, status | idempotência por artefato/versão |
| SourceRecord | artifactId, externalRecordId, rawPointer, rawHash, parseStatus | unique por artifact + externalRecordId |
| Transformation | code, version, inputSchema, outputSchema, codeHash, description | versão imutável |
| FieldEvidence | entityType, entityId, fieldPath, sourceRecordId, normalizedValueHash, observedAt, validFrom, validTo, datePrecision, confidence, reviewStatus, rightsStatus, transformationId | evidência rastreia valor, não substitui a coluna tipada |
| ReconciliationCase | entityType, candidateIds, conflictType, openedAt, resolvedAt, decision, reviewer | toda ambiguidade manual deixa trilha |

**Regra:** não usar um EAV genérico como banco principal de jogador/clube/partida. Os domínios devem ter tabelas tipadas; FieldEvidence serve para procedência e auditoria, não como única forma de consultar o valor atual.

### 4.2 Identidade, pessoas e aliases

| Entidade | Campos essenciais |
|---|---|
| Entity | id interno, type, createdAt, lifecycleStatus |
| ExternalIdentity | entityId, providerCode, externalId, entityType, firstSeenAt, lastSeenAt, mappingStatus |
| EntityAlias | entityId, alias, normalizedAlias, language, aliasType, validFrom, validTo, evidenceId |
| Person | entityId, canonicalName, birthDate, birthDatePrecision, nationality/other nationalities |
| PlayerProfile | personId, preferredName, birthCityId, heightCm, foot, positions, activeStatus |
| StaffProfile | personId, role history, coaching licences, specialties |
| RefereeProfile | personId, category, federation, role history |

- Um atleta é uma pessoa com perfil de jogador; treinador pode ter também perfil de jogador histórico.
- Não criar dois registros de pessoa porque os papéis são diferentes.
- Não mesclar pessoas só por nome.
- Nome público, nome civil e alias são campos diferentes.
- Data de nascimento com precisão apenas anual não deve ser convertida para 1º de janeiro como se fosse dia confirmado.

### 4.3 Clubes, equipes e entidades legais

| Entidade | Campos essenciais |
|---|---|
| Club | id, canonicalName, shortName, countryId, foundedDate, identityStatus |
| ClubAlias | clubId, alias, language, validFrom, validTo |
| ClubRelationship | fromClubId, toClubId, type, validFrom, validTo, evidenceId |
| Team | id, clubId, category, gender, ageGroup, reserveLevel, country |
| LegalEntity | id, legalName, taxId (com proteção apropriada), legalForm, country |
| ClubLegalRelationship | clubId, legalEntityId, relationshipType, validFrom, validTo |
| OwnershipRelationship | legalEntityId, ownerEntityId, share, controlType, validFrom, validTo |
| ClubSeasonProfile | clubId, seasonId, sportTier, reputation, financeProfile, cultureProfile |
| ClubColor | clubId, role, hex, validFrom, validTo, method |
| ClubFacility | clubId, facilityId, function, ownershipOrUse, validFrom, validTo |

Club, Team e LegalEntity não são sinônimos. Uma SAF, associação, time B e equipe feminina precisam poder estar relacionados sem colapsar suas identidades.

### 4.4 Cidades e instalações

- Country: ISO-3166-1, nome, aliases e fonte.
- State/Region: código oficial/nacional e vínculo ao país.
- City: nome oficial, subdivisão, população com data, coordenadas e altitude.
- CityMetric: indicador, unidade, valor, período, método e fonte.
- ClimateStation: instituição, código, coordenadas, altitude e período operacional.
- CityClimateProfile: estatísticas mensais/estacionais derivadas de estação(ões) e método.
- Venue/Stadium: nome, cidade, coordenadas, tipo, capacidade e fonte.
- VenueCapacityHistory: capacidade e intervalo de validade.
- VenueClubUse: clube, tipo de mando/uso, intervalo, contrato quando conhecido.
- VenueSector: setor, capacidade e acessibilidade, quando publicado.
- TrainingGround: instalações e campos de treino; não inferir nível técnico só da quantidade de campos.

### 4.5 Competições, temporadas e regras

| Entidade | Campos essenciais |
|---|---|
| Competition | id, organizerId, countryId, scope, officialName, category |
| CompetitionSeason | competitionId, seasonLabel, startDate, endDate, status, sourceVersion |
| CompetitionStage | competitionSeasonId, stageKey, formatType, sequence, configuration |
| CompetitionParticipant | competitionSeasonId, clubId/teamId, entryReason, status |
| RuleDocument | organizer, competitionSeasonId, documentType, version, publishedAt, effectiveFrom, URI, hash |
| RuleClause | ruleDocumentId, article, title, extractedMeaning, structuredRuleKey |
| RuleSet | competitionSeasonId, version, structuredConfig, sourceDocumentIds, validationStatus |
| CompetitionOutcome | stageId, selector, destination, access/relegation/slot/prize |
| RegistrationWindow | competitionSeasonId, opensAt, closesAt, allowedActions |
| DisciplineRule | competitionSeasonId, sanction, threshold, scope, resetCondition |

A estrutura canônica mantém documento, artigo e interpretação. O Pack contém somente configuração estruturada usada pelo interpretador, seguindo ADR-016. Uma alteração de regra cria nova versão; não sobrescreve edição passada.

### 4.6 Elenco, contrato e carreira

- PlayerRegistration: jogador, clube/equipe, competição se aplicável, status, registeredAt, validFrom/validTo.
- PlayerClubSpell: jogador, clube, equipe/categoria, tipo (pro, loan, youth), início/fim e precisão.
- PlayerContract: vínculo legal, datas, salário quando divulgado/autorizado, moeda/período, bônus/cláusulas.
- Transfer: origem, destino, tipo, data de anúncio, registro, eficácia, fee, moeda e disclosureStatus.
- LoanAgreement: clube cedente, receptor, retorno, opção/obrigação, repartição salarial e cláusulas.
- FormationRecord: clube formador, período, compensação/solidariedade e evidência.
- PlayerSeasonSquad: clube/equipe/temporada, camisa, posição e status de elenco.

Não inferir empréstimo de uma simples ida e volta sem uma marca explícita. Inferência pode ser uma hipótese revisável, não uma transferência confirmada.

### 4.7 Partidas e estatísticas

- Match: competição/temporada/fase, data UTC, data local, mandante, visitante, venue, status e placar.
- MatchOfficial: árbitro, assistentes, quarto árbitro, VAR.
- MatchAppearance: jogador, equipe, titular/reserva, posição, camisa, capitão, minutos.
- MatchEvent: tipo, equipe, jogador(es), período, minuto, tempo adicional, coordenada se licenciada.
- TeamMatchStat: métrica, valor, unidade, definição e source provider.
- PlayerMatchStat: jogador, partida, métrica, valor, unidade, exposição/minutos.
- PlayerSeasonStat: jogador, equipe, competição/temporada, métrica, valor, minutos, partidas e denominador.
- MetricDefinition: código, definição operacional, unidade, inclusões/exclusões, fonte/versão.

Uma estatística precisa de definição, unidade, denominador e cobertura. “Duelos aéreos”, “grandes chances” e “passes progressivos” podem ter definições diferentes entre provedores. Não misturar números antes de alinhar definições.

### 4.8 Avaliações e atributos

- AttributeDefinition: atributo, família, escala, definição observável e consumidor na engine.
- AttributeAssessment: jogador, atributo, valor/faixa, season/date, assessmentType (observed, derived, scout, estimated, adjusted), confidence, sampleSize.
- AttributeModelVersion: fórmula, features, treinamento/versão, normalização, validação e range.
- AttributeInput: estatística ou observação que alimenta a avaliação.
- AttributeReview: pessoa responsável, motivo, decisão e histórico.

Manter atributos reais/avaliados separados de potencial e de estado de carreira. Só atributo com efeito na engine entra no perfil exibido conforme ADR-019.

### 4.9 Finanças

- FinancialEntity: entidade jurídica e relação com clube esportivo.
- FinancialStatement: exercício, tipo, data de publicação, perímetro, moeda, status de auditoria e documento.
- FinancialLineItem: código canônico, valor original, unidade, moeda, valor normalizado, nota/página.
- FinancialMetric: indicador derivado, fórmula, período, entidade e versão.
- CurrencyRate: moeda, data, fonte, método de conversão.
- InflationIndex: país, índice, mês/ano base, fonte.
- FinancialScenarioProjection: hipótese de jogo; não deve ser confundida com fato publicado.

Separar:
- receita operacional e receita total;
- receitas recorrentes e transferência;
- dívida bruta, líquida, operacional, fiscal e empréstimos;
- passivo, contingência e patrimônio;
- fluxo de caixa e resultado contábil;
- valuation e caixa disponível.

### 4.10 Patrocínios, uniformes e mídia

- Brand: marca, empresa proprietária, segmento, país e aliases.
- SponsorAgreement: clube, brand, legalEntity, período, property, categoria de exclusividade, valor e disclosure status.
- SponsorDeliverable: obrigação, gatilho, valor, evidência de entrega.
- Kit: clube/equipe, temporada, fabricante, edição, tipo (home/away/third/goalkeeper), padrão e cores.
- KitSponsorPlacement: kit, brand, posição, período e evidência.
- MediaAsset: URI, autor, titular, licença, validade, atribuição, territory, mediaType, hash, status.
- AssetEntityLink: asset e entidade representada; não presume que licença de foto libere marcas representadas.
- Chant: equipe/grupo, nome curto, origem/contexto, idioma, temas e status.
- ChantRecording: recording, titular do master, licenciante, composição, autores, licença de sincronização, territórios e prazos.

### 4.11 Torcida e cultura

- SupporterEstimate: clube, população estimada, data, pesquisa, universo, amostra e margem de erro.
- MembershipSnapshot: sócios, data, definição do plano/status e fonte.
- Attendance: partida, público, capacidade disponível, renda quando divulgada e fonte.
- SupporterGroup: nome, cidade, clube relacionado, datas e evidência pública.
- SupporterGroupRelationship: grupo, clube, relação, temporalidade e fonte.
- ClubCultureAssessment: perfil do clube, dimensão, indicador, método, confidence e reviewer.
- Rivalry: clubes, tipo, escopo, início aproximado e fontes históricas.

Não criar um “perfil comportamental da torcida” sem observação, período e método. Popularidade, sócios, público e comportamento de estádio são dimensões diferentes.

## 5. Evidência: estrutura mínima

Cada fonte gera registros de observação; cada observação pode apoiar, contradizer ou complementar um fato já conhecido.

Uma observação mínima deve conter:
- sourceId e termsVersionId;
- sourceArtifactId/sourceRecordId;
- entityType/entityId e fieldPath;
- valor bruto ou ponteiro para o registro bruto;
- valor normalizado e hash;
- collectedAt e publishedAt;
- validFrom/validTo e datePrecision;
- transformationId/version;
- confidence e verificationStatus;
- commercialUseStatus e redistributionStatus.

**Não basta guardar sourceId na entidade inteira.** Um clube pode ter a fundação vinda de Wikidata, nome atual do site oficial, capacidade do estádio de documento municipal e cores de um manual de marca.

### 5.1 Status do valor

- candidate: importado ou descoberto; ainda não aprovado.
- verified: conferido segundo regra definida e evidência suficiente.
- disputed: há fontes conflitantes.
- rejected: fonte ou observação rejeitada.
- estimated: valor calculado/estimado por método explícito.
- adjusted: correção editorial justificada.

O status de verificação não substitui o status de licença. Um dado pode estar factualmente certo e não estar liberado para uso comercial.

### 5.2 Direitos por ativo e por fonte

Status separados:
- internal_research_allowed;
- commercial_product_allowed;
- redistribution_allowed;
- derivative_work_allowed;
- persistent_cache_allowed;
- attribution_required;
- license_expires_at;
- terms_version_checked_at.

Default para campos não verificados: uso comercial e redistribuição bloqueados. Não herdar licença do repositório para os dados que ele espelha.

## 6. Reconciliação de identidades

### 6.1 External ID

Chave única: provider + entityType + externalId. O ID interno do De Cabeça é estável, aleatório/UUID ou namespace próprio; nunca reutilizar IDs do fornecedor como primary key.

### 6.2 Matching automático

Matching seguro precisa usar conjunto de evidências:
- pessoa: nome/aliases + data de nascimento com precisão + nacionalidade + carreira/contexto;
- clube: país + cidade + aliases + entidade histórica;
- partida: competição + temporada + data + casa/fora;
- competição: organizador + escopo + nome/aliases + temporada;
- estádio: nome + cidade + coordenada próxima + clube/operador.

Regras:
1. 1 match forte e sem conflito: pode vincular automaticamente, mantendo evidência.
2. Mais de um candidato: abrir ReconciliationCase.
3. Conflito de DOB/cidade/país/continuidade: não vincular automaticamente.
4. Nome isolado: nunca é chave de deduplicação.
5. Homônimos entre equipes masculinas, femininas, reservas e base: manter Team separado.
6. IDs do Reep auxiliam a reconciliação, mas nunca comprovam que conteúdo do provedor está licenciado.

### 6.3 Mudanças históricas

Fusão, mudança de nome, sucessão, SAF, mudança de cidade e mudança de estádio devem ser relacionamentos temporais. Não sobrescrever a identidade passada. A equipe histórica pode continuar existindo mesmo que a entidade jurídica tenha mudado.

## 7. Temporalidade e versões

Todo fato temporal precisa separar:
- tempo do mundo: validFrom / validTo;
- tempo da fonte: publishedAt;
- tempo de coleta: retrievedAt;
- tempo da temporada: seasonId;
- precisão: day/month/year/interval/unknown.

A edição do Pack fixa:
- packId;
- version;
- kind real/fictional;
- region;
- season;
- createdAt;
- manifest;
- checksum.

Atualizar a base canônica não altera o Pack já publicado. Publicar temporada nova ou corrigida gera nova versão, preservando carreira antiga.

## 8. Performance e materialização

Não colocar toda a F-KB no caminho da simulação. O importador pode ser pesado, mas o runtime lê o pacote já validado.

Estratégia:
1. consultas analíticas/joins de histórico ocorrem na fase de ingestão;
2. cálculos de reputação, força, valor e atributos são feitos na criação do Pack;
3. arrays e tabelas do Pack são ordenados e têm IDs internos estáveis;
4. Pack é validado pelo schema Zod e por verificações de qualidade cruzadas;
5. o manifesto inclui arquivos, hashes, rows, versão do transformador e data de corte;
6. no runtime, o engine não busca dados externos nem depende de APIs de terceiros.

Não adotar microserviços, event streaming ou banco de grafo sem medição que demonstre necessidade. PostgreSQL para dados canônicos tipados e Parquet/DuckDB para auditorias e cálculos em lote são suficientes para o estágio atual; essa escolha é recomendação, não implementação aprovada.

## 9. Qualidade e gates do Pack real

### 9.1 Identidade

- 100% de jogadores de elenco com identidade resolvida nos campos mínimos do gate atual.
- Nenhuma duplicata aberta.
- Nenhum jogador em dois clubes sem relação formal de empréstimo/registro compatível.
- Todas as entidades externas mapeadas com regra reprodutível.

### 9.2 Carreira e desempenho

- Temporadas e passagens não se sobrepõem sem justificativa.
- Precisão temporal preservada; não transformar ano em dia.
- Estatísticas comparáveis somente com a mesma definição.
- Minutos e aparições devem ser internamente coerentes.
- Campo não existente fica null; não fabricar aparição, gol, contrato ou lesão.

### 9.3 Competição

- Participantes batem com o regulamento e com o tamanho da edição.
- Todas as fases possuem regra de avanço e saída.
- Datas e janelas não se contradizem.
- Tie-breakers preservam ordem oficial.
- Circulares e adendos não substituídos.
- Regras desconhecidas bloqueiam a publicação se forem relevantes à engine.

### 9.4 Direitos

- Cada campo exportado tem direitos comerciais e de redistribuição aprovados ou tem sido produzido independentemente a partir de fatos e métodos permitidos, sujeito à revisão aplicável.
- Nenhum documento, imagem, áudio ou texto protegido é copiado por acidente.
- Nenhuma fonte com uso comercial bloqueado alimenta atributos, valores ou parâmetro de jogo sem permissão.

### 9.5 Confiança

O Pack continua com marca de origem/confiança compacta, mas a F-KB retém o detalhe. Reproduzir a geração do Pack a partir do mesmo conjunto de fontes e da mesma versão dos transformadores deve produzir o mesmo checksum.

## 10. Mudanças a decidir por ADR antes de modificar o schema

| Questão | Situação atual | Proposta para avaliação |
|---|---|---|
| região multi-país | PackSchema region é literal BR | manter Brasil no primeiro corte; criar decisão de expansão antes de suportar SA |
| marcas de procedência de clube | marks do jogador e staff; não há field marks completo em Club | adicionar marks compactos para valores importantes do clube ou definir mecanismo equivalente |
| marcas de procedência de cidade | PackCity não tem marks | decidir se cidade precisa field marks ou se manifest + F-KB cobre o suficiente |
| cores temporais | duas cores por clube sem período | F-KB armazena paleta histórica; Pack exporta 2 cores da data de corte |
| estádio com ID próprio | estádio embutido em PackClub | F-KB tem entidade Stadium; Pack embutido permanece até a engine precisar de IDs |
| sponsors | name/annual/until | manter projeção simples até mercado comercial requerer propriedade/segmento/detalhe |
| torcida | 8 ratings/proxies no Pack | separar fatos observados e avaliação no F-KB; só projetar os parâmetros usados no jogo |
| salários/valores | Pack tem números inteiros sem unidade explícita no schema | documentar moeda e unidade por Pack (BRL nominal da temporada) antes de adicionar contratos reais |
| jogadores estrangeiros | nationality ISO-2, Pack regional Brasil | expandir apenas após decisão de conjunto sul-americano e país de nascimento/dupla nacionalidade |
| estatísticas de atleta | não estão em PackPlayer | continuar fora do Pack; projetar somente atributos e dados de jogo consumidos pela simulação |
| assets de marca | não estão no Pack | manter fora até licença e decisão de produto |

## 11. Próximo slice técnico recomendado

Não implementar toda a plataforma agora. Primeiro fazer um slice de evidência com baixa dependência:
1. modelar DataSource, SourceTermsVersion, SourceArtifact, IngestionRun, SourceRecord, ExternalIdentity, FieldEvidence e ReconciliationCase;
2. importar uma release fixa do Reep apenas como crosswalk e uma amostra CC0 do Wikidata;
3. importar uma pequena amostra de Brasileirão Data somente após confirmar licença dos dados;
4. criar resolução de identidade de clubes/jogadores e relatório de duplicidades;
5. gerar uma prévia de Pack sem publicar;
6. medir tempo, linhas, duplicatas, não-resolvidos e cobertura por campo;
7. revisar este modelo e registrar ADR antes da integração total.

Esse slice não precisa adicionar tabelas financeiras, mídia ou 54 atributos ao runtime. A prioridade é provar identidade, procedência, licenças e reprodutibilidade primeiro.
