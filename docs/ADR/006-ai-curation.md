# ADR-006 — Curadoria feita por IA

Status: aceito (2026-11-05). Substitui, em parte, ADR-003 e `DATA_QUALITY.md` §1 ("`verified` só por ação de editor").

## Contexto
O autor do produto pediu que a própria IA encontre e prepare todo o conteúdo do piloto (jogadores, verificação, desafios). Não há editor humano disponível.

## Decisão
- Um agente de IA atua como editor: importa do Wikidata, confere cada carreira contra uma segunda fonte aberta (Wikipédia PT via API, CC BY-SA, só fatos) e marca `verified` pelas mesmas rotas admin, com `verifiedBy = "ai-curator"` e `sourceRef` da fonte conferida.
- Só vira `verified` o que passa nas checagens DQ bloqueantes **e** concorda entre as duas fontes (mesma sequência de clubes). Divergência fica `imported` e vai para o relatório.
- Desafios são criados, validados e publicados pelo agente com as mesmas checagens de elegibilidade.
- Continua proibido: scraping de Transfermarkt, FBref, Sofascore, Flashscore, ogol; qualquer API paga.

## Consequências
Erros de dado que as duas fontes compartilham passam. Mitigação: relatório de palpites rejeitados (`DATA_QUALITY.md` §5) e `retire` de desafio. `verifiedBy = "ai-curator"` permite uma revisão humana posterior filtrar o que a IA verificou.
