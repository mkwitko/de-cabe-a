# Data Sources

Pesquisa feita em 2026-11-04 com acesso web limitado. Itens marcados **(verificado)** têm URL consultada; **(não verificado)** vêm de conhecimento prévio ou snippet de busca e devem ser confirmados antes de uso.

## 1. Avaliação

| Fonte | Licença | Uso comercial | Cobertura Brasil pré-2000 | Custo | Decisão |
|---|---|---|---|---|---|
| **Wikidata** | CC0 (verificado: wikidata.org/wiki/Wikidata:Licensing) | Sim | Desconhecida; exige spot-check SPARQL | Grátis | **Fonte primária** de Player/Club/CareerSpell |
| **Wikipedia PT/EN** | CC BY-SA 4.0 (não verificado nesta sessão) | Sim, com atribuição e share-alike para texto | Boa em infobox de carreira | Grátis | **Fonte de verificação manual** (editor consulta; não copiamos texto; fatos não são protegidos, mas registramos `sourceRef` com URL) |
| Transfermarkt | Termos proíbem bots/scraping (fonte secundária, não verificado na página oficial) | Não | Excelente | — | **Scraping próprio continua proibido.** Exceção decidida pelo dono em 2026-11-17: dataset público `dcaribou/transfermarkt-datasets` (ver "Transfermarkt datasets" abaixo) |
| FBref / Sports Reference | Bloqueio acima de 10 req/min; dados revendidos a terceiros (verificado: sports-reference.com/bot-traffic.html) | Restrito | Desconhecida | — | **Proibido** scraping. Dono do Immaculate Grid (concorrente) |
| API-Football | Free: 100 req/dia (snippet) | Não declarado | Desconhecida | Free tier / pago | **Não usar no MVP**: cota inviável para carreiras históricas |
| football-data.org | Free: 12 competições, 10 req/min (verificado: pricing) | Não declarado | Improvável | Free / EUR 29+ | **Não usar**: foco em fixtures, não carreiras |
| TheSportsDB | Chave pública 30 req/min; v2 só premium $9/mês (verificado: thesportsdb.com/api.php) | Desconhecido | Desconhecida | Free / $9 | **Não usar no MVP**; candidata a escudos se licença confirmar |
| Sofascore / Flashscore | Não verificado | Tratar como não | — | — | **Proibido** |
| ogol.com.br / zerozero.pt | Não verificado | Desconhecido | Provavelmente a melhor para Brasil (hipótese) | — | **Consulta manual** do editor; parceria/licença é opção futura |
| openfootball | Domínio público / CC0 (verificado: github.com/openfootball) | Sim | Sem Brasil; só fixtures | Grátis | Não relevante |
| Kaggle | Varia por dataset; muitos são cópias de Transfermarkt (hipótese) | Verificar cada um | Varia | Grátis | **Não usar** sem licença clara por dataset |

## 2. Estratégia

1. **Import Wikidata (CC0)** via SPARQL ou dumps filtrados: jogadores com `P54` (member of sports team) em clube com país BR, ou nacionalidade BR (`P27`), ou tier global curado manualmente. Qualificadores: `P580` início, `P582` fim, `P1642` acting as (empréstimo), `P413` posição, `P569` nascimento. Propriedades listadas de conhecimento prévio; **confirmar no primeiro script de import**.
2. **Status `imported`** para tudo que vem automático. Nada `imported` entra em desafio.
3. **Verificação manual** no painel editorial: editor compara com Wikipedia/ogol/Transfermarkt (consulta visual), ajusta spells, marca `verified`, registra `sourceRef` (URL consultada).
4. **Aliases**: canônico e nome completo vêm do Wikidata (labels PT e EN, `P1477` nome de nascimento); apelidos entram manualmente.
5. **Escudos/fotos**: não no MVP. UI usa iniciais e cores. Motivo: licenciamento de marcas de clubes é risco separado; logos em Wikimedia Commons têm licenças variadas por arquivo.

## 3. Riscos

- Cobertura do Wikidata para jogadores brasileiros das décadas de 1970–1990 pode ser rala e sem datas. Mitigação: curadoria manual concentrada em ~300 jogadores de maior notoriedade para o piloto; medir taxa de spells sem data no import.
- Empréstimos no Wikidata são inconsistentes (às vezes `P1642`, às vezes item separado, às vezes ausente). Mitigação: `spellType` revisado manualmente, obrigatório antes de `verified`.
- Direitos de imagem e marca: fora do MVP.
- Termos de uso de sites consultados manualmente: consulta humana para verificação é uso normal; não automatizar.

## 4. Spot-check obrigatório antes do slice de import

Script temporário (fora do produto, em `scripts/research/`) que roda 5 consultas SPARQL:
- Contagem de jogadores com `P27=Q155` (Brasil) e pelo menos um `P54`.
- Percentual desses com `P580` em todos os `P54`.
- Amostra de 20 jogadores conhecidos (lista fixa: Zico, Sócrates, Romário, Ronaldo, Rivaldo, Cafu, Roberto Carlos, Kaká, Ronaldinho, Neymar, Falcão, Careca, Bebeto, Taffarel, Dida, Juninho Pernambucano, Alex, Marcelinho Carioca, Edmundo, Túlio) comparando número de clubes vs. Wikipedia PT.
- Resultado documentado em `DATA_QUALITY.md` §Baseline.

Nada do produto depende de contratar API paga.

## Partidas e escalações (2026-11-06)

| Fonte | Licença | O que importamos | Uso |
|---|---|---|---|
| OpenFootball (`football.json`, `worldcup.json`, `champions-league`, `brazil`) | CC0 (domínio público, inclusive comercial) | ~44 mil partidas: ligas da Inglaterra, Espanha, Itália, Alemanha, França, Portugal e Holanda (2010-11 a 2025-26); Copas do Mundo 1930–2026; Liga dos Campeões 2011-12 a 2025-26; Brasileirão A e B 2018–2026; Copa do Brasil 2025; Libertadores e Sul-Americana 2012–2026 (resultados) | Liberado |
| StatsBomb open data | Contrato proíbe uso comercial e fornecer os dados a terceiros (itens 1.2.1 e 1.2.2 do `LICENSE.pdf`, 2023-09-08) | Nada: dados apagados em 2026-11-06 | **Proibido** (jogo com anúncios) |

Script: `scripts/research/import-matches.ts` (tabelas `Match` e `MatchLineup`; arquivos de texto lidos por `scripts/research/lib/football-txt.ts`, com autoteste). Jogador de escalação só é ligado ao nosso quando nome (ou apelido) e nacionalidade batem com exatamente um jogador; time só é ligado a clube quando o nome bate. Escalações de finais (Copa do Mundo 1930–2026, Copa dos Campeões/Champions 1956–2026, Libertadores 2019–2026, Copa América): dos artigos das finais na Wikipédia em inglês (CC BY-SA, uso comercial com crédito e link), por `scripts/research/import-lineups.ts` (parser em `scripts/research/lib/wiki-lineups.ts`, com autoteste). O jogador é ligado ao nosso pelo link do artigo → item do Wikidata (o que falta é importado do Wikidata); ~96% dos titulares ficam ligados. Também os mata-matas das Copas do Mundo 1986–2022 e das Copas América 2011–2024 (oitavas, quartas, semifinais, disputa do 3º lugar), uma seção por jogo nos artigos "knockout stage". Usadas na Escalação e nos grupos de "titulares da mesma final" das Conexões.

**Nome dos jogadores (2026-11-07):** o nome principal é o que a torcida usa, tirado do título do artigo na Wikipédia em português ou inglês, sem o "(futebolista, nascido em…)": "Marcelo", não "Marcelo Vieira da Silva Júnior". O nome de registro fica como apelido de busca. Script: `scripts/research/common-names.ts` (7.991 jogadores renomeados na primeira passada). Scraping de sites com termos que proíbem (Transfermarkt, FBref, Sofascore, ogol) continua fora.

## Transfermarkt datasets (2026-11-17)

| Fonte | Licença | Uso |
|---|---|---|
| `dcaribou/transfermarkt-datasets` (tabelas `players`, `transfers`, `clubs`, `competitions`; download em `pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/<tabela>.csv.gz`, citado no README do repositório) | CC0-1.0 para o repositório; **os dados de fundo são raspados do Transfermarkt e seguem os termos dele** | `Source` `transfermarkt-datasets`, `commercialUseAllowed = false`. Tudo entra como `imported` (nunca `verified`); nada disso entra em desafio sem verificação do editor |

**Nota legal:** a licença CC0 cobre o código e a compilação do repositório, não os termos do Transfermarkt sobre o conteúdo original. Por isso `commercialUseAllowed = false`: antes de qualquer fato desta fonte aparecer ao jogador, o editor o confirma em fonte livre (Wikidata/Wikipédia) e muda o `sourceId`. As tabelas brutas nunca vão ao git (cache em `scripts/research/.cache/transfermarkt/`, ignorado).

**Importador:** `apps/api/src/modules/data-import/transfermarkt-import.ts` (mapeamento puro em `transfermarkt-mapper.ts`, com testes), chamado por `scripts/research/import-transfermarkt.ts [--download] [--dry] [--all]`. Só roda contra `localhost`. Mesmo contrato do import Wikidata: jogador/spell existente nunca é alterado, cada campo diferente vira `ImportDiff` aberto.

- **Escopo da primeira rodada:** cidadania brasileira ou alguma transferência de/para clube da `BRA1`.
- **Jogador:** casa por apelido normalizado (`name`, `first_name last_name`) + data de nascimento exata, com um único candidato; se não casa, cria (precisa de nascimento, nacionalidade conhecida e ao menos uma passagem com clube nosso). Mais de um candidato = ambíguo, não cria.
- **Clube:** casa por nome normalizado (sem FC/SC/...; "X U20" é o time de base de X), filtrando por país quando o dataset conhece (`clubs` → `competitions`). Empate dentro do país vai para o clube com mais passagens; empate sem país fica sem casar. Clubes nunca são criados; passagem com clube sem casar é descartada e contada.
- **Passagens:** a tabela `transfers` tem datas de transferência, não de passagem: cada transferência fecha a passagem aberta e abre outra no destino; a primeira também gera o clube de origem sem data de início. Datas futuras (movimentos agendados) são ignoradas. **O dataset não marca empréstimo**: `loan` é inferido por ida e volta (X→Y e Y→X em até 24 meses), com `loanFromClub` = X. Revisão do editor é obrigatória (DQ-03).
- **Conflitos:** passagem existente do mesmo jogador e clube com períodos que se cruzam é comparada em `startDate`, `endDate` e `spellType` (data só conflita na precisão que temos: ano 2012 concorda com 2012-07-15; dia, com mais de 31 dias de diferença). Também `nationality` e `primaryPositionGroup` do jogador.
- **Lacunas conhecidas:** nomes do Transfermarkt fora do padrão (Athletico-PR, Mirassol-SP, "B"/"II") não casam; a passagem do emprestador é dividida em duas em volta do empréstimo; só os clubes da `BRA1` têm país conhecido.
