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
