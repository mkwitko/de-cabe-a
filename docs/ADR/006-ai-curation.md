# ADR-006 — Curadoria feita por IA

Status: aceito (2026-11-05). Substitui, em parte, ADR-003 e `DATA_QUALITY.md` §1 ("`verified` só por ação de editor").

## Contexto
O autor do produto pediu que a própria IA encontre e prepare todo o conteúdo do piloto (jogadores, verificação, desafios). Não há editor humano disponível.

## Decisão
- Um agente de IA atua como editor: importa do Wikidata, confere cada carreira contra uma segunda fonte aberta (Wikipédia PT via API, CC BY-SA, só fatos) e marca `verified` pelas mesmas rotas admin, com `verifiedBy = "ai-curator"` e `sourceRef` da fonte conferida.
- Regra de concordância (ajustada no spot-check, 2026-11-05): a **sequência e os anos** da carreira vêm da infobox da Wikipédia PT (EN quando não há página em português) e **cada clube** dela precisa existir entre os clubes do jogador no Wikidata (casamento exato por nome; aproximado só para transliterações, nunca reutilizando um clube já casado). Times B/reserva/sub-XX são ignorados; o mesmo clube repetido em sequência com anos sobrepostos vira uma passagem. Só vira `verified` o que concorda **e** passa nas checagens DQ bloqueantes. O resto fica `imported` e vai para `scripts/research/curation-report.json`.
- Clube que a infobox cita mas o Wikidata não liga ao jogador: a identidade do clube vem do link da infobox (sitelink → entidade do Wikidata) e a passagem só é aceita se a infobox de **outro idioma** também listar o clube (por nome, pela entidade do link ou pelo título do artigo do clube naquele idioma). Idiomas lidos: PT, EN, ES, IT, DE, FR; a sequência da carreira vem do primeiro deles que tiver infobox. Assim toda passagem tem duas fontes (Wikidata + Wikipédia, ou duas Wikipédias editadas por comunidades diferentes).
- Fontes avaliadas e recusadas: Transfermarkt, FBref, Sofascore, ogol (termos proíbem coleta), API-Football (cota), Kaggle (licença), DBpedia (derivada da Wikipédia, não é fonte independente).
- Motivo da regra: a granularidade das fontes difere (retornos, times B, empréstimos curtos); exigir sequências idênticas descartava 60% dos jogadores conhecidos.
- Controle de qualidade: amostras aleatórias de carreiras verificadas a cada rodada; `--recheck` refaz tudo o que a IA verificou quando a regra muda (achados: time B casado com o principal; "Inter" casado com "Internacional").
- Desafios são criados, validados e publicados pelo agente com as mesmas checagens de elegibilidade.
- Continua proibido: scraping de Transfermarkt, FBref, Sofascore, Flashscore, ogol; qualquer API paga.

## Consequências
Erros de dado que as duas fontes compartilham passam. Mitigação: relatório de palpites rejeitados (`DATA_QUALITY.md` §5) e `retire` de desafio. `verifiedBy = "ai-curator"` permite uma revisão humana posterior filtrar o que a IA verificou.
