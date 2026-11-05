# ADR-003 — Wikidata como fonte primária, verificação manual obrigatória

Status: aceito, com spot-check pendente.

## Contexto
Fontes ricas (Transfermarkt, FBref, Sofascore) proíbem scraping; APIs esportivas focam em dados atuais e têm cotas pequenas no free tier. Wikidata é CC0.

## Decisão
Import automático só do Wikidata (status `imported`). Nenhum fato entra em desafio sem `verified` por editor humano, que consulta Wikipedia/ogol/Transfermarkt **manualmente** e registra `sourceRef`. Sem scraping de nenhuma fonte com termos restritivos. Sem logos no MVP.

## Alternativas
- Comprar dados (API-Football, licença Transfermarkt): custo não autorizado; rejeitado por ora.
- Curadoria 100% manual: lento; Wikidata como esqueleto reduz digitação.

## Consequências
Volume inicial limitado (~300 jogadores verificados no piloto). Cobertura pré-2000 precisa medição (`DATA_SOURCES.md` §4). Custo zero em licenças.
