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
