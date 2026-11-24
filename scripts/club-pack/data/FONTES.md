# Fontes e lacunas (finances-audited.json, rules-official.json)

Gerado em 2026-11-18. Apenas demonstracoes publicadas pelos clubes e regulamentos oficiais da CBF. Nada estimado; `null` = nao encontrado.

## Financas: 7 de 40 clubes com demonstracao 2025 lida (valores em R$ mil convertidos para BRL)

| Clube           | Fonte (PDF)                                                                                                                                                            | Auditoria                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Palmeiras       | palmeiras.com.br/wp-content/uploads/2026/05/Balanco-e-DRE-2025.pdf (1 pag., DRE e balanco); parecer-bdo-2025.pdf                                                       | BDO, sem ressalva na opiniao                              |
| Santos          | media.santosfc.com.br/wp-content/uploads/2026/04/Demonstracoes_Financeiras-2025-assinada.pdf                                                                           | relatorio na pag. 11, tipo nao verificado                 |
| Grêmio          | gremio.net/documentos/GREMIO_-_DFS+RAI_2025_-_final_-_23-03-2026_CD_(1).pdf                                                                                            | relatorio no PDF                                          |
| Novorizontino   | gremionovorizontino.com.br/wp-content/uploads/2026/04/DF-GREMIO-NOVORIZONTINO-2025-Final-assinada-total-1.pdf                                                          | relatorio no PDF, nao lido                                |
| Internacional   | static.internacional.com.br/cms/assets/ra_2025_6be6c85b2a.pdf                                                                                                          | relatorio pag. 2, nao verificado                          |
| Fortaleza (SAF) | transparencia.fortaleza1918.com.br/wp-content/uploads/2026/04/DEMONSTRACOES-CONTABEIS-FEC-SAF-31-12-2025.pdf                                                           | relatorio pag. 2, nao verificado                          |
| Vasco (SAF)     | netvasco.com.br/news/noticias16/arquivos/20260430-224806-1-vasco-da-gama-saf-...-2025.pdf (espelho de fan site; original em vasco.com.br/transparencia nao verificado) | opiniao COM RESSALVA (pag. 29), incerteza de continuidade |

Cada valor tem `sourceUrl` + `page` (pagina do PDF; Palmeiras e Novorizontino usam pagina impressa quando indicado).

### Sem dado (33 clubes) e o que foi achado

- Flamengo: so DFs 1T2026 nao auditadas (images.flamengo.com.br/.../1777579037016.pdf); anual 2025 (EY) nao localizado.
- Botafogo: DFs em static.botafogo.com.br dao AccessDenied; so o relatorio do auditor (com ressalva) foi lido, sem numeros. Imprensa cita outra versao com abstencao de opiniao.
- Athletico-PR: PDF existe (athletico.com.br/.../Relatorio_Club_Athletico_Paranaense_2025.pdf) mas retornou 403.
- Atletico-MG: achado so o PDF da associacao 2025 (atletico.com.br/.../3648-26-NEs-Clube-Atletico-Mineiro-31.12.2025.pdf), nao extraido; SAF 2025 nao localizada.
- Bahia: 2025 (fbf.org.br) fora do ar; 2024 existe em repositorio-bahia.s3.amazonaws.com (nao extraido).
- Cruzeiro SAF: apenas suplemento de jornal (diariodocomercio.com.br), nao lido.
- Corinthians, Fluminense, Ceara: balancos citados pela imprensa (ressalvas), PDF oficial nao localizado.
- Sao Paulo, Bragantino, Vitoria, Mirassol, Coritiba, Chapecoense, Remo e demais da Serie B (Sport, Juventude, Nautico, America-MG, Avai, Ponte Preta, Vila Nova, Goias, Botafogo-SP, Sao Bernardo, Athletic-MG, Londrina, Atletico-GO, Cuiaba, Criciuma, Operario-PR, CRB): nao pesquisados a fundo ou nao localizados. Central de Balancos (centraldebalancos.estaleiro.serpro.gov.br) e transparencia de cada clube sao o proximo passo.

### Limites de campo

- Venda de atletas, folha e direitos de imagem nem sempre sao linhas separadas; ver `note` por campo.
- Divida bruta/liquida so onde o balanco abre emprestimos; passivo fiscal e trabalhista nao incluido (ver `extra.totalLiabilities` quando houver).
- Serie C/D: nenhum balanco de clube localizado.

## Regras: PDFs oficiais lidos

- REC Serie A 2026 (CBF, 15/12/2025), lido do espelho https://www.netvasco.com.br/news/noticias16/arquivos/20251215-231828-1-.pdf
- REC Serie B 2026: https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_Serie_B_2026_85d55b9f72.pdf
- REC Copa do Brasil 2026: https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Copa_do_Brasil_2026_66989a5426.pdf
- Manual de Competicoes CBF 2026 (substitui o RGC): https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Manual_de_Competicoes_CBF_2026_f5b02a4e04.pdf
- Regulamento Serie C 2026 (republicado por esportegoiano.com.br): https://esportegoiano.com.br/wp-content/uploads/2026/02/Veja-o-regulamento-geral-da-Serie-C-2026.pdf
- Serie D 2026 e cotas da Copa do Brasil: paginas de noticia da CBF (sem PDF/artigos).

### Lacunas de regras

- Janelas de transferencia 2026 (datas) e regras de emprestimo (RGR): nao localizadas.
- Premiacao Serie A/B por posicao: nao ha no REC. Cota Serie C 2026: so por oficio nao localizado.
- REC Serie D (PDF) e demais artigos da Copa do Brasil (ida/volta, prorrogacao) nao lidos.
- SSF/RSSF (fair play financeiro) citado no REC Serie A art. 1, nao extraido.
- `rules.json` anterior (Wikipedia) nao foi alterado; `rules-official.json` o substitui onde ha dado.

## Torcidas (`fans.size`, data/fans.json)

- Ipsos-Ipec / O Globo, campo 5-9 jun 2025 (2.000 entrevistas, 132 municipios, margem 2,2 p.p.): 20 clubes de 0,5% para cima, aplicados a populacao IBGE 2025. https://tvtnews.com.br/maiores-torcidas-do-brasil-nova-pesquisa-2025/ e https://www.diariodepernambuco.com.br/esportes-dp/sport/2025/07/amp/7795455-pesquisa-aponta-o-sport-com-a-13-maior-torcida-do-pais-santa-cruz-tambem-ocupa-o-top-20.html
- Conferencia: CBF/Nexus, nov 2025 (mesma ordem no top 10). https://www.netvasco.com.br/n/372844/pesquisa-de-torcidas-encomendada-pela-cbf-diz-que-o-vasco-tem-5-da-preferencia-no-brasil
- Abaixo de 0,5%: estimado (publico 2025 x razao mediana dos clubes pesquisados, ou reputacao), marcado no relatorio.

## Naturalidade (`origin.cityId`, data/birthplaces.json)

- Wikidata (CC0), SPARQL por ano de nascimento 1980-2011: futebolistas (P106 Q937857) brasileiros (P27 Q155) com data (P569) e local de nascimento (P19), estado (P131* ate Q485258), coordenadas (P625) e populacao (P1082). Gerado por `fetch-birthplaces.ts`.
- Casamento em `import-fm.ts`: mesma data de nascimento e nome (igual ao conhecido/completo, ou todas as palavras do rotulo dentro do nome completo); data com dois candidatos fica sem. Cobertura 2027: Serie A 57%, B 38%, C 24%, D 11%.

## Segunda nacionalidade (`secondNationality`, data/citizenships.json)

- Wikidata (CC0), SPARQL por ano de nascimento: futebolistas com cidadania brasileira (P27 Q155) e outra (P27 com ISO P297). Gerado por `fetch-citizenships.ts`; casado em `import-fm.ts` como a naturalidade. 18 jogadores no pacote (ex.: Rafael Toloi IT+BR, Jorginho IT+BR, Coutinho BR+ES).
- `second_nation_ids` do FM nao e usado: marca Brasil para estrangeiros sem passaporte brasileiro (Mercado, Cuello, Ferraresi).
- `birthCityId` (campo de naturalidade do esquema) passa a guardar a naturalidade, em vez de `origin.cityId`.

## Estrutura do clube (`facilities`, `profile`, data/clubes-formadores.json)

- Instalacoes: `facilities.csv` do FM so traz `corporate_facilities_code` (1-20; basic 1-2, fairly basic 3-5, adequate 6-9, average 10-12, good 13-14, excellent 15+), mapeado a 1-5 e **mediado com o nivel por reputacao** (treino e saude). Base = a mesma media, +1 se o clube esta na lista CBF de Clubes Formadores, +1 se >= 40% dos minutos do time titular vem de jogadores formados no clube (`home_grown_club_uids`). Sem nota do FM, vale a reputacao.
- CBF, Certificado de Clube Formador: https://www.cbf.com.br/a-cbf/drt/clubes-formadores (pagina de 09/09/2026, lista de 20/10/2026, 78 clubes; sem categoria publicada). Casamento por nome sem formas juridicas. Conferencia: https://diariodopara.com.br/bola/para-fica-fora-da-lista-de-clubes-formadores-da-cbf-em-2026/ e Lance! (categoria A 2 anos, B 1 ano).
- Departamentos: mantidos (derivados da reputacao). `staff.csv` do FM nao tem `job` nem atributos de comissao preenchidos, so preferencias taticas.
- Estilo de jogo (`profile.playingStyle`): `player-season-stats.csv` (kind overall, time principal), taxas por 90 min do time, percentil entre os clubes do pacote, limitado a 10-90: posse = passes; verticalidade = passes progressivos por passe; pressao = pressoes; bloco = poucos cortes (clearances); largura = cruzamentos; ritmo = sprints; risco = bolas perdidas. So clubes com >= 5000 minutos (303); os demais mantem o sorteio por reputacao.
- Politica de base (`youthPolicy`): parcela dos minutos de jogadores formados no clube, 50% = 95.
- Mercado: `readyVsYoung` pela idade media do elenco (21 = 10, 31 = 90); `regionalVsNational` = 25 + 400 x parcela de estrangeiros + 50 x parcela nao formada no clube.

## Blocos de TV, caixa/divida e valores de mercado (2026-11-20)

- **Blocos de TV Serie A** (`tv-blocs.json`, espelhado em `LIBRA_CLUB_IDS` de `revenue.ts`): Libra = Atletico-MG, Bahia, Flamengo, Gremio, Palmeiras, Bragantino, Remo, Santos, Sao Paulo, Vitoria; FFU = os demais da Serie A 2026. Fontes: Lance! 27/01/2026, Wikipedia "Liga Forte Uniao" (16/02/2026), Band 05/05/2026 (Palmeiras sai da Libra mas mantem o contrato ate 2029). Clubes fora da lista: FFU (padrao, bloco com ~35 membros).
- **Caixa**: balanco auditado 2025 dos 7 clubes (Palmeiras, Gremio, Santos, Inter, Vasco, Fortaleza, Novorizontino); demais clubes: ESTIMATIVA de 2,1% da receita (mediana dos 7), sinalizada no relatorio do pack. Receita: auditada/imprensa 2025 (`finances.json`), senao folha mensal da economia x 12 / 0,65. Causa do zero antigo: o saldo do FM e negativo em A-C e virava so divida.
- **Divida**: emprestimos/divida bruta auditados (Gremio, Vasco, Fortaleza, Palmeiras), senao divida total Anresf 2025 (`finances.json`, imprensa), limitada a 0,8x a receita: o jogo quita em 5 anos com 10% de juros e a Lei SAF limita o pagamento a 20% da receita mensal (0,2 x 5 / (1 + juros medios) ~ 0,77). PARAMETRO.
- **33 balancos faltantes**: nenhum novo localizado nesta passada (Flamengo so 1T2026 nao auditado; ver acima).
- **Valor de mercado**: nao ha base publica com licenca por jogador. CIES publica so listas curtas na imprensa (top 10 do Brasil, 24/09/2026: Flaco Lopez EUR 53,9 mi ... Gomez 24,5; soma EUR 354,6 mi, R$ 5,90/EUR). Transfermarkt nao usado (ToS). `market/value.ts` ficou como esta; o bench ganhou uma linha com a soma dos 10 mais valiosos (faixa R$ 1,4-2,6 bi; pack ~1,5 bi, baixo mas dentro). Comparacao por jogador (Kaio Jorge, Montoro, Arroyo...) foi inconclusiva: o pack e um retrato do FM com outros elencos.

## Comissao tecnica (`staff.csv` do FM, em `import-fm.ts`)

- `staff.csv` nao traz cargo (`job`/`job_code` vazios) nem atributos de treinador (so `attributes_adaptability`). Tem salario, habilidade atual (1-200), personalidade, preferencias taticas (1-20) e `in_club_lists`: falso para o tecnico do clube, verdadeiro para quem esta listado ao lado dele (conferido na Serie A: Abel Ferreira, Leonardo Jardim, Tite, Dorival Junior, Rogerio Ceni, Luis Castro). Tecnico = maior salario entre os `in_club_lists` falsos. 776 de 829 clubes; os demais ficam com o gerado.
- Atributos (`tactics`, `gameReading`) da habilidade atual; `manManagement`/`motivation` da personalidade (estimado, baixa confianca). As preferencias vao em `specialties` como `pref:<chave>=<n>` e o `career/coach-pool.ts` as le (filosofia: pressao, ritmo, largura, ataque, jogo direto; qualidade: habilidade). Os tecnicos de clubes fora das divisoes formam a reserva livre. Auxiliares, preparadores, olheiros etc. nao sao importados: sem cargo nao ha como separar, e as atribuicoes entram na folha do clube.

## Clausula de rescisao (`contract.releaseFee`, `contracts.csv`)

- `clauses` e um JSON `[{kind, kind_code, parameter, value}]`. Usadas: `minimum_fee_release_domestic` (18), senao `minimum_fee_release` (0); `value` na moeda do save (GBP como os salarios, convertido a 7,0). `minimum_fee_release_foreign` (16), `relegation_release` (1) e `non_promotion_release` (2) ficam de fora (nao disparam dentro do mundo do pack). 15.049 de 15.689 jogadores (96%).
- Sanidade: Lei Geral do Esporte (Lei 14.597/2023, art. 28, par. 1): clausula indenizatoria desportiva ate 2.000 vezes o salario contratual medio em transferencia nacional, sem limite na internacional. O valor domestico e cortado em 2.000 salarios mensais (1 caso).

## Lesoes e tracos

- `injuries.csv` (linhas `history`): cada 2 pontos de gravidade (leve 1, media 2, grave 3) somam 1 a `injuryProneness` do FM, ate +3 (PARAMETRO). 3.002 jogadores.
- Traco FM codigo 9 (chutes de longe, penaltis, forca; coocorre com `shoots_from_distance`): inferido `shootsFromDistance`. Codigos 20, 44 (bola parada, visao), 33, 60 (marcacao) nao tem traco equivalente no motor e seguem descartados.

## Estadios, rivalidades, publico C/D e torcida (2026-11-20)

- `stadiums.json` (enrich-stadiums.ts): estadio de cada clube ligado ao Wikidata (CC0, QLever) lido pelo lado do estadio (P466 ocupante, P127 dono), P115 vigente (sem data fim) e capacidade P1083 mais recente (qualificador P585); depois infobox da pt.wikipedia (CC BY-SA, campo estadio do clube, capacidade do estadio) so para quem ainda nao tinha nome ou capacidade. Ordem no pacote: capacidade do save do FM, depois Wikidata/ptwiki; nome: Wikidata, `stadiums.json`, openfootball, save. O que nenhuma fonte tem segue marcado `estimated`. Cadastro Nacional de Estadios da CBF: nao encontrado em formato aberto.
- `rivals.json`: 115 classicos/derbies reais com nome e intensidade 1-3 (listas de classicos da pt.wikipedia, fontes no arquivo). Onde o clube tem classico curado ele substitui a heuristica de mesma cidade; os demais seguem na heuristica. A intensidade ordena os rivais (o schema nao tem campo para ela; `isDerby` segue booleano).
- `attendance.json`: acrescentados Serie C 2025 (Nautico 9.040, Ponte Preta 7.214, Figueirense 6.712, Sao Bernardo 970, Retro 92; DGABC) e Serie D 2025 (Santa Cruz 21.003, ge via Diario do Nordeste). Nao ha tabela por clube de C/D publica e legivel por maquina (borderos da CBF sao PDF por jogo; os artigos da ptwiki so trazem o total da liga); os demais seguem estimados e sinalizados.
- Outros tracos da torcida (lealdade, paciencia, identidade local, orgulho da base, ambicao): nenhum proxy publico defensavel por clube (contagem de socios so existe para uns 20 clubes, sem serie comparavel); mantidos derivados da reputacao, documentados em `estimated`.

## Cores e uniformes (`club.colours`, `club.kits`, data/kits.json)

- Wikipedia (CC BY-SA 4.0), caixas de informacao: pt "Info/Clube de futebol" (corpo1, bracoesquerdo1, calcoes1, meias1; 2 = reserva) e en "Infobox football club" (body1, leftarm1, shorts1, socks1, pattern_b1); so os codigos de cor, nenhum escudo. Titulos pelos sitelinks do Wikidata (CC0); clubes sem QID sao buscados pelo nome na pt.wikipedia (`match: "name"` no JSON). Gerado por `fetch-kits.ts`.
- `club.colours` = corpo do uniforme 1 + a segunda cor dominante (mangas, calcao ou meias); cai para Wikidata P6364/P465 e, por ultimo, para um par por hash (marcado como estimado). O padrao (listras, faixas, diagonal, metades) sai do nome do arquivo de padrao da en.wikipedia, quando existe.
- `club.kits` e um campo novo e opcional no esquema (estrito): implantar pacote e codigo juntos, builds antigos rejeitam o campo.
- Escudos e camisas do jogo sao desenho proprio (SVG a partir das cores), sem logos reais.

## Municípios (`cities`, data/br-cities.json)

Gerado por `fetch-cities.ts` (respostas em cache local, requisições espaçadas). Um registro por município usado no pacote, chave = código IBGE.

- Nomes e UF: API de localidades do IBGE, https://servicodados.ibge.gov.br/api/v1/localidades/municipios (5.570 municípios).
- População: SIDRA tabela 6579 (estimativas da população residente), variável 9324, último ano publicado. https://apisidra.ibge.gov.br/values/t/6579/n6/all/v/9324/p/last
- Renda (`income`): PIB per capita mensal em R$ = PIB a preços correntes (SIDRA tabela 5938, variável 37, 2023, mil R$) / população estimada 2024 (tabela 6579; o ano de 2023 não tem estimativa) / 12. Não é renda domiciliar: o Censo 2022 não publica renda média por município numa tabela única completa; o PIB per capita cobre todos e distingue municípios industriais, petroleiros e do agro dos pobres (extremos como refinarias não são aparados, o jogo não usa a renda da cidade). https://apisidra.ibge.gov.br/values/t/5938/n6/all/v/37/p/2023
- Coordenadas (P625) e altitude (P2044): Wikidata (CC0) via QLever, casadas pelo código IBGE (P1585). Sem P2044: modelo de elevação de 90 m do Open-Meteo (Copernicus DEM, CC BY 4.0), https://open-meteo.com/en/docs/elevation-api, marcado `altSource: open-meteo` e como estimado no relatório.
- Clima (chuva mm/mês, temperatura média °C, umidade relativa %): NASA POWER, climatologia mensal 2001-2025 (T2M, PRECTOTCORR, RH2M; MERRA-2), uma chamada por célula de 0,5 grau, https://power.larc.nasa.gov/api/temporal/climatology/point. Escolhida no lugar das normais INMET 1991-2020 (só ~250 estações, a maioria dos municípios ficaria longe de uma) e do Open-Meteo (histórico diário de 30 anos por município estoura o limite gratuito). A chuva mm/dia vira mm/mês pelo número de dias.
- Município dos clubes sem cidade ("Cidade N"), campo `clubCity`: Wikidata P159 (sede), P115 (estádio) ou P740 (local de fundação) subindo por P131 até um município com código IBGE (`by: wikidata`); senão o artigo da pt.wikipedia com o mesmo nome do clube, ligado ao item Wikidata de clube de futebol (`by: ptwiki`); senão o município citado no próprio nome ("... de Porto Velho", ou o nome sem as palavras genéricas igual ao município; `by: name`, estimado). Uma marca "(UF)" no nome do clube que contradiz o município descarta o resultado.

## Campeonatos estaduais (`packages/club-domain/src/competition/estaduais-data.ts`)

Dados em codigo, nao no pacote (o esquema do pacote e estrito): participantes por estado vem das cidades dos clubes (`state`), so a primeira divisao de cada estado, clubes das divisoes nacionais primeiro, depois por reputacao. Janela CBF: 11 jan a 8 mar de 2026; 10 jan a 7 mar de 2027 (primeiro domingo a partir de 9 jan, 56 dias; domingos e quartas). Sem acesso/descenso estadual: o pacote nao tem divisoes estaduais inferiores. Formatos e dinheiro por relato de imprensa (os PDFs das federacoes nem sempre estao publicos); onde as fontes divergem a escolha esta na `note` de cada estado.

- SP (Paulista A1, 16 clubes, 2 grupos de 8 no modelo, final em 2 jogos): https://www.band.com.br/esportes/paulistao-entenda-novo-regulamento-e-veja-jogos-sorteados, https://www.gazetaesportiva.com/campeonatos/paulista/paulistao-2026-novo-formato-como-sera-disputa/, https://en.wikipedia.org/wiki/2026_Campeonato_Paulista. Dinheiro: cota de R$ 35 mi para Corinthians, Palmeiras, Sao Paulo e Santos; R$ 10 mi Mirassol e Bragantino; ~R$ 7-8 mi os demais; campeao R$ 5 mi, vice R$ 1,5 mi (https://abcdoabc.com.br/paulistao-2026-grandes-ganham-milhoes-cada/, https://www.band.com.br/esportes/quanto-o-palmeiras-ganha-com-o-titulo-do-paulistao-veja-premiacoes-202603082239). Fontes divergem sobre a final (Palmeiras: jogo unico).
- RJ (Carioca, 12 clubes, 2 grupos de 6 que so enfrentam o outro grupo, quartas, final unica): https://www.band.com.br/esportes/campeonato-carioca-2026-quando-comeca-regulamento-e-todos-os-jogos-202512311732, https://jovempan.com.br/esportes/futebol/campeonato-carioca-tem-reducao-de-dias-e-passara-a-ter-final-unica.html. Dinheiro: Flamengo R$ 10 mi de cota, Botafogo/Fluminense/Vasco R$ 6,6 mi, campeao R$ 10 mi, semifinalistas R$ 5,5 mi (https://www.mktesportivo.com/2025/11/campeonato-carioca-de-2026-volta-a-pagar-premiacao-aos-clubes-e-define-alteracoes-no-regulamento/, https://www.netvasco.com.br/n/375667/vasco-recebera-r-66-milhoes-fixos-mais-premiacao-por-metas-no-carioca-2026). Taca Guanabara/Taca Rio nao modeladas.
- MG (Mineiro, 12 clubes, 3 grupos de 4, lideres + melhor 2o em semis de ida e volta, final unica): https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/campeonato-mineiro/fmf-confirma-retorno-da-final-unica-para-o-campeonato-mineiro-de-2026/, https://www.goal.com/br/listas/como-funciona-regulamento-campeonato-mineiro-2026/blt0c685dc1bbf74c1a. Cota R$ 9 mi Atletico e Cruzeiro, sem premio ao campeao (Goal, Lance).
- RS (Gaucho, 12 clubes, 2 grupos de 6 contra o outro grupo, quartas unicas, semi e final em 2 jogos): regulamento FGF (PDF, ver estaduais-data.ts), https://www.goal.com/br/listas/como-funciona-regulamento-campeonato-gaucho-2026/bltbab8e2c2e3c8fca8. Cota ~R$ 10 mi Gremio e Inter, sem premio (Lance, Itatiaia).
- PR (Paranaense, 12 clubes, 2 grupos de 6, 8 avancam, mata-mata em ida e volta): https://www.bandab.com.br/esporte/futebol/paranaense-2026-regulamento-definido-inicio-janeiro-veja-detalhes/amp/. Dinheiro: estimativa.
- SC (Catarinense, 12 clubes em 2 grupos de 6; 10 em 2027): https://www.nsctotal.com.br/?p=7687334, https://www.nsctotal.com.br/?p=7770379. Mata-mata e dinheiro: suposicao / estimativa.
- BA (Baiano, 10 clubes, turno unico, 4 avancam, semi e final unicas): https://www.bnews.com.br/noticias/esporte/novo-formato-saiba-o-que-muda-no-regulamento-do-baianao-2026.html, https://atarde.com.br/esportes/campeonato-baiano-2026-tera-duas-datas-a-menos-e-final-em-jogo-unico-1366907. Cota R$ 1,2 mi Bahia e Vitoria; premio do campeao R$ 315 mil (valor de 2025).
- PE (Pernambucano, 8 clubes, turno unico, final em ida e volta): https://www.diariodepernambuco.com.br/amp/esportes-dp/nacional/2025/11/11701720-pernambucano-de-2026-e-confirmado-com-final-em-ida-e-volta-confira-formato-da-disputa.html. Pool de cotas R$ 3 mi fixado pela FPF (https://www.diariodepernambuco.com.br/esportes-dp/nacional/2025/11/11701734-fpf-fixa-cotas-do-pernambucano-2026-em-rs-3-milhoes-confira-divisao.html); a divisao entre clubes e suposicao.
- CE (Cearense, 10 clubes, 2 grupos de 5 e segunda fase contra o outro grupo): https://diariodonordeste.verdesmares.com.br/jogada/regulamento-do-campeonato-cearense-2026-tera-mudancas-veja-nova-formula-e-tabela-1.3707688. Mata-mata e dinheiro: suposicao / estimativa.
- GO (Goiano, 12 clubes, 3 grupos de 4): https://ohoje.com/2025/11/26/goiano-de-2026-tera-calendario-ampliado/. Mata-mata e dinheiro: suposicao / estimativa.
- Outros 17 estados (AC AL AM AP DF ES MA MS MT PA PB PI RN RO RR SE TO): formato generico do projeto (uma tabela, ou 2 grupos a partir de 11 clubes, e mata-mata dos 4 ou 8 melhores); numero de clubes aproximado (ESTIMATIVA); dinheiro ESTIMADO (cota por posicao de reputacao, premio do campeao), escalado pela divisao nacional do clube (x2 Serie A, x1,5 B, x1,2 C). A imprensa so diz que pagam muito menos que os grandes (https://www.lance.com.br/lance-negocios/levantamento-aponta-disparidade-milionaria-de-cotas-e-premiacoes-entre-os-estaduais.html).
- Lacuna: regulamentos oficiais completos das federacoes nao lidos (so imprensa e Wikipedia); acesso e descenso estaduais nao modelados.

## Categorias de base (pack.youth)

- Fonte: o save do FM26 (`players.csv`, `team_slot` 1 = sub-20, 2 = sub-17). Entram os garotos de até 20 anos dos clubes das Séries A–D (2026 e 2027), até 40 por clube, os melhores primeiro. Mesma conversão de atributos dos profissionais.
- Uso: só o clube do jogador recebe a sua base no primeiro dia, na academia (career/academy.ts). Os garotos dos outros clubes ficam fora do mundo, então a liga joga como antes.
- Cobertura: 2.161 garotos. Série A tem base para os 20 clubes (média 27); Série B 18 de 20; Série C 23 de 24; Série D 72 de 96.
- Lacuna: clube com menos de 12 garotos no save completa com até três safras geradas pela própria academia (development.ts `crop`), marcadas como geradas pelo id `y<ano>-`.

## Copas regionais e Supercopa (`packages/club-domain/src/competition/regionais-data.ts`)

Dados em codigo, nao no pacote (o esquema do pacote e estrito): participantes pelas cidades dos clubes (`state`) e pelos resultados dos estaduais da temporada anterior (campeao e vice de cada estado); clubes de qualquer divisao. Datas pela primeira quarta-feira a partir de 24 de marco (25 mar 2026), Supercopa no primeiro domingo de fevereiro. Os PARAMETROs (sem fonte) estao listados em `NOTES` no mesmo arquivo.

- Copa do Nordeste 2026 (20 clubes, 4 grupos de 5, A x B e C x D em turno unico, quartas em jogo unico, semis e final em ida e volta, 24 mar a 6 jun): https://www.cbf.com.br/futebol-brasileiro/noticias/undefined/gremio-x-criciuma/confira-os-documentos-tecnicos-da-copa-do-nordeste-de-2026, https://en.wikipedia.org/wiki/2026_Copa_do_Nordeste, https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/copa-do-nordeste/copa-do-nordeste-2026-veja-datas-novo-formato-e-participantes/, https://www.band.com.br/esportes/copa-do-nordeste-comeca-hoje-veja-formato-onde-assistir-e-premiacoes-202603231823. Vagas: campeao e vice do estadual de 2025 de AL, MA, PB, PE, PI, RN e SE; BA e CE com 3 (a 3a pelo ranking da CBF). Dinheiro: cotas R$ 2,5 mi / 1,35 mi / 850 mil / 500 mil (5 clubes cada, ranking da CBF), quartas R$ 500 mil, semi R$ 600 mil, vice R$ 700 mil, campeao R$ 1 mi (https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/saiba-valores-recebido-pelos-times-que-disputam-as-copas-regionais/); a soma, R$ 34,1 mi, bate com o total anunciado pela CBF.
- Copa Verde 2026 (24 clubes de N, CO e ES em Copa Norte e Copa Centro-Oeste de 12, 2 grupos de 6, semi em jogo unico, final regional e final da Copa Verde em ida e volta, 70 jogos, 25 mar a 7 jun): https://www.cbf.com.br/futebol-brasileiro/noticias/serie-a/a/cbf-publica-documentos-tecnicos-da-copa-verde-de-2026-2, https://en.wikipedia.org/wiki/2026_Copa_Norte, https://en.wikipedia.org/wiki/2026_Copa_Verde, https://jornalgrandebahia.com.br/?p=1329801, https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/copa-verde/copa-verde-2026-sera-dividida-entre-a-copa-norte-e-a-nova-copa-centro-oeste-veja-novo-formato/. Vagas Copa Norte: AC 2, AM 2, AP 1, PA 3, RO 2, RR 2 (Wikipedia); Copa Centro-Oeste: DF 2, ES 2, GO 3, MS 1, MT 2, TO 2 (lista de clubes do sorteio). Dinheiro: cotas R$ 200 mil / 125 mil / 100 mil / 75 mil (6 clubes cada), semi regional R$ 100 mil, final regional R$ 200 mil, vice R$ 250 mil, campeao R$ 400 mil (Itatiaia, link das copas regionais acima). Fontes divergem sobre jogo unico ou ida e volta nas semis (adotado: jogo unico, como Wikipedia da Copa Norte e DOL).
- Supercopa do Brasil 2026 (jogo unico, campeao brasileiro x campeao da Copa do Brasil, 1 fev 2026 no Mane Garrincha; sem prorrogacao, penaltis; mesmo campeao: joga o vice brasileiro; R$ 6,35 mi a cada finalista, campeao tambem US$ 1 mi da Conmebol, R$ 5,23 mi segundo o Lance): https://www.lance.com.br/lance-negocios/flamengo-x-corinthians-cbf-aumenta-premiacao-da-supercopa-rei.html, https://www.band.com.br/esportes/supercopa-corinthians-x-flamengo-saiba-sobre-data-sede-e-premiacao-202512212239, https://www.dci.com.br/esporte/futebol/tem-prorrogacao-na-final-da-supercopa-2026/.
- Copa do Brasil, 3a fase: campeoes de Serie C, Serie D, Copa Verde e Copa do Nordeste do ano anterior (https://www.lance.com.br/futebol-nacional/copa-do-brasil-2026-confira-classificados-formato-e-quando-estreiam-os-times.html; Lance cita o vice Confiança no lugar do campeao Bahia, ja classificado). A CBF diz que cada campeao regional da Copa Verde de 2027 tem vaga; o modelo mantem 4 vagas (um campeao da Copa Verde).
- Lacunas: regulamentos completos (REC) das tres copas nao lidos, so imprensa e Wikipedia; regra de clube em competicao continental fora da Copa do Nordeste nao modelada; sorteio real dos grupos nao modelado (potes por reputacao).

## Calendário CBF 2026 (estaduais e Série A)

- Estaduais de 11/1 a 8/3, no máximo 11 datas (antes 16); Série A a partir da quarta-feira 28/1; Copa do Nordeste e Copa Verde de 25/3 a 7/6. Fontes: [Itatiaia](https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/veja-todas-as-datas-do-novo-calendario-do-futebol-brasileiro-em-2026/), [NetVasco](https://www.netvasco.com.br/n/370252/cbf-anuncia-calendario-de-2026-com-estaduais-em-11-datas-e-brasileiro-iniciando-em-janeiro-e-terminando-em-dezembro).
- As 11 datas do jogo são os nove domingos da janela e as duas quartas antes da estreia da Série A; dali até 8/3 a Série A joga só no meio de semana. A lista oficial das datas não foi encontrada: é a leitura deste projeto (PARÂMETRO).
- Copa do Brasil 2027: a CBF mantém 126 clubes e muda só as vagas estaduais (federações do 15º ao 27º lugar podem dar uma das três a uma copa estadual). Nenhuma vaga regional extra foi anunciada. Fontes: [TNH1](https://www.tnh1.com.br/noticia/nid/cbf-altera-regras-de-classificacao-para-a-copa-do-brasil-2027-veja-o-que-mudou/), [A Tarde](https://atarde.com.br/esportes/futebol/copa-do-brasil-entenda-nova-regra-de-classificacao-para-2027-1382696), [DOL](https://dol.com.br/esporte/esporte-brasil/936794/copa-do-brasil-tera-novo-formato-de-classificacao-em-2027-e-2028?d=1).

## Copa Sul-Sudeste 2026

- Regulamento Específico da Competição (CBF, PDF em [clicrdc](https://files.clicrdc.com.br/wp-content/uploads/2026/03/REC_COPA_SUL_SUDESTE_2026_96e5c88253-1.pdf)): participação (Art. 2º), vaga na 3ª fase da Copa do Brasil 2027 (Art. 5º), fases e confrontos (Art. 10 a 19).
- Clubes e sorteio: [Jornal Grande Bahia](https://jornalgrandebahia.com.br/?p=1329805).
- Cotas e prêmios (R$ 3,8 mi): [Itatiaia](https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/saiba-valores-recebido-pelos-times-que-disputam-as-copas-regionais/).
- A partir de 2027 o campeão entra direto na 3ª fase, com os campeões do Nordeste, da Copa Norte e da Copa Centro-Oeste e das Séries C e D (seis vagas); para manter 126 clubes, a 1ª fase passa de 28 para 32 e o grupo do ranking de 102 para 100 (PARÂMETRO: a CBF não publicou como encaixa). Os clubes nas copas da Conmebol (os classificados reais do jogo) ficam fora do Nordeste e da Sul-Sudeste.

## Libertadores e Sul-Americana 2026

- Clubes, vagas, fases de entrada, formato e datas: Wikipedia, "2026 Copa Libertadores" e "2026 Copa Sudamericana" (lidas em 24/11/2026), que citam os sorteios da CONMEBOL de 18/12/2025 e 19/03/2026.
- Prêmios em dólares: anúncio da CONMEBOL de abril de 2026, segundo [Super Rádio Tupi](https://www.tupi.fm/esportes/libertadores-e-sul-americana-recebem-aumento-em-premios-da-conmebol/), [Diario de Pernambuco](https://www.diariodepernambuco.com.br/esportes-dp/internacional/2026/04/11711673-conmebol-anuncia-aumento-da-premiacao-na-libertadores-e-na-sul-americana.html), [Portal Tela](https://www.portaltela.com/esporte/futebol/2026/04/07/premiacao-recorde-para-campeoes-da-libertadores-e-da-sul-americana/) e [Trivela](https://trivela.com.br/america-do-sul/premiacao-libertadores-sul-americana-2026-valores-fases-campeao/).
- Ranking de clubes da CONMEBOL 2026 (topo): [Lance!](https://www.lance.com.br/futebol-internacional/ranking-da-conmebol-palmeiras-e-flamengo-no-top-4-com-river-e-boca.html), [ESPN](https://espndeportes.espn.com/futbol/copa-libertadores/nota/_/id/16088042/asi-quedo-el-ranking-de-clubes-de-conmebol-2026).
- Recopa Sul-Americana 2026 (Lanús x Flamengo, 19 e 26 fev, prorrogação e pênaltis; US$ 1,8 mi ao campeão, US$ 900 mil ao vice): [Band, datas](https://www.band.com.br/esportes/flamengo-e-lanus-conhecem-datas-e-horarios-de-duelos-pela-recopa-2026-veja-detalhes-202512182157), [Band, premiação](https://www.band.com.br/esportes/recopa-sul-americana-quanto-o-flamengo-pode-faturar-se-for-campeao-202602181918), [Tupi](https://www.tupi.fm/esportes/flamengo/premiacao-recopa-flamengo-lanus-2026/), [El Economista](https://eleconomista.com.ar/deportes/lanus-campeon-recopa-2026-premio-millonario-dolares-flamengo-n92948/amp), [beIN](https://www.beinsports.com/en-us/soccer/articles-video/historic-night-in-maracan-lan%C3%BAs-defeats-flamengo-and-claims-the-recopa-sudamericana-title-2026-02-27-lanus_campeon_de_la_recopa_sudamericana_goles_epi?7w=dg).
- PARÂMETRO: força dos estrangeiros pela fase de entrada e pelo país (career/foreign.ts), até o pack trazer a reputação do FM; de 2027 em diante, os estrangeiros são sorteados entre os clubes de cada país, mantendo as vagas de 2026; cores dos clubes são as tradicionais, não o uniforme da temporada.

## club-city-fixes.json (2026-11-24)

104 clubs whose home city or state was wrong or unknown after the automatic sources (openfootball name matches across states, a municipality found in the club's name, placeholders that took their Série D group's state). Each entry was checked by hand and carries the page it was read from (pt.wikipedia, Wikidata, club or federation pages). `import-fm.ts` applies it before every other source. Clubs that could not be established (18) are left to the automatic sources.

## Pausa da Copa do Mundo

- Série A 2026: 18ª rodada encerrada em 31/5, 19ª marcada de início para 22/7 (Copa do Mundo de 11/6 a 19/7) e antecipada pela CBF para 16/7 por causa das copas da Conmebol ([Band](https://www.band.com.br/esportes/cbf-divulga-tabela-da-volta-do-brasileirao-e-anuncia-exclusao-de-horarios), [Itatiaia](https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/brasileirao-serie-a/sem-copa-do-mundo-veja-quando-sera-retorno-do-brasileirao/)); o jogo volta em 16/7 em 2026. Fontes: [Band](https://www.band.com.br/esportes/saiba-quando-o-brasileirao-vai-voltar-apos-a-copa-do-mundo-202606010916), [90min](https://www.90min.com/pt-br/quando-brasileirao-parar-para-copa-do-mundo), [O Liberal](https://www.oliberal.com/esportes/copa-do-mundo/veja-quanto-tempo-o-brasileirao-ficara-paralisado-durante-a-copa-do-mundo-1.1123079). O jogo repete a pausa a cada quatro anos (2030, 2034...), com volta em 22/7 (PARÂMETRO: sem calendário publicado).
